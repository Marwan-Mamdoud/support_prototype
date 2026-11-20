import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { DropoffBatch } from "@/lib/models/Batch";
import { Client, Courier } from "@/lib/models";
import { requireSession } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;
  await connectDB();
  const items = await DropoffBatch.find().sort({ startDate: -1 }).lean();
  const courierIds = [...new Set(items.map((i: any) => String(i.courierId)))];
  const clientIds = [...new Set(items.map((i: any) => i.clientId ? String(i.clientId) : null).filter(Boolean))];
  const couriers = await Courier.find({ _id: { $in: courierIds } }).lean();
  const clients = await Client.find({ _id: { $in: clientIds } }).lean();
  const cMap = new Map(couriers.map((c: any) => [String(c._id), c]));
  const clMap = new Map(clients.map((c: any) => [String(c._id), c]));
  // unclosed older than 2 days per courier
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  const oldOpenByCourier: Record<string, number> = {};
  for (const b of items) {
    if ((b as any).status === "OPEN" && new Date((b as any).startDate) < twoDaysAgo) {
      const k = String((b as any).courierId);
      oldOpenByCourier[k] = (oldOpenByCourier[k] || 0) + 1;
    }
  }
  const enriched = items.map((b: any) => ({
    ...b,
    id: String(b._id),
    courier: cMap.get(String(b.courierId)),
    client: b.clientId ? clMap.get(String(b.clientId)) : null,
    oldOpenCount: oldOpenByCourier[String(b.courierId)] || 0,
  }));
  return NextResponse.json({ items: enriched });
}

export async function POST(req: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;
  await connectDB();
  const body = await req.json();
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  const oldOpen = await DropoffBatch.countDocuments({ courierId: body.courierId, status: "OPEN", startDate: { $lt: twoDaysAgo } });
  if (oldOpen >= 3) {
    const batches = await DropoffBatch.find({ courierId: body.courierId, status: "OPEN", startDate: { $lt: twoDaysAgo } }).lean();
    return NextResponse.json({ error: `Courier has ${oldOpen} open batches older than 2 days: ${batches.map((b: any) => b.bid).join(", ")}` }, { status: 409 });
  }
  const batch = await DropoffBatch.create({
    bid: body.bid || `DB-${Date.now()}`,
    courierId: body.courierId,
    destinationType: body.destinationType || "BRAND",
    clientId: body.clientId || null,
    startDate: new Date(),
    status: "OPEN",
    otp: body.otp || String(Math.floor(100000 + Math.random() * 900000)),
    ordersCount: body.ordersCount || 0,
  });
  return NextResponse.json({ id: String(batch._id), bid: batch.bid }, { status: 201 });
}
