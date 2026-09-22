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

export function normalizeAudioUrl(url: string | undefined | null): string | null {
  if (!url || !url.trim()) return null;
  const trimmed = url.trim();
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `https://${trimmed}`;
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

  return {
    word: entry.word?.trim() || fallbackWord,
    ipa: pickIpa(entry),
    audioUsUrl,
    audioUkUrl,
    meanings,
  };
}

export async function fetchDictionary(
  word: string
): Promise<DictionaryResult | null> {
  const q = word.trim().toLowerCase();
  if (!q) return null;

  const res = await fetch(
    `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(q)}`
  );

  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Dictionary API error: ${res.status}`);
  }

  const data = await res.json();
  return parseDictionaryEntries(data, q);
}
