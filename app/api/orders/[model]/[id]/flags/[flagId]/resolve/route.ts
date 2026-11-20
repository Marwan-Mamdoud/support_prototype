import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { orderModelFor } from "@/lib/models/Order";
import { requireSession } from "@/lib/serverAuth";
import { writeAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: { params: Promise<{ model: string; id: string; flagId: string }> }) {
  const { session, response } = await requireSession();
  if (response) return response;
  const { model, id, flagId } = await ctx.params;
  const Model = orderModelFor(model);
  if (!Model) return NextResponse.json({ error: "Invalid model" }, { status: 400 });
  await connectDB();
  const order = await Model.findById(id);
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const flag = (order.issueFlags as any).id(flagId);
  if (!flag) return NextResponse.json({ error: "Flag not found" }, { status: 404 });
  flag.state = "resolved";
  flag.resolvedBy = session.name || session.username;
  flag.resolvedAt = new Date();
  flag.resolveNote = body.note || "";
  order.hasOpenIssue = (order.issueFlags as any).some((f: any) => f.state === "open");
  await order.save();
  await writeAudit({ orderModel: model, orderId: order._id, action: "resolve_flag", field: "issueFlags", oldValue: "open", newValue: "resolved", userId: session.staffId, userName: session.name || session.username, userRole: session.role });
  return NextResponse.json({ ok: true });
}
