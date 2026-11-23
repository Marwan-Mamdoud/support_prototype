import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { StaffMember } from "@/lib/models";
import { requireSession } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { session, response } = await requireSession();
  if (response) return response;
  if (session.role !== "SUPER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  await connectDB();
  const body = await req.json();
  const update: any = {};
  if (body.assignedBrandIds !== undefined) {
    update.assignedBrandIds = body.assignedBrandIds;
  }
  if (body.active !== undefined) {
    update.active = body.active;
  }
  const staff = await StaffMember.findByIdAndUpdate(id, update, { new: true }).lean();
  if (!staff) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
