import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Alert } from "@/lib/models/Alert";
import { TuruqOrder, IntegrationOrder } from "@/lib/models/Order";
import { requireSession, getBrandFilter } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;
  await connectDB();
  const sp = req.nextUrl.searchParams;
  const handled = sp.get("handled");
  const handledFilter: any = {};
  if (handled === "true") handledFilter.handled = true;
  else if (handled === "false" || handled === "unhandled") handledFilter.handled = false;

  const brandFilter = getBrandFilter(session);
  let filter: any = handledFilter;
  if (brandFilter.clientId) {
    const [turuqIds, integrationIds] = await Promise.all([
      TuruqOrder.find(brandFilter).select("_id").lean(),
      IntegrationOrder.find(brandFilter).select("_id").lean(),
    ]);
    const tIds = turuqIds.map((o: any) => o._id.toString());
    const iIds = integrationIds.map((o: any) => o._id.toString());
    const accessFilter = {
      $or: [
        { orderModel: "turuq", orderId: { $in: tIds } },
        { orderModel: "integration", orderId: { $in: iIds } },
      ],
    };
    filter = Object.keys(handledFilter).length
      ? { $and: [handledFilter, accessFilter] }
      : accessFilter;
  }

  const items = await Alert.find(filter).sort({ createdAt: -1 }).lean();
  return NextResponse.json({ items, total: items.length });
}
