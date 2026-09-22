import { redirect } from "next/navigation";
import { NotebookApp } from "@/components/notebook-app";
import { auth } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { data: session } = await auth.getSession();

  if (!session?.user) {
    redirect("/login");
  }

  return <NotebookApp email={session.user.email} />;
}
