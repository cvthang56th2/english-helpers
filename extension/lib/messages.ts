import type { Direction, LookupResult, WordRecord } from "../../lib/lookup/types";
import type { ManualWordDraft } from "../../lib/words/manual";

export type AuthedUser = {
  id: string;
  email?: string | null;
  name?: string | null;
};

export type ExtensionRequest =
  | { type: "GET_SESSION" }
  | { type: "LOOKUP"; q: string; direction?: Direction }
  | { type: "SAVE_LOOKUP"; result: LookupResult }
  | { type: "SAVE_MANUAL"; draft: ManualWordDraft }
  | { type: "LIST_WORDS"; q?: string }
  | { type: "OPEN_LOGIN" }
  | { type: "OPEN_APP" }
  | { type: "OPEN_SIDE_PANEL" };

export type ExtensionResponse =
  | { ok: true; user: AuthedUser | null }
  | { ok: true; result: LookupResult }
  | { ok: true; word?: WordRecord; duplicate?: boolean }
  | { ok: true; words: WordRecord[] }
  | { ok: true }
  | { ok: false; error: string; code?: "unauthorized" };

export type PageLookupMessage = {
  type: "LOOKUP_IN_PAGE";
  q: string;
};

export type PageAddMessage = {
  type: "ADD_IN_PAGE";
  q: string;
};

export type PageMessage = PageLookupMessage | PageAddMessage;

export function sendMessage<T extends ExtensionResponse>(
  message: ExtensionRequest
): Promise<T> {
  return browser.runtime.sendMessage(message) as Promise<T>;
}
