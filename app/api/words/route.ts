import { NextResponse } from "next/server";
import { and, desc, eq, gte, ilike, lte, or } from "drizzle-orm";
import { getAuthedUser } from "@/lib/api/auth";
import { db } from "@/lib/db";
import { wordToRecord, words } from "@/lib/db/schema";
import type { Lang } from "@/lib/lookup/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authResult = await getAuthedUser();
  if ("error" in authResult) return authResult.error;

  const { user } = authResult;
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const conditions = [eq(words.userId, user.id)];

  if (q) {
    conditions.push(
      or(ilike(words.term, `%${q}%`), ilike(words.translation, `%${q}%`))!
    );
  }
  if (from) {
    conditions.push(gte(words.createdAt, new Date(from)));
  }
  if (to) {
    conditions.push(lte(words.createdAt, new Date(to)));
  }

  try {
    const rows = await db
      .select()
      .from(words)
      .where(and(...conditions))
      .orderBy(desc(words.createdAt));

    return NextResponse.json({ words: rows.map(wordToRecord) });
  } catch (err) {
    console.error("[api/words GET]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load words" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const authResult = await getAuthedUser();
  if ("error" in authResult) return authResult.error;

  const { user } = authResult;

  try {
    const body = (await request.json()) as {
      term?: string;
      source_lang?: Lang;
      target_lang?: Lang;
      translation?: string;
      ipa?: string | null;
      audio_us_url?: string | null;
      audio_uk_url?: string | null;
      part_of_speech?: string | null;
      definition?: string | null;
    };

    const term = body.term?.trim();
    if (
      !term ||
      !body.translation?.trim() ||
      !body.source_lang ||
      !body.target_lang
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const [row] = await db
      .insert(words)
      .values({
        userId: user.id,
        term,
        sourceLang: body.source_lang,
        targetLang: body.target_lang,
        translation: body.translation.trim(),
        ipa: body.ipa ?? null,
        audioUsUrl: body.audio_us_url ?? null,
        audioUkUrl: body.audio_uk_url ?? null,
        partOfSpeech: body.part_of_speech ?? null,
        definition: body.definition ?? null,
      })
      .returning();

    return NextResponse.json({ word: wordToRecord(row) }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Save failed";
    if (
      message.includes("unique") ||
      message.includes("duplicate") ||
      // Neon/Postgres unique violation
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
    console.error("[api/words POST]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
