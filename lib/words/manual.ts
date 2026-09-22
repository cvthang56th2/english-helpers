import { googleTtsUrl } from "../lookup/dictionary";
import { inferDirection, langsFromDirection } from "../lookup/detect-lang";
import type { Direction, Lang } from "../lookup/types";

export { selectionToQuery } from "./selection";

export type ManualWordDraft = {
  term?: string;
  translation?: string;
  ipa?: string | null;
  direction?: Direction;
  partOfSpeech?: string | null;
  definition?: string | null;
};

export type ValidatedManualWord = {
  term: string;
  translation: string;
  ipa: string | null;
  direction: Direction;
  sourceLang: Lang;
  targetLang: Lang;
  partOfSpeech: string | null;
  definition: string | null;
};

export type ManualWordPostBody = {
  term: string;
  source_lang: Lang;
  target_lang: Lang;
  translation: string;
  ipa: string | null;
  audio_us_url: string | null;
  audio_uk_url: string | null;
  part_of_speech: string | null;
  definition: string | null;
};

export function normalizeIpa(ipa: string | null | undefined): string | null {
  if (ipa == null) return null;
  const trimmed = ipa.trim().replace(/^\/+|\/+$/g, "").trim();
  return trimmed || null;
}

function cleanText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

export function validateManualWord(
  draft: ManualWordDraft
): { ok: true; value: ValidatedManualWord } | { ok: false; error: string } {
  const term = cleanText(draft.term);
  const translation = cleanText(draft.translation);
  if (!term) return { ok: false, error: "Nhập từ cần lưu" };
  if (!translation) return { ok: false, error: "Nhập nghĩa hoặc bản dịch" };

  const direction = draft.direction ?? inferDirection(term);
  const { sourceLang, targetLang } = langsFromDirection(direction);

  return {
    ok: true,
    value: {
      term,
      translation,
      ipa: normalizeIpa(draft.ipa),
      direction,
      sourceLang,
      targetLang,
      partOfSpeech: cleanText(draft.partOfSpeech) || null,
      definition: cleanText(draft.definition) || null,
    },
  };
}

export function buildManualWordBody(
  word: ValidatedManualWord
): ManualWordPostBody {
  const english =
    word.sourceLang === "en"
      ? word.term
      : word.targetLang === "en"
        ? word.translation
        : null;

  return {
    term: word.term,
    source_lang: word.sourceLang,
    target_lang: word.targetLang,
    translation: word.translation,
    ipa: word.ipa,
    audio_us_url: english ? googleTtsUrl(english, "en-US") : null,
    audio_uk_url: english ? googleTtsUrl(english, "en-GB") : null,
    part_of_speech: word.partOfSpeech,
    definition: word.definition,
  };
}
