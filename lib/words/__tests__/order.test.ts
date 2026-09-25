import { describe, expect, it } from "vitest";
import type { WordRecord } from "@/lib/lookup/types";
import { reorderIds, sortWordsInDay } from "@/lib/words/order";

function word(partial: Pick<WordRecord, "id" | "position" | "created_at">): WordRecord {
  return {
    user_id: "u",
    term: partial.id,
    source_lang: "en",
    target_lang: "vi",
    translation: "x",
    ipa: null,
    audio_us_url: null,
    audio_uk_url: null,
    part_of_speech: null,
    definition: null,
    updated_at: partial.created_at,
    ...partial,
  };
}

describe("sortWordsInDay", () => {
  it("keeps newest first when every position is 0", () => {
    const sorted = sortWordsInDay([
      word({ id: "old", position: 0, created_at: "2026-09-25T01:00:00.000Z" }),
      word({ id: "new", position: 0, created_at: "2026-09-25T08:00:00.000Z" }),
    ]);
    expect(sorted.map((w) => w.id)).toEqual(["new", "old"]);
  });

  it("uses position ahead of created time", () => {
    const sorted = sortWordsInDay([
      word({ id: "b", position: 1, created_at: "2026-09-25T08:00:00.000Z" }),
      word({ id: "a", position: 0, created_at: "2026-09-25T01:00:00.000Z" }),
    ]);
    expect(sorted.map((w) => w.id)).toEqual(["a", "b"]);
  });
});

describe("reorderIds", () => {
  it("moves an id to a new index", () => {
    expect(reorderIds(["a", "b", "c"], "c", 0)).toEqual(["c", "a", "b"]);
  });

  it("returns null when the order does not change", () => {
    expect(reorderIds(["a", "b"], "a", 0)).toBeNull();
  });
});
