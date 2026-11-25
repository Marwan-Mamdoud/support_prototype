import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { TuruqOrder, IntegrationOrder, Client, DropoffBatch, Courier, StaffMember, Alert, SupportNote, AuditLog } from "@/lib/models";
import { requireSession, getBrandFilter } from "@/lib/serverAuth";
import { FINAL_STATUSES, SUCCESS_STATUSES, ISSUE_FLAG_TYPES } from "@/lib/rules/constants";
import { computeBrandMetrics, MinimalOrder } from "@/lib/brandMetrics";

export const dynamic = "force-dynamic";

const HEATMAP_STATUSES = ["pending", "processing", "outOfStock", "outForDelivery", "returned"];
const AGE_BUCKETS = [
  { label: "0-1 day", maxHours: 24 },
  { label: "2-3 days", maxHours: 72 },
  { label: "4-7 days", maxHours: 168 },
  { label: "+7 days", maxHours: Infinity },
];

function ageBucket(hours: number): string {
  for (const b of AGE_BUCKETS) {
    if (hours <= b.maxHours) return b.label;
  }
  return AGE_BUCKETS[AGE_BUCKETS.length - 1].label;
}

function toDate(d: string | Date): Date {
  return d instanceof Date ? d : new Date(d);
}

function hoursAgo(d: string | Date, now: Date): number {
  return (now.getTime() - toDate(d).getTime()) / (60 * 60 * 1000);
}

function daysAgo(n: number, now: Date): Date {
  return new Date(now.getTime() - n * 24 * 60 * 60 * 1000);
}

