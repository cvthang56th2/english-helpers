import { NextResponse } from "next/server";
import { formatInTimeZone } from "date-fns-tz";
import { and, eq, inArray } from "drizzle-orm";
import { getAuthedUser } from "@/lib/api/auth";
import { db } from "@/lib/db";
import { words } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const TZ = "Asia/Ho_Chi_Minh";

export async function POST(request: Request) {
  const authResult = await getAuthedUser();
  if ("error" in authResult) return authResult.error;

  const { user } = authResult;
  const body = (await request.json()) as { ids?: unknown };
  const ids = Array.isArray(body.ids)
    ? body.ids.filter((id): id is string => typeof id === "string" && id.length > 0)
    : [];

  if (ids.length < 2 || new Set(ids).size !== ids.length) {
    return NextResponse.json({ error: "Invalid order" }, { status: 400 });
  }

  try {
    const rows = await db
      .select({ id: words.id, createdAt: words.createdAt })
      .from(words)
      .where(and(eq(words.userId, user.id), inArray(words.id, ids)));

    if (rows.length !== ids.length) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const days = new Set(
      rows.map((row) => {
        const created =
          row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt);
        return formatInTimeZone(created, TZ, "yyyy-MM-dd");
      })
    );
    if (days.size !== 1) {
      return NextResponse.json(
        { error: "Words must be on the same day" },
        { status: 400 }
      );
    }

    await Promise.all(
      ids.map((id, position) =>
        db
          .update(words)
          .set({ position })
          .where(and(eq(words.id, id), eq(words.userId, user.id)))
      )
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Reorder failed" },
      { status: 500 }
    );
  }
}
