import { describe, expect, it } from "vitest";
import {
  filterLookupHistory,
  parseLookupHistory,
  removeLookupHistoryEntry,
  upsertLookupHistoryEntry,
} from "@/lib/lookup/history";
import type { LookupResult } from "@/lib/lookup/types";

function result(
  partial: Partial<LookupResult> & Pick<LookupResult, "term">
): LookupResult {
  return {
    term: partial.term,
    sourceLang: partial.sourceLang ?? "en",
    targetLang: partial.targetLang ?? "vi",
    direction: partial.direction ?? "en-vi",
    translation: partial.translation ?? "dịch",
    translateProvider: partial.translateProvider ?? "server",
    ipa: partial.ipa ?? null,
    audioUsUrl: partial.audioUsUrl ?? null,
    audioUkUrl: partial.audioUkUrl ?? null,
    partOfSpeech: partial.partOfSpeech ?? null,
    definition: partial.definition ?? null,
    meanings: partial.meanings ?? [],
  };
}

describe("lookup history", () => {
  it("pushes newest first and dedupes by term+direction", () => {
    let entries = upsertLookupHistoryEntry(result({ term: "apple", translation: "táo" }), []);
    entries = upsertLookupHistoryEntry(result({ term: "book", translation: "sách" }), entries);
    entries = upsertLookupHistoryEntry(
      result({ term: "Apple", translation: "quả táo" }),
      entries
    );

    expect(entries).toHaveLength(2);
    expect(entries[0].result.term).toBe("Apple");
    expect(entries[0].result.translation).toBe("quả táo");
    expect(entries[1].result.term).toBe("book");
  });

  it("removes by id", () => {
    let entries = upsertLookupHistoryEntry(result({ term: "a" }), []);
    const firstId = entries[0].id;
    entries = upsertLookupHistoryEntry(result({ term: "b" }), entries);
    expect(removeLookupHistoryEntry(firstId, entries)).toHaveLength(1);
  });

  it("filters by term or translation", () => {
    const entries = [
      {
        id: "1",
        lookedAt: new Date().toISOString(),
        result: result({ term: "apple", translation: "táo" }),
      },
      {
        id: "2",
        lookedAt: new Date().toISOString(),
        result: result({ term: "book", translation: "sách" }),
      },
    ];
    expect(filterLookupHistory(entries, "táo")).toHaveLength(1);
    expect(filterLookupHistory(entries, "")).toHaveLength(2);
  });

  it("parses valid storage payload", () => {
    const raw = JSON.stringify([
      {
        id: "1",
        lookedAt: "2026-01-01T00:00:00.000Z",
        result: result({ term: "hi", translation: "xin chào" }),
      },
      { bad: true },
    ]);
    expect(parseLookupHistory(raw)).toHaveLength(1);
    expect(parseLookupHistory("not-json")).toEqual([]);
  });
});
