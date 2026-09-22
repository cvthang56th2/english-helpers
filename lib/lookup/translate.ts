import { fetchGoogleTranslate } from "./google";
import type { Lang, TranslateResult } from "./types";

export async function translateWithGoogle(
  text: string,
  from: Lang,
  to: Lang
): Promise<TranslateResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const result = await fetchGoogleTranslate(text, from, to, controller.signal);
    return { text: result.translation, provider: "google" };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Google Translate timeout");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** Server-side: Google only. */
export async function translateServer(
  text: string,
  from: Lang,
  to: Lang
): Promise<TranslateResult> {
  return translateWithGoogle(text, from, to);
}

/**
 * Client-side fallback when POST /api/lookup fails:
 * same Google endpoint (browser IP).
 */
export async function translateClient(
  text: string,
  from: Lang,
  to: Lang
): Promise<TranslateResult> {
  return translateWithGoogle(text, from, to);
}
