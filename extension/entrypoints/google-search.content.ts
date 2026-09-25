import type { Direction } from "../../lib/lookup/types";
import { normalizeIpa } from "../../lib/words/manual";
import {
  canSplitEnglishPhrase,
  joinWordIpas,
  tokenizeForIpa,
} from "../lib/google-translate/read-pair";
import {
  findSearchSaveAnchor,
  readGoogleSearchMeaningPair,
  type GoogleSearchMeaningPair,
} from "../lib/google-search/meaning-query";
import { sendMessage } from "../lib/messages";

const BUTTON_HOST_ID = "word-ledger-gs-btn-host";
const UI_HOST_ID = "word-ledger-gs-ui-host";

export default defineContentScript({
  matches: [
    "*://www.google.com/search*",
    "*://google.com/search*",
    "*://www.google.com.vn/search*",
    "*://google.com.vn/search*",
  ],
  cssInjectionMode: "manual",
  main() {
    const ui = mountUi();
    let syncTimer = 0;

    function scheduleSync() {
      window.clearTimeout(syncTimer);
      syncTimer = window.setTimeout(() => syncSaveButton(ui), 150);
    }

    scheduleSync();
    const observer = new MutationObserver(scheduleSync);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    window.addEventListener("popstate", scheduleSync);
    document.addEventListener("selectionchange", scheduleSync);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") ui.hideCard();
    });
  },
});

function syncSaveButton(ui: ReturnType<typeof mountUi>) {
  const pair = readGoogleSearchMeaningPair();
  const anchor = findSearchSaveAnchor();
  if (!pair || !anchor) {
    ui.hideSaveButton();
    return;
  }
  ui.showSaveButton(anchor, () => {
    // Re-read so current selection / late AI text is included.
    const fresh = readGoogleSearchMeaningPair() ?? pair;
    ui.openConfirm(fresh);
  });
}

