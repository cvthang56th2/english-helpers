import Image from "next/image";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  size?: number;
};

export function AppLogo({ className, size = 40 }: Props) {
  return (
    <Image
      src="/logo.png"
      alt="Word Ledger"
      width={size}
      height={size}
      className={cn("h-auto w-auto shrink-0 rounded-xl object-contain", className)}
      priority
    />
  );
}
