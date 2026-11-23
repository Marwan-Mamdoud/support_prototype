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
  const now = new Date();
  const startToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const startYesterday = new Date(startToday.getTime() - 24 * 60 * 60 * 1000);

  async function countsFor(clientId: string, from: Date, to: Date) {
    const filter = { clientId, createdAt: { $gte: from, $lt: to } };
    const [t, i] = await Promise.all([
      TuruqOrder.countDocuments(filter),
      IntegrationOrder.countDocuments(filter),
    ]);
    return t + i;
  }

  const today = await countsFor(id, startToday, new Date(startToday.getTime() + 24 * 60 * 60 * 1000));
  const yesterday = await countsFor(id, startYesterday, startToday);

  // by source today
  const [tToday, iToday] = await Promise.all([
    TuruqOrder.countDocuments({ clientId: id, createdAt: { $gte: startToday } }),
    IntegrationOrder.countDocuments({ clientId: id, createdAt: { $gte: startToday } }),
  ]);

  // by status today
  const [tStatus, iStatus] = await Promise.all([
    TuruqOrder.aggregate([{ $match: { clientId: id, createdAt: { $gte: startToday } } }, { $group: { _id: "$status", n: { $sum: 1 } } }]),
    IntegrationOrder.aggregate([{ $match: { clientId: id, createdAt: { $gte: startToday } } }, { $group: { _id: "$status", n: { $sum: 1 } } }]),
  ]);
  const statusMap: Record<string, number> = {};
  for (const r of [...tStatus, ...iStatus]) statusMap[r._id] = (statusMap[r._id] || 0) + r.n;

  return NextResponse.json({
    today,
    yesterday,
    diff: today - yesterday,
    bySource: { turuq: tToday, integration: iToday },
    byStatus: statusMap,
  });
}
