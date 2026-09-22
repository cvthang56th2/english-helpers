"use client";

import { BookmarkPlus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AudioButton } from "@/components/audio-button";
import type { LookupResult } from "@/lib/lookup/types";

type Props = {
  result: LookupResult;
  onSave: () => void;
  saving?: boolean;
  saved?: boolean;
};

export function LookupResultCard({ result, onSave, saving, saved }: Props) {
  return (
    <article className="rounded-xl border border-[var(--paper-border)] bg-[var(--paper-card)] p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-[var(--ink)]">
            {result.term}
          </h2>
          {result.ipa && (
            <p className="mt-1 font-[family-name:var(--font-ipa)] text-lg text-[var(--ink-accent)]">
              /{result.ipa.replace(/^\/|\/$/g, "")}/
            </p>
          )}
          <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
            {result.direction === "en-vi" ? "English → Tiếng Việt" : "Tiếng Việt → English"}
            {result.translateProvider !== "server" && (
              <span className="ml-2 normal-case tracking-normal opacity-70">
                · {result.translateProvider}
              </span>
            )}
          </p>
        </div>
        <Button
          type="button"
          onClick={onSave}
          disabled={saving || saved}
          className="cursor-pointer gap-1.5 bg-[var(--ink-accent)] text-white hover:bg-[var(--ink-accent)]/90 disabled:opacity-70"
        >
          {saved ? (
            <>
              <Check className="size-4" /> Đã lưu
            </>
          ) : (
            <>
              <BookmarkPlus className="size-4" /> {saving ? "Đang lưu…" : "Lưu"}
            </>
          )}
        </Button>
      </div>

      <p className="mt-4 text-xl leading-snug text-[var(--ink)]">{result.translation}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        <AudioButton url={result.audioUsUrl} label="US" />
        <AudioButton url={result.audioUkUrl} label="UK" />
      </div>

      {result.meanings.length > 0 && (
        <ul className="mt-4 space-y-2 border-t border-[var(--paper-border)] pt-4">
          {result.meanings.slice(0, 2).map((m, i) => (
            <li key={`${m.partOfSpeech}-${i}`} className="text-sm leading-relaxed">
              <span className="mr-2 italic text-muted-foreground">{m.partOfSpeech}</span>
              <span className="text-[var(--ink)]/85">{m.definition}</span>
              {m.example && (
                <span className="mt-0.5 block text-muted-foreground">“{m.example}”</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
