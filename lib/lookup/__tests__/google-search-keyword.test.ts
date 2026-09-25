import { describe, expect, it } from "vitest";
import {
  englishMeaningQuery,
  googleEnglishMeaningSearchUrl,
  isEnglishSearchHotkey,
  isGoogleSearchUrl,
} from "../../../extension/lib/google-search/keyword-search";

describe("englishMeaningQuery", () => {
  it("builds a Google meaning query from the keyword", () => {
    expect(englishMeaningQuery("  bò kho  ")).toBe("bò kho tiếng anh là gì");
  });

  it("returns null for a blank keyword", () => {
    expect(englishMeaningQuery("   ")).toBeNull();
  });
});

describe("isEnglishSearchHotkey", () => {
  it("matches Cmd+Shift+F and Ctrl+Shift+F", () => {
    expect(
      isEnglishSearchHotkey({ code: "KeyF", shiftKey: true, metaKey: true })
    ).toBe(true);
    expect(
      isEnglishSearchHotkey({ code: "KeyF", shiftKey: true, ctrlKey: true })
    ).toBe(true);
  });

  it("ignores find, repeats, and extra modifiers", () => {
    expect(isEnglishSearchHotkey({ code: "KeyF", metaKey: true })).toBe(false);
    expect(
      isEnglishSearchHotkey({
        code: "KeyF",
        shiftKey: true,
        metaKey: true,
        repeat: true,
      })
    ).toBe(false);
    expect(
      isEnglishSearchHotkey({
        code: "KeyF",
        shiftKey: true,
        metaKey: true,
        altKey: true,
      })
    ).toBe(false);
  });
});

describe("isGoogleSearchUrl", () => {
  it("matches the Google search site", () => {
    expect(isGoogleSearchUrl("https://www.google.com/search?q=bò")).toBe(true);
    expect(isGoogleSearchUrl("https://www.google.com.vn/")).toBe(true);
    expect(isGoogleSearchUrl("https://google.com/")).toBe(true);
  });

  it("does not match other Google products", () => {
    expect(isGoogleSearchUrl("https://mail.google.com/mail")).toBe(false);
    expect(isGoogleSearchUrl("https://docs.google.com/document")).toBe(false);
    expect(isGoogleSearchUrl("https://example.com")).toBe(false);
  });
});

describe("googleEnglishMeaningSearchUrl", () => {
  it("opens Google search for the meaning query", () => {
    const url = googleEnglishMeaningSearchUrl("phở");
    expect(url).toBeTruthy();
    const parsed = new URL(url!);
    expect(parsed.origin).toBe("https://www.google.com");
    expect(parsed.pathname).toBe("/search");
    expect(parsed.searchParams.get("q")).toBe("phở tiếng anh là gì");
  });
});
