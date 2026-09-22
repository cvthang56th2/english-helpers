"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { AppLogo } from "@/components/app-logo";
import { ThemeToggle } from "@/components/theme-toggle";
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
    <div className="relative mx-auto flex min-h-full w-full max-w-md flex-col justify-center gap-8 px-4 py-16">
      <div className="absolute right-4 top-4 sm:right-0 sm:top-6">
        <ThemeToggle />
      </div>
      <div className="space-y-3">
        <AppLogo size={44} />
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Word Ledger
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Đăng nhập
          </h1>
          <p className="mt-2 text-muted-foreground leading-relaxed">
            Lưu từ vựng mỗi ngày — tra EN⇔VI kèm IPA.
          </p>
        </div>
        {sent && (
          <p
            role="status"
            className="rounded-xl border border-primary/20 bg-accent px-3.5 py-3 text-sm text-accent-foreground"
          >
            Link đăng nhập đã gửi. Mở email và bấm vào link để vào sổ.
          </p>
        )}
      </div>

      <div className="surface space-y-5 p-5 sm:p-6">
        <Button
          type="button"
          size="lg"
          className="h-11 w-full cursor-pointer"
          onClick={signInGoogle}
          disabled={loading !== null}
        >
          {loading === "google" ? "Đang mở Google…" : "Tiếp tục với Google"}
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase tracking-wide">
            <span className="bg-card px-2.5 text-muted-foreground">
              hoặc email
            </span>
          </div>
        </div>

        <form onSubmit={signInMagic} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ban@email.com"
                required
                autoComplete="email"
                className="h-11 pl-9"
              />
            </div>
          </div>
          <Button
            type="submit"
            variant="outline"
            size="lg"
            className="h-11 w-full cursor-pointer"
            disabled={loading !== null}
          >
            {loading === "magic" ? "Đang gửi…" : "Gửi magic link"}
          </Button>
        </form>
      </div>
    </div>
  );
}
