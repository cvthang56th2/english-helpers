"use client";

import { useRef, useState } from "react";
import { Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  url: string | null | undefined;
  label: string;
  className?: string;
};

export function AudioButton({ url, label, className }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  if (!url) return null;

  async function play() {
    if (!audioRef.current) {
      audioRef.current = new Audio(url!);
      audioRef.current.addEventListener("ended", () => setPlaying(false));
      audioRef.current.addEventListener("pause", () => setPlaying(false));
    }
    try {
      setPlaying(true);
      await audioRef.current.play();
    } catch {
      setPlaying(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={play}
      className={cn("gap-1.5 cursor-pointer", className)}
      aria-label={`Phát âm ${label}`}
    >
      <Volume2 className={cn("size-3.5", playing && "animate-pulse")} />
      {label}
    </Button>
  );
}
