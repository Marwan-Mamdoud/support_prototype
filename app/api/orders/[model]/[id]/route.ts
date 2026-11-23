import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { orderModelFor, orderCollectionName } from "@/lib/models/Order";
import { Client, Courier, Product } from "@/lib/models";
import { requireSession, loadOrderWithAccess, canAccessBrand } from "@/lib/serverAuth";
import { canEditData } from "@/lib/rules/editRules";
import { writeAudit } from "@/lib/audit";
import { Alert } from "@/lib/models/Alert";
import { normalizePhone, isValidPhone } from "@/lib/rules/phone";
import { isAddressValid } from "@/lib/rules/address";

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
  if (!canAccessBrand(session, (order as any).clientId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
  const { order, error } = await loadOrderWithAccess(Model, id, session);
  if (error) return error;

  if (!canEditData(order.status)) {
    return NextResponse.json({ error: "This order is read-only" }, { status: 403 });
  }

  const body = await req.json();
  const editableFields = new Set([
    "customerName",
    "customerFirstName",
    "customerLastName",
    "customerPhone",
    "customerAddress",
    "customerGovernorate",
    "products",
    "subtotal",
    "shippingFees",
    "total",
    "paymentMethod",
    "paymentStatus",
    "shippingHandledBy",
    "specialHandling",
    "notes",
  ]);

  const rejected = Object.keys(body).filter((f) => !editableFields.has(f));
  if (rejected.length) {
    return NextResponse.json({ error: `Cannot edit fields: ${rejected.join(", ")}` }, { status: 400 });
  }

  if (body.clientId !== undefined && !canAccessBrand(session, body.clientId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const changedFields: { field: string; old: any; new: any }[] = [];
  for (const f of Object.keys(body)) {
    const oldVal = (order as any)[f];
    let newVal = body[f];
    if (f === "customerGovernorate") newVal = String(newVal || "").toUpperCase();
    if (f === "customerPhone") (order as any).customerPhoneNormalized = normalizePhone(newVal || "");
    (order as any)[f] = newVal;
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changedFields.push({ field: f, old: oldVal, new: newVal });
    }
  }

  const hasOpenFlag = (type: string) => (order.issueFlags || []).some((f: any) => f.type === type && f.state === "open");
  const newFlags: any[] = [];

  if (body.customerAddress !== undefined && isAddressValid(body.customerAddress || "")) {
    for (const f of order.issueFlags || []) {
      if (f.type === "invalid_address" && f.state === "open") {
        f.state = "resolved"; f.resolvedBy = "system"; f.resolvedAt = new Date(); f.resolveNote = "Address corrected";
      }
    }
  }
  if (body.customerAddress !== undefined && !isAddressValid(body.customerAddress || "") && !hasOpenFlag("invalid_address")) {
    newFlags.push({ type: "invalid_address", note: "Address failed validation", reportedByRole: "system", reportedByUser: "system", reportedAt: new Date(), state: "open" });
  }
  if (body.customerPhone !== undefined && isValidPhone((order as any).customerPhoneNormalized || "")) {
    for (const f of order.issueFlags || []) {
      if (f.type === "invalid_phone_number" && f.state === "open") {
        f.state = "resolved"; f.resolvedBy = "system"; f.resolvedAt = new Date(); f.resolveNote = "Phone corrected";
      }
    }
  }
  if (body.customerPhone !== undefined && !isValidPhone((order as any).customerPhoneNormalized || "") && !hasOpenFlag("invalid_phone_number")) {
    newFlags.push({ type: "invalid_phone_number", note: "Phone failed validation", reportedByRole: "system", reportedByUser: "system", reportedAt: new Date(), state: "open" });
  }

  // address_update_required: governorate changed but address not updated in same request
  const govChanged = changedFields.some((c) => c.field === "customerGovernorate");
  const addrChanged = body.customerAddress !== undefined;
  if (govChanged && !addrChanged && !hasOpenFlag("address_update_required")) {
    newFlags.push({ type: "address_update_required", note: "Governorate changed without address update", reportedByRole: "system", reportedByUser: "system", reportedAt: new Date(), state: "open" });
  }

  // courier_finance_alert: finance data changed while location is with courier
  const financeFields = ["subtotal", "shippingFees", "total", "paymentMethod", "paymentStatus"];
  const financeChanged = financeFields.some((f) => body[f] !== undefined);
  if (financeChanged && (order as any).currentLocation === "with_courier" && !hasOpenFlag("courier_finance_alert")) {
    newFlags.push({ type: "courier_finance_alert", note: "Finance updated while order with courier", reportedByRole: "system", reportedByUser: "system", reportedAt: new Date(), state: "open" });
  }

  // reprint_bill_of_lading: phone or address changed while status=processing & location=distribution_center
  const contactChanged = body.customerPhone !== undefined || body.customerAddress !== undefined;
  if (contactChanged && (order as any).status === "processing" && (order as any).currentLocation === "distribution_center" && !hasOpenFlag("reprint_bill_of_lading")) {
    newFlags.push({ type: "reprint_bill_of_lading", note: "Phone/address updated while processing at distribution center", reportedByRole: "system", reportedByUser: "system", reportedAt: new Date(), state: "open" });
  }

  // Auto-resolve: if address updated now, resolve open address_update_required flags
  if (addrChanged) {
    for (const f of order.issueFlags || []) {
      if (f.type === "address_update_required" && f.state === "open") {
        f.state = "resolved";
        f.resolvedBy = "system";
        f.resolvedAt = new Date();
        f.resolveNote = "Address updated";
      }
    }
  }

  if (body.products !== undefined) {
    const oldProducts = (order as any).products || [];
    const newProducts = body.products || [];
    for (const p of oldProducts) {
      const prod = await Product.findOne({ uid: p.uid });
      if (prod) {
        prod.quantity += p.quantity;
        await prod.save();
      }
    }
    for (const p of newProducts) {
      const prod = await Product.findOne({ uid: p.uid });
      if (prod) {
        const available = prod.quantity;
        if (p.quantity > available && !hasOpenFlag("outOfStock")) {
          newFlags.push({ type: "outOfStock", note: `${p.name} ordered ${p.quantity} but only ${available} in stock`, reportedByRole: "system", reportedByUser: "system", reportedAt: new Date(), state: "open" });
        }
        prod.quantity -= p.quantity;
        await prod.save();
      }
    }
  }

  if (newFlags.length) {
    order.issueFlags.push(...newFlags);
    order.hasOpenIssue = true;
  }

  order.markModified("issueFlags");
  order.hasOpenIssue = (order.issueFlags || []).some((f: any) => f.state === "open");
  await order.save();

  if (newFlags.length) {
    const savedFlags = order.issueFlags.slice(-newFlags.length);
    for (const f of savedFlags) {
      await Alert.create({ type: "NEW_FLAG", orderModel: model, orderId: order._id, flagId: f._id, createdAt: f.reportedAt, handled: false });
    }
  }

  for (const c of changedFields) {
    await writeAudit({ orderModel: model, orderId: order._id, action: "edit", field: c.field, oldValue: c.old, newValue: c.new, userId: session.staffId, userName: session.name || session.username, userRole: session.role });
  }

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
