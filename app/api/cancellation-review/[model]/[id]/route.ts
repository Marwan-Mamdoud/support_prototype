import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { orderModelFor } from "@/lib/models/Order";
import { requireSession, loadOrderWithAccess } from "@/lib/serverAuth";
import { writeAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: { params: Promise<{ model: string; id: string }> }) {
  const { session, response } = await requireSession();
  if (response) return response;
  const { model, id } = await ctx.params;
  const Model = orderModelFor(model);
  if (!Model) return NextResponse.json({ error: "Invalid model" }, { status: 400 });
  await connectDB();
  const { order, error } = await loadOrderWithAccess(Model, id, session);
  if (error) return error;
  const body = await req.json();
  order.cancellationReviewStatus = body.decision; // APPROVED | REJECTED
  order.cancellationReviewedBy = session.name || session.username;
  order.cancellationReviewedAt = new Date();
  order.cancellationReviewNote = body.note || "";
  await order.save();
  await writeAudit({ orderModel: model, orderId: order._id, action: "cancellation_review", field: "cancellationReviewStatus", oldValue: "PENDING", newValue: body.decision, userId: session.staffId, userName: session.name || session.username, userRole: session.role });
  return NextResponse.json({ ok: true });
}
