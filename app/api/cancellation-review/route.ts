import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { TuruqOrder, IntegrationOrder } from "@/lib/models/Order";
import { Client } from "@/lib/models";
import { requireSession } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;
  await connectDB();
  const [t, i] = await Promise.all([
    TuruqOrder.find({ cancellationReviewStatus: "PENDING" }).lean(),
    IntegrationOrder.find({ cancellationReviewStatus: "PENDING" }).lean(),
  ]);
  const all = [...t.map((o: any) => ({ ...o, id: String(o._id), source: "turuq" })), ...i.map((o: any) => ({ ...o, id: String(o._id), source: "integration" }))];
  const clientIds = [...new Set(all.map((o) => String(o.clientId)))];
  const clients = await Client.find({ _id: { $in: clientIds } }).lean();
  const cMap = new Map(clients.map((c: any) => [String(c._id), c]));
  const enriched = all.map((o) => ({ ...o, client: cMap.get(String(o.clientId)) }));
  return NextResponse.json({ items: enriched });
}
