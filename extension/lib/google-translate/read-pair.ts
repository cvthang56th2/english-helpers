import {
  detectLang,
  directionFromLangs,
  inferDirection,
} from "../../../lib/lookup/detect-lang";
import type { Direction, Lang } from "../../../lib/lookup/types";

export type GoogleTranslatePair = {
  term: string;
  translation: string;
  direction: Direction;
  sourceLang: Lang;
  targetLang: Lang;
  pageIpa: string | null;
};

const SOURCE_SELECTORS = [
  'textarea[aria-label]',
  "textarea[jsname='BJE2fc']",
  "textarea.er8xn",
  "textarea",
];

const RESULT_SELECTORS = [
  "span[data-language-for-speech]",
  "span.ryNqvb",
  "span.Y2IQFc",
  "span.Q4iAWc",
  '[jsname="WHxgEa"]',
  '[data-result-index="0"]',
];

const RESULT_ANCHOR_SELECTORS = [
  "span[data-language-for-speech]",
  "span.ryNqvb",
  "span.Y2IQFc",
  '[jsname="WHxgEa"]',
  ".J0lOec",
  ".lRu31",
  ".ryNqvb",
];

const TRANSLIT_SELECTORS = [
  '[jsname="toZopb"]',
  ".D4w5q",
  "span.kO6q6e",
  '[jsname="jqKx2e"]',
  ".tvt2K",
];

/** Google often shows NOAD-style respelling (həˈlō), not strict IPA. */
const PHONETIC_MARKS =
  /[əɛɪʊɔɑæʃʒθðŋˈˌːāēīōūäôŏŭɡ]|o͝o|o͞o|T͟H|NG|SH|CH|ZH/;

function looksLikePhonetic(
  text: string,
  term: string,
  translation: string
): boolean {
  const t = clean(text);
  if (!t || t.length > 80) return false;
  if (t === term || t === translation) return false;
  if (/^https?:/i.test(t)) return false;
  return PHONETIC_MARKS.test(t);
}

function readPageIpa(term: string, translation: string): string | null {
  for (const sel of TRANSLIT_SELECTORS) {
    const nodes = document.querySelectorAll(sel);
    for (const node of nodes) {
      if (!(node instanceof HTMLElement)) continue;
      const text = clean(node.innerText || node.textContent);
      if (looksLikePhonetic(text, term, translation)) return text;
    }
  }

  // Fallback: short phonetic-looking text under the source panel.
  const candidates = document.querySelectorAll(
    "span, div, button, [role='button']"
  );
  for (const node of candidates) {
    if (!(node instanceof HTMLElement)) continue;
    if (node.children.length > 3) continue;
    const text = clean(node.innerText || node.textContent);
    if (!looksLikePhonetic(text, term, translation)) continue;
    // Prefer nodes near the source textarea.
    const nearSource = node.closest(
      "[class*='Source'], [class*='source'], c-wiz"
    );
    if (nearSource || PHONETIC_MARKS.test(text)) return text;
  }
  return null;
}

function clean(text: string | null | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

function mapGoogleLang(code: string | null | undefined): Lang | null {
  if (!code) return null;
  const lower = code.toLowerCase();
  if (lower === "en" || lower.startsWith("en-")) return "en";
  if (lower === "vi" || lower.startsWith("vi-")) return "vi";
  return null;
}

function readUrlText(): string {
  try {
    return clean(new URL(location.href).searchParams.get("text") ?? "");
  } catch {
    return "";
  }
}

function readUrlLangs(): { sl: string; tl: string } {
  try {
    const params = new URL(location.href).searchParams;
    return {
      sl: params.get("sl") ?? "auto",
      tl: params.get("tl") ?? "vi",
    };
  } catch {
    return { sl: "auto", tl: "vi" };
  }
}

function firstText(selectors: string[]): string {
  for (const sel of selectors) {
    const nodes = document.querySelectorAll(sel);
    for (const node of nodes) {
      if (!(node instanceof HTMLElement)) continue;
      if (node instanceof HTMLTextAreaElement || node instanceof HTMLInputElement) {
        const value = clean(node.value);
        if (value) return value;
      }
      const text = clean(node.innerText || node.textContent);
      if (text) return text;
    }
  }
  return "";
}

function firstElement(selectors: string[]): HTMLElement | null {
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el instanceof HTMLElement) return el;
  }
  return null;
}

function resolveDirection(
  term: string,
  translation: string,
  sl: string,
  tl: string
): { direction: Direction; sourceLang: Lang; targetLang: Lang } {
  const mappedSl = mapGoogleLang(sl);
  const mappedTl = mapGoogleLang(tl);
  if (mappedSl && mappedTl && mappedSl !== mappedTl) {
    return {
      direction: directionFromLangs(mappedSl, mappedTl),
      sourceLang: mappedSl,
      targetLang: mappedTl,
    };
  }
  if (mappedSl && !mappedTl) {
    const targetLang: Lang = mappedSl === "en" ? "vi" : "en";
    return {
      direction: directionFromLangs(mappedSl, targetLang),
      sourceLang: mappedSl,
      targetLang,
    };
  }
  if (mappedTl && !mappedSl) {
    const detected = detectLang(term);
    if (detected !== mappedTl) {
      return {
        direction: directionFromLangs(detected, mappedTl),
        sourceLang: detected,
        targetLang: mappedTl,
      };
    }
  }
  const direction = inferDirection(term || translation);
  const sourceLang = direction === "en-vi" ? "en" : "vi";
  const targetLang = direction === "en-vi" ? "vi" : "en";
  return { direction, sourceLang, targetLang };
}

export function readGoogleTranslatePair(): GoogleTranslatePair | null {
  const term = firstText(SOURCE_SELECTORS) || readUrlText();
  const translation = firstText(RESULT_SELECTORS);
  if (!term || !translation) return null;

  const { sl, tl } = readUrlLangs();
  const { direction, sourceLang, targetLang } = resolveDirection(
    term,
    translation,
    sl,
    tl
  );
  const pageIpa = readPageIpa(term, translation);

  return {
    term,
    translation,
    direction,
    sourceLang,
    targetLang,
    pageIpa,
  };
}

export function findResultAnchor(): HTMLElement | null {
  return firstElement(RESULT_ANCHOR_SELECTORS);
}

export function tokenizeForIpa(text: string): string[] {
  const matches = text.match(/[A-Za-z]+(?:'[A-Za-z]+)?/g);
  if (!matches) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of matches) {
    const word = raw.toLowerCase();
    if (word.length < 2) continue;
    if (seen.has(word)) continue;
    seen.add(word);
    out.push(raw);
  }
  return out;
}

export function canSplitEnglishPhrase(
  english: string,
  ipa: string | null | undefined
): boolean {
  if (ipa?.trim()) return false;
  return tokenizeForIpa(english).length >= 2;
}

export function canSplitForIpa(
  term: string,
  ipa: string | null | undefined,
  direction: Direction
): boolean {
  const englishSide = direction === "en-vi" ? term : null;
  if (!englishSide) return false;
  return canSplitEnglishPhrase(englishSide, ipa);
}

export function joinWordIpas(
  words: string[],
  ipaByWord: Record<string, string | null>
): string {
  return words
    .map((w) => {
      const ipa = ipaByWord[w.toLowerCase()] ?? ipaByWord[w];
      if (!ipa) return null;
      return ipa.replace(/^\/+|\/+$/g, "").trim();
    })
    .filter((v): v is string => Boolean(v))
    .join(" ");
}
