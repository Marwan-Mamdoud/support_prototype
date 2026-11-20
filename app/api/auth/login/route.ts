import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { StaffMember } from "@/lib/models";
import { verifyPassword, signSession, setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { username, email, password } = body || {};
  const loginId = email || username;
  if (!loginId || !password) {
    return NextResponse.json({ error: "Email/username and password required" }, { status: 400 });
  }
  await connectDB();
  const staff = await StaffMember.findOne({ $or: [{ username: loginId }, { email: loginId }] });
  if (!staff || !staff.active) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
  const ok = await verifyPassword(password, staff.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
  const token = await signSession({ staffId: String(staff._id), username: staff.username, name: staff.name, role: staff.role });
  await setSessionCookie(token);
  return NextResponse.json({ user: { id: String(staff._id), name: staff.name, username: staff.username, role: staff.role } });
}
