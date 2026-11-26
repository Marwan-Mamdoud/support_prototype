import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Product } from "@/lib/models";
import { Client } from "@/lib/models";
import { requireSession, getBrandFilter, canAccessBrand } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;
  await connectDB();
  const sp = req.nextUrl.searchParams;
  const clientId = sp.get("clientId");
  if (clientId && !canAccessBrand(session, clientId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const filter: any = getBrandFilter(session);
  if (filter.clientId) {
    filter.primaryClientId = filter.clientId;
    delete filter.clientId;
  }
  if (clientId) filter.primaryClientId = clientId;

  const q = sp.get("q");
  if (q) {
    const rx = { $regex: q, $options: "i" };
    filter.$or = [{ uid: rx }, { itemDescription: rx }];
  }
  const brand = sp.get("brand");
  if (brand) {
    const clients = await Client.find({ companyName: { $regex: brand, $options: "i" } }).select("_id");
    filter.primaryClientId = { $in: clients.map((c: any) => c._id) };
  }
  const stock = sp.get("stock");
  if (stock === "in") filter.quantity = { $gt: 0 };
  else if (stock === "out") filter.quantity = { $lte: 0 };
  else if (stock === "low") filter.quantity = { $gt: 0, $lte: 20 };

  const page = Math.max(1, parseInt(sp.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(sp.get("limit") || "12")));
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Product.find(filter).sort({ itemDescription: 1 }).skip(skip).limit(limit).lean(),
    Product.countDocuments(filter),
  ]);

  // attach client company name
  const clientIds = [...new Set(items.map((i: any) => String(i.primaryClientId)))];
  const clients = await Client.find({ _id: { $in: clientIds } }).lean();
  const clientMap = new Map(clients.map((c: any) => [String(c._id), c]));
  const enriched = items.map((p: any) => ({ ...p, id: String(p._id), client: clientMap.get(String(p.primaryClientId)) || null }));

  return NextResponse.json({ items: enriched, total, page, limit, pages: Math.ceil(total / limit) });
}
