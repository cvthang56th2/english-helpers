import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getAuthedUser } from "@/lib/api/auth";
import { db } from "@/lib/db";
import { wordToRecord, words } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const authResult = await getAuthedUser();
  if ("error" in authResult) return authResult.error;

  const { id } = await params;
  const { user } = authResult;

  const body = (await request.json()) as { translation?: string };
  const translation = body.translation?.trim();
  if (!translation) {
    return NextResponse.json({ error: "Missing translation" }, { status: 400 });
  }

  try {
    const [row] = await db
      .update(words)
      .set({ translation })
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
