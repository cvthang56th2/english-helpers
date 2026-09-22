"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AudioButton } from "@/components/audio-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { WordRecord } from "@/lib/lookup/types";

type Props = {
  word: WordRecord;
  onUpdated: (word: WordRecord) => void;
  onDeleted: (id: string) => void;
};

export function WordCard({ word, onUpdated, onDeleted }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [translation, setTranslation] = useState(word.translation);
  const [busy, setBusy] = useState(false);

  async function saveEdit() {
    const next = translation.trim();
    if (!next || next === word.translation) {
      setEditOpen(false);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/words/${word.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ translation: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không sửa được");
      onUpdated(data.word);
      setEditOpen(false);
      toast.success("Đã cập nhật");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(`Xóa “${word.term}”?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/words/${word.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không xóa được");
      onDeleted(word.id);
      toast.success("Đã xóa");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <li className="group flex items-start justify-between gap-3 border-b border-[var(--paper-border)] py-3 last:border-0">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--ink)]">
              {word.term}
            </span>
            {word.ipa && (
              <span className="font-[family-name:var(--font-ipa)] text-sm text-[var(--ink-accent)]">
                /{word.ipa.replace(/^\/|\/$/g, "")}/
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[var(--ink)]/90">{word.translation}</p>
          {word.definition && (
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
              {word.part_of_speech && (
                <em className="mr-1.5">{word.part_of_speech}</em>
              )}
              {word.definition}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-1.5">
            <AudioButton url={word.audio_us_url} label="US" />
            <AudioButton url={word.audio_uk_url} label="UK" />
          </div>
        </div>
        <div className="flex shrink-0 gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="cursor-pointer"
            onClick={() => {
              setTranslation(word.translation);
              setEditOpen(true);
            }}
            aria-label="Sửa"
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="cursor-pointer text-destructive"
            onClick={remove}
            disabled={busy}
            aria-label="Xóa"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </li>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sửa bản dịch — {word.term}</DialogTitle>
          </DialogHeader>
          <Input
            value={translation}
            onChange={(e) => setTranslation(e.target.value)}
            autoFocus
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              onClick={() => setEditOpen(false)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              className="cursor-pointer bg-[var(--ink-accent)] text-white hover:bg-[var(--ink-accent)]/90"
              onClick={saveEdit}
              disabled={busy}
            >
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
