"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/client";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sent = searchParams.get("sent") === "1";

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState<"google" | "magic" | null>(null);

  async function signInGoogle() {
    setLoading("google");
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/",
      });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Đăng nhập Google thất bại"
      );
      setLoading(null);
    }
  }

  async function signInMagic(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading("magic");
    try {
      const { error } = await authClient.signIn.magicLink({
        email: email.trim(),
        callbackURL: "/",
      });
      if (error) throw new Error(error.message || "Không gửi được email");
      toast.success("Đã gửi magic link — kiểm tra email.");
      router.replace("/login?sent=1");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không gửi được email");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center gap-8 px-4 py-16">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--ink-accent)]">
          Word Ledger
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-semibold text-[var(--ink)]">
          Đăng nhập
        </h1>
        <p className="mt-2 text-muted-foreground">
          Lưu từ vựng mỗi ngày — tra EN⇔VI kèm IPA.
        </p>
        {sent && (
          <p className="mt-3 rounded-lg border border-[var(--paper-border)] bg-[var(--paper-card)] px-3 py-2 text-sm text-[var(--ink)]">
            Link đăng nhập đã gửi. Mở email và bấm vào link để vào sổ.
          </p>
        )}
      </div>

      <Button
        type="button"
        className="h-11 cursor-pointer"
        onClick={signInGoogle}
        disabled={loading !== null}
      >
        {loading === "google" ? "Đang mở Google…" : "Tiếp tục với Google"}
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-[var(--paper-border)]" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-[var(--paper)] px-2 text-muted-foreground">
            hoặc email
          </span>
        </div>
      </div>

      <form onSubmit={signInMagic} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ban@email.com"
            required
            autoComplete="email"
          />
        </div>
        <Button
          type="submit"
          variant="outline"
          className="h-11 w-full cursor-pointer"
          disabled={loading !== null}
        >
          {loading === "magic" ? "Đang gửi…" : "Gửi magic link"}
        </Button>
      </form>
    </div>
  );
}
