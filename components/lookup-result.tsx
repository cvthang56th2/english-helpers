"use client";

import { BookmarkPlus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AudioButton } from "@/components/audio-button";
import type { LookupResult } from "@/lib/lookup/types";
import { cn } from "@/lib/utils";

type Props = {
  result: LookupResult;
  onSave: () => void;
  saving?: boolean;
  saved?: boolean;
  variant?: "card" | "pane";
};

/** Prefer English lemma for pronunciation */
function speakText(result: LookupResult) {
  if (result.sourceLang === "en") return result.term;
  if (result.targetLang === "en") return result.translation;
  return result.term;
}

export function LookupResultCard({
  result,
  onSave,
  saving,
  saved,
  variant = "card",
}: Props) {
  const speak = speakText(result);
  const isPane = variant === "pane";

  return (
    <article
      className={cn(
        isPane
          ? "flex h-full flex-col p-4 sm:p-5"
          : "rounded-xl border border-border bg-card p-5 shadow-sm"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {result.term}
          </h2>
          {result.ipa ? (
            <p className="mt-1 font-[family-name:var(--font-ipa)] text-lg text-primary">
              /{result.ipa.replace(/^\/|\/$/g, "")}/
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              Chưa có IPA từ từ điển — vẫn nghe được bên dưới
            </p>
          )}
          <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
            {result.direction === "en-vi"
              ? "English → Tiếng Việt"
              : "Tiếng Việt → English"}
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
          className="cursor-pointer gap-1.5"
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

      <p className="mt-4 text-xl leading-snug text-foreground">
        {result.translation}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <AudioButton
          url={result.audioUsUrl}
          text={speak}
          label="US"
          lang="en-US"
        />
        <AudioButton
          url={result.audioUkUrl}
          text={speak}
          label="UK"
          lang="en-GB"
        />
      </div>

      {result.meanings.length > 0 && (
        <ul className="mt-4 space-y-2 border-t border-border pt-4">
          {result.meanings.slice(0, 2).map((m, i) => (
            <li
              key={`${m.partOfSpeech}-${i}`}
              className="text-sm leading-relaxed"
            >
              <span className="mr-2 italic text-muted-foreground">
                {m.partOfSpeech}
              </span>
              <span className="text-foreground/85">{m.definition}</span>
              {m.example && (
                <span className="mt-0.5 block text-muted-foreground">
                  “{m.example}”
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
