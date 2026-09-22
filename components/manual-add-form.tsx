"use client";

import { useState, type FormEvent } from "react";
import { ArrowLeftRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Direction, WordRecord } from "@/lib/lookup/types";
import {
  buildManualWordBody,
  validateManualWord,
} from "@/lib/words/manual";

type Props = {
  onSaved: (word: WordRecord) => void;
};

export function ManualAddForm({ onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [translation, setTranslation] = useState("");
  const [ipa, setIpa] = useState("");
  const [direction, setDirection] = useState<Direction>("en-vi");
  const [partOfSpeech, setPartOfSpeech] = useState("");
  const [definition, setDefinition] = useState("");
  const [busy, setBusy] = useState(false);

  function reset() {
    setTerm("");
    setTranslation("");
    setIpa("");
    setDirection("en-vi");
    setPartOfSpeech("");
    setDefinition("");
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = validateManualWord({
      term,
      translation,
      ipa,
      direction,
      partOfSpeech,
      definition,
    });
    if (!parsed.ok) {
      toast.error(parsed.error);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/words", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildManualWordBody(parsed.value)),
      });
      const data = await res.json();
      if (res.status === 409) {
        toast.message(data.error || "Từ này đã có trong sổ");
        return;
      }
      if (!res.ok) throw new Error(data.error || "Không lưu được");
      onSaved(data.word as WordRecord);
      toast.success("Đã thêm vào sổ");
      reset();
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi lưu");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="h-10 cursor-pointer gap-1.5"
        onClick={() => setOpen(true)}
      >
        <Plus className="size-3.5" />
        Thêm thủ công
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={submit} className="grid gap-4">
            <DialogHeader>
              <DialogTitle>Thêm từ thủ công</DialogTitle>
              <DialogDescription>
                Dùng khi bạn đã tra Google — nhập từ, nghĩa và IPA.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="flex items-center justify-center gap-2">
                <span className="text-sm font-medium text-primary">
                  {direction === "en-vi" ? "English" : "Tiếng Việt"}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="cursor-pointer"
                  onClick={() =>
                    setDirection((d) => (d === "en-vi" ? "vi-en" : "en-vi"))
                  }
                  aria-label="Đổi hướng"
                >
                  <ArrowLeftRight className="size-3.5" />
                </Button>
                <span className="text-sm font-medium text-primary">
                  {direction === "en-vi" ? "Tiếng Việt" : "English"}
                </span>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="manual-term">Từ</Label>
                <Input
                  id="manual-term"
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder="cat"
                  className="h-10"
                  autoFocus
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="manual-translation">Nghĩa / bản dịch</Label>
                <Input
                  id="manual-translation"
                  value={translation}
                  onChange={(e) => setTranslation(e.target.value)}
                  placeholder="mèo"
                  className="h-10"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="manual-ipa">IPA</Label>
                <Input
                  id="manual-ipa"
                  value={ipa}
                  onChange={(e) => setIpa(e.target.value)}
                  placeholder="/kæt/"
                  className="h-10 font-[family-name:var(--font-ipa)]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="manual-pos">Loại từ</Label>
                  <Input
                    id="manual-pos"
                    value={partOfSpeech}
                    onChange={(e) => setPartOfSpeech(e.target.value)}
                    placeholder="noun"
                    className="h-10"
                  />
                </div>
                <div className="space-y-1.5 col-span-1">
                  <Label htmlFor="manual-def">Định nghĩa</Label>
                  <Input
                    id="manual-def"
                    value={definition}
                    onChange={(e) => setDefinition(e.target.value)}
                    placeholder="tùy chọn"
                    className="h-10"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer"
                onClick={() => setOpen(false)}
              >
                Hủy
              </Button>
              <Button type="submit" className="cursor-pointer" disabled={busy}>
                {busy ? "Đang lưu…" : "Lưu vào sổ"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
