import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { TuruqOrder, IntegrationOrder, Client, Product } from "@/lib/models";
import { requireSession, getBrandFilter } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

function toDate(d: string | Date): Date {
  return d instanceof Date ? d : new Date(d);
}

export async function GET(req: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;
  await connectDB();

  const now = new Date();
  const hours24 = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const hours36 = new Date(now.getTime() - 36 * 60 * 60 * 1000);
  const hours48 = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  const brandFilter = getBrandFilter(session);
  const [turuq, integration] = await Promise.all([
    TuruqOrder.find(brandFilter).lean(),
    IntegrationOrder.find(brandFilter).lean(),
  ]);
  const orders: any[] = [
    ...turuq.map((o: any) => ({ ...o, _id: String(o._id), clientId: String(o.clientId) })),
    ...integration.map((o: any) => ({ ...o, _id: String(o._id), clientId: String(o.clientId) })),
  ];

  const openIssues = orders.filter((o) => o.hasOpenIssue).length;

  const outOfStockOrders = orders.filter((o) => o.status === "outOfStock");
  const outOfStockUids = new Set<string>();
  for (const o of outOfStockOrders) for (const pr of (o.products || [])) if (pr?.uid) outOfStockUids.add(pr.uid);
  const inStockProducts = await Product.find({ uid: { $in: [...outOfStockUids] }, quantity: { $gt: 0 } }).select("uid").lean();
  const inStockUidSet = new Set(inStockProducts.map((p: any) => p.uid));
  const outOfStockWithStock = outOfStockOrders.filter((o) => (o.products || []).some((pr: any) => inStockUidSet.has(pr.uid))).length;

  const pendingOver36h = orders.filter((o) => o.status === "pending" && toDate(o.lastStatusChangedAt) < hours36).length;
  const processingOver2d = orders.filter((o) => o.status === "processing" && toDate(o.lastStatusChangedAt) < hours48).length;
  const cancelledOver2d = orders.filter((o) => o.status === "cancelled" && toDate(o.lastStatusChangedAt) < hours48).length;
  const returnedOver2d = orders.filter((o) => o.status === "returned" && toDate(o.lastStatusChangedAt) < hours48).length;
  const outForDeliveryOver2d = orders.filter((o) => o.status === "outForDelivery" && toDate(o.lastStatusChangedAt) < hours48).length;

  const statusPending = orders.filter((o) => o.status === "pending").length;
  const statusProcessing = orders.filter((o) => o.status === "processing").length;
  const statusOutForDelivery = orders.filter((o) => o.status === "outForDelivery").length;
  const statusCancelled = orders.filter((o) => o.status === "cancelled").length;
  const statusReturned = orders.filter((o) => o.status === "returned").length;
  const statusPostponed = orders.filter((o) => o.status === "postponed").length;
  const statusQC = orders.filter((o) => o.status === "QC").length;
  const statusRTW = orders.filter((o) => o.status === "RTW").length;
  const statusRTO = orders.filter((o) => o.status === "RTO").length;
  const statusOutOfStock = orders.filter((o) => o.status === "outOfStock").length;

  // Product metrics (respect brand filter)
  const prodFilter: any = {};
  if (brandFilter && (brandFilter as any).clientId) {
    prodFilter.primaryClientId = (brandFilter as any).clientId;
  }
  const allProducts = await Product.find(prodFilter).lean();
  const totalProducts = allProducts.length;
  const inStockCount = allProducts.filter((p: any) => p.quantity > 0).length;
  const lowStockProducts = allProducts.filter((p: any) => p.quantity > 0 && p.quantity <= 20).length;
  const outStockProducts = allProducts.filter((p: any) => p.quantity <= 0).length;
  const totalProductValue = allProducts.reduce((s: number, p: any) => s + (p.unitPrice || 0) * (p.quantity || 0), 0);
  const statusDelivered = orders.filter((o) => o.status === "delivered").length;
  const statusCollected = orders.filter((o) => o.status === "collected").length;
  const statusPickedUp = orders.filter((o) => o.status === "pickedUp").length;
  const statusPacked = orders.filter((o) => o.status === "packed").length;
  const statusDroppedOff = orders.filter((o) => o.status === "droppedOff").length;

  const receivedStatuses = new Set(["processing", "packed", "pickedUp", "droppedOff", "QC", "outForDelivery", "delivered", "returned", "RTW", "RTO"]);
  const cancelledReceived = orders.filter((o) => o.status === "cancelled" && (o.statusHistory || {}) && Object.keys(o.statusHistory || {}).some((k) => receivedStatuses.has(k))).length;
  const cancelledNotReceived = orders.filter((o) => o.status === "cancelled" && !Object.keys(o.statusHistory || {}).some((k) => receivedStatuses.has(k))).length;

  return NextResponse.json({
    open_issues: openIssues,
    out_of_stock_with_stock: outOfStockWithStock,
    pending_over_36h: pendingOver36h,
    processing_over_2d: processingOver2d,
    cancelled_over_2d: cancelledOver2d,
    returned_over_2d: returnedOver2d,
    out_for_delivery_over_2d: outForDeliveryOver2d,
    status_pending: statusPending,
    status_processing: statusProcessing,
    status_out_for_delivery: statusOutForDelivery,
    status_cancelled: statusCancelled,
    status_returned: statusReturned,
    status_postponed: statusPostponed,
    status_QC: statusQC,
    status_RTW: statusRTW,
    status_RTO: statusRTO,
    status_outOfStock: statusOutOfStock,
    status_delivered: statusDelivered,
    status_collected: statusCollected,
    status_pickedUp: statusPickedUp,
    status_packed: statusPacked,
    status_droppedOff: statusDroppedOff,
    cancelled_received: cancelledReceived,
    cancelled_not_received: cancelledNotReceived,
    total_products: totalProducts,
    in_stock_products: inStockCount,
    low_stock_products: lowStockProducts,
    out_stock_products: outStockProducts,
    total_product_value: totalProductValue,
  });
}
