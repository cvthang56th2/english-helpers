import { inferDirection } from "../../lib/lookup/detect-lang";
import type { Direction, LookupResult, WordRecord } from "../../lib/lookup/types";
import {
  buildManualWordBody,
  validateManualWord,
  type ManualWordDraft,
} from "../../lib/words/manual";
import { selectionToQuery } from "../../lib/words/selection";
import { getAppUrl } from "../lib/app-url";
import {
  googleEnglishMeaningSearchUrl,
  isGoogleSearchUrl,
} from "../lib/google-search/keyword-search";
import type { ExtensionRequest, ExtensionResponse } from "../lib/messages";

const KEYWORD_PROMPT_PATH = "/keyword-search.html";
const KEYWORD_PROMPT_SIZE = { width: 420, height: 280 };

let keywordPromptWindowId: number | undefined;
let keywordPromptOpenerId: number | undefined;

export default defineBackground(() => {
  void ensureContextMenu();

  browser.runtime.onInstalled.addListener(() => {
    void ensureContextMenu();
  });

  browser.commands.onCommand.addListener((command) => {
    if (command === "search-english-meaning") {
      void openKeywordPrompt();
    }
  });

  browser.windows.onRemoved.addListener((windowId) => {
    if (windowId === keywordPromptWindowId) keywordPromptWindowId = undefined;
  });

  browser.contextMenus.onClicked.addListener((info, tab) => {
    if (!tab?.id) return;
    const q = selectionToQuery(String(info.selectionText ?? ""));
    if (!q) return;
    const type =
      info.menuItemId === "word-ledger-lookup"
        ? "LOOKUP_IN_PAGE"
        : info.menuItemId === "word-ledger-add"
          ? "ADD_IN_PAGE"
          : null;
    if (!type) return;
    void browser.tabs.sendMessage(tab.id, { type, q }).catch(() => {});
  });

  browser.runtime.onMessage.addListener(
    (message: ExtensionRequest, _sender, sendResponse) => {
      void handleMessage(message)
        .then(sendResponse)
        .catch((err: unknown) => {
          sendResponse({
            ok: false,
            error: err instanceof Error ? err.message : "Lỗi extension",
          } satisfies ExtensionResponse);
        });
      return true;
    }
  );
});

async function ensureContextMenu() {
  await browser.contextMenus.removeAll();
  browser.contextMenus.create({
    id: "word-ledger",
    title: "Word Ledger",
    contexts: ["selection"],
  });
  browser.contextMenus.create({
    id: "word-ledger-lookup",
    parentId: "word-ledger",
    title: "Tra từ",
    contexts: ["selection"],
  });
  browser.contextMenus.create({
    id: "word-ledger-add",
    parentId: "word-ledger",
    title: "Thêm từ mới",
    contexts: ["selection"],
  });
}

async function handleMessage(
  message: ExtensionRequest
): Promise<ExtensionResponse> {
  switch (message.type) {
    case "GET_SESSION":
      return getSession();
    case "LOOKUP":
      return lookup(message.q, message.direction);
    case "SAVE_LOOKUP":
      return saveLookup(message.result);
    case "SAVE_MANUAL":
      return saveManual(message.draft);
    case "LIST_WORDS":
      return listWords(message.q);
    case "OPEN_LOGIN":
      await browser.tabs.create({ url: `${getAppUrl()}/login` });
      return { ok: true };
    case "OPEN_APP":
      await browser.tabs.create({ url: `${getAppUrl()}/` });
      return { ok: true };
    case "OPEN_SIDE_PANEL": {
      const win = await browser.windows.getCurrent();
      if (win.id != null) {
        await browser.sidePanel.open({ windowId: win.id });
      }
      return { ok: true };
    }
    case "SEARCH_ENGLISH_MEANING":
      return searchEnglishMeaning(message.keyword);
    case "OPEN_KEYWORD_PROMPT":
      await openKeywordPrompt();
      return { ok: true };
  }
}

let openingKeywordPrompt: Promise<void> | null = null;

function openKeywordPrompt() {
  if (!openingKeywordPrompt) {
    openingKeywordPrompt = createKeywordPrompt().finally(() => {
      openingKeywordPrompt = null;
    });
  }
  return openingKeywordPrompt;
}

async function createKeywordPrompt() {
  if (keywordPromptWindowId != null) {
    try {
      await browser.windows.update(keywordPromptWindowId, { focused: true });
      return;
    } catch {
      keywordPromptWindowId = undefined;
    }
  }

  let opener: Browser.windows.Window | undefined;
  try {
    opener = await browser.windows.getLastFocused({ windowTypes: ["normal"] });
  } catch {
    opener = undefined;
  }
  keywordPromptOpenerId = opener?.id;
  const created = await browser.windows.create({
    url: browser.runtime.getURL(KEYWORD_PROMPT_PATH),
    type: "popup",
    focused: true,
    ...(opener ? popupBounds(opener) : KEYWORD_PROMPT_SIZE),
  });
  keywordPromptWindowId = created?.id;
}

