import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { orderModelFor } from "@/lib/models/Order";
import { requireSession } from "@/lib/serverAuth";
import { canEditStatus, allowedNextStatuses } from "@/lib/rules/editRules";
import { writeAudit } from "@/lib/audit";
import { ORDER_STATUSES } from "@/lib/rules/constants";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: { params: Promise<{ model: string; id: string }> }) {
  const { session, response } = await requireSession();
  if (response) return response;
  const { model, id } = await ctx.params;
  const Model = orderModelFor(model);
  if (!Model) return NextResponse.json({ error: "Invalid model" }, { status: 400 });
  await connectDB();
  const order = await Model.findById(id);
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!canEditStatus(order.status)) {
    return NextResponse.json({ error: "Status cannot be changed for this order" }, { status: 403 });
  }

  const body = await req.json();
  const newStatus = body.status;
  const reason = body.reason;

  if (!newStatus || !ORDER_STATUSES.includes(newStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const allowed = allowedNextStatuses(order.status);
  if (!allowed.includes(newStatus)) {
    return NextResponse.json({ error: `Cannot change status to ${newStatus}` }, { status: 400 });
  }

  const oldStatus = order.status;
  order.status = newStatus;
  order.statusHistory = order.statusHistory || {};
  order.statusHistory[newStatus] = new Date().toISOString();
  order.lastStatusChangedAt = new Date();

  if (newStatus === "cancelled") {
    if (!reason) return NextResponse.json({ error: "Cancellation reason is required" }, { status: 400 });
    order.cancellationReason = reason;
    order.cancelledBy = session.name || session.username || "support";
  }

  await order.save();

  await writeAudit({
    orderModel: model,
    orderId: order._id,
    action: "status_change",
    field: "status",
    oldValue: oldStatus,
    newValue: newStatus,
    userId: session.staffId,
    userName: session.name || session.username,
    userRole: session.role,
  });

  return NextResponse.json({ ok: true, status: newStatus });
}
