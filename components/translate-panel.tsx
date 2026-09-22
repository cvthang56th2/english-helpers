"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { ArrowLeftRight, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LookupResultCard } from "@/components/lookup-result";
import { filterLookupHistory, type LookupHistoryEntry } from "@/lib/lookup/history";
import { inferDirection } from "@/lib/lookup/detect-lang";
import type { Direction, LookupResult } from "@/lib/lookup/types";

export type TranslateSeed = {
  term: string;
  direction: Direction;
  /** Bumps on each restore so the same term can re-fill the input. */
  at: number;
};

type Props = {
  onLookup: (q: string, direction: Direction) => void;
  onSelectHistory: (entry: LookupHistoryEntry) => void;
  /** Clear current result after language swap so user must look up again. */
  onClearResult: () => void;
  history: LookupHistoryEntry[];
  loading?: boolean;
  result: LookupResult | null;
  onSave: () => void;
  saving?: boolean;
  saved?: boolean;
  /** When set (e.g. restore from history list), fill the input. */
  seed?: TranslateSeed | null;
};

export function TranslatePanel({
  onLookup,
  onSelectHistory,
  onClearResult,
  history,
  loading,
  result,
  onSave,
  saving,
  saved,
  seed,
}: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLFormElement>(null);
  const [q, setQ] = useState("");
  const [direction, setDirection] = useState<Direction>("en-vi");
  const [manualDirection, setManualDirection] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const lastSeedRef = useRef<TranslateSeed | null>(null);

  const suggestions = filterLookupHistory(history, q, 8);
  const showDropdown = open && suggestions.length > 0;

  useEffect(() => {
    if (!seed) return;
    if (lastSeedRef.current?.at === seed.at) return;
    lastSeedRef.current = seed;
    setQ(seed.term);
    setDirection(seed.direction);
    setManualDirection(true);
    setOpen(false);
  }, [seed]);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function submit(e?: FormEvent) {
    e?.preventDefault();
    const term = q.trim();
    if (!term || loading) return;
    const dir = manualDirection ? direction : inferDirection(term);
    if (!manualDirection) setDirection(dir);
    setOpen(false);
    onLookup(term, dir);
  }

  function pick(entry: LookupHistoryEntry) {
    setQ(entry.result.term);
    setDirection(entry.result.direction);
    setManualDirection(true);
    setOpen(false);
    onSelectHistory(entry);
  }

  function flip() {
    setManualDirection(true);
    setOpen(false);
    if (result?.translation.trim()) {
      setQ(result.translation);
      setDirection(result.direction === "en-vi" ? "vi-en" : "en-vi");
      onClearResult();
      return;
    }
    setDirection((d) => (d === "en-vi" ? "vi-en" : "en-vi"));
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      if (showDropdown && suggestions[highlight]) {
        e.preventDefault();
        pick(suggestions[highlight]);
        return;
      }
      e.preventDefault();
      submit();
      return;
    }
    if (!showDropdown) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const sourceLabel = direction === "en-vi" ? "English" : "Tiếng Việt";
  const targetLabel = direction === "en-vi" ? "Tiếng Việt" : "English";

  return (
    <form ref={rootRef} onSubmit={submit} className="surface overflow-hidden">
      <div className="flex items-center justify-center gap-2 border-b border-border/80 px-3 py-2.5 sm:px-4">
        <span
          className="min-w-0 flex-1 truncate text-center text-sm font-semibold text-primary"
          aria-current="true"
        >
          {sourceLabel}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={flip}
          className="size-9 shrink-0 cursor-pointer"
          aria-label="Đổi hướng dịch"
        >
          <ArrowLeftRight className="size-4" />
        </Button>
        <span
          className="min-w-0 flex-1 truncate text-center text-sm font-semibold text-primary"
          aria-current="true"
        >
          {targetLabel}
        </span>
      </div>

      <div className="grid md:grid-cols-2">
        <div className="relative flex min-h-[220px] flex-col border-b border-border/80 md:min-h-[280px] md:border-b-0 md:border-r">
          <label htmlFor="lookup-q" className="sr-only">
            Từ hoặc cụm cần tra
          </label>
          <textarea
            id="lookup-q"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setManualDirection(false);
              setOpen(true);
              setHighlight(0);
            }}
            onFocus={() => {
              setOpen(true);
              setHighlight(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Một từ hoặc cụm ngắn…"
            className="min-h-[160px] flex-1 resize-none bg-transparent px-4 py-4 text-lg leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/70 md:min-h-[220px]"
            autoFocus
            autoComplete="off"
            spellCheck={false}
            role="combobox"
            aria-expanded={showDropdown}
            aria-controls={listId}
            aria-autocomplete="list"
          />
          <div className="flex items-center justify-end gap-2 px-3 pb-3">
            <Button
              type="submit"
              disabled={!q.trim() || loading}
              className="h-10 min-w-24 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Đang tra…
                </>
              ) : (
                "Tra"
              )}
            </Button>
          </div>
          {showDropdown && (
            <ul
              id={listId}
              role="listbox"
              className="absolute inset-x-3 top-[4.5rem] z-30 max-h-56 overflow-auto rounded-xl border border-border/80 bg-background py-1 shadow-lg sm:inset-x-4"
            >
              <li className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Clock className="size-3" aria-hidden />
                Lịch sử
              </li>
              {suggestions.map((entry, index) => (
                <li
                  key={entry.id}
                  role="option"
                  aria-selected={index === highlight}
                >
                  <button
                    type="button"
                    className={`flex w-full cursor-pointer flex-col gap-0.5 px-3 py-2 text-left text-sm transition-colors ${
                      index === highlight ? "bg-muted" : "hover:bg-muted/70"
                    }`}
                    onMouseEnter={() => setHighlight(index)}
                    onClick={() => pick(entry)}
                  >
                    <span className="font-medium text-foreground">
                      {entry.result.term}
                      <span className="ml-2 font-normal text-muted-foreground">
                        → {entry.result.translation}
                      </span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {entry.result.direction === "en-vi"
                        ? "EN → VI"
                        : "VI → EN"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex min-h-[220px] flex-col bg-muted/30 md:min-h-[280px]">
          {loading && !result ? (
            <div
              className="flex flex-1 animate-pulse flex-col gap-3 p-5"
              aria-busy="true"
              aria-label="Đang tra từ"
            >
              <div className="h-8 w-40 rounded bg-muted" />
              <div className="h-5 w-28 rounded bg-muted" />
              <div className="h-6 w-3/4 rounded bg-muted" />
            </div>
          ) : result ? (
            <LookupResultCard
              result={result}
              onSave={onSave}
              saving={saving}
              saved={saved}
              variant="pane"
            />
          ) : (
            <p className="px-4 py-4 text-lg text-muted-foreground/70">
              Bản dịch
            </p>
          )}
        </div>
      </div>
    </form>
  );
}