function popupBounds(win: Browser.windows.Window) {
  const { width, height } = KEYWORD_PROMPT_SIZE;
  return {
    width,
    height,
    left: Math.max(
      0,
      Math.round((win.left ?? 0) + ((win.width ?? 800) - width) / 2)
    ),
    top: Math.max(
      0,
      Math.round((win.top ?? 0) + Math.max(48, ((win.height ?? 640) - height) / 4))
    ),
  };
}

async function searchEnglishMeaning(keyword: string): Promise<ExtensionResponse> {
  const url = googleEnglishMeaningSearchUrl(keyword);
  if (!url) return { ok: false, error: "Nhập một từ khóa" };

  const windowId = keywordPromptOpenerId;
  if (windowId != null) {
    try {
      await browser.windows.update(windowId, { focused: true });
      await openMeaningSearch(url, windowId);
      return { ok: true };
    } catch {
      keywordPromptOpenerId = undefined;
    }
  }

  await openMeaningSearch(url);
  return { ok: true };
}

async function openMeaningSearch(url: string, windowId?: number) {
  const [tab] = await browser.tabs.query({
    active: true,
    ...(windowId != null ? { windowId } : {}),
  });
  if (tab?.id != null && isGoogleSearchUrl(tab.url)) {
    await browser.tabs.update(tab.id, { url, active: true });
    return;
  }
  await browser.tabs.create({
    url,
    active: true,
    ...(windowId != null ? { windowId } : {}),
  });
}

async function authedFetch(path: string, init: RequestInit = {}) {
  const url = `${getAppUrl()}${path}`;
  const cookies = await browser.cookies.getAll({ url: getAppUrl() });
  const cookie = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
  const headers = new Headers(init.headers);
  if (cookie) headers.set("Cookie", cookie);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(url, { ...init, headers, credentials: "include" });
}

async function readJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { error: text.slice(0, 120) || `HTTP ${res.status}` };
  }
}

function unauthorized(): ExtensionResponse {
  return {
    ok: false,
    error: "Hãy đăng nhập Word Ledger trên trình duyệt",
    code: "unauthorized",
  };
}

async function getSession(): Promise<ExtensionResponse> {
  const res = await authedFetch("/api/me");
  if (res.status === 401) return { ok: true, user: null };
  const data = await readJson(res);
  if (!res.ok) {
    return { ok: false, error: String(data.error || "Không kiểm tra được phiên") };
  }
  return {
    ok: true,
    user: (data.user as { id: string; email?: string | null }) ?? null,
  };
}

async function lookup(
  q: string,
  direction?: Direction
): Promise<ExtensionResponse> {
  const term = selectionToQuery(q) ?? q.trim();
  if (!term) return { ok: false, error: "Chọn một từ để tra" };
  const dir = direction ?? inferDirection(term);
  const res = await fetch(`${getAppUrl()}/api/lookup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q: term, direction: dir }),
  });
  const data = await readJson(res);
  if (!res.ok) {
    return { ok: false, error: String(data.error || "Không tra được từ") };
  }
  return { ok: true, result: data as unknown as LookupResult };
}

async function saveLookup(result: LookupResult): Promise<ExtensionResponse> {
  return postWord({
    term: result.term,
    source_lang: result.sourceLang,
    target_lang: result.targetLang,
    translation: result.translation,
    ipa: result.ipa,
    audio_us_url: result.audioUsUrl,
    audio_uk_url: result.audioUkUrl,
    part_of_speech: result.partOfSpeech,
    definition: result.definition,
  });
}

async function saveManual(draft: ManualWordDraft): Promise<ExtensionResponse> {
  const parsed = validateManualWord(draft);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  return postWord(buildManualWordBody(parsed.value));
}

async function postWord(body: unknown): Promise<ExtensionResponse> {
  const res = await authedFetch("/api/words", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (res.status === 401) return unauthorized();
  const data = await readJson(res);
  if (res.status === 409) {
    return {
      ok: true,
      duplicate: true,
    };
  }
  if (!res.ok) {
    return { ok: false, error: String(data.error || "Không lưu được") };
  }
  return { ok: true, word: data.word as WordRecord };
}

async function listWords(q?: string): Promise<ExtensionResponse> {
  const params = new URLSearchParams();
  if (q?.trim()) params.set("q", q.trim());
  const res = await authedFetch(`/api/words?${params.toString()}`);
  if (res.status === 401) return unauthorized();
  const data = await readJson(res);
  if (!res.ok) {
    return { ok: false, error: String(data.error || "Không tải được sổ") };
  }
  return { ok: true, words: (data.words as WordRecord[]) ?? [] };
}
