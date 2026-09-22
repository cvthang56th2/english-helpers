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
import { Label } from "@/components/ui/label";
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
      <li className="group flex items-start justify-between gap-3 px-3 py-3.5 transition-colors hover:bg-muted/40">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-lg font-semibold tracking-tight text-foreground">
              {word.term}
            </span>
            {word.ipa && (
              <span className="font-[family-name:var(--font-ipa)] text-sm text-primary">
                /{word.ipa.replace(/^\/|\/$/g, "")}/
              </span>
            )}
          </div>
          <p className="mt-0.5 text-foreground/90">{word.translation}</p>
          {word.definition && (
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
              {word.part_of_speech && (
                <em className="mr-1.5">{word.part_of_speech}</em>
              )}
              {word.definition}
            </p>
          )}
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <AudioButton
              url={word.audio_us_url}
              text={word.source_lang === "en" ? word.term : word.translation}
              label="US"
              lang="en-US"
            />
            <AudioButton
              url={word.audio_uk_url}
              text={word.source_lang === "en" ? word.term : word.translation}
              label="UK"
              lang="en-GB"
            />
          </div>
        </div>
        <div className="flex shrink-0 gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-9 cursor-pointer"
            onClick={() => {
              setTranslation(word.translation);
              setEditOpen(true);
            }}
            aria-label={`Sửa ${word.term}`}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-9 cursor-pointer text-destructive hover:text-destructive"
            onClick={remove}
            disabled={busy}
            aria-label={`Xóa ${word.term}`}
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
          <div className="space-y-1.5">
            <Label htmlFor={`edit-${word.id}`}>Bản dịch</Label>
            <Input
              id={`edit-${word.id}`}
              value={translation}
              onChange={(e) => setTranslation(e.target.value)}
              autoFocus
              className="h-10"
            />
          </div>
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
              className="cursor-pointer"
              onClick={saveEdit}
              disabled={busy}
            >
              {busy ? "Đang lưu…" : "Lưu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
