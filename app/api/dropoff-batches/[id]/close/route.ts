import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { DropoffBatch } from "@/lib/models/Batch";
import { requireSession } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { session, response } = await requireSession();
  if (response) return response;
  const { id } = await ctx.params;
  await connectDB();
  const batch = await DropoffBatch.findById(id);
  if (!batch) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await req.json();
  if (body.otp !== batch.otp) return NextResponse.json({ error: "Wrong OTP" }, { status: 400 });
  batch.status = "CLOSED";
  batch.endDate = new Date();
  batch.finishedBy = session.name || session.username;
  await batch.save();
  return NextResponse.json({ ok: true });
}