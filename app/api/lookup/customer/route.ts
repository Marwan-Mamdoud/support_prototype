import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { TuruqOrder, IntegrationOrder } from "@/lib/models/Order";
import { Client } from "@/lib/models";
import { requireSession } from "@/lib/serverAuth";
import { normalizePhone } from "@/lib/rules/phone";
import { computeSuccessRate } from "@/lib/rules/successRate";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;
  await connectDB();
  const phone = req.nextUrl.searchParams.get("phone") || "";
  const norm = normalizePhone(phone);
  const [turuq, integration] = await Promise.all([
    TuruqOrder.find({ customerPhoneNormalized: norm }).lean(),
    IntegrationOrder.find({ customerPhoneNormalized: norm }).lean(),
  ]);
  const names = new Set<string>();
  const addresses = new Set<string>();
  const addressGovs = new Map<string, string>();
  const verified: any[] = [];
  for (const o of [...turuq, ...integration]) {
    if ((o as any).customerName) names.add((o as any).customerName);
    if ((o as any).customerFirstName) names.add(`${(o as any).customerFirstName} ${(o as any).customerLastName}`.trim());
    if ((o as any).customerAddress) { addresses.add((o as any).customerAddress); addressGovs.set((o as any).customerAddress, (o as any).customerGovernorate); }

  }
  for (const v of verified) addresses.add((v as any).address);

  const allStatuses = [...turuq.map((o: any) => o.status), ...integration.map((o: any) => o.status)];
  const sr = computeSuccessRate(allStatuses);

  const clientIds = [...new Set([...turuq, ...integration].map((o: any) => String(o.clientId)))];
  const clients = await Client.find({ _id: { $in: clientIds } }).lean();
  const cMap = new Map(clients.map((c: any) => [String(c._id), c]));

  const orders = [
    ...turuq.map((o: any) => ({ id: String(o._id), source: "turuq", oid: o.oid, brand: cMap.get(String(o.clientId))?.companyName, status: o.status, date: o.createdAt, total: o.total })),
    ...integration.map((o: any) => ({ id: String(o._id), source: "integration", oid: o.oid, brand: cMap.get(String(o.clientId))?.companyName, status: o.status, date: o.createdAt, total: o.total })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return NextResponse.json({
    phone: norm,
    names: [...names],
    addresses: [...addresses],
    addressList: [...addresses].map((a) => ({ address: a, governorate: addressGovs.get(a) || "" })),
    successRate: sr,
    orders,
  });
}
