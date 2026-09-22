"use client";

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
      <p className="py-12 text-center text-muted-foreground">
        Gõ một từ để tra và lưu vào sổ.
      </p>
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
    <div className="space-y-8">
      {[...groups.entries()].map(([key, list]) => (
        <section key={key}>
          <h3 className="mb-2 font-[family-name:var(--font-display)] text-sm font-medium uppercase tracking-wider text-muted-foreground">
            {dayLabel(list[0].created_at)}
          </h3>
          <ul className="rounded-xl border border-[var(--paper-border)] bg-[var(--paper-card)] px-4">
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
