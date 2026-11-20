import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Product } from "@/lib/models";
import { requireSession } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;
  await connectDB();
  const clientId = req.nextUrl.searchParams.get("clientId");
  const filter: any = {};
  if (clientId) filter.primaryClientId = clientId;
  const items = await Product.find(filter).sort({ itemDescription: 1 }).lean();
  return NextResponse.json({ items: items.map((p: any) => ({ ...p, id: String(p._id) })) });
}
