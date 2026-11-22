import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Client } from "@/lib/models";
import { TuruqOrder, IntegrationOrder } from "@/lib/models/Order";
import { requireSession } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;
  await connectDB();
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q");
  const id = sp.get("id");
  if (id) {
    const c = await Client.findById(id).lean();
    if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ client: { ...c, id: String((c as any)._id) } });
  }
  const filter: any = {};
  if (q) filter.$or = [
    { name: { $regex: q, $options: "i" } },
    { companyName: { $regex: q, $options: "i" } },
    { email: { $regex: q, $options: "i" } },
    { phone: { $regex: q, $options: "i" } },
  ];
  const scheme = sp.get("scheme");
  if (scheme) filter.serviceScheme = scheme.toUpperCase();
  const active = sp.get("active");
  if (active === "true" || active === "false") filter.active = active === "true";

  const items = await Client.find(filter).sort({ companyName: 1 }).lean();

  const now = new Date();
  const startToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const enriched = await Promise.all(items.map(async (c: any) => {
    const cid = String(c._id);
    const [totalTuruq, totalIntegration, todayTuruq, todayIntegration] = await Promise.all([
      TuruqOrder.countDocuments({ clientId: cid }),
      IntegrationOrder.countDocuments({ clientId: cid }),
      TuruqOrder.countDocuments({ clientId: cid, createdAt: { $gte: startToday } }),
      IntegrationOrder.countDocuments({ clientId: cid, createdAt: { $gte: startToday } }),
    ]);
    return {
      ...c,
      id: cid,
      stats: {
        totalOrders: totalTuruq + totalIntegration,
        todayOrders: todayTuruq + todayIntegration,
        turuq: { total: totalTuruq, today: todayTuruq },
        integration: { total: totalIntegration, today: todayIntegration },
      },
    };
  }));

  return NextResponse.json({ items: enriched });
}
