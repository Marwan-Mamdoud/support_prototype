import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Client, TuruqOrder, IntegrationOrder, DropoffBatch, Courier, StaffMember, AuditLog, SupportNote, Alert } from "@/lib/models";
import { requireSession, canAccessBrand, getBrandFilter } from "@/lib/serverAuth";
import { computeBrandMetrics, MinimalOrder, MinimalInteraction } from "@/lib/brandMetrics";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { session, response } = await requireSession();
  if (response) return response;
  const { id } = await ctx.params;
  if (!canAccessBrand(session, id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await connectDB();

  const now = new Date();
  const brandFilter = getBrandFilter(session);
  const [client, turuq, integration, dropoffs, couriers, staff, auditLogs, notes, alerts, allTuruq, allIntegration] = await Promise.all([
    Client.findById(id).lean(),
    TuruqOrder.find({ clientId: id }).lean(),
    IntegrationOrder.find({ clientId: id }).lean(),
    DropoffBatch.find({ clientId: id }).lean(),
    Courier.find({}).lean(),
    StaffMember.find({}).lean(),
    AuditLog.find({}).lean(),
    SupportNote.find({}).lean(),
    Alert.find({}).lean(),
    TuruqOrder.find(brandFilter).lean(),
    IntegrationOrder.find(brandFilter).lean(),
  ]);

  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const orders: MinimalOrder[] = [
    ...turuq.map((o: any) => ({ ...o, model: "turuq" as const, _id: String(o._id), clientId: String(o.clientId) })),
    ...integration.map((o: any) => ({ ...o, model: "integration" as const, _id: String(o._id), clientId: String(o.clientId) })),
  ];

  const allOrders: MinimalOrder[] = [
    ...allTuruq.map((o: any) => ({ ...o, model: "turuq" as const, _id: String(o._id), clientId: String(o.clientId) })),
    ...allIntegration.map((o: any) => ({ ...o, model: "integration" as const, _id: String(o._id), clientId: String(o.clientId) })),
  ];

  const orderIds = new Set(orders.map((o) => String(o._id)));
  const interactions: MinimalInteraction[] = [
    ...auditLogs.filter((a: any) => orderIds.has(String(a.orderId))).map((a: any) => ({ at: a.at })),
    ...alerts.filter((a: any) => orderIds.has(String(a.orderId))).map((a: any) => ({ at: a.createdAt })),
    ...notes.map((n: any) => ({ at: n.createdAt })),
  ];

  const metrics = computeBrandMetrics(
    String(client._id),
    client.companyName,
    client.serviceScheme,
    client.active,
    orders,
    allOrders,
    dropoffs.map((d: any) => ({ ...d, _id: String(d._id), clientId: d.clientId ? String(d.clientId) : null })),
    couriers.map((x: any) => ({ _id: String(x._id), name: x.name, outsourced: x.outsourced })),
    staff.map((s: any) => ({ _id: String(s._id), name: s.name, role: s.role, assignedBrandIds: (s.assignedBrandIds || []).map((id: any) => String(id)) })),
    interactions,
    now
  );

  return NextResponse.json(metrics);
}
