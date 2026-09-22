import type { DictionaryMeaning, Lang } from "./types";

export type GoogleTranslatePayload = {
  translation: string;
  /** Source-language pronunciation when Google returns it (often American respelling). */
  pronunciation: string | null;
  meanings: DictionaryMeaning[];
};

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "").trim();
}

/** Join translated segments from translate_a/single `data[0]`. */
export function pickTranslation(data: unknown): string | null {
  if (!Array.isArray(data) || !Array.isArray(data[0])) return null;
  const parts: string[] = [];
  for (const row of data[0]) {
    if (Array.isArray(row) && typeof row[0] === "string" && row[0]) {
      parts.push(row[0]);
    }
  }
  const text = parts.join("").trim();
  return text || null;
}

/** Pronunciation sits on a secondary row: `[null, null, null, "həˈlō"]`. */
export function pickPronunciation(data: unknown): string | null {
  if (!Array.isArray(data) || !Array.isArray(data[0])) return null;
  for (const row of data[0]) {
    if (Array.isArray(row) && typeof row[3] === "string") {
      const p = row[3].trim();
      if (p) return p;
    }
  }
  return null;
}

/**
 * English definitions live at index 12:
 * `["exclamation", [["def", id, "example"], ...], lemma, n]`
 */
export function pickMeanings(data: unknown): DictionaryMeaning[] {
  if (!Array.isArray(data) || !Array.isArray(data[12])) return [];
  const meanings: DictionaryMeaning[] = [];

  for (const block of data[12]) {
    if (!Array.isArray(block)) continue;
    const pos = typeof block[0] === "string" ? block[0].trim() : "";
    const entries = block[1];
    if (!pos || !Array.isArray(entries)) continue;

    for (const entry of entries) {
      if (!Array.isArray(entry)) continue;
      const definition =
        typeof entry[0] === "string" ? entry[0].trim() : "";
      if (!definition) continue;
      const exampleRaw =
        typeof entry[2] === "string" ? stripTags(entry[2]) : "";
      meanings.push({
        partOfSpeech: pos,
        definition,
        example: exampleRaw || undefined,
      });
      if (meanings.length >= 4) return meanings;
    }
  }

  return meanings;
}

export function parseGoogleTranslateResponse(
  data: unknown
): GoogleTranslatePayload | null {
  const translation = pickTranslation(data);
  if (!translation) return null;
  return {
    translation,
    pronunciation: pickPronunciation(data),
    meanings: pickMeanings(data),
  };
}

export async function fetchGoogleTranslate(
  text: string,
  from: Lang,
  to: Lang,
  signal?: AbortSignal
): Promise<GoogleTranslatePayload> {
  const q = text.trim();
  if (!q) throw new Error("Empty query");

  const params = new URLSearchParams({
    client: "gtx",
    sl: from,
    tl: to,
    hl: "en",
    dt: "t",
    q,
  });
  // Extra dt flags for pronunciation + dictionary definitions
  for (const dt of ["at", "bd", "ex", "ld", "md", "qca", "rw", "rm", "ss", "tl"]) {
    params.append("dt", dt);
  }

  const url = `https://translate.googleapis.com/translate_a/single?${params.toString()}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal,
  });
  if (!res.ok) {
    throw new Error(`Google Translate error: ${res.status}`);
  }

  const data: unknown = await res.json();
  const parsed = parseGoogleTranslateResponse(data);
  if (!parsed) {
    throw new Error("Google Translate returned empty text");
  }
  return parsed;
}
