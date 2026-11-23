import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { TuruqOrder, IntegrationOrder } from "@/lib/models/Order";
import { requireSession, canAccessBrand } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { session, response } = await requireSession();
  if (response) return response;
  const { id } = await ctx.params;
  if (!canAccessBrand(session, id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await connectDB();
  const sp = req.nextUrl.searchParams;
  const from = sp.get("from") ? new Date(sp.get("from")!) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const toRaw = sp.get("to") ? new Date(sp.get("to")!) : new Date();
  const to = new Date(toRaw.getTime() + 24 * 60 * 60 * 1000 - 1); // inclusive end of day
  const groupBy = sp.get("groupBy") || "day"; // day|week|month

  // fetch orders in range
  const [turuq, integration] = await Promise.all([
    TuruqOrder.find({ clientId: id, createdAt: { $gte: from, $lte: to } }).lean(),
    IntegrationOrder.find({ clientId: id, createdAt: { $gte: from, $lte: to } }).lean(),
  ]);

  function bucket(d: Date): string {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    if (groupBy === "month") return `${y}-${m}`;
    if (groupBy === "week") {
      // ISO week-ish: year-week number
      const onejan = new Date(Date.UTC(y, 0, 1));
      const week = Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getUTCDay() + 1) / 7);
      return `${y}-W${String(week).padStart(2, "0")}`;
    }
    return `${y}-${m}-${String(d.getUTCDate()).padStart(2, "0")}`;
  }

  // orders over time by source
  const overTime: Record<string, { turuq: number; integration: number }> = {};
  const statusDist: Record<string, number> = {};
  let delivered = 0, returned = 0, cancelled = 0;
  for (const o of turuq) {
    const b = bucket(new Date((o as any).createdAt));
    overTime[b] = overTime[b] || { turuq: 0, integration: 0 };
    overTime[b].turuq++;
    statusDist[(o as any).status] = (statusDist[(o as any).status] || 0) + 1;
    if ((o as any).status === "delivered" || (o as any).status === "collected") delivered++;
    if ((o as any).status === "returned") returned++;
    if ((o as any).status === "cancelled") cancelled++;
  }
  for (const o of integration) {
    const b = bucket(new Date((o as any).createdAt));
    overTime[b] = overTime[b] || { turuq: 0, integration: 0 };
    overTime[b].integration++;
    statusDist[(o as any).status] = (statusDist[(o as any).status] || 0) + 1;
    if ((o as any).status === "delivered" || (o as any).status === "collected") delivered++;
    if ((o as any).status === "returned") returned++;
    if ((o as any).status === "cancelled") cancelled++;
  }

  const overTimeArr = Object.keys(overTime).sort().map((k) => ({ bucket: k, ...overTime[k] }));
  const statusArr = Object.keys(statusDist).map((k) => ({ status: k, count: statusDist[k] }));

  return NextResponse.json({
    from: from.toISOString(),
    to: to.toISOString(),
    groupBy,
    overTime: overTimeArr,
    statusDistribution: statusArr,
    outcome: { delivered, returned, cancelled },
  });
}
