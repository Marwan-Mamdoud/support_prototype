import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { orderModelFor, orderCollectionName } from "@/lib/models/Order";
import { Client, Courier } from "@/lib/models";
import { requireSession } from "@/lib/serverAuth";
import { editableScope, canEditField } from "@/lib/rules/editRules";
import { writeAudit } from "@/lib/audit";
import { Alert } from "@/lib/models/Alert";
import { normalizePhone } from "@/lib/rules/phone";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, ctx: { params: Promise<{ model: string; id: string }> }) {
  const { session, response } = await requireSession();
  if (response) return response;
  const { model, id } = await ctx.params;
  const Model = orderModelFor(model);
  if (!Model) return NextResponse.json({ error: "Invalid model" }, { status: 400 });
  await connectDB();
  const order = await Model.findById(id).lean();
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const client = await Client.findById((order as any).clientId).lean();
  const courier = (order as any).courierId ? await Courier.findById((order as any).courierId).lean() : null;
  const AuditLogModel = (await import("@/lib/models/AuditLog")).AuditLog;
  const audit = await AuditLogModel.find({ orderModel: model, orderId: id }).sort({ at: -1 }).lean();
  // attach staff name
  const { StaffMember } = await import("@/lib/models");
  const missingIds = [...new Set(audit.filter((a: any) => !a.userName).map((a: any) => a.userId).filter(Boolean))];
  const staff = missingIds.length ? await (await import("@/lib/models")).StaffMember.find({ _id: { $in: missingIds } }).lean() : [];
  const nameMap = new Map(staff.map((s: any) => [String(s._id), s.name]));
  const enrichedAudit = audit.map((a: any) => ({ ...a, userName: a.userName || nameMap.get(String(a.userId)) || a.userId }));
  return NextResponse.json({ order: { ...order, id: String((order as any)._id), client, courier }, audit: enrichedAudit });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ model: string; id: string }> }) {
  const { session, response } = await requireSession();
  if (response) return response;
  const { model, id } = await ctx.params;
  const Model = orderModelFor(model);
  if (!Model) return NextResponse.json({ error: "Invalid model" }, { status: 400 });
  await connectDB();
  const order = await Model.findById(id);
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const scope = editableScope(order.status, Object.keys(order.statusHistory || {}));
  if (scope === "none") {
    return NextResponse.json({ error: "This order is read-only" }, { status: 403 });
  }

  const allowedFields = Object.keys(body).filter((f) => canEditField(scope, f));
  const rejected = Object.keys(body).filter((f) => !canEditField(scope, f) && f !== "status");
  if (rejected.length) {
    return NextResponse.json({ error: `Cannot edit fields: ${rejected.join(", ")}` }, { status: 400 });
  }
  // prevent status change via PATCH
  if (body.status && body.status !== order.status) {
    return NextResponse.json({ error: "Status cannot be changed via edit" }, { status: 400 });
  }

  const changedFields: { field: string; old: any; new: any }[] = [];
  for (const f of allowedFields) {
    const oldVal = (order as any)[f];
    let newVal = body[f];
    if (f === "customerGovernorate") newVal = String(newVal || "").toUpperCase();
    (order as any)[f] = newVal;
    changedFields.push({ field: f, old: oldVal, new: newVal });
  }

  // recompute total if subtotal/total/shipping changed? Trust client but recompute total by rule if subtotal/shipping changed
  if (allowedFields.includes("subtotal") || allowedFields.includes("shippingFees") || allowedFields.includes("shippingHandledBy")) {
    const handler = order.shippingHandledBy;
    if (handler === "TURUQ") order.shippingFees = 0;
    order.total = handler === "CUSTOMER" ? order.subtotal + order.shippingFees : order.subtotal;
  }

  await order.save();

  // audit rows
  for (const c of changedFields) {
    await writeAudit({ orderModel: model, orderId: order._id, action: "edit", field: c.field, oldValue: c.old, newValue: c.new, userId: session.staffId, userName: session.name || session.username, userRole: session.role });
  }

  // outbox if address/subtotal/total changed
  const tracked = ["customerAddress", "subtotal", "total"];
  const changedTracked = changedFields.filter((c) => tracked.includes(c.field));
  if (changedTracked.length) {
    const client = await Client.findById(order.clientId);
    const { BrandEmailOutbox } = await import("@/lib/models");
    await BrandEmailOutbox.create({
      clientId: order.clientId,
      toEmail: client?.email || "",
      subject: `Order ${order.oid} updated`,
      body: JSON.stringify({ order: order.oid, changed: changedTracked, staff: session.name || session.username, time: new Date().toISOString() }),
      createdAt: new Date(),
    });
  }

  return NextResponse.json({ ok: true });
}
