import type { Metadata } from "next";
import { Fraunces, Source_Sans_3, Noto_Serif } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin", "latin-ext"],
  variable: "--font-display",
  display: "swap",
});

const sans = Source_Sans_3({
  subsets: ["latin", "latin-ext", "vietnamese"],
  variable: "--font-sans",
  display: "swap",
});

const ipa = Noto_Serif({
  subsets: ["latin", "latin-ext"],
  variable: "--font-ipa",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Word Ledger — Sổ từ vựng",
  description: "Tra EN⇔VI, IPA, và lưu từ vựng học mỗi ngày.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${display.variable} ${sans.variable} ${ipa.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[var(--paper)] text-[var(--ink)]">
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
