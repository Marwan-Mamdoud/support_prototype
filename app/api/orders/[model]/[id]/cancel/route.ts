import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { orderModelFor } from "@/lib/models/Order";
import { getCancellationReason } from "@/lib/rules/cancellationReasons";
import { requireSession, loadOrderWithAccess } from "@/lib/serverAuth";
import { writeAudit } from "@/lib/audit";
import { FINAL_STATUSES } from "@/lib/rules/constants";

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
  if (FINAL_STATUSES.has(order.status as any)) return NextResponse.json({ error: "Order is final" }, { status: 400 });
  if (order.status === "cancelled") return NextResponse.json({ error: "Already cancelled" }, { status: 400 });

  const body = await req.json();
  const reasonCode = body.reason;
  const reason = getCancellationReason(reasonCode);
  if (!reason) return NextResponse.json({ error: "Invalid reason" }, { status: 400 });
  const images = body.images || [];
  if (reason.requiresAttachment && (!images || images.length === 0)) {
    return NextResponse.json({ error: "Attachment required for this reason" }, { status: 400 });
  }

  const old = order.status;
  order.status = "cancelled";
  if (!order.statusHistory) order.statusHistory = {};
  order.statusHistory["cancelled"] = new Date().toISOString();
  order.lastStatusChangedAt = new Date();
  order.cancelledBy = "SUPPORT";
  order.cancellationReason = reasonCode;
  order.cancellationImages = images;
  order.cancellationReviewStatus = images.length > 0 ? "PENDING" : "NONE";

  // Auto-add flag based on cancellation reason
  const reasonToFlag: Record<string, string> = {
    WRONG_PHONE_NUMBER: "invalid_phone_number",
    CUSTOMER_UNREACHABLE: "invalid_phone_number",
    INCORRECT_OR_INCOMPLETE_ADDRESS: "invalid_address",
    PROBLEM_WITH_PRODUCT: "defective_items",
    BAD_SIZE: "defective_items",
    WRONG_ORDER: "defective_items",
  };
  const flagType = reasonToFlag[reasonCode];
  if (flagType) {
    const hasOpen = (order.issueFlags || []).some((f: any) => f.type === flagType && f.state === "open");
    if (!hasOpen) {
      order.issueFlags = order.issueFlags || [];
      order.issueFlags.push({ type: flagType, note: `Cancelled: ${reason.label}`, reportedByRole: "system", reportedByUser: "system", reportedAt: new Date(), state: "open" } as any);
      order.hasOpenIssue = true;
      // create alert
      const { Alert } = await import("@/lib/models/Alert");
      const savedFlag = order.issueFlags[order.issueFlags.length - 1];
      await Alert.create({ type: "NEW_FLAG", orderModel: model, orderId: order._id, flagId: savedFlag._id, createdAt: new Date(), handled: false });
    }
  }

  await order.save();

  await writeAudit({ orderModel: model, orderId: order._id, action: "cancel", field: "status", oldValue: old, newValue: "cancelled", userId: session.staffId, userName: session.name || session.username, userRole: session.role });

  return NextResponse.json({ ok: true });
}
