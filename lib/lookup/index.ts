import { fetchDictionary } from "./dictionary";
import { langsFromDirection } from "./detect-lang";
import { translateServer } from "./translate";
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

  const englishWord = sourceLang === "en" ? term : null;

  const [translationResult, dictForSource] = await Promise.all([
    translateServer(term, sourceLang, targetLang),
    englishWord ? fetchDictionary(englishWord).catch(() => null) : Promise.resolve(null),
  ]);

  // For VI→EN, pull IPA/audio for the English translation
  let dict = dictForSource;
  if (!dict && targetLang === "en" && translationResult.text) {
    dict = await fetchDictionary(translationResult.text).catch(() => null);
  }

  const primaryMeaning = dict?.meanings[0];

  return {
    term,
    sourceLang,
    targetLang,
    direction,
    translation: translationResult.text,
    translateProvider: translationResult.provider === "google" ? "server" : "mymemory",
    ipa: dict?.ipa ?? null,
    audioUsUrl: dict?.audioUsUrl ?? null,
    audioUkUrl: dict?.audioUkUrl ?? null,
    partOfSpeech: primaryMeaning?.partOfSpeech ?? null,
    definition: primaryMeaning?.definition ?? null,
    meanings: dict?.meanings ?? [],
  };
}

export * from "./types";
export * from "./detect-lang";
export * from "./dictionary";
export * from "./translate";
