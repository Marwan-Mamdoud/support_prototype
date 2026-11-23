import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { TuruqOrder, IntegrationOrder } from "@/lib/models/Order";
import { Client } from "@/lib/models";
import { requireSession } from "@/lib/serverAuth";
import { FINAL_STATUSES } from "@/lib/rules/constants";

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

export async function GET(req: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;
  await connectDB();

  const now = new Date();
  const hours24 = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const startToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const [turuq, integration] = await Promise.all([
    TuruqOrder.find({}).lean(),
    IntegrationOrder.find({}).lean(),
  ]);
  const allOrders = [...turuq, ...integration] as any[];

  const clientIds = [...new Set(allOrders.map((o) => String(o.clientId)))];
  const clients = await Client.find({ _id: { $in: clientIds } }).lean();
  const clientMap = new Map(clients.map((c: any) => [String(c._id), c.companyName]));

  // 1. Late orders without flags (>24h, not final, no open flag)
  const lateNoFlagCount = allOrders.filter((o) => {
    if (FINAL_STATUSES.has(o.status)) return false;
    if (o.hasOpenIssue) return false;
    return new Date(o.lastStatusChangedAt).getTime() < hours24.getTime();
  }).length;

  // 2. Open flags over 24h
  const openFlagsOver24hCount = allOrders.reduce((sum, o) => {
    const oldOpen = (o.issueFlags || []).filter((f: any) => f.state === "open" && new Date(f.reportedAt).getTime() < hours24.getTime());
    return sum + oldOpen.length;
  }, 0);

  // 3. Status-age heatmap
  const heatmap: Record<string, Record<string, number>> = {};
  for (const s of HEATMAP_STATUSES) heatmap[s] = {};
  for (const b of AGE_BUCKETS) {
    for (const s of HEATMAP_STATUSES) heatmap[s][b.label] = 0;
  }
  for (const o of allOrders) {
    if (!HEATMAP_STATUSES.includes(o.status)) continue;
    const hours = (now.getTime() - new Date(o.lastStatusChangedAt).getTime()) / (60 * 60 * 1000);
    const bucket = ageBucket(hours);
    heatmap[o.status][bucket] = (heatmap[o.status][bucket] || 0) + 1;
  }

  // 4. Orders created today by brand
  const todayByBrand: Record<string, number> = {};
  for (const o of allOrders) {
    if (new Date(o.createdAt).getTime() < startToday.getTime()) continue;
    const brand = clientMap.get(String(o.clientId)) || "Unknown";
    todayByBrand[brand] = (todayByBrand[brand] || 0) + 1;
  }

  // 5. Orders with open issue flags by brand
  const flagsByBrand: Record<string, number> = {};
  for (const o of allOrders) {
    if (!o.hasOpenIssue) continue;
    const brand = clientMap.get(String(o.clientId)) || "Unknown";
    flagsByBrand[brand] = (flagsByBrand[brand] || 0) + 1;
  }

  // 6. Orders with special handling by brand (not final)
  const specialHandlingByBrand: Record<string, number> = {};
  for (const o of allOrders) {
    if (!o.specialHandling || o.specialHandling === "none") continue;
    if (FINAL_STATUSES.has(o.status)) continue;
    const brand = clientMap.get(String(o.clientId)) || "Unknown";
    specialHandlingByBrand[brand] = (specialHandlingByBrand[brand] || 0) + 1;
  }

  return NextResponse.json({
    lateNoFlagCount,
    openFlagsOver24hCount,
    heatmap,
    ageBucketLabels: AGE_BUCKETS.map((b) => b.label),
    todayByBrand,
    flagsByBrand,
    specialHandlingByBrand,
  });
}
