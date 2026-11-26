import { FINAL_STATUSES, SUCCESS_STATUSES, FAILED_STATUSES, ISSUE_FLAG_TYPES, ORDER_STATUSES } from "./rules/constants";

export interface MinimalOrder {
  _id: string;
  clientId: string;
  model: "turuq" | "integration";
  oid: string;
  status: string;
  type?: string;
  provider?: string;
  statusHistory: Record<string, string>;
  lastStatusChangedAt: string | Date;
  createdAt: string | Date;
  issueFlags: any[];
  hasOpenIssue: boolean;

  currentLocation?: string | null;
  courierId?: string | null;
  shippingHandledBy: string;
  deliveryAttempts: number;
  cancelledBy?: string;
  cancellationReviewStatus?: string;
  dropoffBatchId?: string | null;
  createdByStaffId?: string | null;
  customerName?: string;
  customerFirstName?: string;
  customerLastName?: string;
}

export interface MinimalDropoff {
  _id: string;
  clientId?: string | null;
  status: "OPEN" | "CLOSED";
  destinationType: "BRAND" | "WAREHOUSE";
  startDate: string | Date;
  endDate?: string | Date | null;
}

export interface MinimalCourier {
  _id: string;
  name: string;
  outsourced: boolean;
}

export interface MinimalStaff {
  _id: string;
  name: string;
  role: "SUPER" | "SUPPORT";
  assignedBrandIds: string[];
}

export interface MinimalInteraction {
  at: string | Date;
}

