import { NextResponse } from "next/server";
import { performLookup } from "@/lib/lookup";
import type { Direction } from "@/lib/lookup/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      q?: string;
      direction?: Direction;
    };

    const q = body.q?.trim();
    const direction = body.direction;

    if (!q) {
      return NextResponse.json({ error: "Missing q" }, { status: 400 });
    }
    if (direction !== "en-vi" && direction !== "vi-en") {
      return NextResponse.json({ error: "Invalid direction" }, { status: 400 });
    }

    const result = await performLookup(q, direction);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/lookup]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Lookup failed" },
      { status: 502 }
    );
  }
}
