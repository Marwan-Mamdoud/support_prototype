import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { orderModelFor } from "@/lib/models/Order";
import { Client, Courier } from "@/lib/models";
import { requireSession } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;
  await connectDB();
  const sp = req.nextUrl.searchParams;
  const model = sp.get("model") || "turuq";
  const Model = orderModelFor(model);
  if (!Model) return NextResponse.json({ error: "Invalid model" }, { status: 400 });

  const hours = parseInt(sp.get("hours") || "48");
  const noAction = sp.get("noAction") === "true";
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

  const FINAL = ["delivered", "collected", "cancelled", "returned", "RTW", "RTO"];
  const filter: any = {
    status: { $nin: FINAL },
    lastStatusChangedAt: { $lt: cutoff },
  };
  if (noAction) filter.hasOpenIssue = false;

  const brand = sp.get("brand");
  if (brand) {
    const clients = await Client.find({ companyName: { $regex: brand, $options: "i" } }).select("_id");
    filter.clientId = { $in: clients.map((c: any) => c._id) };
  }
  const status = sp.get("status");
  if (status) filter.status = status;

  const carrier = sp.get("carrier");
  if (carrier) {
    const { Courier: C } = await import("@/lib/models");
    let couriers: any[] = [];
    if (carrier === "bosta") couriers = await C.find({ name: "Bosta" });
    else if (carrier === "shipblu") couriers = await C.find({ name: "ShipBlu" });
    else if (carrier === "turuq") couriers = await C.find({ outsourced: false });
    else { filter.courierId = carrier; couriers = []; }
    if (couriers.length) filter.courierId = { $in: couriers.map((c: any) => c._id) };
  }

  const items = await Model.find(filter).sort({ lastStatusChangedAt: 1 }).lean();
  const clientIds = [...new Set(items.map((i: any) => String(i.clientId)))];
  const courierIds = [...new Set(items.map((i: any) => i.courierId ? String(i.courierId) : null).filter(Boolean))];
  const clients = await Client.find({ _id: { $in: clientIds } }).lean();
  const couriers = await Courier.find({ _id: { $in: courierIds } }).lean();
  const clientMap = new Map(clients.map((c: any) => [String(c._id), c]));
  const courierMap = new Map(couriers.map((c: any) => [String(c._id), c]));

  const now = Date.now();
  const enriched = items.map((it: any) => ({
    ...it,
    id: String(it._id),
    client: clientMap.get(String(it.clientId)) || null,
    courier: it.courierId ? courierMap.get(String(it.courierId)) || null : null,
    hoursStale: Math.floor((now - new Date(it.lastStatusChangedAt).getTime()) / (1000 * 60 * 60)),
  }));

  return NextResponse.json({ items: enriched, total: enriched.length });
}