function mountUi() {
  const btnHost = ensureHost(BUTTON_HOST_ID, { pointerEvents: "none" });
  const uiHost = ensureHost(UI_HOST_ID, { pointerEvents: "none" });

  const btnShadow = btnHost.attachShadow({ mode: "open" });
  btnShadow.innerHTML = `
    <style>${buttonCss}</style>
    <button id="save-btn" type="button" hidden>Lưu vào sổ</button>
  `;
  const saveBtn = btnShadow.getElementById("save-btn") as HTMLButtonElement;

  const shadow = uiHost.attachShadow({ mode: "open" });
  shadow.innerHTML = `
    <style>${uiCss}</style>
    <article id="card" hidden></article>
    <div id="toast" hidden></div>
  `;
  const card = shadow.getElementById("card") as HTMLElement;
  const toast = shadow.getElementById("toast") as HTMLElement;
  let toastTimer = 0;
  let onSaveClick: (() => void) | null = null;

  saveBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    onSaveClick?.();
  });

  function showSaveButton(anchor: HTMLElement, onClick: () => void) {
    onSaveClick = onClick;
    saveBtn.hidden = false;
    const rect = anchor.getBoundingClientRect();
    const top = Math.min(
      window.innerHeight - 44,
      Math.max(72, rect.top + 8)
    );
    const left = Math.min(
      window.innerWidth - 128,
      Math.max(8, Math.min(rect.right - 120, window.innerWidth - 140))
    );
    saveBtn.style.top = `${top}px`;
    saveBtn.style.left = `${left}px`;
  }

  function hideSaveButton() {
    saveBtn.hidden = true;
    onSaveClick = null;
  }

  function hideCard() {
    card.hidden = true;
    card.innerHTML = "";
  }

  function showToast(message: string, kind: "ok" | "err" | "warn" = "ok") {
    window.clearTimeout(toastTimer);
    toast.hidden = false;
    toast.dataset.kind = kind;
    toast.textContent = message;
    toastTimer = window.setTimeout(() => {
      toast.hidden = true;
    }, 2600);
  }

  function openConfirm(pair: GoogleSearchMeaningPair) {
    hideCard();
    card.hidden = false;
    let direction: Direction = pair.direction;
    let term = pair.term;
    let translation = pair.translation;
    let ipa = "";
    let errorText = "";
    let fetchingIpa = false;
    let splitMode = false;
    let selected = new Set<string>();

    function englishText() {
      return direction === "vi-en" ? translation : term;
    }

    function syncFromInputs() {
      const termEl = shadow.getElementById("term") as HTMLInputElement | null;
      const translationEl = shadow.getElementById(
        "translation"
      ) as HTMLInputElement | null;
      const ipaEl = shadow.getElementById("ipa") as HTMLInputElement | null;
      if (termEl) term = termEl.value;
      if (translationEl) translation = translationEl.value;
      if (ipaEl) ipa = ipaEl.value;
    }

    function refreshTranslationFromPage() {
      const fresh = readGoogleSearchMeaningPair();
      if (fresh?.term) term = fresh.term;
      if (fresh?.translation) translation = fresh.translation;
    }

    function render() {
      syncFromInputs();
      const english = englishText();
      const tokens = tokenizeForIpa(english);
      const showSplit =
        canSplitEnglishPhrase(english, ipa) || (splitMode && tokens.length >= 2);

      card.innerHTML = `
        <button id="close" type="button" aria-label="Đóng">×</button>
        <h2>Lưu từ Google Search</h2>
        <p class="muted">Query: ${escapeHtml(pair.query)}</p>
        <label>Từ
          <input id="term" value="${escapeAttr(term)}" />
        </label>
        <label>Nghĩa
          <input id="translation" value="${escapeAttr(translation)}" placeholder="${direction === "en-vi" ? "nghĩa tiếng Việt" : "English meaning"}" />
        </label>
        <label>IPA
          <input id="ipa" value="${escapeAttr(ipa)}" placeholder="/…/" />
        </label>
        <div class="row">
          <span class="muted">${direction === "en-vi" ? "EN → VI" : "VI → EN"}</span>
          <button id="toggle-dir" type="button">Đổi hướng</button>
        </div>
        <button id="fetch-ipa" type="button" class="secondary" ${fetchingIpa ? "disabled" : ""}>
          ${fetchingIpa ? "Đang lấy IPA…" : "Lấy IPA từ EN"}
        </button>
        ${
          showSplit
            ? `<button id="split" type="button" class="secondary">${
                splitMode ? "Ẩn tách từ" : "Tách từ lấy IPA"
              }</button>`
            : ""
        }
        ${
          splitMode && tokens.length
            ? `<div id="split-panel">
                <p class="muted">Chọn từ EN để lấy IPA (vẫn một entry)</p>
                <div class="chips">
                  ${tokens
                    .map((w) => {
                      const key = w.toLowerCase();
                      const checked = selected.has(key) ? "checked" : "";
                      return `<label class="chip"><input type="checkbox" data-word="${escapeAttr(w)}" ${checked}/> ${escapeHtml(w)}</label>`;
                    })
                    .join("")}
                </div>
                <button id="apply-ipa" type="button" class="secondary" ${fetchingIpa ? "disabled" : ""}>
                  ${fetchingIpa ? "Đang lấy IPA…" : "Áp dụng IPA"}
                </button>
              </div>`
            : ""
        }
        <p id="error" class="error" ${errorText ? "" : "hidden"}>${escapeHtml(errorText)}</p>
        <button id="save" type="button">Lưu vào sổ</button>
      `;

      shadow.getElementById("close")?.addEventListener("click", hideCard);
      shadow.getElementById("toggle-dir")?.addEventListener("click", () => {
        syncFromInputs();
        direction = direction === "en-vi" ? "vi-en" : "en-vi";
        splitMode = false;
        selected = new Set();
        errorText = "";
        render();
      });
      shadow.getElementById("fetch-ipa")?.addEventListener("click", () => {
        void fetchIpa();
      });
      shadow.getElementById("split")?.addEventListener("click", () => {
        syncFromInputs();
        splitMode = !splitMode;
        if (splitMode && selected.size === 0) {
          for (const w of tokenizeForIpa(englishText())) {
            // Skip tiny function words by default? Keep all selected like GT.
            selected.add(w.toLowerCase());
          }
        }
        errorText = "";
        render();
      });
      shadow.querySelectorAll<HTMLInputElement>("input[data-word]").forEach((el) => {
        el.addEventListener("change", () => {
          const word = el.dataset.word?.toLowerCase();
          if (!word) return;
          if (el.checked) selected.add(word);
          else selected.delete(word);
        });
      });
      shadow.getElementById("apply-ipa")?.addEventListener("click", () => {
        void applySplitIpa();
      });
      shadow.getElementById("save")?.addEventListener("click", () => {
        void save();
      });
      for (const id of ["term", "translation", "ipa"] as const) {
        shadow.getElementById(id)?.addEventListener("keydown", (e) => {
          if ((e as KeyboardEvent).key === "Enter") {
            e.preventDefault();
            void save();
          }
        });
      }
    }

    async function fetchIpa() {
      syncFromInputs();
      const q = englishText().trim();
      if (!q) {
        errorText = "Nhập từ tiếng Anh để lấy IPA";
        render();
        return;
      }
      fetchingIpa = true;
      errorText = "";
      render();
      const res = await sendMessage({
        type: "LOOKUP",
        q,
        direction: "en-vi",
      });
      fetchingIpa = false;
      if (!res.ok || !("result" in res) || !res.result.ipa) {
        errorText = "Không lấy được IPA — thử tách từng từ bên dưới";
        if (canSplitEnglishPhrase(q, null)) {
          splitMode = true;
          selected = new Set(tokenizeForIpa(q).map((w) => w.toLowerCase()));
        }
        render();
        showToast("Không lấy được IPA", "warn");
        return;
      }
      const raw = res.result.ipa.replace(/^\/+|\/+$/g, "");
      ipa = `/${raw}/`;
      splitMode = false;
      errorText = "";
      render();
      showToast("Đã điền IPA", "ok");
    }

    async function applySplitIpa() {
      syncFromInputs();
      const words = tokenizeForIpa(englishText()).filter((w) =>
        selected.has(w.toLowerCase())
      );
      if (!words.length) {
        errorText = "Chọn ít nhất một từ";
        render();
        return;
      }
      fetchingIpa = true;
      errorText = "";
      render();
      const ipaByWord: Record<string, string | null> = {};
      for (const word of words) {
        const res = await sendMessage({
          type: "LOOKUP",
          q: word,
          direction: "en-vi",
        });
        ipaByWord[word.toLowerCase()] =
          res.ok && "result" in res ? res.result.ipa : null;
      }
      const joined = joinWordIpas(words, ipaByWord);
      fetchingIpa = false;
      if (!joined) {
        errorText = "Không lấy được IPA cho các từ đã chọn";
        render();
        showToast("Không lấy được IPA", "warn");
        return;
      }
      ipa = `/${joined}/`;
      splitMode = false;
      errorText = "";
      render();
      showToast("Đã điền IPA", "ok");
    }

    async function save() {
      syncFromInputs();
      const errorEl = shadow.getElementById("error") as HTMLElement;
      const saveEl = shadow.getElementById("save") as HTMLButtonElement;
      errorText = "";
      errorEl.hidden = true;
      saveEl.disabled = true;
      saveEl.textContent = "Đang lưu…";
      const res = await sendMessage({
        type: "SAVE_MANUAL",
        draft: {
          term,
          translation,
          ipa: normalizeIpa(ipa),
          direction,
        },
      });
      if (!res.ok) {
        saveEl.disabled = false;
        if (res.code === "unauthorized") {
          saveEl.textContent = "Đăng nhập để lưu";
          showToast("Cần đăng nhập Word Ledger", "warn");
          saveEl.onclick = () => {
            void sendMessage({ type: "OPEN_LOGIN" });
          };
          return;
        }
        saveEl.textContent = "Lưu vào sổ";
        errorText = res.error;
        errorEl.hidden = false;
        errorEl.textContent = res.error;
        showToast(res.error, "err");
        return;
      }
      const duplicate = "duplicate" in res && res.duplicate;
      showToast(duplicate ? "Đã có trong sổ" : "Đã lưu vào sổ", "ok");
      hideCard();
    }

    refreshTranslationFromPage();
    render();

    // Widget dịch trên SERP đôi khi render chậm hơn AI Overview.
    if (!translation) {
      let tries = 0;
      const timer = window.setInterval(() => {
        tries += 1;
        refreshTranslationFromPage();
        if (translation || tries >= 8) {
          window.clearInterval(timer);
          if (translation) {
            render();
            void fetchIpa();
          }
        }
      }, 250);
    } else {
      void fetchIpa();
    }
  }

  return {
    showSaveButton,
    hideSaveButton,
    openConfirm,
    hideCard,
    showToast,
  };
}

