import { describe, expect, it } from "vitest";
import { detectLang, inferDirection } from "@/lib/lookup/detect-lang";
import { buildDictionaryResult, googleTtsUrl } from "@/lib/lookup/dictionary";
import {
  parseGoogleTranslateResponse,
  pickMeanings,
  pickPronunciation,
  pickTranslation,
} from "@/lib/lookup/google";

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

describe("googleTtsUrl", () => {
  it("builds US and UK TTS urls", () => {
    expect(googleTtsUrl("hello", "en-US")).toContain("translate.google.com");
    expect(googleTtsUrl("hello", "en-US")).toContain("tl=en");
    expect(googleTtsUrl("hello", "en-GB")).toContain("tl=en-GB");
  });
});

describe("parseGoogleTranslateResponse", () => {
  const helloPayload = [
    [
      ["Xin chào", "hello", null, null, 10],
      [null, null, null, "həˈlō"],
    ],
    null,
    "en",
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    [
      [
        "exclamation",
        [
          [
            "used as a greeting or to begin a phone conversation.",
            "m_en_gbus0460730.012",
            "hello there, Katie!",
          ],
        ],
        "hello",
        17,
      ],
      [
        "noun",
        [
          [
            "an utterance of “hello”; a greeting.",
            "m_en_gbus0460730.025",
            "she was getting polite nods and hellos from people",
          ],
        ],
        "hello",
        1,
      ],
    ],
  ];

  it("picks translation, pronunciation, and meanings", () => {
    expect(pickTranslation(helloPayload)).toBe("Xin chào");
    expect(pickPronunciation(helloPayload)).toBe("həˈlō");
    const meanings = pickMeanings(helloPayload);
    expect(meanings[0]?.partOfSpeech).toBe("exclamation");
    expect(meanings[0]?.definition).toContain("greeting");
    expect(meanings[0]?.example).toBe("hello there, Katie!");

    const parsed = parseGoogleTranslateResponse(helloPayload);
    expect(parsed).toEqual({
      translation: "Xin chào",
      pronunciation: "həˈlō",
      meanings: expect.arrayContaining([
        expect.objectContaining({ partOfSpeech: "exclamation" }),
      ]),
    });
  });

  it("returns null when translation missing", () => {
    expect(parseGoogleTranslateResponse([])).toBeNull();
    expect(parseGoogleTranslateResponse(null)).toBeNull();
  });

  it("joins multi-segment translations", () => {
    const multi = [
      [
        ["Hello ", "Xin ", null, null, 1],
        ["world", "chào", null, null, 1],
      ],
    ];
    expect(pickTranslation(multi)).toBe("Hello world");
  });
});

describe("buildDictionaryResult", () => {
  it("attaches Google TTS urls", () => {
    const result = buildDictionaryResult("hello", "həˈlō", [
      {
        partOfSpeech: "exclamation",
        definition: "used as a greeting",
      },
    ]);
    expect(result.ipa).toBe("həˈlō");
    expect(result.audioUsUrl).toContain("translate_tts");
    expect(result.audioUkUrl).toContain("en-GB");
    expect(result.meanings).toHaveLength(1);
  });
});
