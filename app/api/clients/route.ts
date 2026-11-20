import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Client } from "@/lib/models";
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
  if (q) filter.$or = [{ name: { $regex: q, $options: "i" } }, { companyName: { $regex: q, $options: "i" } }];
  const items = await Client.find(filter).sort({ companyName: 1 }).lean();
  return NextResponse.json({ items: items.map((c: any) => ({ ...c, id: String(c._id) })) });
}