export async function GET(req: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;
  await connectDB();

  const now = new Date();
  const hours24 = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const hours36 = new Date(now.getTime() - 36 * 60 * 60 * 1000);
  const hours48 = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const days7 = daysAgo(7, now);
  const days30 = daysAgo(30, now);
  const startToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const brandFilter = getBrandFilter(session);
  const [turuq, integration, clients, dropoffs, couriers, staff, alerts, notes, auditLogs] = await Promise.all([
    TuruqOrder.find(brandFilter).lean(),
    IntegrationOrder.find(brandFilter).lean(),
    Client.find(Object.keys(brandFilter).length ? { _id: { $in: (brandFilter as any).clientId.$in } } : {}).lean(),
    DropoffBatch.find({}).lean(),
    Courier.find({}).lean(),
    StaffMember.find({}).lean(),
    Alert.find({ handled: false }).lean(),
    SupportNote.find({ done: false }).lean(),
    AuditLog.find({}).lean(),
  ]);

  const orders: MinimalOrder[] = [
    ...turuq.map((o: any) => ({ ...o, model: "turuq" as const, _id: String(o._id), clientId: String(o.clientId) })),
    ...integration.map((o: any) => ({ ...o, model: "integration" as const, _id: String(o._id), clientId: String(o.clientId) })),
  ];

  const clientMap = new Map(clients.map((c: any) => [String(c._id), c.companyName]));
  const orderIds = new Set(orders.map((o) => o._id));

  // SECTION 1: Problematic Pending Orders
  const pendingOrders = orders.filter((o) => o.status === "pending");
  const totalPending = pendingOrders.length;
  const pendingWithoutFlag = pendingOrders.filter((o) => !o.hasOpenIssue).length;

  // Open issues by type
  const openIssueCounts: Record<string, { count: number; oldestAgeHours: number }> = {};
  for (const o of orders) {
    for (const f of o.issueFlags || []) {
      if (f.state !== "open") continue;
      const type = f.type || "other";
      const age = hoursAgo(f.reportedAt, now);
      if (!openIssueCounts[type]) openIssueCounts[type] = { count: 0, oldestAgeHours: 0 };
      openIssueCounts[type].count++;
      openIssueCounts[type].oldestAgeHours = Math.max(openIssueCounts[type].oldestAgeHours, age);
    }
  }
  const openIssuesByType = Object.entries(openIssueCounts).map(([type, data]) => ({ type, ...data }));

  const outOfStockOver7Days = orders.filter((o) => o.status === "outOfStock" && toDate(o.lastStatusChangedAt) < days7).length;

  const overdueReturns = orders.filter(
    (o) => o.status === "returned" && toDate(o.lastStatusChangedAt) < hours48
  ).length;

  const processingOver2d = orders.filter((o) => o.status === "processing" && toDate(o.lastStatusChangedAt) < hours48).length;
  const pendingOver36h = orders.filter((o) => o.status === "pending" && toDate(o.lastStatusChangedAt) < hours36).length;
  const packedOver1d = orders.filter((o) => o.status === "packed" && toDate(o.lastStatusChangedAt) < hours24).length;
  const pickedupOver1d = orders.filter((o) => o.status === "pickedUp" && toDate(o.lastStatusChangedAt) < hours24).length;

  const outOfStockOrders = orders.filter((o) => o.status === "outOfStock");
  const outOfStockUids = new Set<string>();
  for (const o of outOfStockOrders) for (const pr of (o as any).products || []) if (pr?.uid) outOfStockUids.add(pr.uid);
  const inStockProducts = await (await import("@/lib/models")).Product.find({ uid: { $in: [...outOfStockUids] }, quantity: { $gt: 0 } }).select("uid").lean();
  const inStockUidSet = new Set(inStockProducts.map((p: any) => p.uid));
  const outOfStockWithStock = outOfStockOrders.filter((o) => (o as any).products?.some((pr: any) => inStockUidSet.has(pr.uid))).length;

  const urgentVIPNotMoved = orders.filter(
    (o) => ["urgent", "vip", "replacement"].includes(o.specialHandling) && !FINAL_STATUSES.has(o.status as any) && toDate(o.lastStatusChangedAt) < hours24
  ).length;

  // Action required
  const actionRequired = {
    missingFlag: pendingWithoutFlag,
    outOfStockOver7Days,
    validAddressPhoneNoFlag: orders.filter(
      (o) =>
        !o.hasOpenIssue &&
        o.status === "pending" &&
        !["invalid_address", "invalid_phone_number"].some((t) => (o.issueFlags || []).some((f: any) => f.type === t && f.state === "open"))
    ).length,
    cancelledBeforeHub: orders.filter(
      (o) => o.status === "cancelled" && !o.currentLocation
    ).length,
    twoPlusFailedAttempts: orders.filter((o) => o.deliveryAttempts >= 2 && !FINAL_STATUSES.has(o.status as any)).length,
    overdueReturns,
  };

  // Heatmap
  const heatmap: Record<string, Record<string, number>> = {};
  for (const s of HEATMAP_STATUSES) heatmap[s] = {};
  for (const b of AGE_BUCKETS) {
    for (const s of HEATMAP_STATUSES) heatmap[s][b.label] = 0;
  }
  for (const o of orders) {
    if (!HEATMAP_STATUSES.includes(o.status)) continue;
    const hours = hoursAgo(o.lastStatusChangedAt, now);
    const bucket = ageBucket(hours);
    heatmap[o.status][bucket] = (heatmap[o.status][bucket] || 0) + 1;
  }

  // Open issues by type + age
  const openIssuesByTypeAge: Record<string, Record<string, number>> = {};
  for (const type of ISSUE_FLAG_TYPES) openIssuesByTypeAge[type] = {};
  for (const b of AGE_BUCKETS) {
    for (const type of ISSUE_FLAG_TYPES) openIssuesByTypeAge[type][b.label] = 0;
  }
  for (const o of orders) {
    for (const f of o.issueFlags || []) {
      if (f.state !== "open") continue;
      const type = f.type || "other";
      const hours = hoursAgo(f.reportedAt, now);
      const bucket = ageBucket(hours);
      openIssuesByTypeAge[type][bucket] = (openIssuesByTypeAge[type][bucket] || 0) + 1;
    }
  }

  // 10 oldest problematic orders
  const problematicOrders = orders
    .filter((o) => !FINAL_STATUSES.has(o.status as any) && (o.hasOpenIssue || toDate(o.lastStatusChangedAt) < hours24))
    .map((o) => {
      const hours = hoursAgo(o.lastStatusChangedAt, now);
      const openFlags = (o.issueFlags || []).filter((f: any) => f.state === "open");
      const issueType = openFlags[0]?.type || "";
      return {
        id: o._id,
        model: o.model,
        oid: o.oid,
        brandName: clientMap.get(o.clientId) || "Unknown",
        status: o.status,
        daysInStatus: Math.floor(hours / 24),
        issueType,
        assignedTo: o.createdByStaffId ? String(o.createdByStaffId) : "",
      };
    })
    .sort((a, b) => b.daysInStatus - a.daysInStatus)
    .slice(0, 10);

  // SECTION 2: Problematic Brands
  const brandMetrics = clients.map((c: any) =>
    computeBrandMetrics(
      String(c._id),
      c.companyName,
      c.serviceScheme,
      c.active,
      orders.filter((o) => o.clientId === String(c._id)),
      orders,
      dropoffs.map((d: any) => ({ ...d, _id: String(d._id), clientId: d.clientId ? String(d.clientId) : null })),
      couriers.map((x: any) => ({ _id: String(x._id), name: x.name, outsourced: x.outsourced })),
      staff.map((s: any) => ({ _id: String(s._id), name: s.name, role: s.role, assignedBrandIds: (s.assignedBrandIds || []).map((id: any) => String(id)) })),
      [],
      now
    )
  );

  const problematicBrands = brandMetrics
    .map((b: any) => ({
      ...b,
      workload: b.pendingCount + b.openTickets + b.unprocessedDropoffs,
      oldIssueCount: b.openTickets,
    }))
    .sort((a: any, b: any) => {
      if (b.pendingCount !== a.pendingCount) return b.pendingCount - a.pendingCount;
      if (b.oldIssueCount !== a.oldIssueCount) return b.oldIssueCount - a.oldIssueCount;
      return b.workload - a.workload;
    })
    .slice(0, 8);

  // SECTION 3: Summary
  const ticketsAwaitingResponse = {
    count: alerts.filter((a: any) => orderIds.has(String(a.orderId))).length + notes.length,
    oldestAgeHours: 0,
  };
  const ticketAges = [
    ...alerts.filter((a: any) => orderIds.has(String(a.orderId))).map((a: any) => hoursAgo(a.createdAt, now)),
    ...notes.map((n: any) => hoursAgo(n.createdAt, now)),
  ];
  ticketsAwaitingResponse.oldestAgeHours = ticketAges.length ? Math.max(...ticketAges) : 0;

  const myAssignments = orders.filter((o) => o.createdByStaffId && String(o.createdByStaffId) === session.staffId && !FINAL_STATUSES.has(o.status as any)).length;
  const remindersDueToday = notes.filter((n: any) => !n.done && toDate(n.createdAt) >= startToday).length;

  const todayOrders = orders.filter((o) => toDate(o.createdAt) >= startToday);
  const todaySummary = {
    processed: todayOrders.filter((o) => !["pending"].includes(o.status)).length,
    delivered: todayOrders.filter((o) => SUCCESS_STATUSES.has(o.status as any)).length,
    returned: todayOrders.filter((o) => ["returned", "RTW", "RTO"].includes(o.status)).length,
  };

  return NextResponse.json({
    problematicPending: {
      totalPending,
      pendingWithoutFlag,
      openIssuesByType,
      outOfStockOver7Days,
      overdueReturns,
      urgentVIPNotMoved,
      outOfStockWithStock,
      processingOver2d,
      pendingOver36h,
      packedOver1d,
      pickedupOver1d,
    },
    actionRequired,
    heatmap,
    ageBucketLabels: AGE_BUCKETS.map((b) => b.label),
    openIssuesByTypeAge,
    oldestProblematicOrders: problematicOrders,
    problematicBrands,
    summary: {
      ticketsAwaitingResponse,
      myAssignments,
      remindersDueToday,
      todaySummary,
      lastUpdated: now.toISOString(),
    },
  });
}
