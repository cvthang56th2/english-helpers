export type Lang = "en" | "vi";
export type Direction = "en-vi" | "vi-en";

export type DictionaryMeaning = {
  partOfSpeech: string;
  definition: string;
  example?: string;
};

export type DictionaryResult = {
  word: string;
  ipa: string | null;
  audioUsUrl: string | null;
  audioUkUrl: string | null;
  meanings: DictionaryMeaning[];
};

export type TranslateResult = {
  text: string;
  provider: "google" | "mymemory";
};

export type LookupResult = {
  term: string;
  sourceLang: Lang;
  targetLang: Lang;
  direction: Direction;
  translation: string;
  translateProvider: "google" | "mymemory" | "server";
  ipa: string | null;
  audioUsUrl: string | null;
  audioUkUrl: string | null;
  partOfSpeech: string | null;
  definition: string | null;
  meanings: DictionaryMeaning[];
};

export type WordRecord = {
  id: string;
  user_id: string;
  term: string;
  source_lang: Lang;
  target_lang: Lang;
  translation: string;
  ipa: string | null;
  audio_us_url: string | null;
  audio_uk_url: string | null;
  part_of_speech: string | null;
  definition: string | null;
  created_at: string;
  updated_at: string;
};
