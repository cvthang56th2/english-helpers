import { inferDirection } from "../../lib/lookup/detect-lang";
import type { LookupResult } from "../../lib/lookup/types";
import { selectionToQuery } from "../../lib/words/selection";
import { getAppUrl } from "../lib/app-url";
import { sendMessage, type PageLookupMessage } from "../lib/messages";

export default defineContentScript({
  matches: ["http://*/*", "https://*/*"],
  cssInjectionMode: "manual",
  main() {
    if (location.origin === getAppUrl()) return;
    const ui = mountOverlay();

    document.addEventListener("mouseup", () => {
      window.setTimeout(() => {
        const q = selectionToQuery(window.getSelection()?.toString() ?? "");
        if (!q) {
          ui.hideIcon();
          return;
        }
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;
        const rect = sel.getRangeAt(0).getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return;
        ui.showIcon(rect, q);
      }, 10);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") ui.hideAll();
    });

    window.addEventListener("scroll", () => ui.hideIcon(), true);

    browser.runtime.onMessage.addListener((message: PageLookupMessage) => {
      if (message.type !== "LOOKUP_IN_PAGE") return;
      const sel = window.getSelection();
      const rect =
        sel && sel.rangeCount > 0
          ? sel.getRangeAt(0).getBoundingClientRect()
          : { top: 80, left: 80, width: 0, height: 0, bottom: 80, right: 80 };
      void ui.lookup(message.q, rect);
    });
  },
});

function mountOverlay() {
  const host = document.createElement("div");
  host.id = "word-ledger-root";
  host.style.zIndex = "2147483647";
  const shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = `
    <style>${overlayCss}</style>
    <button id="icon" hidden title="Tra Word Ledger" aria-label="Tra Word Ledger">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="7"/>
        <path d="M20 20L16.5 16.5"/>
      </svg>
    </button>
    <article id="card" hidden>
      <button id="close" type="button" aria-label="Đóng">×</button>
      <p id="status"></p>
      <div id="body"></div>
    </article>
  `;
  document.documentElement.appendChild(host);

  const icon = shadow.getElementById("icon") as HTMLButtonElement;
  const card = shadow.getElementById("card") as HTMLElement;
  const status = shadow.getElementById("status") as HTMLElement;
  const body = shadow.getElementById("body") as HTMLElement;
  const close = shadow.getElementById("close") as HTMLButtonElement;

  let pendingQuery = "";

  icon.addEventListener("mousedown", (e) => e.preventDefault());
  icon.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = icon.getBoundingClientRect();
    void lookup(pendingQuery, rect);
  });
  close.addEventListener("click", () => hideAll());

  function place(el: HTMLElement, rect: { top: number; left: number; width: number; height: number; bottom?: number; right?: number }) {
    const top = Math.min(window.innerHeight - 12, Math.max(8, (rect.bottom ?? rect.top + rect.height) + 8));
    const left = Math.min(window.innerWidth - 280, Math.max(8, rect.left));
    el.style.top = `${top}px`;
    el.style.left = `${left}px`;
  }

  function showIcon(rect: DOMRect, q: string) {
    pendingQuery = q;
    icon.hidden = false;
    place(icon, rect);
  }

  function hideIcon() {
    icon.hidden = true;
  }

  function hideAll() {
    icon.hidden = true;
    card.hidden = true;
    body.innerHTML = "";
    status.textContent = "";
  }

  async function lookup(
    q: string,
    rect: { top: number; left: number; width: number; height: number; bottom?: number }
  ) {
    hideIcon();
    card.hidden = false;
    place(card, rect);
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
      save.textContent = res.duplicate ? "Đã có trong sổ" : "Đã lưu";
    });
  }

  return { showIcon, hideIcon, hideAll, lookup };
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
  #icon, #card {
    position: fixed;
    font-family: "Be Vietnam Pro", ui-sans-serif, system-ui, sans-serif;
  }
  #icon {
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
  #icon[hidden], #card[hidden] { display: none !important; }
  #card {
    width: 260px;
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