export interface BrandMetrics {
  id: string;
  name: string;
  serviceScheme: string;
  active: boolean;
  statusCounts: Record<string, number>;
  pendingCount: number;
  processingCount: number;
  outForDeliveryCount: number;
  deliveredCount: number;
  cancelledCount: number;
  returnedCount: number;
  companyDeliveredCount: number;
  deliveredSharePct: number;
  backlogCount: number;
  backlogDays: number;
  usualDailyOrders: number;
  onHoldCount: number;
  openShipments: number;
  oldestShipmentAgeHours: number;
  deliveryRate30d: number;
  deliveryTrend: number;
  returnRate30d: number;
  returnTrend: number;
  openTickets: number;
  oldestOpenIssueAgeHours: number;
  unprocessedDropoffs: number;
  restricted: boolean;
  mostFrequentIssue: string;
  mostFrequentIssueCount: number;
  outOfStockOrders: number;
  oldestOutOfStockAgeHours: number;
  cancelledAfterShipment30d: number;
  avgDeliveryTimeHours: number;
  companyAvgDeliveryTimeHours: number;
  volume30d: number;
  volumePrev30d: number;
  volumeTrend: number;
  todayVolume: number;
  yesterdayVolume: number;
  todayTrend: number;
  turuqCount: number;
  integrationCount: number;
  courierDistribution: { turuq: number; bosta: number; shipblu: number; other: number };
  lastInteractionAt: string | null;
  lastInteractionDays: number | null;
  assignedSupportRep: { id: string; name: string } | null;
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

function startOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function courierBucket(courier: MinimalCourier | undefined): "turuq" | "bosta" | "shipblu" | "other" {
  if (!courier) return "other";
  const name = courier.name.toLowerCase();
  if (name.includes("bosta")) return "bosta";
  if (name.includes("shipblu")) return "shipblu";
  if (name.includes("turuq")) return "turuq";
  return courier.outsourced ? "other" : "turuq";
}

function avgDeliveryTime(orders: MinimalOrder[]): number | null {
  const hours: number[] = [];
  for (const o of orders) {
    if (!SUCCESS_STATUSES.has(o.status as any)) continue;
    const pendingAt = o.statusHistory["pending"];
    const deliveredAt = o.statusHistory["delivered"] || o.statusHistory["collected"];
    if (pendingAt && deliveredAt) {
      const h = (new Date(deliveredAt).getTime() - new Date(pendingAt).getTime()) / (60 * 60 * 1000);
      if (h >= 0) hours.push(h);
    }
  }
  if (hours.length === 0) return null;
  return hours.reduce((a, b) => a + b, 0) / hours.length;
}

export function computeBrandMetrics(
  clientId: string,
  clientName: string,
  serviceScheme: string,
  active: boolean,
  orders: MinimalOrder[],
  allOrders: MinimalOrder[],
  dropoffs: MinimalDropoff[],
  couriers: MinimalCourier[],
  staff: MinimalStaff[],
  interactions: MinimalInteraction[],
  now: Date
): BrandMetrics {
  const courierMap = new Map(couriers.map((c) => [c._id, c]));
  const clientOrders = orders;

  const days30 = daysAgo(30, now);
  const days60 = daysAgo(60, now);
  const startToday = startOfDay(now);
  const startYesterday = new Date(startToday.getTime() - 24 * 60 * 60 * 1000);

  const last30 = clientOrders.filter((o) => toDate(o.createdAt) >= days30);
  const prev30 = clientOrders.filter((o) => toDate(o.createdAt) >= days60 && toDate(o.createdAt) < days30);

  const pendingCount = clientOrders.filter((o) => o.status === "pending").length;
  const processingCount = clientOrders.filter((o) => o.status === "processing").length;
  const statusCounts: Record<string, number> = {};
  for (const s of ORDER_STATUSES) {
    statusCounts[s] = clientOrders.filter((o) => o.status === s).length;
  }
  const outForDeliveryCount = clientOrders.filter((o) => o.status === "outForDelivery").length;
  const deliveredCount = clientOrders.filter((o) => o.status === "delivered").length;
  const cancelledCount = clientOrders.filter((o) => o.status === "cancelled").length;
  const returnedCount = clientOrders.filter((o) => o.status === "returned").length;
  const companyDeliveredCount = allOrders.filter((o) => o.status === "delivered").length;
  const deliveredSharePct = companyDeliveredCount ? Math.round((deliveredCount / companyDeliveredCount) * 100) : 0;
  const backlogCount = pendingCount + processingCount;
  const usualDailyOrders = Math.max(1, +(last30.length / 30).toFixed(1));
  const backlogDays = +((backlogCount / usualDailyOrders).toFixed(1));
  const onHoldCount = clientOrders.filter((o) => ["postponed", "unreachable", "invalidAddress", "outOfStock"].includes(o.status)).length;
  const openShipments = clientOrders.filter((o) => ["pickedUp", "droppedOff", "outForDelivery"].includes(o.status)).length;

  const shipmentAges = clientOrders
    .filter((o) => ["pickedUp", "droppedOff", "outForDelivery"].includes(o.status))
    .map((o) => hoursAgo(o.lastStatusChangedAt, now));
  const oldestShipmentAgeHours = shipmentAges.length ? Math.max(...shipmentAges) : 0;

  const last30Final = last30.filter((o) => FINAL_STATUSES.has(o.status as any));
  const last30Delivered = last30.filter((o) => SUCCESS_STATUSES.has(o.status as any));
  const last30Returned = last30.filter((o) => ["returned", "RTW", "RTO"].includes(o.status));

  const deliveryRate30d = last30Final.length ? Math.round((last30Delivered.length / last30Final.length) * 100) : 0;
  const returnRate30d = last30Final.length ? Math.round((last30Returned.length / last30Final.length) * 100) : 0;

  const prev30Final = prev30.filter((o) => FINAL_STATUSES.has(o.status as any));
  const prev30Delivered = prev30.filter((o) => SUCCESS_STATUSES.has(o.status as any));
  const prev30Returned = prev30.filter((o) => ["returned", "RTW", "RTO"].includes(o.status));
  const prevDeliveryRate = prev30Final.length ? (prev30Delivered.length / prev30Final.length) * 100 : 0;
  const prevReturnRate = prev30Final.length ? (prev30Returned.length / prev30Final.length) * 100 : 0;
  const deliveryTrend = Math.round(deliveryRate30d - prevDeliveryRate);
  const returnTrend = Math.round(returnRate30d - prevReturnRate);

  const openTickets = clientOrders.reduce((sum, o) => sum + (o.issueFlags || []).filter((f: any) => f.state === "open").length, 0);
  const openIssueAges = clientOrders.flatMap((o) =>
    (o.issueFlags || []).filter((f: any) => f.state === "open").map((f: any) => hoursAgo(f.reportedAt, now))
  );
  const oldestOpenIssueAgeHours = openIssueAges.length ? Math.max(...openIssueAges) : 0;

  const dropoffThreshold = daysAgo(7, now);
  const unprocessedDropoffs = dropoffs.filter(
    (d) => String(d.clientId) === clientId && d.status === "OPEN" && d.destinationType === "WAREHOUSE" && toDate(d.startDate) < dropoffThreshold
  ).length;
  const restricted = unprocessedDropoffs >= 3;

  const issueCounts: Record<string, number> = {};
  for (const o of clientOrders) {
    for (const f of o.issueFlags || []) {
      if (f.state === "open") issueCounts[f.type] = (issueCounts[f.type] || 0) + 1;
    }
  }
  const issueEntries = Object.entries(issueCounts).sort((a, b) => b[1] - a[1]);
  const mostFrequentIssue = issueEntries[0]?.[0] || "";
  const mostFrequentIssueCount = issueEntries[0]?.[1] || 0;

  const outOfStockOrders = clientOrders.filter((o) => o.status === "outOfStock");
  const outOfStockAges = outOfStockOrders.map((o) => hoursAgo(o.lastStatusChangedAt, now));
  const oldestOutOfStockAgeHours = outOfStockAges.length ? Math.max(...outOfStockAges) : 0;

  const cancelledAfterShipment30d = clientOrders.filter(
    (o) =>
      o.status === "cancelled" &&
      toDate(o.createdAt) >= days30 &&
      o.statusHistory &&
      (o.statusHistory["pickedUp"] || o.statusHistory["droppedOff"] || o.statusHistory["outForDelivery"])
  ).length;

  const avgDelivery = avgDeliveryTime(clientOrders);
  const companyAvgDelivery = avgDeliveryTime(allOrders);

  const volume30d = last30.length;
  const volumePrev30d = prev30.length;
  const volumeTrend = volumePrev30d ? Math.round(((volume30d - volumePrev30d) / volumePrev30d) * 100) : 0;

  const todayVolume = clientOrders.filter((o) => toDate(o.createdAt) >= startToday).length;
  const yesterdayVolume = clientOrders.filter((o) => toDate(o.createdAt) >= startYesterday && toDate(o.createdAt) < startToday).length;
  const todayTrend = yesterdayVolume ? Math.round(((todayVolume - yesterdayVolume) / yesterdayVolume) * 100) : 0;

  const turuqCount = clientOrders.filter((o) => o.model === "turuq").length;
  const integrationCount = clientOrders.filter((o) => o.model === "integration").length;

  const courierDistribution = { turuq: 0, bosta: 0, shipblu: 0, other: 0 };
  for (const o of clientOrders) {
    if (o.courierId) {
      const bucket = courierBucket(courierMap.get(String(o.courierId)));
      courierDistribution[bucket]++;
    }
  }

  const brandInteractions = [
    ...clientOrders.map((o) => toDate(o.createdAt)),
    ...interactions.map((i) => toDate(i.at)),
  ];
  const lastInteractionAt = brandInteractions.length ? new Date(Math.max(...brandInteractions.map((d) => d.getTime()))) : null;
  const lastInteractionDays = lastInteractionAt ? Math.floor(hoursAgo(lastInteractionAt, now) / 24) : null;

  const rep = staff.find((s) => s.role === "SUPPORT" && s.assignedBrandIds.includes(clientId));
  const assignedSupportRep = rep ? { id: String(rep._id), name: rep.name } : null;

  return {
    id: clientId,
    name: clientName,
    serviceScheme,
    active,
    statusCounts,
    pendingCount,
    processingCount,
    outForDeliveryCount,
    deliveredCount,
    cancelledCount,
    returnedCount,
    companyDeliveredCount,
    deliveredSharePct,
    backlogCount,
    backlogDays,
    usualDailyOrders,
    onHoldCount,
    openShipments,
    oldestShipmentAgeHours,
    deliveryRate30d,
    deliveryTrend,
    returnRate30d,
    returnTrend,
    openTickets,
    oldestOpenIssueAgeHours,
    unprocessedDropoffs,
    restricted,
    mostFrequentIssue,
    mostFrequentIssueCount,
    outOfStockOrders: outOfStockOrders.length,
    oldestOutOfStockAgeHours,
    cancelledAfterShipment30d,
    avgDeliveryTimeHours: avgDelivery ? Math.round(avgDelivery) : 0,
    companyAvgDeliveryTimeHours: companyAvgDelivery ? Math.round(companyAvgDelivery) : 0,
    volume30d,
    volumePrev30d,
    volumeTrend,
    todayVolume,
    yesterdayVolume,
    todayTrend,
    turuqCount,
    integrationCount,
    courierDistribution,
    lastInteractionAt: lastInteractionAt?.toISOString() || null,
    lastInteractionDays,
    assignedSupportRep,
  };
}
