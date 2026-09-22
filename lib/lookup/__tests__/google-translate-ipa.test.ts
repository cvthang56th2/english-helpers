import { describe, expect, it } from "vitest";
import {
  canSplitForIpa,
  joinWordIpas,
  tokenizeForIpa,
} from "../../../extension/lib/google-translate/read-pair";

describe("tokenizeForIpa", () => {
  it("extracts unique english words", () => {
    expect(tokenizeForIpa("Hello, world! Hello again")).toEqual([
      "Hello",
      "world",
      "again",
    ]);
  });

  it("keeps contractions", () => {
    expect(tokenizeForIpa("don't stop")).toEqual(["don't", "stop"]);
  });
});

describe("canSplitForIpa", () => {
  it("allows split for long english source without ipa", () => {
    expect(canSplitForIpa("hello world", null, "en-vi")).toBe(true);
  });

  it("blocks when ipa exists or too short", () => {
    expect(canSplitForIpa("hello world", "/x/", "en-vi")).toBe(false);
    expect(canSplitForIpa("hello", null, "en-vi")).toBe(false);
    expect(canSplitForIpa("xin chào bạn", null, "vi-en")).toBe(false);
  });
});

describe("joinWordIpas", () => {
  it("joins selected word ipas", () => {
    expect(
      joinWordIpas(["Hello", "world"], {
        hello: "/həˈloʊ/",
        world: "wɜːrld",
      })
    ).toBe("həˈloʊ wɜːrld");
  });
});

describe("Google phonetic shape", () => {
  it("recognizes NOAD-style respelling like həˈlō", () => {
    expect(/[əˈō]/.test("həˈlō")).toBe(true);
  });
});
