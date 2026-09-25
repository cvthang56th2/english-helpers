import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getAuthedUser } from "@/lib/api/auth";
import { db } from "@/lib/db";
import { wordToRecord, words } from "@/lib/db/schema";
import { googleTtsUrl } from "@/lib/lookup/dictionary";
import { normalizeIpa } from "@/lib/words/manual";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

type PatchBody = {
  term?: string;
  translation?: string;
  ipa?: string | null;
  part_of_speech?: string | null;
  definition?: string | null;
};

function cleanText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function cleanOptional(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed || null;
}

export async function PATCH(request: Request, { params }: Params) {
  const authResult = await getAuthedUser();
  if ("error" in authResult) return authResult.error;

  const { id } = await params;
  const { user } = authResult;

  const body = (await request.json()) as PatchBody;

  try {
    const [existing] = await db
      .select()
      .from(words)
      .where(and(eq(words.id, id), eq(words.userId, user.id)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const term = body.term != null ? cleanText(body.term) : existing.term;
    const translation =
      body.translation != null
        ? cleanText(body.translation)
        : existing.translation;

    if (!term) {
      return NextResponse.json({ error: "Missing term" }, { status: 400 });
    }
    if (!translation) {
      return NextResponse.json({ error: "Missing translation" }, { status: 400 });
    }

    // Empty optional fields keep the existing DB value (client omits or sends blank).
    const patch: {
      term: string;
      translation: string;
      ipa?: string | null;
      partOfSpeech?: string | null;
      definition?: string | null;
      audioUsUrl?: string | null;
      audioUkUrl?: string | null;
    } = { term, translation };

    const ipa = normalizeIpa(body.ipa);
    if (ipa) patch.ipa = ipa;

    const partOfSpeech = cleanOptional(body.part_of_speech);
    if (partOfSpeech) patch.partOfSpeech = partOfSpeech;

    const definition = cleanOptional(body.definition);
    if (definition) patch.definition = definition;

    const englishText =
      existing.sourceLang === "en"
        ? term
        : existing.targetLang === "en"
          ? translation
          : null;
    const previousEnglish =
      existing.sourceLang === "en"
        ? existing.term
        : existing.targetLang === "en"
          ? existing.translation
          : null;
    if (englishText && englishText !== previousEnglish) {
      patch.audioUsUrl = googleTtsUrl(englishText, "en-US");
      patch.audioUkUrl = googleTtsUrl(englishText, "en-GB");
    }

    const [row] = await db
      .update(words)
      .set(patch)
      .where(and(eq(words.id, id), eq(words.userId, user.id)))
      .returning();

    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ word: wordToRecord(row) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    if (
      message.includes("unique") ||
      message.includes("duplicate") ||
      (typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code?: string }).code === "23505")
    ) {
      return NextResponse.json(
        { error: "Từ này đã có trong sổ", code: "duplicate" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const authResult = await getAuthedUser();
  if ("error" in authResult) return authResult.error;

  const { id } = await params;
  const { user } = authResult;

  try {
    const deleted = await db
      .delete(words)
      .where(and(eq(words.id, id), eq(words.userId, user.id)))
      .returning({ id: words.id });

    if (deleted.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Delete failed" },
      { status: 500 }
    );
  }
}
