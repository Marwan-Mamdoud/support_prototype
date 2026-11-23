import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { BrandEmailOutbox } from "@/lib/models";
import { requireSession, getBrandFilter } from "@/lib/serverAuth";
import { Client } from "@/lib/models";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;
  await connectDB();
  const brandFilter = getBrandFilter(session);
  const items = await BrandEmailOutbox.find(brandFilter).sort({ createdAt: -1 }).limit(100).lean();
  const clientIds = [...new Set(items.map((i: any) => String(i.clientId)))];
  const clients = await Client.find({ _id: { $in: clientIds } }).lean();
  const cMap = new Map(clients.map((c: any) => [String(c._id), c]));
  const enriched = items.map((i: any) => ({ ...i, id: String(i._id), client: cMap.get(String(i.clientId)) }));
  return NextResponse.json({ items: enriched });
}
