import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";

export type AuthedUser = {
  id: string;
  email?: string | null;
  name?: string | null;
};

export async function getAuthedUser(): Promise<
  { user: AuthedUser } | { error: NextResponse }
> {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    },
  };
}
