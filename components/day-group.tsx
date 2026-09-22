"use client";

import { BookMarked } from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import { WordCard } from "@/components/word-card";
import type { WordRecord } from "@/lib/lookup/types";

const TZ = "Asia/Ho_Chi_Minh";

type Props = {
  words: WordRecord[];
  onUpdated: (word: WordRecord) => void;
  onDeleted: (id: string) => void;
};

function dayKey(iso: string) {
  return formatInTimeZone(new Date(iso), TZ, "yyyy-MM-dd");
}

function dayLabel(iso: string) {
  return formatInTimeZone(new Date(iso), TZ, "EEEE, d MMMM yyyy");
}

export function DayGroup({ words, onUpdated, onDeleted }: Props) {
  if (words.length === 0) {
    return (
      <div className="surface flex flex-col items-center gap-3 px-6 py-14 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <BookMarked className="size-5" aria-hidden />
        </div>
        <div className="space-y-1">
          <p className="font-medium text-foreground">Sổ còn trống</p>
          <p className="max-w-xs text-sm text-muted-foreground leading-relaxed">
            Tra một từ ở phía trên rồi bấm Lưu, hoặc Thêm thủ công nếu bạn đã tra IPA trên Google.
          </p>
        </div>
      </div>
    );
  }

  const groups = new Map<string, WordRecord[]>();
  for (const w of words) {
    const key = dayKey(w.created_at);
    const list = groups.get(key) ?? [];
    list.push(w);
    groups.set(key, list);
  }

  return (
    <div className="space-y-6">
      {[...groups.entries()].map(([key, list]) => (
        <section key={key}>
          <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {dayLabel(list[0].created_at)}
            <span className="ml-2 font-normal normal-case tracking-normal">
              · {list.length} từ
            </span>
          </h3>
          <ul className="surface divide-y divide-border px-1 sm:px-2">
            {list.map((w) => (
              <WordCard
                key={w.id}
                word={w}
                onUpdated={onUpdated}
                onDeleted={onDeleted}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
