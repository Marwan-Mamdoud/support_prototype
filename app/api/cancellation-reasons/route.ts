import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/serverAuth";
import { activeCancellationReasons } from "@/lib/rules/cancellationReasons";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;
  return NextResponse.json({ items: activeCancellationReasons() });
}
