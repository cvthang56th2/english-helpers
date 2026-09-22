"use client";

import { useCallback, useEffect, useState } from "react";
import { LogOut, Search } from "lucide-react";
import { toast } from "sonner";
import { DayGroup } from "@/components/day-group";
import { LookupBar } from "@/components/lookup-bar";
import { LookupResultCard } from "@/components/lookup-result";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth/client";
import {
  fetchDictionary,
  langsFromDirection,
  translateClient,
} from "@/lib/lookup";
import type { Direction, LookupResult, WordRecord } from "@/lib/lookup/types";

type Props = {
  email: string | undefined;
};

export function NotebookApp({ email }: Props) {
  const [result, setResult] = useState<LookupResult | null>(null);
  const [looking, setLooking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [words, setWords] = useState<WordRecord[]>([]);
  const [query, setQuery] = useState("");
  const [loadingWords, setLoadingWords] = useState(true);

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

    try {
      // 1) Try server
      const res = await fetch("/api/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q, direction }),
      });

      if (res.ok) {
        const data = (await res.json()) as LookupResult;
        setResult(data);
        return;
      }

      // 2+3) Client Google → MyMemory + dictionary
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
      setResult({
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
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-8 sm:py-12">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--ink-accent)]">
            Word Ledger
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--ink)] sm:text-4xl">
            Sổ từ vựng
          </h1>
          {email && (
            <p className="mt-1 text-sm text-muted-foreground">{email}</p>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="cursor-pointer gap-1.5"
          onClick={signOut}
        >
          <LogOut className="size-3.5" />
          Thoát
        </Button>
      </header>

      <section className="space-y-4">
        <LookupBar onLookup={lookup} loading={looking} />
        {result && (
          <LookupResultCard
            result={result}
            onSave={save}
            saving={saving}
            saved={saved}
          />
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-medium text-[var(--ink)]">
            Sổ của bạn
          </h2>
          <div className="relative w-full max-w-[220px]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => onSearchNotebook(e.target.value)}
              placeholder="Tìm trong sổ…"
              className="h-9 pl-8 text-sm"
            />
          </div>
        </div>
        {loadingWords ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Đang tải…
          </p>
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
      </section>
    </div>
  );
}
