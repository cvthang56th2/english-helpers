const MEANING_SUFFIX = "tiếng anh là gì";

type HotkeyEvent = {
  repeat?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  ctrlKey?: boolean;
  code?: string;
};

/** Cmd+Shift+F on macOS, Ctrl+Shift+F elsewhere. */
export function isEnglishSearchHotkey(event: HotkeyEvent): boolean {
  if (event.repeat || event.altKey || event.code !== "KeyF" || !event.shiftKey) {
    return false;
  }
  const meta = Boolean(event.metaKey);
  const ctrl = Boolean(event.ctrlKey);
  return (meta && !ctrl) || (ctrl && !meta);
}


export function englishMeaningQuery(keyword: string): string | null {
  const term = keyword.replace(/\s+/g, " ").trim();
  if (!term) return null;
  return `${term} ${MEANING_SUFFIX}`;
}

export function isGoogleSearchUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return /^(www\.)?google\.([a-z]{2,3})(\.[a-z]{2})?$/.test(host);
  } catch {
    return false;
  }
}

export function googleEnglishMeaningSearchUrl(keyword: string): string | null {
  const q = englishMeaningQuery(keyword);
  if (!q) return null;
  const params = new URLSearchParams({ hl: "vi", q });
  return `https://www.google.com/search?${params.toString()}`;
}
