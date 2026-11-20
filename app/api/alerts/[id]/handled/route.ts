import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Alert } from "@/lib/models/Alert";
import { requireSession } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { session, response } = await requireSession();
  if (response) return response;
  const { id } = await ctx.params;
  await connectDB();
  const alert = await Alert.findById(id);
  if (!alert) return NextResponse.json({ error: "Not found" }, { status: 404 });
  alert.handled = true;
  alert.handledBy = session.name || session.username;
  alert.handledAt = new Date();
  await alert.save();
  return NextResponse.json({ ok: true });
}
