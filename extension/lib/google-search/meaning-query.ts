import { detectLang } from "../../../lib/lookup/detect-lang";
import type { Direction } from "../../../lib/lookup/types";

export type GoogleSearchMeaningPair = {
  term: string;
  translation: string;
  direction: Direction;
  query: string;
};

/** Map VI query term + EN gloss into notebook-oriented EN→VI pair. */
export function buildSearchMeaningPair(
  viTerm: string,
  enGloss: string,
  query: string
): GoogleSearchMeaningPair {
  return {
    term: enGloss,
    translation: viTerm,
    direction: "en-vi",
    query,
  };
}

const MEANING_QUERY_PATTERNS: RegExp[] = [
  /^what\s+is\s+(.+?)\s+in\s+english\s*[?.!]*$/i,
  /^(.+?)\s+tiếng\s*anh\s+là\s+gì\s*[?.!]*$/i,
  /^(.+?)\s+tiếng\s*anh\s+nghĩa\s+là\s+gì\s*[?.!]*$/i,
  /^(.+?)\s+nghĩa\s+tiếng\s*anh\s*(là\s+gì)?\s*[?.!]*$/i,
  /^(.+?)\s+tiếng\s*anh\s*[?.!]*$/i,
  /^(.+?)\s+in\s+english\s*(mean(?:ing)?|translation)?\s*[?.!]*$/i,
  /^(.+?)\s+english\s+(meaning|translation)\s*[?.!]*$/i,
];

