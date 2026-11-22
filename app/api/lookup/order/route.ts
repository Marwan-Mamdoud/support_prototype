import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { TuruqOrder, IntegrationOrder, Client, Courier } from "@/lib/models";
import { requireSession } from "@/lib/serverAuth";
import { detectCarrier } from "@/lib/rules/carrier";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;
  await connectDB();
  const q = req.nextUrl.searchParams.get("q") || "";
  if (!q) return NextResponse.json({ results: [] });

  const rx = { $regex: q, $options: "i" };
  const [turuq, integration] = await Promise.all([
    TuruqOrder.find({ $or: [{ oid: rx }, { customerPhone: rx }, { trackingNumber: rx }] }).lean(),
    IntegrationOrder.find({ $or: [{ oid: rx }, { customerPhone: rx }, { trackingNumber: rx }] }).lean(),
  ]);

  async function enrich(list: any[], model: string) {
    const clientIds = [...new Set(list.map((i) => String(i.clientId)))];
    const courierIds = [...new Set(list.map((i) => i.courierId ? String(i.courierId) : null).filter(Boolean))];
    const clients = await Client.find({ _id: { $in: clientIds } }).lean();
    const couriers = await Courier.find({ _id: { $in: courierIds } }).lean();
    const cMap = new Map(clients.map((c: any) => [String(c._id), c]));
    const coMap = new Map(couriers.map((c: any) => [String(c._id), c]));
    return list.map((it: any) => {
      const courier = it.courierId ? coMap.get(String(it.courierId)) : null;
      const carrier = detectCarrier(courier?.name);
      return {
        ...it,
        id: String(it._id),
        source: model,
        client: cMap.get(String(it.clientId)) || null,
        courier,
        carrier,
      };
    });
  }

  const results = [
    ...(await enrich(turuq, "turuq")),
    ...(await enrich(integration, "integration")),
  ];

  const AuditLogModel = (await import("@/lib/models/AuditLog")).AuditLog;
  const { StaffMember } = await import("@/lib/models");
  const resultsWithAudit = await Promise.all(results.map(async (order: any) => {
    const audit = await AuditLogModel.find({ orderModel: order.source, orderId: order.id }).sort({ at: -1 }).lean();
    const missingIds = [...new Set(audit.filter((a: any) => !a.userName).map((a: any) => a.userId).filter(Boolean))];
    const staff = missingIds.length ? await StaffMember.find({ _id: { $in: missingIds } }).lean() : [];
    const nameMap = new Map(staff.map((s: any) => [String(s._id), s.name]));
    const enrichedAudit = audit.map((a: any) => ({ ...a, userName: a.userName || nameMap.get(String(a.userId)) || a.userId }));
    return { ...order, audit: enrichedAudit };
  }));

  return NextResponse.json({ results: resultsWithAudit });
}
