"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { ArrowLeftRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { inferDirection } from "@/lib/lookup/detect-lang";
import type { Direction } from "@/lib/lookup/types";

type Props = {
  onLookup: (q: string, direction: Direction) => void;
  loading?: boolean;
};

export function LookupBar({ onLookup, loading }: Props) {
  const [q, setQ] = useState("");
  const [direction, setDirection] = useState<Direction>("en-vi");
  const [manualDirection, setManualDirection] = useState(false);

  function submit(e?: FormEvent) {
    e?.preventDefault();
    const term = q.trim();
    if (!term || loading) return;
    const dir = manualDirection ? direction : inferDirection(term);
    if (!manualDirection) setDirection(dir);
    onLookup(term, dir);
  }

  function flip() {
    setManualDirection(true);
    setDirection((d) => (d === "en-vi" ? "vi-en" : "en-vi"));
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") submit();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setManualDirection(false);
          }}
          onKeyDown={onKeyDown}
          placeholder="Gõ một từ để tra…"
          className="h-11 pl-9 text-base"
          autoFocus
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={flip}
          className="h-11 gap-2 cursor-pointer font-medium tabular-nums"
          aria-label="Đổi hướng dịch"
        >
          {direction === "en-vi" ? "EN → VI" : "VI → EN"}
          <ArrowLeftRight className="size-3.5 opacity-60" />
        </Button>
        <Button
          type="submit"
          disabled={!q.trim() || loading}
          className="h-11 min-w-24 cursor-pointer bg-[var(--ink-accent)] text-white hover:bg-[var(--ink-accent)]/90"
        >
          {loading ? "Đang tra…" : "Tra"}
        </Button>
      </div>
    </form>
  );
}
