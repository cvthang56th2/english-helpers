import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getAuthedUser } from "@/lib/api/auth";
import { db } from "@/lib/db";
import { wordToRecord, words } from "@/lib/db/schema";
import { normalizeIpa } from "@/lib/words/manual";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

type PatchBody = {
  translation?: string;
  ipa?: string | null;
  part_of_speech?: string | null;
  definition?: string | null;
};

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
  const translation = body.translation?.replace(/\s+/g, " ").trim();
  if (!translation) {
    return NextResponse.json({ error: "Missing translation" }, { status: 400 });
  }

  // Empty optional fields keep the existing DB value (client omits or sends blank).
  const patch: {
    translation: string;
    ipa?: string | null;
    partOfSpeech?: string | null;
    definition?: string | null;
  } = { translation };

  const ipa = normalizeIpa(body.ipa);
  if (ipa) patch.ipa = ipa;

  const partOfSpeech = cleanOptional(body.part_of_speech);
  if (partOfSpeech) patch.partOfSpeech = partOfSpeech;

  const definition = cleanOptional(body.definition);
  if (definition) patch.definition = definition;

  try {
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
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Update failed" },
      { status: 500 }
    );
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
