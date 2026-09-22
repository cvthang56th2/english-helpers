import { describe, expect, it } from "vitest";
import {
  parseMeaningQuery,
  pickBestEnglishGloss,
  sanitizeEnglishGloss,
} from "../../../extension/lib/google-search/meaning-query";

describe("parseMeaningQuery", () => {
  it("parses Vietnamese 'tiếng anh là gì' queries", () => {
    expect(parseMeaningQuery("bò kho tiếng anh là gì")).toBe("bò kho");
    expect(parseMeaningQuery("bò kho tiếng anh là gì?")).toBe("bò kho");
    expect(parseMeaningQuery("phở nghĩa tiếng anh")).toBe("phở");
  });

  it("parses English-style queries", () => {
    expect(parseMeaningQuery("what is bò kho in english")).toBe("bò kho");
    expect(parseMeaningQuery("bánh mì in english")).toBe("bánh mì");
  });

  it("returns null for unrelated searches", () => {
    expect(parseMeaningQuery("weather hanoi")).toBeNull();
    expect(parseMeaningQuery("")).toBeNull();
  });
});

describe("sanitizeEnglishGloss", () => {
  it("strips leaked 'ho' from 'hoặc'", () => {
    expect(sanitizeEnglishGloss("Vietnamese beef stew ho")).toBe(
      "Vietnamese beef stew"
    );
    expect(
      sanitizeEnglishGloss("Vietnamese beef stew hoặc đơn giản là beef stew")
    ).toBe("Vietnamese beef stew");
  });
});

describe("pickBestEnglishGloss", () => {
  it("prefers primary highlighted headword over list subtype", () => {
    expect(
      pickBestEnglishGloss([
        {
          text: "lettuce",
          highlighted: true,
          primaryAnswer: true,
          inList: false,
          fromFirstSentence: true,
        },
        {
          text: "Butterhead lettuce",
          highlighted: false,
          primaryAnswer: false,
          inList: true,
          fromFirstSentence: false,
        },
        {
          text: "Iceberg lettuce",
          highlighted: false,
          primaryAnswer: false,
          inList: true,
          fromFirstSentence: false,
        },
      ])
    ).toBe("lettuce");
  });

  it("keeps multi-word primary gloss like Vietnamese beef stew", () => {
    expect(
      pickBestEnglishGloss([
        {
          text: "Vietnamese beef stew",
          highlighted: true,
          primaryAnswer: true,
          inList: false,
          fromFirstSentence: true,
        },
        {
          text: "beef stew",
          highlighted: false,
          primaryAnswer: false,
          inList: false,
          fromFirstSentence: true,
        },
      ])
    ).toBe("Vietnamese beef stew");
  });
});
