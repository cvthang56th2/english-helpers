import { inferDirection } from "../../lib/lookup/detect-lang";
import type { LookupResult } from "../../lib/lookup/types";
import { selectionToQuery } from "../../lib/words/selection";
import { getAppUrl } from "../lib/app-url";
import { sendMessage, type PageMessage } from "../lib/messages";

export default defineContentScript({
  matches: ["http://*/*", "https://*/*"],
  excludeMatches: [
    "*://translate.google.com/*",
    "*://translate.google.com.vn/*",
    "*://translate.google.co.uk/*",
  ],
  cssInjectionMode: "manual",
  main() {
    if (location.origin === getAppUrl()) return;
    if (location.hostname.startsWith("translate.google.")) return;
    const ui = mountOverlay();
    let syncTimer = 0;

    function syncSelectionIcons() {
      if (ui.isCardOpen()) return;
      const sel = window.getSelection();
      const q = selectionToQuery(sel?.toString() ?? "");
      if (!q || !sel || sel.rangeCount === 0 || sel.isCollapsed) {
        ui.hideIcon();
        return;
      }
      const rect = selectionAnchorRect(sel);
      if (!rect) {
        ui.hideIcon();
        return;
      }
      ui.showIcon(rect, q);
    }

    function scheduleSync() {
      window.clearTimeout(syncTimer);
      syncTimer = window.setTimeout(syncSelectionIcons, 0);
    }

    document.addEventListener("mouseup", scheduleSync);
    document.addEventListener("keyup", scheduleSync);
    document.addEventListener("selectionchange", scheduleSync);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") ui.hideAll();
    });

    document.addEventListener(
      "pointerdown",
      (e) => {
        if (!ui.isOpen()) return;
        if (ui.containsEvent(e)) return;
        ui.hideAll();
        window.getSelection()?.removeAllRanges();
      },
      true
    );

    window.addEventListener(
      "scroll",
      () => {
        if (ui.isCardOpen()) return;
        syncSelectionIcons();
      },
      true
    );

    browser.runtime.onMessage.addListener((message: PageMessage) => {
      if (message.type !== "LOOKUP_IN_PAGE" && message.type !== "ADD_IN_PAGE") {
        return;
      }
      const sel = window.getSelection();
      const rect =
        sel && sel.rangeCount > 0
          ? selectionAnchorRect(sel) ?? {
              top: 80,
              left: 80,
              width: 0,
              height: 0,
              bottom: 80,
              right: 80,
            }
          : { top: 80, left: 80, width: 0, height: 0, bottom: 80, right: 80 };
      if (message.type === "ADD_IN_PAGE") {
        ui.addWord(message.q, rect);
        return;
      }
      void ui.lookup(message.q, rect);
    });
  },
});

/** Place toolbar at the end of the highlighted text (last visible client rect). */
function selectionAnchorRect(sel: Selection): DOMRect | null {
  try {
    const range = sel.getRangeAt(0);
    const rects = range.getClientRects();
    for (let i = rects.length - 1; i >= 0; i--) {
      const r = rects[i];
      if (r.width > 0 || r.height > 0) return r;
    }
    const fallback = range.getBoundingClientRect();
    if (fallback.width === 0 && fallback.height === 0) return null;
    return fallback;
  } catch {
    return null;
  }
}

