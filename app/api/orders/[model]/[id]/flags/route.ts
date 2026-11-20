import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { orderModelFor } from "@/lib/models/Order";
import { Alert } from "@/lib/models/Alert";
import { requireSession } from "@/lib/serverAuth";
import { writeAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// Add flag
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
  const flag: any = {
    type: body.type,
    note: body.note || "",
    reportedByRole: "support",
    reportedByUser: session.name || session.username,
    reportedAt: new Date(),
    state: "open",
  };
  order.issueFlags.push(flag);
  order.hasOpenIssue = true;
  await order.save();
  const newFlag = order.issueFlags[order.issueFlags.length - 1];
  await Alert.create({ type: "NEW_FLAG", orderModel: model, orderId: order._id, flagId: newFlag._id, createdAt: newFlag.reportedAt, handled: false });
  await writeAudit({ orderModel: model, orderId: order._id, action: "add_flag", field: "issueFlags", oldValue: null, newValue: body.type, userId: session.staffId, userName: session.name || session.username, userRole: session.role });
  return NextResponse.json({ ok: true, flagId: String(newFlag._id) });
}
