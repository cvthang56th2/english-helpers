import { describe, expect, it } from "vitest";
import {
  buildManualWordBody,
  normalizeIpa,
  selectionToQuery,
  validateManualWord,
} from "@/lib/words/manual";

describe("normalizeIpa", () => {
  it("strips wrapping slashes and whitespace", () => {
    expect(normalizeIpa("  /həˈloʊ/  ")).toBe("həˈloʊ");
    expect(normalizeIpa("/kat/")).toBe("kat");
  });

  it("returns null for empty input", () => {
    expect(normalizeIpa("")).toBeNull();
    expect(normalizeIpa("   ")).toBeNull();
    expect(normalizeIpa(null)).toBeNull();
    expect(normalizeIpa(undefined)).toBeNull();
  });
});

describe("validateManualWord", () => {
  it("requires term and translation", () => {
    expect(validateManualWord({ term: "", translation: "mèo" }).ok).toBe(false);
    expect(validateManualWord({ term: "cat", translation: "" }).ok).toBe(false);
  });

  it("accepts IPA and infers EN→VI by default for English term", () => {
    const result = validateManualWord({
      term: "  cat ",
      translation: " mèo ",
      ipa: "/kæt/",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toMatchObject({
      term: "cat",
      translation: "mèo",
      ipa: "kæt",
      sourceLang: "en",
      targetLang: "vi",
      direction: "en-vi",
    });
  });

  it("uses explicit direction when provided", () => {
    const result = validateManualWord({
      term: "mèo",
      translation: "cat",
      direction: "vi-en",
      ipa: "kæt",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.direction).toBe("vi-en");
    expect(result.value.sourceLang).toBe("vi");
    expect(result.value.targetLang).toBe("en");
  });
});

describe("buildManualWordBody", () => {
  it("maps to API snake_case and attaches English TTS urls", () => {
    const parsed = validateManualWord({
      term: "cat",
      translation: "mèo",
      ipa: "kæt",
      partOfSpeech: "noun",
      definition: "a small domesticated carnivorous mammal",
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const body = buildManualWordBody(parsed.value);
    expect(body.term).toBe("cat");
    expect(body.source_lang).toBe("en");
    expect(body.target_lang).toBe("vi");
    expect(body.ipa).toBe("kæt");
    expect(body.part_of_speech).toBe("noun");
    expect(body.audio_us_url).toContain("translate_tts");
    expect(body.audio_uk_url).toContain("en-GB");
  });
});

describe("selectionToQuery", () => {
  it("trims and collapses whitespace", () => {
    expect(selectionToQuery("  look   up \n this ")).toBe("look up this");
  });

  it("rejects empty or oversized selections", () => {
    expect(selectionToQuery("   ")).toBeNull();
    expect(selectionToQuery("word ".repeat(80))).toBeNull();
  });
});