function mountOverlay() {
  const host = document.createElement("div");
  host.id = "word-ledger-root";
  Object.assign(host.style, {
    position: "fixed",
    inset: "0",
    zIndex: "2147483647",
    pointerEvents: "none",
  });
  const shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = `
    <style>${overlayCss}</style>
    <div id="icons" hidden>
      <button id="icon-lookup" type="button" title="Tra Word Ledger" aria-label="Tra Word Ledger">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="7"/>
          <path d="M20 20L16.5 16.5"/>
        </svg>
      </button>
      <button id="icon-add" type="button" title="Thêm từ mới" aria-label="Thêm từ mới">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 5v14M5 12h14"/>
        </svg>
      </button>
    </div>
    <article id="card" hidden>
      <button id="close" type="button" aria-label="Đóng">×</button>
      <p id="status"></p>
      <div id="body"></div>
    </article>
  `;
  document.documentElement.appendChild(host);

  const icons = shadow.getElementById("icons") as HTMLElement;
  const iconLookup = shadow.getElementById("icon-lookup") as HTMLButtonElement;
  const iconAdd = shadow.getElementById("icon-add") as HTMLButtonElement;
  const card = shadow.getElementById("card") as HTMLElement;
  const status = shadow.getElementById("status") as HTMLElement;
  const body = shadow.getElementById("body") as HTMLElement;
  const close = shadow.getElementById("close") as HTMLButtonElement;

  let pendingQuery = "";

  iconLookup.addEventListener("mousedown", (e) => e.preventDefault());
  iconAdd.addEventListener("mousedown", (e) => e.preventDefault());
  iconLookup.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = icons.getBoundingClientRect();
    void lookup(pendingQuery, rect);
  });
  iconAdd.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = icons.getBoundingClientRect();
    addWord(pendingQuery, rect);
  });
  close.addEventListener("click", () => hideAll());

  function place(
    el: HTMLElement,
    rect: {
      top: number;
      left: number;
      width: number;
      height: number;
      bottom?: number;
      right?: number;
    },
    size: { width: number; height: number }
  ) {
    const gap = 6;
    const preferTop = (rect.top ?? 0) - size.height - gap;
    const preferBottom = (rect.bottom ?? rect.top + rect.height) + gap;
    const top =
      preferTop >= 8
        ? preferTop
        : Math.min(window.innerHeight - size.height - 8, Math.max(8, preferBottom));
    const anchorX = rect.right ?? rect.left + rect.width;
    const left = Math.min(
      window.innerWidth - size.width - 8,
      Math.max(8, anchorX - size.width)
    );
    el.style.top = `${top}px`;
    el.style.left = `${left}px`;
  }

  function showIcon(rect: DOMRect, q: string) {
    pendingQuery = q;
    icons.hidden = false;
    place(icons, rect, { width: 72, height: 32 });
  }

  function hideIcon() {
    icons.hidden = true;
  }

  function isCardOpen() {
    return !card.hidden;
  }

  function isOpen() {
    return !icons.hidden || !card.hidden;
  }

  function containsEvent(e: Event) {
    const path = e.composedPath();
    return path.includes(icons) || path.includes(card);
  }

  function hideAll() {
    icons.hidden = true;
    card.hidden = true;
    body.innerHTML = "";
    status.textContent = "";
  }

  function showCard(
    rect: { top: number; left: number; width: number; height: number; bottom?: number; right?: number }
  ) {
    hideIcon();
    card.hidden = false;
    place(card, rect, { width: 280, height: 220 });
  }

  async function lookup(
    q: string,
    rect: { top: number; left: number; width: number; height: number; bottom?: number }
  ) {
    hideIcon();
    showCard(rect);
    status.textContent = "Đang tra…";
    body.innerHTML = "";
    const res = await sendMessage({
      type: "LOOKUP",
      q,
      direction: inferDirection(q),
    });
    if (!res.ok || !("result" in res)) {
      status.textContent = res.ok ? "Không tra được từ" : res.error;
      return;
    }
    renderResult(res.result);
  }

  function renderResult(result: LookupResult) {
    status.textContent = "";
    const ipa = result.ipa
      ? `<p class="ipa">/${result.ipa.replace(/^\/|\/$/g, "")}/</p>`
      : `<p class="muted">Chưa có IPA</p>`;
    body.innerHTML = `
      <h2>${escapeHtml(result.term)}</h2>
      ${ipa}
      <p class="meaning">${escapeHtml(result.translation)}</p>
      <p class="dir">${result.direction === "en-vi" ? "EN → VI" : "VI → EN"}</p>
      <button id="save" type="button">Lưu vào sổ</button>
    `;
    const save = shadow.getElementById("save") as HTMLButtonElement;
    save.addEventListener("click", async () => {
      save.disabled = true;
      save.textContent = "Đang lưu…";
      const res = await sendMessage({ type: "SAVE_LOOKUP", result });
      if (!res.ok) {
        save.disabled = false;
        save.textContent = res.code === "unauthorized" ? "Đăng nhập để lưu" : res.error;
        if (res.code === "unauthorized") {
          save.disabled = false;
          save.addEventListener(
            "click",
            () => {
              void sendMessage({ type: "OPEN_LOGIN" });
            },
            { once: true }
          );
        }
        return;
      }
      save.textContent = "duplicate" in res && res.duplicate ? "Đã có trong sổ" : "Đã lưu";
    });
  }

  function addWord(
    q: string,
    rect: { top: number; left: number; width: number; height: number; bottom?: number }
  ) {
    pendingQuery = q;
    showCard(rect);
    status.textContent = "";
    let direction = inferDirection(q);
    body.innerHTML = `
      <h2>Thêm từ mới</h2>
      <label>Từ
        <input id="add-term" value="${escapeHtml(q)}" />
      </label>
      <label>Nghĩa
        <input id="add-translation" placeholder="${direction === "en-vi" ? "bản dịch tiếng Việt" : "English meaning"}" />
      </label>
      <label>IPA
        <input id="add-ipa" placeholder="/kæt/" />
      </label>
      <div class="row">
        <span id="add-dir" class="muted">${direction === "en-vi" ? "EN → VI" : "VI → EN"}</span>
        <button id="toggle-dir" type="button">Đổi hướng</button>
      </div>
      <p id="add-error" class="error" hidden></p>
      <button id="save" type="button">Lưu vào sổ</button>
    `;
    const termInput = shadow.getElementById("add-term") as HTMLInputElement;
    const translationInput = shadow.getElementById("add-translation") as HTMLInputElement;
    const ipaInput = shadow.getElementById("add-ipa") as HTMLInputElement;
    const dirLabel = shadow.getElementById("add-dir") as HTMLElement;
    const toggleDir = shadow.getElementById("toggle-dir") as HTMLButtonElement;
    const errorEl = shadow.getElementById("add-error") as HTMLElement;
    const save = shadow.getElementById("save") as HTMLButtonElement;

    toggleDir.addEventListener("click", () => {
      direction = direction === "en-vi" ? "vi-en" : "en-vi";
      dirLabel.textContent = direction === "en-vi" ? "EN → VI" : "VI → EN";
      translationInput.placeholder =
        direction === "en-vi" ? "bản dịch tiếng Việt" : "English meaning";
    });

    let loginOnly = false;
    async function saveManual() {
      if (loginOnly) {
        void sendMessage({ type: "OPEN_LOGIN" });
        return;
      }
      const term = termInput.value.trim();
      const translation = translationInput.value.trim();
      if (!term || !translation) {
        errorEl.hidden = false;
        errorEl.textContent = !term ? "Nhập từ cần lưu" : "Nhập nghĩa hoặc bản dịch";
        return;
      }
      errorEl.hidden = true;
      save.disabled = true;
      save.textContent = "Đang lưu…";
      const res = await sendMessage({
        type: "SAVE_MANUAL",
        draft: {
          term,
          translation,
          ipa: ipaInput.value,
          direction,
        },
      });
      if (!res.ok) {
        save.disabled = false;
        if (res.code === "unauthorized") {
          loginOnly = true;
          save.textContent = "Đăng nhập để lưu";
          return;
        }
        save.textContent = res.error;
        return;
      }
      save.textContent = "duplicate" in res && res.duplicate ? "Đã có trong sổ" : "Đã lưu";
    }

    save.addEventListener("click", () => void saveManual());
    for (const input of [termInput, translationInput, ipaInput]) {
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          void saveManual();
        }
      });
    }

    translationInput.focus();
  }

  return { showIcon, hideIcon, hideAll, isCardOpen, isOpen, containsEvent, lookup, addWord };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const overlayCss = `
  :host { all: initial; }
  #icons, #card {
    position: fixed;
    pointer-events: auto;
    font-family: "Be Vietnam Pro", ui-sans-serif, system-ui, sans-serif;
  }
  #icons {
    display: flex;
    gap: 6px;
  }
  #icon-lookup, #icon-add {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    background: #fff;
    color: #0f766e;
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.16);
    cursor: pointer;
  }
  #icon-lookup:hover, #icon-add:hover {
    background: #f0fdfa;
  }
  #icons[hidden], #card[hidden] { display: none !important; }
  #card {
    width: 280px;
    padding: 12px 14px 14px;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    background: #fff;
    color: #0f172a;
    box-shadow: 0 16px 40px rgba(15, 23, 42, 0.18);
  }
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
  h2 { margin: 0 18px 0 0; font-size: 18px; }
  .ipa { margin: 4px 0 0; color: #0f766e; font-family: "Noto Serif", Georgia, serif; }
  .meaning { margin: 8px 0 0; font-size: 15px; }
  .dir, .muted, #status { margin: 6px 0 0; font-size: 12px; color: #64748b; }
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
  .row .muted { margin: 0; }
  #toggle-dir {
    margin-left: auto;
    height: 28px;
    padding: 0 8px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #fff;
    color: #0f172a;
    cursor: pointer;
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
  #save:disabled { opacity: 0.7; cursor: default; }
`;
