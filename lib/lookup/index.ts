import { fetchDictionary, googleTtsUrl } from "./dictionary";
import { langsFromDirection } from "./detect-lang";
import { fetchGoogleTranslate } from "./google";
import type { Direction, LookupResult } from "./types";

export async function performLookup(
  q: string,
  direction: Direction
): Promise<LookupResult> {
  const term = q.trim();
  if (!term) {
    throw new Error("Empty query");
  }

  const { sourceLang, targetLang } = langsFromDirection(direction);
  const google = await fetchGoogleTranslate(term, sourceLang, targetLang);

  let ipa: string | null = null;
  let meanings: LookupResult["meanings"] = [];
  let audioUsUrl: string | null = null;
  let audioUkUrl: string | null = null;

  if (sourceLang === "en") {
    // Same Google payload already has EN pronunciation + definitions.
    ipa = google.pronunciation;
    meanings = google.meanings;
    audioUsUrl = googleTtsUrl(term, "en-US");
    audioUkUrl = googleTtsUrl(term, "en-GB");
  } else if (targetLang === "en" && google.translation) {
    // VI→EN: pull dictionary for the English translation.
    const dict = await fetchDictionary(google.translation).catch(() => null);
    ipa = dict?.ipa ?? null;
    meanings = dict?.meanings ?? [];
    audioUsUrl = dict?.audioUsUrl ?? googleTtsUrl(google.translation, "en-US");
    audioUkUrl = dict?.audioUkUrl ?? googleTtsUrl(google.translation, "en-GB");
  }

  const primaryMeaning = meanings[0];

  return {
    term,
    sourceLang,
    targetLang,
    direction,
    translation: google.translation,
    translateProvider: "server",
    ipa,
    audioUsUrl,
    audioUkUrl,
    partOfSpeech: primaryMeaning?.partOfSpeech ?? null,
    definition: primaryMeaning?.definition ?? null,
    meanings,
  };
}

export * from "./types";
export * from "./detect-lang";
export * from "./dictionary";
export * from "./translate";
export * from "./google";
