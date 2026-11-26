import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { orderModelFor } from "@/lib/models/Order";
import { requireSession, loadOrderWithAccess } from "@/lib/serverAuth";
import { canEditData } from "@/lib/rules/editRules";
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
  if (!canEditData(order.status)) {
    return NextResponse.json({ error: "Address is locked for this order" }, { status: 403 });
  }
  const body = await req.json();
  const old = order.customerAddress;
  order.customerAddress = body.address;
  if (body.governorate) order.customerGovernorate = String(body.governorate).toUpperCase();

  // Address triggers
  const status = order.status;
  const trigFlags: string[] = [];
  if (["packed", "pickedUp", "processing", "postponed"].includes(status)) {
    trigFlags.push("reprint_bill_of_lading");
  }
  if (status === "outForDelivery") {
    if (!trigFlags.includes("reprint_bill_of_lading")) trigFlags.push("reprint_bill_of_lading");
    trigFlags.push("courier_address_alert");
  }
  const hasOpenFlag = (t: string) => (order.issueFlags || []).some((f: any) => f.type === t && f.state === "open");
  const newTrig: any[] = [];
  for (const ft of trigFlags) {
    if (!hasOpenFlag(ft)) {
      newTrig.push({ type: ft, note: ft === "courier_address_alert" ? "Update courier with new address" : "Address updated", reportedByRole: "system", reportedByUser: "system", reportedAt: new Date(), state: "open" });
    }
  }

  const { isAddressValid } = await import("@/lib/rules/address");
  const newFlags: any[] = [...newTrig];
  if (!isAddressValid(body.address || "") && !hasOpenFlag("invalid_address")) {
    newFlags.push({ type: "invalid_address", note: "Address failed validation", reportedByRole: "system", reportedByUser: "system", reportedAt: new Date(), state: "open" });
  }
  // auto-resolve invalid_address if now valid
  if (isAddressValid(body.address || "")) {
    for (const f of order.issueFlags || []) {
      if (f.type === "invalid_address" && f.state === "open") { f.state = "resolved"; f.resolvedBy = "system"; f.resolvedAt = new Date(); f.resolveNote = "Address corrected"; }
    }
  }
  if (newFlags.length) {
    order.issueFlags.push(...newFlags);
    order.hasOpenIssue = true;
    await order.save();
    const savedNewFlags = (order.issueFlags as any[]).slice(-newFlags.length);
    for (let i = 0; i < newFlags.length; i++) {
      const { Alert } = await import("@/lib/models/Alert");
      await Alert.create({ type: "NEW_FLAG", orderModel: model, orderId: order._id, flagId: savedNewFlags[i]._id, createdAt: new Date(), handled: false });
    }
  } else {
    order.hasOpenIssue = (order.issueFlags || []).some((f: any) => f.state === "open");
    await order.save();
  }
  await writeAudit({ orderModel: model, orderId: order._id, action: "apply_address", field: "customerAddress", oldValue: old, newValue: body.address, userId: session.staffId, userName: session.name || session.username, userRole: session.role });
  return NextResponse.json({ ok: true });
}
