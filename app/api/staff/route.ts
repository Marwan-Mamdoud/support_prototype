import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { StaffMember, Client } from "@/lib/models";
import { requireSession } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

export async function GET() {
  const { session, response } = await requireSession();
  if (response) return response;
  if (session.role !== "SUPER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await connectDB();
  const staff = await StaffMember.find().lean();
  const clients = await Client.find().lean();
  return NextResponse.json({
    staff: staff.map((s: any) => ({
      id: String(s._id),
      name: s.name,
      username: s.username,
      email: s.email,
      phone: s.phone,
      role: s.role,
      active: s.active,
      assignedBrandIds: (s.assignedBrandIds || []).map((id: any) => String(id)),
    })),
    brands: clients.map((c: any) => ({ id: String(c._id), name: c.companyName })),
  });
}
