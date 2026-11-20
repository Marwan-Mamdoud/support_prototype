import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Alert } from "@/lib/models/Alert";
import { requireSession } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;
  await connectDB();
  const sp = req.nextUrl.searchParams;
  const handled = sp.get("handled");
  const filter: any = {};
  if (handled === "true") filter.handled = true;
  else if (handled === "false" || handled === "unhandled") filter.handled = false;
  const items = await Alert.find(filter).sort({ createdAt: -1 }).lean();
  return NextResponse.json({ items, total: items.length });
}
