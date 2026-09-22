import { describe, expect, it } from "vitest";
import { detectLang, inferDirection } from "@/lib/lookup/detect-lang";
import {
  normalizeAudioUrl,
  parseDictionaryEntries,
} from "@/lib/lookup/dictionary";

describe("detectLang", () => {
  it("detects Vietnamese by diacritics", () => {
    expect(detectLang("xin chào")).toBe("vi");
    expect(detectLang("học")).toBe("vi");
  });

  it("defaults to English", () => {
    expect(detectLang("hello")).toBe("en");
    expect(detectLang("serendipity")).toBe("en");
  });

  it("infers direction", () => {
    expect(inferDirection("beautiful")).toBe("en-vi");
    expect(inferDirection("đẹp")).toBe("vi-en");
  });
});

describe("normalizeAudioUrl", () => {
  it("prepends https: for protocol-relative URLs", () => {
    expect(
      normalizeAudioUrl("//ssl.gstatic.com/dictionary/static/sounds/hello--_gb_1.mp3")
    ).toBe("https://ssl.gstatic.com/dictionary/static/sounds/hello--_gb_1.mp3");
  });

  it("keeps absolute https URLs", () => {
    expect(normalizeAudioUrl("https://example.com/a.mp3")).toBe(
      "https://example.com/a.mp3"
    );
  });

  it("returns null for empty", () => {
    expect(normalizeAudioUrl("")).toBeNull();
    expect(normalizeAudioUrl(null)).toBeNull();
  });
});

describe("parseDictionaryEntries", () => {
  it("extracts IPA and US/UK audio", () => {
    const result = parseDictionaryEntries(
      [
        {
          word: "hello",
          phonetic: "həˈləʊ",
          phonetics: [
            {
              text: "həˈləʊ",
              audio: "//ssl.gstatic.com/dictionary/static/sounds/20200429/hello--_gb_1.mp3",
            },
            {
              text: "hɛˈloʊ",
              audio: "//ssl.gstatic.com/dictionary/static/sounds/20200429/hello--_us_1.mp3",
            },
          ],
          meanings: [
            {
              partOfSpeech: "exclamation",
              definitions: [
                {
                  definition: "used as a greeting",
                  example: "hello there!",
                },
              ],
            },
          ],
        },
      ],
      "hello"
    );

    expect(result).not.toBeNull();
    expect(result!.ipa).toBe("həˈləʊ");
    expect(result!.audioUkUrl).toContain("https://");
    expect(result!.audioUkUrl).toContain("_gb_");
    expect(result!.audioUsUrl).toContain("_us_");
    expect(result!.meanings[0].partOfSpeech).toBe("exclamation");
    expect(result!.meanings[0].definition).toBe("used as a greeting");
  });

  it("returns null for empty payload", () => {
    expect(parseDictionaryEntries([], "x")).toBeNull();
    expect(parseDictionaryEntries(null, "x")).toBeNull();
  });
});
