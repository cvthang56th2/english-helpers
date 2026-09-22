"use client";

import { useCallback, useEffect, useState } from "react";
import { BookOpen, Clock, LogOut, Search } from "lucide-react";
import { toast } from "sonner";
import { AppLogo } from "@/components/app-logo";
import { DayGroup } from "@/components/day-group";
import { ManualAddForm } from "@/components/manual-add-form";
import { LookupHistoryList } from "@/components/lookup-history-list";
import {
  TranslatePanel,
  type TranslateSeed,
} from "@/components/translate-panel";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth/client";
import {
  fetchDictionary,
  langsFromDirection,
  translateClient,
} from "@/lib/lookup";
import {
  clearLookupHistory,
  pushLookupHistory,
  readLookupHistory,
  removeLookupHistory,
  type LookupHistoryEntry,
} from "@/lib/lookup/history";
import type { Direction, LookupResult, WordRecord } from "@/lib/lookup/types";

type Props = {
  email: string | undefined;
};

type MainTab = "notebook" | "history";

function NotebookSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Đang tải sổ">
      {[0, 1].map((i) => (
        <div key={i} className="surface space-y-3 p-4">
          <div className="h-3 w-32 animate-pulse rounded bg-muted" />
          <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

export function NotebookApp({ email }: Props) {
  const [result, setResult] = useState<LookupResult | null>(null);
  const [looking, setLooking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [words, setWords] = useState<WordRecord[]>([]);
  const [query, setQuery] = useState("");
  const [loadingWords, setLoadingWords] = useState(true);
  const [mainTab, setMainTab] = useState<MainTab>("notebook");
  const [history, setHistory] = useState<LookupHistoryEntry[]>([]);
  const [translateSeed, setTranslateSeed] = useState<TranslateSeed | null>(
    null
  );

  useEffect(() => {
    setHistory(readLookupHistory());
  }, []);

  function rememberResult(next: LookupResult) {
    setResult(next);
    setHistory((prev) => pushLookupHistory(next, prev));
  }

  function restoreFromHistory(entry: LookupHistoryEntry) {
    setLooking(false);
    setSaved(false);
    setResult(entry.result);
    setTranslateSeed({
      term: entry.result.term,
      direction: entry.result.direction,
      at: Date.now(),
    });
    setHistory((prev) => pushLookupHistory(entry.result, prev));
    setMainTab("notebook");
  }

  function clearResult() {
    setResult(null);
    setSaved(false);
  }

  const loadWords = useCallback(async (q = "") => {
    setLoadingWords(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      const res = await fetch(`/api/words?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không tải được sổ");
      setWords(data.words ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi tải sổ");
    } finally {
      setLoadingWords(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      void loadWords(query);
    }, query ? 280 : 0);
    return () => clearTimeout(t);
  }, [query, loadWords]);

  async function lookup(q: string, direction: Direction) {
    setLooking(true);
    setSaved(false);
    setResult(null);

    const { sourceLang, targetLang } = langsFromDirection(direction);

    async function enrichWithDictionary(
      base: LookupResult
    ): Promise<LookupResult> {
      if (base.ipa && base.audioUsUrl && base.meanings.length > 0) {
        return base;
      }
      const english =
        base.sourceLang === "en"
          ? base.term
          : base.targetLang === "en"
            ? base.translation
            : null;
      if (!english) {
        return {
          ...base,
          audioUsUrl: base.audioUsUrl,
          audioUkUrl: base.audioUkUrl,
        };
      }
      try {
        const dict = await fetchDictionary(english);
        if (!dict) return base;
        const primary = dict.meanings[0];
        return {
          ...base,
          ipa: base.ipa || dict.ipa,
          audioUsUrl: base.audioUsUrl || dict.audioUsUrl,
          audioUkUrl: base.audioUkUrl || dict.audioUkUrl,
          partOfSpeech: base.partOfSpeech || primary?.partOfSpeech || null,
          definition: base.definition || primary?.definition || null,
          meanings: base.meanings.length > 0 ? base.meanings : dict.meanings,
        };
      } catch {
        return base;
      }
    }

    try {
      const res = await fetch("/api/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q, direction }),
      });

      if (res.ok) {
        const data = (await res.json()) as LookupResult;
        // Server may return translation without IPA if dictionary timed out —
        // enrich from the browser.
        const enriched = await enrichWithDictionary(data);
        rememberResult(enriched);
        return;
      }

      toast.message("Server không dịch được — thử từ trình duyệt…");

      const englishWord = sourceLang === "en" ? q : null;
      const [translation, dictSource] = await Promise.all([
        translateClient(q, sourceLang, targetLang),
        englishWord
          ? fetchDictionary(englishWord).catch(() => null)
          : Promise.resolve(null),
      ]);

      let dict = dictSource;
      if (!dict && targetLang === "en") {
        dict = await fetchDictionary(translation.text).catch(() => null);
      }

      const primary = dict?.meanings[0];
      rememberResult({
        term: q,
        sourceLang,
        targetLang,
        direction,
        translation: translation.text,
        translateProvider: translation.provider,
        ipa: dict?.ipa ?? null,
        audioUsUrl: dict?.audioUsUrl ?? null,
        audioUkUrl: dict?.audioUkUrl ?? null,
        partOfSpeech: primary?.partOfSpeech ?? null,
        definition: primary?.definition ?? null,
        meanings: dict?.meanings ?? [],
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không tra được từ");
    } finally {
      setLooking(false);
    }
  }

  async function save() {
    if (!result || saving || saved) return;
    setSaving(true);
    try {
      const res = await fetch("/api/words", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          term: result.term,
          source_lang: result.sourceLang,
          target_lang: result.targetLang,
          translation: result.translation,
          ipa: result.ipa,
          audio_us_url: result.audioUsUrl,
          audio_uk_url: result.audioUkUrl,
          part_of_speech: result.partOfSpeech,
          definition: result.definition,
        }),
      });
      const data = await res.json();
      if (res.status === 409) {
        toast.message(data.error || "Từ này đã có trong sổ");
        setSaved(true);
        return;
      }
      if (!res.ok) throw new Error(data.error || "Không lưu được");
      setSaved(true);
      setWords((prev) => [data.word, ...prev]);
      toast.success("Đã lưu vào sổ");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi lưu");
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    await authClient.signOut();
    window.location.href = "/login";
  }

  function onSearchNotebook(value: string) {
    setQuery(value);
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pb-16 pt-6 sm:gap-8 sm:pt-10">
      <header className="sticky top-0 z-20 -mx-4 border-b border-border/80 bg-background/85 px-4 py-3 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <AppLogo size={40} />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                Word Ledger
              </p>
              <h1 className="truncate text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                Sổ từ vựng
              </h1>
              {email && (
                <p className="truncate text-xs text-muted-foreground">{email}</p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <ThemeToggle />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-10 cursor-pointer gap-1.5 px-3"
              onClick={signOut}
            >
              <LogOut className="size-3.5" />
              Thoát
            </Button>
          </div>
        </div>
      </header>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Tra từ</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Gõ một từ hoặc cụm ngắn — Enter hoặc Tra để dịch. Hướng tự nhận nếu
            chưa đổi tay.
          </p>
        </div>
        <TranslatePanel
          onLookup={lookup}
          onSelectHistory={restoreFromHistory}
          onClearResult={clearResult}
          history={history}
          loading={looking}
          result={result}
          onSave={save}
          saving={saving}
          saved={saved}
          seed={translateSeed}
        />
      </section>

      <section className="space-y-4">
        <div
          role="tablist"
          aria-label="Sổ và lịch sử"
          className="flex gap-1 rounded-xl border border-border/80 bg-muted/40 p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mainTab === "notebook"}
            className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              mainTab === "notebook"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setMainTab("notebook")}
          >
            <BookOpen className="size-3.5" aria-hidden />
            Sổ của bạn
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mainTab === "history"}
            className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              mainTab === "history"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setMainTab("history")}
          >
            <Clock className="size-3.5" aria-hidden />
            Lịch sử
            {history.length > 0 && (
              <span className="tabular-nums text-xs opacity-70">
                {history.length}
              </span>
            )}
          </button>
        </div>

        {mainTab === "notebook" ? (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  Sổ của bạn
                </h2>
                <p className="text-sm text-muted-foreground">
                  {loadingWords
                    ? "Đang tải…"
                    : words.length > 0
                      ? `${words.length} từ`
                      : "Chưa có từ nào"}
                </p>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                <ManualAddForm
                  onSaved={(word) => setWords((prev) => [word, ...prev])}
                />
                <div className="relative w-full sm:max-w-[240px]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => onSearchNotebook(e.target.value)}
                    placeholder="Tìm trong sổ…"
                    aria-label="Tìm trong sổ"
                    className="h-10 pl-9 text-sm"
                  />
                </div>
              </div>
            </div>
            {loadingWords ? (
              <NotebookSkeleton />
            ) : (
              <DayGroup
                words={words}
                onUpdated={(w) =>
                  setWords((prev) => prev.map((x) => (x.id === w.id ? w : x)))
                }
                onDeleted={(id) =>
                  setWords((prev) => prev.filter((x) => x.id !== id))
                }
              />
            )}
          </>
        ) : (
          <LookupHistoryList
            entries={history}
            onSelect={restoreFromHistory}
            onRemove={(id) => setHistory(removeLookupHistory(id, history))}
            onClear={() => {
              setHistory(clearLookupHistory());
              toast.message("Đã xóa lịch sử tra từ trên máy này");
            }}
          />
        )}
      </section>
    </div>
  );
}
