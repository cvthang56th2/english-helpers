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

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className={cn("size-10 cursor-pointer", className)}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      disabled={!mounted}
      aria-label={isDark ? "Chuyển sang sáng" : "Chuyển sang tối"}
      title={isDark ? "Chế độ sáng" : "Chế độ tối"}
    >
      {mounted && isDark ? (
        <Sun className="size-4" aria-hidden />
      ) : (
        <Moon className="size-4" aria-hidden />
      )}
    </Button>
  );
}