function clean(text: string | null | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

export function readSearchQuery(): string {
  try {
    const q = new URL(location.href).searchParams.get("q");
    if (q) return clean(q);
  } catch {
    /* ignore */
  }
  const input =
    document.querySelector<HTMLInputElement>('textarea[name="q"]') ||
    document.querySelector<HTMLInputElement>('input[name="q"]');
  return clean(input?.value);
}

export function parseMeaningQuery(query: string): string | null {
  const q = clean(query);
  if (!q) return null;
  for (const pattern of MEANING_QUERY_PATTERNS) {
    const m = q.match(pattern);
    if (!m?.[1]) continue;
    const term = clean(m[1].replace(/^["“”']+|["“”']+$/g, ""));
    if (!term || term.length > 80) continue;
    // Prefer Vietnamese (or short phrase) as the notebook term for these queries.
    return term;
  }
  return null;
}

function isMostlyEnglish(text: string): boolean {
  const t = clean(text);
  if (!t) return false;
  if (detectLang(t) === "vi") return false;
  // Must contain Latin letters; reject pure symbols / URLs.
  if (!/[A-Za-z]/.test(t)) return false;
  if (/^https?:/i.test(t)) return false;
  return true;
}

export function sanitizeEnglishGloss(text: string): string {
  let t = clean(text);
  if (!t) return "";

  // Cut before Vietnamese / English connectors that follow the gloss.
  t = t.split(
    /\s+(?:hoặc|hay|và|còn|đơn\s+giản|or\s+simply|or\s+just|or\s+also)\b/i
  )[0];

  // Drop trailing stubs leaked from the next Vietnamese word (e.g. "ho" from "hoặc").
  const words = t.split(/\s+/).filter(Boolean);
  while (words.length > 1) {
    const last = words[words.length - 1];
    if (/^(ho|ha|va|và|or)$/i.test(last)) {
      words.pop();
      continue;
    }
    // Incomplete Latin stub (1–2 letters) after a real multi-word gloss.
    if (words.length >= 2 && /^[A-Za-z]{1,2}$/.test(last)) {
      words.pop();
      continue;
    }
    break;
  }

  t = clean(words.join(" "));
  return isMostlyEnglish(t) ? t : "";
}

type GlossCandidate = {
  text: string;
  highlighted: boolean;
  primaryAnswer: boolean;
  inList: boolean;
  fromFirstSentence: boolean;
};

function firstSentenceOf(text: string): string {
  return clean(text.split(/[.!?\n]/)[0] ?? text);
}

function elementOwnText(el: HTMLElement): string {
  return clean(
    Array.from(el.childNodes)
      .filter((n) => n.nodeType === Node.TEXT_NODE)
      .map((n) => n.textContent ?? "")
      .join(" ") || el.textContent
  );
}

function isListContext(el: HTMLElement): boolean {
  return Boolean(el.closest("li, [role='listitem'], ol, ul"));
}

function scoreGlossCandidate(c: GlossCandidate, all: GlossCandidate[]): number {
  const t = c.text;
  let score = 0;

  if (c.primaryAnswer) score += 100;
  if (c.highlighted && !c.inList) score += 80;
  if (c.fromFirstSentence) score += 40;
  if (c.inList) score -= 60;

  // Prefer compact headwords for direct "X là Y" answers; still allow multi-word glosses.
  const words = t.split(/\s+/).length;
  if (c.primaryAnswer || c.highlighted) {
    score += words === 1 ? 20 : Math.min(words * 3, 18);
  } else {
    score += words * 2;
  }

  // If a shorter candidate is the head of a longer one (lettuce ⊂ Butterhead lettuce),
  // prefer the shorter when it is primary/highlighted.
  for (const other of all) {
    if (other.text === t) continue;
    const a = t.toLowerCase();
    const b = other.text.toLowerCase();
    if (b.endsWith(" " + a) && (c.primaryAnswer || c.highlighted) && !c.inList) {
      score += 50;
    }
    if (a.endsWith(" " + b) && (other.primaryAnswer || other.highlighted)) {
      score -= 40;
    }
  }

  if (/\b(stew|soup|dish|food)\b/i.test(t) && words >= 2) score += 8;
  if (/\s+[a-z]{1,2}$/i.test(t)) score -= 20;
  return score;
}

/** Exported for tests — pick primary gloss over list subtypes. */
export function pickBestEnglishGloss(candidates: GlossCandidate[]): string | null {
  const cleaned = candidates
    .map((c) => ({ ...c, text: sanitizeEnglishGloss(c.text) }))
    .filter((c) => c.text.length >= 2 && c.text.length <= 80);
  if (!cleaned.length) return null;
  return cleaned.sort(
    (a, b) => scoreGlossCandidate(b, cleaned) - scoreGlossCandidate(a, cleaned)
  )[0].text;
}

function scoreEnglishCandidate(text: string): number {
  // Kept for SERP/dictionary fallbacks.
  const t = clean(text);
  let score = t.length + t.split(" ").length * 2;
  if (/\s+[a-z]{1,2}$/i.test(t)) score -= 20;
  if (/\bho$/i.test(t)) score -= 30;
  return score;
}

function uniqueByLower(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

const AI_OVERVIEW_SELECTORS = [
  ".Kevs9",
  ".Y3BBE",
  "[data-attrid*='overview']",
  "[aria-label*='AI Overview' i]",
  "[aria-label*='Thông tin tổng quan' i]",
  "[data-attrid='wa:/description']",
  "[data-md]",
  ".YtSamb",
  ".xGj8Mb",
  ".V3FYCf",
  ".wDYxhc",
  "#Odp5De",
];

const BOLD_IN_AI =
  "strong, b, em, mark, [role='text'] b, [role='text'] strong, span[style*='background'], span[style*='font-weight']";

function hasHighlightBackground(el: HTMLElement): boolean {
  try {
    const bg = getComputedStyle(el).backgroundColor;
    if (!bg || bg === "transparent" || bg === "rgba(0, 0, 0, 0)") return false;
    const m = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (!m) return false;
    const r = Number(m[1]);
    const g = Number(m[2]);
    const b = Number(m[3]);
    // Soft green / teal / blue highlight (not pure white/black).
    const isLight = (r + g + b) / 3 > 160;
    const isTinted = Math.abs(g - r) > 15 || Math.abs(b - r) > 15;
    return isLight && isTinted;
  } catch {
    return false;
  }
}

function collectAiEnglishCandidates(root: HTMLElement): GlossCandidate[] {
  const out: GlossCandidate[] = [];
  const fullText = clean(root.innerText);
  const firstSentence = firstSentenceOf(fullText);

  function push(raw: string, flags: Partial<Omit<GlossCandidate, "text">>) {
    const text = sanitizeEnglishGloss(raw);
    if (!text) return;
    out.push({
      text,
      highlighted: false,
      primaryAnswer: false,
      inList: false,
      fromFirstSentence: firstSentence.toLowerCase().includes(text.toLowerCase()),
      ...flags,
    });
  }

  for (const el of root.querySelectorAll(BOLD_IN_AI)) {
    if (!(el instanceof HTMLElement)) continue;
    push(elementOwnText(el), {
      highlighted: hasHighlightBackground(el) || el.tagName === "MARK",
      inList: isListContext(el),
    });
  }

  for (const el of root.querySelectorAll("span, mark, em, b, strong")) {
    if (!(el instanceof HTMLElement)) continue;
    if (!hasHighlightBackground(el) && el.tagName !== "MARK") continue;
    push(elementOwnText(el), {
      highlighted: true,
      inList: isListContext(el),
    });
  }

  const primaryPatterns = [
    /(?:trong\s+)?tiếng\s*anh\s+là\s+([A-Za-z][A-Za-z0-9' -]*?)(?=\s+(?:hoặc|hay|và|đơn|or\b)|[.!?,;]|$)/gi,
    /(?:được\s+gọi\s+là|gọi\s+là|called|means)\s+([A-Za-z][A-Za-z0-9' -]*?)(?=\s+(?:hoặc|hay|và|đơn|or\b)|[.!?,;]|$)/gi,
    /(?:hoặc\s+đơn\s+giản\s+là|or\s+simply)\s+([A-Za-z][A-Za-z0-9' -]*?)(?=\s+(?:hoặc|hay|và|or\b)|[.!?,;]|$)/gi,
  ];
  for (const pattern of primaryPatterns) {
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(fullText))) {
      const phrase = sanitizeEnglishGloss(m[1]);
      if (!phrase) continue;
      push(phrase, {
        primaryAnswer: true,
        fromFirstSentence: firstSentence
          .toLowerCase()
          .includes(phrase.toLowerCase()),
      });
    }
  }

  return out;
}

export function findAiOverviewRoot(): HTMLElement | null {
  // Prefer heading-based discovery (stable across class renames).
  const headings = Array.from(
    document.querySelectorAll("h1, h2, h3, span, div, [role='heading']")
  );
  for (const h of headings) {
    if (!(h instanceof HTMLElement)) continue;
    const t = clean(h.innerText);
    if (
      !/thông tin tổng quan do ai|ai overview|ai[- ]generated|tổng quan do ai/i.test(
        t
      ) ||
      t.length > 100
    ) {
      continue;
    }
    let node: HTMLElement | null = h;
    for (let i = 0; i < 10 && node; i++) {
      if (
        node.classList.contains("Kevs9") ||
        node.matches("[data-attrid*='overview'], [aria-label*='Overview' i]")
      ) {
        return node;
      }
      const withBody = node.querySelector(".Y3BBE, .Kevs9, strong, b");
      if (withBody && clean(node.innerText).length > 40) return node;
      node = node.parentElement;
    }
    const fallback =
      h.closest("[data-hveid], [jscontroller], .MjjYud, .ULSxyf, .Kevs9") ||
      h.parentElement;
    if (fallback instanceof HTMLElement) return fallback;
  }

  for (const sel of AI_OVERVIEW_SELECTORS) {
    const el = document.querySelector(sel);
    if (el instanceof HTMLElement && clean(el.innerText).length > 20) {
      return el;
    }
  }
  return null;
}

export function extractEnglishFromAiOverview(
  root: HTMLElement | null
): string | null {
  if (!root) return null;
  return pickBestEnglishGloss(collectAiEnglishCandidates(root));
}

const SERP_TRANSLATE_ROOT_SELECTORS = [
  "#tw-container",
  "#tw-obb",
  "#tw-main",
  "[data-attrid*='Translation']",
  "[data-attrid*='translator']",
  ".tw-menu",
  "g-section-with-header",
];

const SERP_TRANSLATE_TARGET_SELECTORS = [
  "#tw-target-text",
  "#tw-target-rmn",
  "#tw-target span[lang]",
  "#tw-target .Y2IQFc",
  "#tw-target .VIiyi",
  ".tw-data-text[data-placeholder='Translation']",
  "[id='tw-target-text'] span",
  "pre#tw-target-text",
  ".VIiyi span[lang]",
  "span[data-language-for-speech]",
];

export function findSerpTranslateRoot(): HTMLElement | null {
  for (const sel of SERP_TRANSLATE_ROOT_SELECTORS) {
    const el = document.querySelector(sel);
    if (el instanceof HTMLElement) return el;
  }
  const blocks = document.querySelectorAll(
    "#search .MjjYud, #rso .MjjYud, #search .g, #rhs"
  );
  for (const block of blocks) {
    if (!(block instanceof HTMLElement)) continue;
    const text = clean(block.innerText);
    if (/google\s*translate|google\s*dịch/i.test(text) && text.length < 2000) {
      return block;
    }
  }
  return null;
}

export function extractEnglishFromSerpTranslate(term?: string): string | null {
  const root = findSerpTranslateRoot() ?? document.body;
  const scoped = root === document.body ? document : root;

  for (const sel of SERP_TRANSLATE_TARGET_SELECTORS) {
    const nodes = scoped.querySelectorAll(sel);
    for (const node of nodes) {
      if (!(node instanceof HTMLElement)) continue;
      const text = clean(node.innerText || node.textContent);
      if (!isMostlyEnglish(text)) continue;
      if (term && clean(text).toLowerCase() === clean(term).toLowerCase()) {
        continue;
      }
      if (text.length >= 2 && text.length <= 80) return text;
    }
  }

  const candidates = Array.from(root.querySelectorAll("span, div, pre, textarea"))
    .map((el) =>
      clean(el instanceof HTMLElement ? el.innerText : el.textContent)
    )
    .filter(
      (t) =>
        t.length >= 2 &&
        t.length <= 60 &&
        isMostlyEnglish(t) &&
        (!term || t.toLowerCase() !== clean(term).toLowerCase()) &&
        !/google|translate|dịch|copy|listen|phát/i.test(t)
    );

  if (!candidates.length) return null;
  return uniqueByLower(candidates).sort(
    (a, b) => scoreEnglishCandidate(b) - scoreEnglishCandidate(a)
  )[0];
}

export function extractEnglishFromDictionaryPanel(): string | null {
  const panels = document.querySelectorAll(
    "[data-attrid], .kp-wholepage, .liYKde, .osrp-ctrl"
  );
  for (const panel of panels) {
    if (!(panel instanceof HTMLElement)) continue;
    const text = clean(panel.innerText);
    if (!/tiếng anh|english|dịch/i.test(text)) continue;
    const bold = Array.from(panel.querySelectorAll("strong, b, span"))
      .map((el) => clean(el.textContent))
      .filter((t) => t.length >= 2 && t.length <= 60 && isMostlyEnglish(t));
    if (bold.length) {
      return bold.sort(
        (a, b) => scoreEnglishCandidate(b) - scoreEnglishCandidate(a)
      )[0];
    }
  }
  return null;
}

export function currentEnglishSelection(): string | null {
  const sel = window.getSelection()?.toString() ?? "";
  const t = sanitizeEnglishGloss(sel);
  if (!t || t.length > 80) return null;
  return t;
}

export function readGoogleSearchMeaningPair(): GoogleSearchMeaningPair | null {
  const query = readSearchQuery();
  const term = parseMeaningQuery(query);
  if (!term) return null;

  const aiRoot = findAiOverviewRoot();
  // Prefer AI Overview highlight (e.g. "Vietnamese beef stew") over SERP Translate.
  const translation =
    currentEnglishSelection() ||
    extractEnglishFromAiOverview(aiRoot) ||
    extractEnglishFromSerpTranslate(term) ||
    extractEnglishFromDictionaryPanel() ||
    "";

  // Show button even if EN gloss not ready yet (user can fill / select).
  return buildSearchMeaningPair(term, translation, query);
}

export function findSearchSaveAnchor(): HTMLElement | null {
  return (
    findAiOverviewRoot() ||
    findSerpTranslateRoot() ||
    document.querySelector<HTMLElement>("#search") ||
    document.querySelector<HTMLElement>("#rso") ||
    document.body
  );
}
