import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { orderModelFor, orderCollectionName } from "@/lib/models/Order";
import { Client, Courier, Product } from "@/lib/models";
import { requireSession, loadOrderWithAccess, canAccessBrand } from "@/lib/serverAuth";
import { canEditData } from "@/lib/rules/editRules";
import { computeTotal, computeSubtotal } from "@/lib/rules/shipping";
import { defaultShippingFee } from "@/lib/rules/constants";
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

  const { FINAL_STATUSES } = await import("@/lib/rules/constants");
  if (FINAL_STATUSES.has(order.status as any)) {
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
    "refundAmount",
    "exchangeAmount",
  ]);

  const rejected = Object.keys(body).filter((f) => !editableFields.has(f));
  if (rejected.length) {
    return NextResponse.json({ error: `Cannot edit fields: ${rejected.join(", ")}` }, { status: 400 });
  }

  // Per-field validation statuses
  const status = order.status;
  const type = order.type || "NORMAL";
  const TOTAL_STATUSES = new Set(["pending", "processing", "packed", "pickedUp", "outOfStock", "outForDelivery", "postponed"]);
  const PRODUCTS_NORMAL = new Set(["pending", "outOfStock"]);
  const PRODUCTS_REFUND_EXTRA = new Set(["processing", "outForDelivery", "postponed"]);
  const PHONE_STATUSES = new Set(["pending", "packed", "pickedUp", "processing", "outOfStock", "outForDelivery", "postponed"]);
  const ADDRESS_STATUSES = new Set(["pending", "packed", "pickedUp", "processing", "outForDelivery", "postponed", "outOfStock"]);
  const OTHER_STATUSES = new Set(["pending", "processing", "postponed", "outOfStock"]);

  function fieldAllowed(f: string): boolean {
    if (f === "products") {
      if (PRODUCTS_NORMAL.has(status)) return true;
      if (type === "REFUND" && PRODUCTS_REFUND_EXTRA.has(status)) return true;
      return false;
    }
    if (["subtotal", "total", "shippingFees", "shippingHandledBy", "paymentMethod", "paymentStatus", "refundAmount", "exchangeAmount"].includes(f)) {
      return TOTAL_STATUSES.has(status);
    }
    if (f === "customerPhone") return PHONE_STATUSES.has(status);
    if (f === "customerAddress" || f === "customerGovernorate") return ADDRESS_STATUSES.has(status);
    if (f === "customerName" || f === "customerFirstName" || f === "customerLastName") return true;
    return OTHER_STATUSES.has(status);
  }

  for (const f of Object.keys(body)) {
    if (!fieldAllowed(f)) {
      return NextResponse.json({ error: `Cannot edit ${f} in current status` }, { status: 400 });
    }
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

  // Trigger flags based on changed fields & status
  const trigProductsChanged = changedFields.some((c) => c.field === "products");
  const trigPhoneChanged = changedFields.some((c) => c.field === "customerPhone");
  const trigAddrChanged = changedFields.some((c) => c.field === "customerAddress");
  const trigGovChanged = changedFields.some((c) => c.field === "customerGovernorate");
  const trigAddress = trigAddrChanged || trigGovChanged;

  const hasOpenFlagTrig = (t: string) => (order.issueFlags || []).some((f: any) => f.type === t && f.state === "open") || newFlags.some((f: any) => f.type === t && f.state === "open");
  function pushTrig(flagType: string, note: string) {
    if (!hasOpenFlagTrig(flagType)) {
      newFlags.push({ type: flagType, note, reportedByRole: "system", reportedByUser: "system", reportedAt: new Date(), state: "open" });
    }
  }

  // Products triggers
  if (trigProductsChanged && type === "REFUND") {
    if (status === "processing" || status === "postponed") {
      pushTrig("reprint_bill_of_lading", "Products updated (refund) at " + status);
    }
    if (status === "outForDelivery") {
      pushTrig("reprint_bill_of_lading", "Products updated (refund) at out for delivery");
      pushTrig("courier_products_alert", "Update courier with new products");
    }
  }

  // Phone triggers
  if (trigPhoneChanged) {
    if (["packed", "pickedUp", "processing", "postponed"].includes(status)) {
      pushTrig("reprint_bill_of_lading", "Phone updated");
    }
    if (status === "outForDelivery") {
      pushTrig("reprint_bill_of_lading", "Phone updated at out for delivery");
      pushTrig("courier_phone_alert", "Update courier with new phone number");
    }
  }

  // Address triggers
  if (trigAddress) {
    if (["packed", "pickedUp", "processing", "postponed"].includes(status)) {
      pushTrig("reprint_bill_of_lading", "Address updated");
    }
    if (status === "outForDelivery") {
      pushTrig("reprint_bill_of_lading", "Address updated at out for delivery");
      pushTrig("courier_address_alert", "Update courier with new address");
    }
  }

  if (newFlags.length) {
    order.issueFlags.push(...newFlags);
    order.hasOpenIssue = true;
  }

  // Recompute totals when products/governorate/handler/paymentStatus change
  const productsChanged = body.products !== undefined;
  const govChanged2 = body.customerGovernorate !== undefined;
  const handlerChanged = body.shippingHandledBy !== undefined;
  const paymentChanged = body.paymentStatus !== undefined;
  if (productsChanged || govChanged2 || handlerChanged || paymentChanged) {
    const type = (order as any).type || "NORMAL";
    let productSum: number;
    if (type === "REFUND") {
      const amt = body.refundAmount !== undefined ? body.refundAmount : (order as any).refundAmount;
      productSum = Number(amt || 0);
    } else if (type === "EXCHANGE") {
      const amt = body.exchangeAmount !== undefined ? body.exchangeAmount : (order as any).exchangeAmount;
      productSum = Number(amt || 0);
    } else {
      const newProducts = body.products !== undefined ? body.products : (order as any).products;
      productSum = (newProducts || []).reduce((s: number, p: any) => s + (p.price || 0) * (p.quantity || 0), 0);
    }
    const handler = body.shippingHandledBy !== undefined ? body.shippingHandledBy : (order as any).shippingHandledBy;
    const gov = body.customerGovernorate !== undefined ? String(body.customerGovernorate).toUpperCase() : (order as any).customerGovernorate;
    let shippingFees: number;
    if (body.shippingFees !== undefined) {
      shippingFees = Number(body.shippingFees);
    } else {
      if (handler === "TURUQ") shippingFees = 0;
      else shippingFees = defaultShippingFee(gov);
    }
    const paymentStatus = body.paymentStatus !== undefined ? body.paymentStatus : (order as any).paymentStatus;
    const effectivePaymentStatus = paymentStatus || "UNPAID";
    if (handler === "TURUQ") shippingFees = 0;
    (order as any).shippingFees = shippingFees;
    if (body.refundAmount !== undefined) (order as any).refundAmount = Number(body.refundAmount);
    if (body.exchangeAmount !== undefined) (order as any).exchangeAmount = Number(body.exchangeAmount);
    (order as any).subtotal = computeSubtotal(type, productSum, shippingFees, handler, effectivePaymentStatus);
    (order as any).total = computeTotal(type, productSum, shippingFees, handler, effectivePaymentStatus);
    if (effectivePaymentStatus === "PAID") (order as any).total = 0;
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
