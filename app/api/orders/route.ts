import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { orderModelFor, IntegrationOrder } from "@/lib/models/Order";
import { requireSession, getBrandFilter, canAccessBrand } from "@/lib/serverAuth";
import { TuruqOrder, Client, Product } from "@/lib/models";
import { normalizePhone, isValidPhone } from "@/lib/rules/phone";
import { isAddressValid } from "@/lib/rules/address";
import { computeTotal, computeSubtotal } from "@/lib/rules/shipping";
import { defaultShippingFee } from "@/lib/rules/constants";
import { writeAudit } from "@/lib/audit";
import { Alert } from "@/lib/models/Alert";

export const dynamic = "force-dynamic";

// ---------- GET ----------
export async function GET(req: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;
  await connectDB();
  const sp = req.nextUrl.searchParams;
  const model = sp.get("model") || "turuq";
  const Model = orderModelFor(model);
  if (!Model) return NextResponse.json({ error: "Invalid model" }, { status: 400 });

  const page = Math.max(1, parseInt(sp.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(sp.get("limit") || "25")));
  const skip = (page - 1) * limit;

  const filter: any = { ...getBrandFilter(session) };
  const brand = sp.get("brand");
  if (brand) {
    const clients = await Client.find({ companyName: { $regex: brand, $options: "i" } }).select("_id");
    filter.clientId = { $in: clients.map((c: any) => c._id) };
  }
  const clientId = sp.get("clientId");
  if (clientId) filter.clientId = clientId;

  const status = sp.get("status");
  if (status) filter.status = status;

  const currentLocation = sp.get("currentLocation");
  if (currentLocation) filter.currentLocation = currentLocation;

  const governorate = sp.get("governorate");
  if (governorate) filter.customerGovernorate = governorate.toUpperCase();

  const serviceScheme = sp.get("serviceScheme");
  if (serviceScheme) {
    const { Client } = await import("@/lib/models");
    const clients = await Client.find({ serviceScheme }).select("_id");
    filter.clientId = { $in: clients.map((c: any) => c._id) };
  }

  const issueFlag = sp.get("issueFlag");
  if (issueFlag === "open") filter.hasOpenIssue = true;
  else if (issueFlag && issueFlag !== "any") filter["issueFlags.type"] = issueFlag;

  const carrier = sp.get("carrier");
  if (carrier) {
    const { Courier } = await import("@/lib/models");
    let couriers: any[] = [];
    if (carrier === "bosta") couriers = await Courier.find({ name: "Bosta" });
    else if (carrier === "shipblu") couriers = await Courier.find({ name: "ShipBlu" });
    else if (carrier === "turuq") couriers = await Courier.find({ outsourced: false });
    else {
      filter.courierId = carrier;
      couriers = [];
    }
    if (couriers.length) filter.courierId = { $in: couriers.map((c: any) => c._id) };
  }

  const conditions: any[] = [];
  const q = sp.get("q");
  if (q) {
    const rx = { $regex: q, $options: "i" };
    const ors: any[] = [{ oid: rx }, { customerPhone: rx }, { customerPhoneNormalized: rx }, { trackingNumber: rx }];
    if (model === "turuq") ors.push({ customerName: rx });
    else ors.push({ customerFirstName: rx }, { customerLastName: rx });
    conditions.push({ $or: ors });
  }
  const cPhone = sp.get("customerPhone");
  if (cPhone) {
    const rx = { $regex: cPhone, $options: "i" };
    conditions.push({ $or: [{ customerPhone: rx }, { customerPhoneNormalized: rx }] });
  }
  const cName = sp.get("customerName");
  if (cName) {
    const rx = { $regex: cName, $options: "i" };
    if (model === "turuq") conditions.push({ customerName: rx });
    else conditions.push({ $or: [{ customerFirstName: rx }, { customerLastName: rx }] });
  }
  const cAddr = sp.get("customerAddress");
  if (cAddr) {
    const rx = { $regex: cAddr, $options: "i" };
    conditions.push({ customerAddress: rx });
  }
  if (conditions.length) filter.$and = conditions;

  const from = sp.get("from");
  const to = sp.get("to");
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  const saved = sp.get("saved");
  if (saved === "hasOpenIssue") filter.hasOpenIssue = true;
  const card = sp.get("card");
  if (card === "in_progress") filter.status = { $in: ["processing", "pickedUp", "outForDelivery"] };
  if (card === "heading_to_customer") filter.status = "outForDelivery";
  if (card === "successful") filter.status = { $in: ["delivered", "collected"] };
  if (card === "waiting_decision") { filter.hasOpenIssue = true; filter.status = { $nin: ["delivered", "collected", "cancelled", "returned", "RTW", "RTO"] }; }
  if (card === "heading_to_you") filter.status = { $in: ["returned", "RTW", "RTO"] };
  if (card === "new") filter.status = "pending";
  const now = Date.now();
  const hoursAgo = (h: number) => new Date(now - h * 60 * 60 * 1000);
  if (card === "open_issues") { filter.hasOpenIssue = true; }
  if (card === "processing_over_2d") { filter.status = "processing"; filter.lastStatusChangedAt = { $lt: hoursAgo(48) }; }
  if (card === "pending_over_36h") { filter.status = "pending"; filter.lastStatusChangedAt = { $lt: hoursAgo(36) }; }
  if (card === "packed_over_1d") { filter.status = "packed"; filter.lastStatusChangedAt = { $lt: hoursAgo(24) }; }
  if (card === "pickedup_over_1d") { filter.status = "pickedUp"; filter.lastStatusChangedAt = { $lt: hoursAgo(24) }; }
  if (card === "cancelled_over_2d") { filter.status = "cancelled"; filter.lastStatusChangedAt = { $lt: hoursAgo(48) }; }
  if (card === "returned_over_2d") { filter.status = "returned"; filter.lastStatusChangedAt = { $lt: hoursAgo(48) }; }
  if (card === "out_for_delivery_over_2d") { filter.status = "outForDelivery"; filter.lastStatusChangedAt = { $lt: hoursAgo(48) }; }
  if (card === "status_pending") { filter.status = "pending"; }
  if (card === "status_processing") { filter.status = "processing"; }
  if (card === "status_out_for_delivery") { filter.status = "outForDelivery"; }
  if (card === "status_cancelled") { filter.status = "cancelled"; }
  if (card === "status_returned") { filter.status = "returned"; }
  if (card === "status_postponed") { filter.status = "postponed"; }
  if (card === "status_QC") { filter.status = "QC"; }
  if (card === "status_RTW") { filter.status = "RTW"; }
  if (card === "status_RTO") { filter.status = "RTO"; }
  if (card === "cancelled_received") {
    filter.status = "cancelled";
    filter.$or = [
      { "statusHistory.processing": { $exists: true } },
      { "statusHistory.packed": { $exists: true } },
      { "statusHistory.pickedUp": { $exists: true } },
      { "statusHistory.droppedOff": { $exists: true } },
      { "statusHistory.QC": { $exists: true } },
      { "statusHistory.outForDelivery": { $exists: true } },
      { "statusHistory.delivered": { $exists: true } },
      { "statusHistory.returned": { $exists: true } },
      { "statusHistory.RTW": { $exists: true } },
      { "statusHistory.RTO": { $exists: true } },
    ];
  }
  if (card === "cancelled_not_received") {
    filter.status = "cancelled";
    for (const st of ["processing", "packed", "pickedUp", "droppedOff", "QC", "outForDelivery", "delivered", "returned", "RTW", "RTO"]) {
      filter[`statusHistory.${st}`] = { $exists: false };
    }
  }
  if (card === "out_of_stock_with_stock") {
    const { Product } = await import("@/lib/models");
    const candidates = await Model.find({ ...filter, status: "outOfStock" }).select("_id products").lean();
    const uids = [...new Set(candidates.flatMap((o: any) => (o.products || []).map((p: any) => p.uid)))];
    const prods = await Product.find({ uid: { $in: uids } }).select("uid quantity").lean();
    const qmap = new Map(prods.map((p: any) => [p.uid, p.quantity]));
    const ids = candidates.filter((o: any) => (o.products || []).some((pr: any) => (qmap.get(pr.uid) ?? 0) >= pr.quantity)).map((o: any) => o._id);
    filter.status = "outOfStock";
    filter._id = { $in: ids };
  }
  if (saved === "cancelledBeforeDelivery") {
    filter.status = "cancelled";
    const ors = [{ "statusHistory.processing": { $exists: true } }, { "statusHistory.pickedUp": { $exists: true } }];
    filter.$or = ors;
    for (const s of ["outForDelivery", "delivered", "postponed", "returned", "RTW", "RTO", "collected", "droppedOff"]) {
      filter[`statusHistory.${s}`] = { $exists: false };
    }
  }

  const finishedStatuses = ["delivered", "collected", "returned", "RTW", "RTO", "cancelled"];
  const pipeline = [
    { $match: filter },
    { $addFields: {
      _finished: { $cond: [{ $in: ["$status", finishedStatuses] }, 0, 1] }
    } },
    { $sort: { _finished: 1, _prio: 1, createdAt: -1 } },
    { $skip: skip },
    { $limit: limit },
  ];
  const [items, total] = await Promise.all([
    Model.aggregate(pipeline as any),
    Model.countDocuments(filter),
  ]);

  const { Courier } = await import("@/lib/models");
  const clientIds = [...new Set(items.map((i: any) => String(i.clientId)))];
  const courierIds = [...new Set(items.map((i: any) => i.courierId ? String(i.courierId) : null).filter(Boolean))];
  const clients = await Client.find({ _id: { $in: clientIds } }).lean();
  const couriers = await Courier.find({ _id: { $in: courierIds } }).lean();
  const clientMap = new Map(clients.map((c: any) => [String(c._id), c]));
  const courierMap = new Map(couriers.map((c: any) => [String(c._id), c]));

  const enriched = items.map((it: any) => ({
    ...it,
    id: String(it._id),
    client: clientMap.get(String(it.clientId)) || null,
    courier: it.courierId ? courierMap.get(String(it.courierId)) || null : null,
  }));

  return NextResponse.json({ items: enriched, total, page, limit, pages: Math.ceil(total / limit) });
}

