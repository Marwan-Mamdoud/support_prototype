import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { orderModelFor } from "@/lib/models/Order";
import { Alert } from "@/lib/models/Alert";
import { requireSession, loadOrderWithAccess } from "@/lib/serverAuth";
import { writeAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;
  await connectDB();
  const body = await req.json();
  const { model, orderId, reporterRole, type, note } = body;
  const Model = orderModelFor(model);
  if (!Model) return NextResponse.json({ error: "Invalid model" }, { status: 400 });
  const { order, error } = await loadOrderWithAccess(Model, orderId, session);
  if (error) return error;
  const flag: any = {
    type: type || "other",
    note: note || "",
    reportedByRole: reporterRole || "brand",
    reportedByUser: reporterRole || "brand",
    reportedAt: new Date(),
    state: "open",
  };
  order.issueFlags.push(flag);
  order.hasOpenIssue = true;
  await order.save();
  const newFlag = order.issueFlags[order.issueFlags.length - 1];
  await Alert.create({ type: "NEW_FLAG", orderModel: model, orderId: order._id, flagId: newFlag._id, createdAt: newFlag.reportedAt, handled: false });
  await writeAudit({ orderModel: model, orderId: order._id, action: "demo_flag", field: "issueFlags", oldValue: null, newValue: type, userId: session.staffId, userName: session.name || session.username, userRole: session.role });
  return NextResponse.json({ ok: true });
}
