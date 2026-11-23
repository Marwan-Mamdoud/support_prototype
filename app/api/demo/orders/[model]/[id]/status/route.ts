import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { orderModelFor } from "@/lib/models/Order";
import { Alert } from "@/lib/models/Alert";
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
  const newStatus = body.status;
  const reason = body.reason;
  if (newStatus === "pending" && order.status === "processing") {
    return NextResponse.json({ error: "Cannot move from processing back to pending" }, { status: 400 });
  }
  if (newStatus === "cancelled" && !reason) {
    return NextResponse.json({ error: "Cancellation reason is required" }, { status: 400 });
  }
  const old = order.status;
  order.status = newStatus;
  if (!order.statusHistory) order.statusHistory = {};
  order.statusHistory[newStatus] = new Date().toISOString();
  order.markModified("statusHistory");
  order.lastStatusChangedAt = new Date();
  if (newStatus === "cancelled") {
    order.cancellationReason = reason;
    order.cancelledBy = "simulator";

    const reasonToFlag: Record<string, string> = {
      WRONG_PHONE_NUMBER: "invalid_phone_number",
      CUSTOMER_UNREACHABLE: "invalid_phone_number",
      INCORRECT_OR_INCOMPLETE_ADDRESS: "invalid_address",
      PROBLEM_WITH_PRODUCT: "defective_items",
      BAD_SIZE: "defective_items",
      WRONG_ORDER: "defective_items",
    };
    const flagType = reasonToFlag[reason];
    if (flagType) {
      const hasOpen = (order.issueFlags || []).some((f: any) => f.type === flagType && f.state === "open");
      if (!hasOpen) {
        order.issueFlags = order.issueFlags || [];
        order.issueFlags.push({ type: flagType, note: `Cancelled: ${reason}`, reportedByRole: "system", reportedByUser: "system", reportedAt: new Date(), state: "open" } as any);
        order.hasOpenIssue = true;
        order.markModified("issueFlags");
        const { Alert } = await import("@/lib/models/Alert");
        const savedFlag = (order.issueFlags as any[])[order.issueFlags.length - 1];
        await Alert.create({ type: "NEW_FLAG", orderModel: model, orderId: order._id, flagId: savedFlag._id, createdAt: new Date(), handled: false });
      }
    }
  }
  // location defaults
  const client = await (await import("@/lib/models")).Client.findById(order.clientId);
  const scheme = client?.serviceScheme;
  const isWarehouse = scheme === "WAREHOUSE";
  const isRefund = order.type === "REFUND";

  const normalLoc: Record<string, string> = {
    pending: isWarehouse ? "warehouse" : "brand_storage",
    processing: "distribution_center",
    pickedUp: "with_courier",
    outForDelivery: "with_courier",
    postponed: "with_courier",
    outOfStock: "warehouse",
    delivered: "with_customer",
    collected: "with_customer",
    returned: "distribution_center",
    QC: isWarehouse ? "warehouse" : "brand_storage",
    droppedOff: "distribution_center",
    RTW: "warehouse",
    RTO: "brand_storage",
  };

  const refundLoc: Record<string, string> = {
    pending: "with_customer",
    processing: "with_customer",
    outForDelivery: "with_customer",
    postponed: "with_customer",
    cancelled: "with_customer",
    delivered: "distribution_center",
  };

  let newLoc: string | undefined;
  if (isRefund && newStatus in refundLoc) newLoc = refundLoc[newStatus];
  else if (newStatus in normalLoc) newLoc = normalLoc[newStatus];
  if (newLoc !== undefined) order.currentLocation = newLoc;

  // auto-resolve courier_finance_alert if location no longer with courier
  if (order.currentLocation !== "with_courier") {
    let resolved = false;
    for (const f of order.issueFlags || []) {
      if (f.type === "courier_finance_alert" && f.state === "open") {
        f.state = "resolved"; f.resolvedBy = "system"; f.resolvedAt = new Date(); f.resolveNote = "Location left courier";
        resolved = true;
      }
    }
    if (resolved) {
      order.markModified("issueFlags");
      order.hasOpenIssue = (order.issueFlags || []).some((f: any) => f.state === "open");
    }
  }

  // auto-resolve reprint_bill_of_lading if status leaves processing
  if (old === "processing" && newStatus !== "processing") {
    let resolved = false;
    for (const f of order.issueFlags || []) {
      if (f.type === "reprint_bill_of_lading" && f.state === "open") {
        f.state = "resolved"; f.resolvedBy = "system"; f.resolvedAt = new Date(); f.resolveNote = "Left processing";
        resolved = true;
      }
    }
    if (resolved) {
      order.markModified("issueFlags");
      order.hasOpenIssue = (order.issueFlags || []).some((f: any) => f.state === "open");
    }
  }
  await order.save();

  await writeAudit({ orderModel: model, orderId: order._id, action: "status_change", field: "status", oldValue: old, newValue: newStatus, userId: session.staffId, userName: session.name || session.username, userRole: session.role });

  // alert if open flag
  const hasOpen = (order.issueFlags || []).some((f: any) => f.state === "open");
  if (hasOpen) {
    const existing = await Alert.findOne({ type: "STATUS_UPDATED", orderModel: model, orderId: order._id, handled: false });
    if (!existing) {
      const openFlag = (order.issueFlags as any[]).find((f: any) => f.state === "open");
      await Alert.create({ type: "STATUS_UPDATED", orderModel: model, orderId: order._id, flagId: openFlag?._id, createdAt: new Date(), handled: false });
    }
  }

  return NextResponse.json({ ok: true });
}
