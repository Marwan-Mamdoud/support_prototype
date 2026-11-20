import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { orderModelFor } from "@/lib/models/Order";
import { requireSession } from "@/lib/serverAuth";
import { editableScope, canEditField } from "@/lib/rules/editRules";
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
  const scope = editableScope(order.status, Object.keys(order.statusHistory || {}));
  if (!canEditField(scope, "customerAddress")) {
    return NextResponse.json({ error: "Address is locked for this order" }, { status: 403 });
  }
  const body = await req.json();
  const old = order.customerAddress;
  order.customerAddress = body.address;
  if (body.governorate) order.customerGovernorate = String(body.governorate).toUpperCase();
  await order.save();
  await writeAudit({ orderModel: model, orderId: order._id, action: "apply_address", field: "customerAddress", oldValue: old, newValue: body.address, userId: session.staffId, userName: session.name || session.username, userRole: session.role });
  return NextResponse.json({ ok: true });
}
