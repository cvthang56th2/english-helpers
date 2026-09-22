"use client";

import { useRef, useState } from "react";
import { Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  url?: string | null;
  /** Spoken text when using Web Speech / when url fails */
  text?: string;
  label: string;
  lang?: "en-US" | "en-GB";
  className?: string;
};

function speakWithSynthesis(text: string, lang: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    throw new Error("Speech synthesis unavailable");
  }
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = lang;
  const voices = window.speechSynthesis.getVoices();
  const match = voices.find((v) => v.lang === lang) ||
    voices.find((v) => v.lang.startsWith(lang.slice(0, 2)));
  if (match) utter.voice = match;
  window.speechSynthesis.speak(utter);
}

export function AudioButton({
  url,
  text,
  label,
  lang = "en-US",
  className,
}: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  const canPlay = Boolean(url || text);
  if (!canPlay) return null;

  async function play() {
    setPlaying(true);
    try {
      if (url) {
        if (!audioRef.current || audioRef.current.src !== url) {
          audioRef.current = new Audio(url);
          audioRef.current.addEventListener("ended", () => setPlaying(false));
          audioRef.current.addEventListener("pause", () => setPlaying(false));
          audioRef.current.addEventListener("error", () => {
            // Fall back to browser TTS
            if (text) {
              speakWithSynthesis(text, lang);
              setTimeout(() => setPlaying(false), 1200);
            } else {
              setPlaying(false);
            }
          });
        }
        await audioRef.current.play();
        return;
      }
      if (text) {
        speakWithSynthesis(text, lang);
        setTimeout(() => setPlaying(false), Math.max(800, text.length * 80));
      }
    } catch {
      try {
        if (text) {
          speakWithSynthesis(text, lang);
          setTimeout(() => setPlaying(false), 1200);
        } else {
          setPlaying(false);
        }
      } catch {
        setPlaying(false);
      }
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
