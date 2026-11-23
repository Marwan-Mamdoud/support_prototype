import { getSession } from "@/lib/auth";
import { StaffMember } from "@/lib/models";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

export interface AuthedSession {
  staffId: string;
  username: string;
  name: string;
  role: "SUPER" | "SUPPORT";
  assignedBrandIds: string[];
}

export async function requireSession() {
  const session = await getSession();
  if (!session) return { session: null, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const staff = await StaffMember.findById(session.staffId).lean();
  if (!staff) return { session: null, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const authed: AuthedSession = {
    staffId: session.staffId,
    username: session.username,
    name: session.name,
    role: session.role as "SUPER" | "SUPPORT",
    assignedBrandIds: (staff.assignedBrandIds || []).map((id: any) => String(id)),
  };
  return { session: authed, response: null };
}

export function canAccessBrand(session: AuthedSession, brandId?: string | null) {
  if (session.role === "SUPER") return true;
  if (!brandId) return false;
  return session.assignedBrandIds.includes(String(brandId));
}

export function getBrandFilter(session: AuthedSession) {
  if (session.role === "SUPER") return {};
  return { clientId: { $in: session.assignedBrandIds.map((id) => new mongoose.Types.ObjectId(id)) } };
}

export async function loadOrderWithAccess(Model: any, id: string, session: AuthedSession) {
  const order = await Model.findById(id);
  if (!order) return { order: null, error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  if (!canAccessBrand(session, order.clientId)) {
    return { order: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { order, error: null };
}
