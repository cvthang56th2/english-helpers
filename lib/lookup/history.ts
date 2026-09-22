import type { Direction, LookupResult } from "@/lib/lookup/types";

export const LOOKUP_HISTORY_KEY = "word-ledger:lookup-history";
export const LOOKUP_HISTORY_MAX = 50;

export type LookupHistoryEntry = {
  id: string;
  lookedAt: string;
  result: LookupResult;
};

function dedupeKey(term: string, direction: Direction) {
  return `${term.trim().toLowerCase()}::${direction}`;
}

export function upsertLookupHistoryEntry(
  result: LookupResult,
  existing: LookupHistoryEntry[],
  options?: { id?: string; lookedAt?: string; max?: number }
): LookupHistoryEntry[] {
  const key = dedupeKey(result.term, result.direction);
  const max = options?.max ?? LOOKUP_HISTORY_MAX;
  return [
    {
      id: options?.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      lookedAt: options?.lookedAt ?? new Date().toISOString(),
      result,
    },
    ...existing.filter(
      (e) => dedupeKey(e.result.term, e.result.direction) !== key
    ),
  ].slice(0, max);
}

export function removeLookupHistoryEntry(
  id: string,
  existing: LookupHistoryEntry[]
): LookupHistoryEntry[] {
  return existing.filter((e) => e.id !== id);
}

export function filterLookupHistory(
  entries: LookupHistoryEntry[],
  query: string,
  limit = 8
): LookupHistoryEntry[] {
  const q = query.trim().toLowerCase();
  const list = q
    ? entries.filter(
        (e) =>
          e.result.term.toLowerCase().includes(q) ||
          e.result.translation.toLowerCase().includes(q)
      )
    : entries;
  return list.slice(0, limit);
}

export function parseLookupHistory(raw: string | null): LookupHistoryEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isHistoryEntry);
  } catch {
    return [];
  }
}

export function readLookupHistory(): LookupHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return parseLookupHistory(window.localStorage.getItem(LOOKUP_HISTORY_KEY));
  } catch {
    return [];
  }
}

export function writeLookupHistory(entries: LookupHistoryEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      LOOKUP_HISTORY_KEY,
      JSON.stringify(entries.slice(0, LOOKUP_HISTORY_MAX))
    );
  } catch {
    // Quota or private mode — ignore
  }
}

export function pushLookupHistory(
  result: LookupResult,
  existing = readLookupHistory()
): LookupHistoryEntry[] {
  const next = upsertLookupHistoryEntry(result, existing);
  writeLookupHistory(next);
  return next;
}

export function removeLookupHistory(
  id: string,
  existing = readLookupHistory()
): LookupHistoryEntry[] {
  const next = removeLookupHistoryEntry(id, existing);
  writeLookupHistory(next);
  return next;
}

export function clearLookupHistory(): LookupHistoryEntry[] {
  writeLookupHistory([]);
  return [];
}

function isHistoryEntry(value: unknown): value is LookupHistoryEntry {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== "string" || typeof v.lookedAt !== "string") return false;
  const r = v.result;
  if (!r || typeof r !== "object") return false;
  const result = r as Record<string, unknown>;
  return (
    typeof result.term === "string" &&
    typeof result.translation === "string" &&
    (result.direction === "en-vi" || result.direction === "vi-en")
  );
}
