"use client";

import { Clock, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LookupHistoryEntry } from "@/lib/lookup/history";

type Props = {
  entries: LookupHistoryEntry[];
  onSelect: (entry: LookupHistoryEntry) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
};

function formatLookedAt(iso: string) {
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function LookupHistoryList({
  entries,
  onSelect,
  onRemove,
  onClear,
}: Props) {
  if (entries.length === 0) {
    return (
      <div className="surface px-4 py-10 text-center">
        <Clock className="mx-auto size-8 text-muted-foreground/60" aria-hidden />
        <p className="mt-3 text-sm font-medium text-foreground">
          Chưa có lịch sử tra từ
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Các từ bạn tra sẽ được lưu trên máy này.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{entries.length} lần tra</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 cursor-pointer gap-1.5 text-muted-foreground"
          onClick={onClear}
        >
          <Trash2 className="size-3.5" />
          Xóa hết
        </Button>
      </div>
      <ul className="divide-y divide-border/80 overflow-hidden rounded-xl border border-border/80 bg-[var(--paper-card)]">
        {entries.map((entry) => (
          <li key={entry.id} className="flex items-stretch gap-1">
            <button
              type="button"
              className="min-w-0 flex-1 cursor-pointer px-4 py-3 text-left transition-colors hover:bg-muted/50"
              onClick={() => onSelect(entry)}
            >
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="font-medium text-foreground">
                  {entry.result.term}
                </span>
                <span className="text-muted-foreground">→</span>
                <span className="text-foreground/85">
                  {entry.result.translation}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {entry.result.direction === "en-vi" ? "EN → VI" : "VI → EN"}
                {" · "}
                {formatLookedAt(entry.lookedAt)}
              </p>
            </button>
            <button
              type="button"
              className="shrink-0 cursor-pointer px-3 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              aria-label={`Xóa ${entry.result.term} khỏi lịch sử`}
              onClick={() => onRemove(entry.id)}
            >
              <X className="size-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
