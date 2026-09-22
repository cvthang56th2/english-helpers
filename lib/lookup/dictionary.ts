import { fetchGoogleTranslate } from "./google";
import type { DictionaryMeaning, DictionaryResult } from "./types";

/** Google Translate TTS — US / UK pronunciation audio. */
export function googleTtsUrl(word: string, locale: "en-US" | "en-GB" = "en-US"): string {
  const tl = locale === "en-GB" ? "en-GB" : "en";
  const params = new URLSearchParams({
    ie: "UTF-8",
    client: "tw-ob",
    tl,
    q: word.trim(),
  });
  return `https://translate.google.com/translate_tts?${params.toString()}`;
}

export function buildDictionaryResult(
  word: string,
  pronunciation: string | null,
  meanings: DictionaryMeaning[]
): DictionaryResult {
  const lemma = word.trim() || word;
  return {
    word: lemma,
    ipa: pronunciation,
    audioUsUrl: googleTtsUrl(lemma, "en-US"),
    audioUkUrl: googleTtsUrl(lemma, "en-GB"),
    meanings,
  };
}

/**
 * English dictionary + pronunciation via Google Translate's dictionary payload.
 * `tl` only needs to be a real language code; meanings/pron come from the English side.
 */
export async function fetchDictionary(
  word: string
): Promise<DictionaryResult | null> {
  // Google often omits pronunciation for capitalized lemmas ("Pretty" vs "pretty").
  const q = word.trim().toLowerCase();
  if (!q) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const payload = await fetchGoogleTranslate(q, "en", "vi", controller.signal);
    return buildDictionaryResult(q, payload.pronunciation, payload.meanings);
  } catch {
    // TTS-only fallback so "đọc từ" still works
    return buildDictionaryResult(q, null, []);
  } finally {
    clearTimeout(timer);
  }
}
