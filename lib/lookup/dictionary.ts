import type { DictionaryMeaning, DictionaryResult } from "./types";

type RawPhonetic = {
  text?: string;
  audio?: string;
};

type RawDefinition = {
  definition?: string;
  example?: string;
};

type RawMeaning = {
  partOfSpeech?: string;
  definitions?: RawDefinition[];
};

type RawEntry = {
  word?: string;
  phonetic?: string;
  phonetics?: RawPhonetic[];
  meanings?: RawMeaning[];
};

const DICT_UA = "WordLedger/1.0 (personal vocab notebook)";

export function normalizeAudioUrl(url: string | undefined | null): string | null {
  if (!url || !url.trim()) return null;
  const trimmed = url.trim();
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

/** Google Translate TTS — works for any English word when dictionary audio is missing. */
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

/**
 * Candidate lemma forms for dictionary lookup.
 * e.g. mopping → mopping, moppe, mop; running → running, runne, run
 */
export function dictionaryCandidates(word: string): string[] {
  const q = word.trim().toLowerCase();
  if (!q) return [];
  const out: string[] = [q];
  const add = (w: string) => {
    if (w && w.length >= 2 && !out.includes(w)) out.push(w);
  };

  if (q.endsWith("ies") && q.length > 4) {
    add(q.slice(0, -3) + "y");
  }
  if (q.endsWith("ves") && q.length > 4) {
    add(q.slice(0, -3) + "f");
    add(q.slice(0, -3) + "fe");
  }
  if (q.endsWith("ing") && q.length > 5) {
    const stem = q.slice(0, -3);
    add(stem);
    add(stem + "e");
    // mopping → mop (double consonant)
    if (stem.length >= 2 && stem.at(-1) === stem.at(-2)) {
      add(stem.slice(0, -1));
    }
  }
  if (q.endsWith("ed") && q.length > 4) {
    const stem = q.slice(0, -2);
    add(stem);
    add(stem + "e");
    if (stem.length >= 2 && stem.at(-1) === stem.at(-2)) {
      add(stem.slice(0, -1));
    }
  }
  if (q.endsWith("es") && q.length > 4) {
    add(q.slice(0, -2));
    add(q.slice(0, -1));
  } else if (q.endsWith("s") && !q.endsWith("ss") && q.length > 3) {
    add(q.slice(0, -1));
  }

  return out;
}

function pickIpa(entry: RawEntry): string | null {
  if (entry.phonetic?.trim()) return entry.phonetic.trim();
  for (const p of entry.phonetics ?? []) {
    if (p.text?.trim()) return p.text.trim();
  }
  return null;
}

function pickAudios(entry: RawEntry): {
  audioUsUrl: string | null;
  audioUkUrl: string | null;
} {
  let audioUsUrl: string | null = null;
  let audioUkUrl: string | null = null;
  let fallback: string | null = null;

  for (const p of entry.phonetics ?? []) {
    const url = normalizeAudioUrl(p.audio);
    if (!url) continue;
    const lower = url.toLowerCase();
    if (
      !audioUsUrl &&
      (lower.includes("_us_") || lower.includes("-us.") || lower.includes("-au."))
    ) {
      audioUsUrl = url;
    } else if (
      !audioUkUrl &&
      (lower.includes("_gb_") ||
        lower.includes("-uk.") ||
        lower.includes("_uk_") ||
        lower.includes("-gb."))
    ) {
      audioUkUrl = url;
    } else if (!fallback) {
      fallback = url;
    }
  }

  if (!audioUsUrl) audioUsUrl = fallback;
  return { audioUsUrl, audioUkUrl };
}

export function parseDictionaryEntries(
  data: unknown,
  fallbackWord: string
): DictionaryResult | null {
  if (!Array.isArray(data) || data.length === 0) return null;
  const entry = data[0] as RawEntry;
  if (!entry || typeof entry !== "object") return null;

  const meanings: DictionaryMeaning[] = [];
  for (const meaning of entry.meanings ?? []) {
    const pos = meaning.partOfSpeech?.trim() || "unknown";
    for (const def of meaning.definitions ?? []) {
      const definition = def.definition?.trim();
      if (!definition) continue;
      meanings.push({
        partOfSpeech: pos,
        definition,
        example: def.example?.trim() || undefined,
      });
      if (meanings.length >= 4) break;
    }
    if (meanings.length >= 4) break;
  }

  const { audioUsUrl, audioUkUrl } = pickAudios(entry);
  const lemma = entry.word?.trim() || fallbackWord;

  return {
    word: lemma,
    ipa: pickIpa(entry),
    audioUsUrl: audioUsUrl ?? googleTtsUrl(lemma, "en-US"),
    audioUkUrl: audioUkUrl ?? googleTtsUrl(lemma, "en-GB"),
    meanings,
  };
}

async function fetchDictionaryOnce(
  word: string,
  signal?: AbortSignal
): Promise<DictionaryResult | null> {
  const res = await fetch(
    `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
    {
      headers: { Accept: "application/json", "User-Agent": DICT_UA },
      signal,
    }
  );

  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Dictionary API error: ${res.status}`);
  }

  const data = await res.json();
  return parseDictionaryEntries(data, word);
}

export async function fetchDictionary(
  word: string
): Promise<DictionaryResult | null> {
  const candidates = dictionaryCandidates(word);
  if (candidates.length === 0) return null;

  for (const candidate of candidates) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const result = await fetchDictionaryOnce(candidate, controller.signal);
      if (result) return result;
    } catch {
      // try next candidate / fall through
    } finally {
      clearTimeout(timer);
    }
  }

  // Last resort: TTS-only so "đọc từ" still works
  const q = word.trim().toLowerCase();
  return {
    word: q,
    ipa: null,
    audioUsUrl: googleTtsUrl(q, "en-US"),
    audioUkUrl: googleTtsUrl(q, "en-GB"),
    meanings: [],
  };
}
