import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { orderModelFor } from "@/lib/models/Order";
import { Alert } from "@/lib/models/Alert";
import { requireSession } from "@/lib/serverAuth";
import { writeAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: { params: Promise<{ model: string; id: string }> }) {
  const { session, response } = await requireSession();
  if (response) return response;
  const { model, id } = await ctx.params;
  const Model = orderModelFor(model);
  if (!Model) return NextResponse.json({ error: "Invalid model" }, { status: 400 });
  await connectDB();
  const order = await Model.findById(id);
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await req.json();
  const newStatus = body.status;
  if (newStatus === "pending" && order.status === "processing") {
    return NextResponse.json({ error: "Cannot move from processing back to pending" }, { status: 400 });
  }
  const old = order.status;
  order.status = newStatus;
  if (!order.statusHistory) order.statusHistory = {};
  order.statusHistory[newStatus] = new Date().toISOString();
  order.lastStatusChangedAt = new Date();
  // location defaults
  const scheme = (await (await import("@/lib/models")).Client.findById(order.clientId))?.serviceScheme;
  // simple location update
  const locMap: Record<string, string | null> = {
    pending: scheme === "WAREHOUSE" ? "warehouse" : "brand_storage",
    processing: "distribution_center",
    pickedUp: "with_courier",
    outForDelivery: "with_courier",
    postponed: "distribution_center",
    outOfStock: scheme === "WAREHOUSE" ? "warehouse" : "brand_storage",
    RTW: "warehouse",
    RTO: "brand_storage",
    returned: "returns_team",
  };
  if (newStatus in locMap) order.currentLocation = locMap[newStatus] as any;
  if (newStatus === "delivered" || newStatus === "collected") order.currentLocation = null;
  await order.save();

  await writeAudit({ orderModel: model, orderId: order._id, action: "status_change", field: "status", oldValue: old, newValue: newStatus, userId: session.staffId, userName: session.name || session.username, userRole: session.role });

  // alert if open flag
  const hasOpen = (order.issueFlags || []).some((f: any) => f.state === "open");
  if (hasOpen) {
    const existing = await Alert.findOne({ type: "STATUS_UPDATED", orderModel: model, orderId: order._id, handled: false });
    if (!existing) {
      const openFlag = (order.issueFlags as any[]).find((f: any) => f.state === "open");
      await Alert.create({ type: "STATUS_UPDATED", orderModel: model, orderId: order._id, flagId: openFlag?._id, createdAt: new Date(), handled: false });
    }
  }

  return NextResponse.json({ ok: true });
}
