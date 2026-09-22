import type { Direction, Lang } from "./types";

const VI_CHARS =
  /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

export function detectLang(text: string): Lang {
  return VI_CHARS.test(text.trim()) ? "vi" : "en";
}

export function directionFromLangs(from: Lang, to: Lang): Direction {
  return `${from}-${to}` as Direction;
}

export function langsFromDirection(direction: Direction): {
  sourceLang: Lang;
  targetLang: Lang;
} {
  const [sourceLang, targetLang] = direction.split("-") as [Lang, Lang];
  return { sourceLang, targetLang };
}

export function inferDirection(text: string): Direction {
  return detectLang(text) === "vi" ? "vi-en" : "en-vi";
}
