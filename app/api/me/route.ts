import { NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/api/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const authResult = await getAuthedUser();
  if ("error" in authResult) return authResult.error;
  return NextResponse.json({ user: authResult.user });
}
