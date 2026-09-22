"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

export function ThemeToggle({ className }: Props) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Keep labels/icons theme-agnostic until mount so SSR HTML matches the
  // first client render (resolvedTheme is only known in the browser).
  const isDark = mounted && resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className={cn("size-10 cursor-pointer", className)}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      disabled={!mounted}
      aria-label={
        !mounted
          ? "Đổi giao diện"
          : isDark
            ? "Chuyển sang sáng"
            : "Chuyển sang tối"
      }
      title={
        !mounted
          ? "Đổi giao diện"
          : isDark
            ? "Chế độ sáng"
            : "Chế độ tối"
      }
    >
      {isDark ? (
        <Sun className="size-4" aria-hidden />
      ) : (
        <Moon className="size-4" aria-hidden />
      )}
    </Button>
  );
}