function ensureHost(
  id: string,
  style: Partial<CSSStyleDeclaration>
): HTMLElement {
  const existing = document.getElementById(id);
  if (existing) existing.remove();
  const host = document.createElement("div");
  host.id = id;
  Object.assign(host.style, {
    position: "fixed",
    inset: "0",
    zIndex: "2147483645",
    ...style,
  });
  document.documentElement.appendChild(host);
  return host;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttr(value: string) {
  return escapeHtml(value).replaceAll("'", "&#39;");
}

const buttonCss = `
  :host { all: initial; }
  #save-btn {
    position: fixed;
    pointer-events: auto;
    height: 34px;
    padding: 0 12px;
    border: 0;
    border-radius: 10px;
    background: #0f766e;
    color: #f0fdfa;
    font: 600 13px/1 "Be Vietnam Pro", ui-sans-serif, system-ui, sans-serif;
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.18);
    cursor: pointer;
    z-index: 2;
  }
  #save-btn[hidden] { display: none !important; }
  #save-btn:hover { background: #0d9488; }
`;

const uiCss = `
  :host { all: initial; }
  #card, #toast {
    position: fixed;
    pointer-events: auto;
    font-family: "Be Vietnam Pro", ui-sans-serif, system-ui, sans-serif;
    color: #0f172a;
  }
  #card {
    top: 72px;
    right: 16px;
    width: 300px;
    padding: 12px 14px 14px;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    background: #fff;
    box-shadow: 0 16px 40px rgba(15, 23, 42, 0.18);
    z-index: 2;
  }
  #card[hidden], #toast[hidden] { display: none !important; }
  #close {
    position: absolute;
    top: 6px;
    right: 8px;
    border: 0;
    background: transparent;
    color: #64748b;
    font-size: 18px;
    cursor: pointer;
  }
  h2 { margin: 0 18px 4px 0; font-size: 16px; }
  label {
    display: grid;
    gap: 4px;
    margin-top: 8px;
    font-size: 12px;
    font-weight: 600;
  }
  input {
    width: 100%;
    box-sizing: border-box;
    height: 32px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 0 8px;
    font: inherit;
    color: inherit;
    background: #fff;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 8px;
  }
  .muted { margin: 4px 0 0; font-size: 12px; color: #64748b; }
  .row .muted { margin: 0; }
  #toggle-dir, .secondary {
    height: 28px;
    padding: 0 8px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #fff;
    color: #0f172a;
    cursor: pointer;
    font: inherit;
  }
  #toggle-dir { margin-left: auto; }
  #fetch-ipa, #split, #apply-ipa {
    margin-top: 8px;
    width: 100%;
    height: 32px;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    border: 1px solid #e2e8f0;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 500;
  }
  .error { margin: 6px 0 0; font-size: 12px; color: #dc2626; }
  #save {
    margin-top: 10px;
    width: 100%;
    height: 34px;
    border: 0;
    border-radius: 10px;
    background: #0f766e;
    color: #f0fdfa;
    font-weight: 600;
    cursor: pointer;
  }
  #save:disabled, .secondary:disabled { opacity: 0.7; cursor: default; }
  #toast {
    left: 50%;
    bottom: 24px;
    transform: translateX(-50%);
    max-width: min(360px, calc(100vw - 32px));
    padding: 10px 14px;
    border-radius: 12px;
    background: #0f172a;
    color: #f8fafc;
    font-size: 13px;
    font-weight: 600;
    box-shadow: 0 12px 32px rgba(15, 23, 42, 0.28);
    z-index: 3;
  }
  #toast[data-kind="err"] { background: #991b1b; }
  #toast[data-kind="warn"] { background: #92400e; }
`;
