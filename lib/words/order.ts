import type { WordRecord } from "@/lib/lookup/types";

export function compareWordsInDay(a: WordRecord, b: WordRecord): number {
  const position = (a.position ?? 0) - (b.position ?? 0);
  if (position !== 0) return position;
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

export function sortWordsInDay(words: WordRecord[]): WordRecord[] {
  return [...words].sort(compareWordsInDay);
}

/** Move `fromId` to `toIndex` in the current day order. Returns null when nothing changes. */
export function reorderIds(
  ids: string[],
  fromId: string,
  toIndex: number
): string[] | null {
  const from = ids.indexOf(fromId);
  if (from < 0 || toIndex < 0 || toIndex >= ids.length || from === toIndex) {
    return null;
  }
  const next = [...ids];
  const [item] = next.splice(from, 1);
  next.splice(toIndex, 0, item);
  return next;
}
