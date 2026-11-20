import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { StaffMember } from "@/lib/models";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const staff = await StaffMember.findById(session.staffId).lean();
  if (!staff) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    id: String(staff._id),
    name: staff.name,
    username: staff.username,
    email: staff.email,
    phone: staff.phone,
    role: staff.role,
    active: staff.active,
  });
}
