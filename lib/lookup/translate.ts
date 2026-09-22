import { translate as googleTranslate } from "google-translate-api-browser";
import type { Lang, TranslateResult } from "./types";

export async function translateWithGoogle(
  text: string,
  from: Lang,
  to: Lang
): Promise<TranslateResult> {
  const result = await Promise.race([
    googleTranslate(text, { from, to }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Google Translate timeout")), 12_000)
    ),
  ]);
  const translated = result?.text?.trim();
  if (!translated) {
    throw new Error("Google Translate returned empty text");
  }
  return { text: translated, provider: "google" };
}

export async function translateWithMyMemory(
  text: string,
  from: Lang,
  to: Lang,
  email?: string
): Promise<TranslateResult> {
  const params = new URLSearchParams({
    q: text,
    langpair: `${from}|${to}`,
  });
  const de = email || process.env.MYMEMORY_EMAIL || process.env.NEXT_PUBLIC_MYMEMORY_EMAIL;
  if (de) params.set("de", de);

  const res = await fetch(
    `https://api.mymemory.translated.net/get?${params.toString()}`
  );
  if (!res.ok) {
    throw new Error(`MyMemory error: ${res.status}`);
  }

  const data = (await res.json()) as {
    responseData?: { translatedText?: string };
    responseStatus?: number;
  };

  const translated = data.responseData?.translatedText?.trim();
  if (!translated || data.responseStatus !== 200) {
    throw new Error("MyMemory returned empty translation");
  }

  // MyMemory sometimes echoes QUERY LENGTH LIMIT messages
  if (translated.toUpperCase().includes("MYMEMORY WARNING")) {
    throw new Error(translated);
  }

  return { text: translated, provider: "mymemory" };
}

/** Server-side: Google first, MyMemory fallback. */
export async function translateServer(
  text: string,
  from: Lang,
  to: Lang
): Promise<TranslateResult> {
  try {
    return await translateWithGoogle(text, from, to);
  } catch (err) {
    console.warn("[translate] Google failed, trying MyMemory", err);
    return translateWithMyMemory(text, from, to);
  }
}

/**
 * Client-side fallback chain when POST /api/lookup fails:
 * Google (browser IP) → MyMemory.
 */
export async function translateClient(
  text: string,
  from: Lang,
  to: Lang
): Promise<TranslateResult> {
  try {
    return await translateWithGoogle(text, from, to);
  } catch (err) {
    console.warn("[translate] Client Google failed (CORS/block?), MyMemory", err);
    return translateWithMyMemory(text, from, to);
  }
}
