import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Client, TuruqOrder, IntegrationOrder, DropoffBatch, Courier, StaffMember } from "@/lib/models";
import { requireSession, getBrandFilter } from "@/lib/serverAuth";
import { computeBrandMetrics, MinimalOrder } from "@/lib/brandMetrics";

export const dynamic = "force-dynamic";

export async function GET() {
  const { session, response } = await requireSession();
  if (response) return response;
  await connectDB();

  const now = new Date();
  const brandFilter = getBrandFilter(session);

  const [turuq, integration, clients, dropoffs, couriers, staff] = await Promise.all([
    TuruqOrder.find(brandFilter).lean(),
    IntegrationOrder.find(brandFilter).lean(),
    Client.find(Object.keys(brandFilter).length ? { _id: { $in: (brandFilter as any).clientId.$in } } : {}).lean(),
    DropoffBatch.find({}).lean(),
    Courier.find({}).lean(),
    StaffMember.find({}).lean(),
  ]);

  const orders: MinimalOrder[] = [
    ...turuq.map((o: any) => ({ ...o, model: "turuq" as const, _id: String(o._id), clientId: String(o.clientId) })),
    ...integration.map((o: any) => ({ ...o, model: "integration" as const, _id: String(o._id), clientId: String(o.clientId) })),
  ];

  const metrics = clients.map((c: any) =>
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

  return NextResponse.json({ brands: metrics });
}