// ---------- POST ----------
export async function POST(req: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;
  await connectDB();
  const body = await req.json();
  const { clientId, customerName, customerPhone, customerGovernorate, customerAddress, products, paymentMethod, paymentStatus, shippingHandledBy, canOpenPackage, notes, subtotal: subIn, shippingFees: feeIn, type, source, provider, externalId, refundAmount, exchangeAmount } = body;

  if (!clientId) return NextResponse.json({ error: "Brand is required" }, { status: 400 });
  if (!canAccessBrand(session, clientId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const client = await Client.findById(clientId);
  if (!client) return NextResponse.json({ error: "Brand not found" }, { status: 404 });

  const phoneNorm = normalizePhone(customerPhone || "");
  const orderType = type || "NORMAL";
  let productSum = (products || []).reduce((s: number, p: any) => s + (p.price || 0) * (p.quantity || 0), 0);
  if (orderType === "REFUND") productSum = Number(refundAmount || 0);
  else if (orderType === "EXCHANGE") productSum = Number(exchangeAmount || 0);
  const handler = shippingHandledBy || "CUSTOMER";
  const effectivePaymentStatus = paymentStatus || "UNPAID";
  let shippingFees = feeIn;
  if (handler === "TURUQ") shippingFees = 0;
  if (shippingFees == null) shippingFees = defaultShippingFee(customerGovernorate);
  const subtotal = computeSubtotal(orderType, productSum, shippingFees, handler, effectivePaymentStatus);
  let total = computeTotal(orderType, productSum, shippingFees, handler, effectivePaymentStatus);
  if (effectivePaymentStatus === "PAID") total = 0;

  const defaultLocation = (type === "REFUND") ? "with_customer" : (client.serviceScheme === "WAREHOUSE" ? "warehouse" : "brand_storage");

  const orderSource = source === "integration" ? "integration" : "turuq";
  const oid = `TQ-${Date.now().toString().slice(-6)}`;

  const commonData = {
    oid,
    clientId: client._id,
    status: "pending",
    statusHistory: { pending: new Date().toISOString() },
    lastStatusChangedAt: new Date(),
    customerPhone: customerPhone || "",
    customerPhoneNormalized: phoneNorm,
    customerAddress: customerAddress || "",
    customerGovernorate: (customerGovernorate || "").toUpperCase(),
    products: products || [],
    subtotal,
    total,
    shippingFees,
    shippingHandledBy: handler,
    paymentMethod: paymentMethod || "CASH",
    paymentStatus: paymentStatus || "UNPAID",
    canOpenPackage: !!canOpenPackage,
    notes: notes || "",
    courierId: null,
    courierNotes: "",
    deliveryAttempts: 0,
    deliveryAttemptTimestamps: {},
    trackingNumber: null,
    currentLocation: defaultLocation,
    refundAmount: Number(refundAmount || 0),
    exchangeAmount: Number(exchangeAmount || 0),
    hasOpenIssue: false,
    issueFlags: [],
    cancellationReason: null,
    cancelledBy: null,
    cancellationImages: [],
    cancellationReviewStatus: "NONE",
    dropoffBatchId: null,
    tripBatchId: null,
    createdByStaffId: session.staffId,
  };

  let order: any;
  if (orderSource === "integration") {
    const nameParts = (customerName || "").split(" ");
    order = await IntegrationOrder.create({
      ...commonData,
      customerFirstName: nameParts[0] || "",
      customerLastName: nameParts.slice(1).join(" ") || "",
      provider: provider || "SHOPIFY",
      externalId: externalId || `EXT-${Date.now().toString().slice(-6)}`,
    });
  } else {
    order = await TuruqOrder.create({
      ...commonData,
      customerName: customerName || "",
      type: type || "NORMAL",
      courierAssignedAt: null,
    });
  }

  const flags: any[] = [];
  if (!isAddressValid(customerAddress || "")) {
    flags.push({ type: "invalid_address", note: "Address failed validation", reportedByRole: "system", reportedByUser: "system", reportedAt: new Date(), state: "open" });
  }
  if (!isValidPhone(phoneNorm)) {
    flags.push({ type: "invalid_phone_number", note: "Phone failed validation", reportedByRole: "system", reportedByUser: "system", reportedAt: new Date(), state: "open" });
  }

  // Stock check & deduct
  for (const p of products || []) {
    const prod = await Product.findOne({ uid: p.uid });
    if (prod) {
      const available = prod.quantity;
      if (p.quantity > available) {
        flags.push({ type: "outOfStock", note: `${p.name} ordered ${p.quantity} but only ${available} in stock`, reportedByRole: "system", reportedByUser: "system", reportedAt: new Date(), state: "open" });
      }
      prod.quantity -= p.quantity;
      await prod.save();
    }
  }

  if (flags.length) {
    order.issueFlags = flags as any;
    order.hasOpenIssue = true;
    await order.save();
    for (const f of order.issueFlags) {
      await Alert.create({ type: "NEW_FLAG", orderModel: orderSource, orderId: order._id, flagId: f._id, createdAt: f.reportedAt, handled: false });
    }
  }

  await writeAudit({ orderModel: orderSource, orderId: order._id, action: "create", field: null, oldValue: null, newValue: order.oid, userId: session.staffId, userName: session.name || session.username, userRole: session.role });

  return NextResponse.json({ id: String(order._id), oid: order.oid }, { status: 201 });
}
