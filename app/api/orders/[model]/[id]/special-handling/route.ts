import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { orderModelFor } from "@/lib/models/Order";
import { requireSession, loadOrderWithAccess } from "@/lib/serverAuth";
import { writeAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ model: string; id: string }> }) {
  const { session, response } = await requireSession();
  if (response) return response;
  const { model, id } = await ctx.params;
  const Model = orderModelFor(model);
  if (!Model) return NextResponse.json({ error: "Invalid model" }, { status: 400 });
  await connectDB();
  const { order, error } = await loadOrderWithAccess(Model, id, session);
  if (error) return error;
  const body = await req.json();
  const old = order.specialHandling;
  order.specialHandling = body.specialHandling;
  await order.save();
  await writeAudit({ orderModel: model, orderId: order._id, action: "special_handling", field: "specialHandling", oldValue: old, newValue: body.specialHandling, userId: session.staffId, userName: session.name || session.username, userRole: session.role });
  return NextResponse.json({ ok: true });
}
