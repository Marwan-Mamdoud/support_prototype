import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function requireSession() {
  const session = await getSession();
  if (!session) return { session: null, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  return { session, response: null };
}
