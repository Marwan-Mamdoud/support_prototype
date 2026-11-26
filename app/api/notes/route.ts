import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { SupportNote } from "@/lib/models";
import { requireSession } from "@/lib/serverAuth";
import { StaffMember } from "@/lib/models";

export const dynamic = "force-dynamic";

async function getNoteModel() {
  const mod = await import("@/lib/models/SupportNote");
  return mod.SupportNote;
}

export async function GET(req: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;
  await connectDB();
  const Note = await getNoteModel();
  const q = req.nextUrl.searchParams.get("q");
  const isSuper = session.role === "SUPER";
  const filter: any = isSuper ? {} : { staffId: session.staffId };
  if (q) filter.text = { $regex: q, $options: "i" };
  const items = await Note.find(filter).sort({ createdAt: -1 }).lean();
  const staffIds = Array.from(new Set(items.map((i: any) => String(i.staffId))));
  const staff = await StaffMember.find({ _id: { $in: staffIds } }).select("name").lean();
  const nameMap = new Map(staff.map((s: any) => [String(s._id), s.name]));
  return NextResponse.json({
    items: items.map((i: any) => ({
      ...i,
      id: String(i._id),
      staffName: nameMap.get(String(i.staffId)) || "",
    })),
  });
}

export async function POST(req: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;
  await connectDB();
  const Note = await getNoteModel();
  const body = await req.json();
  const n = await Note.create({ staffId: session.staffId, text: body.text, done: false });
  return NextResponse.json({ id: String(n._id) }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;
  await connectDB();
  const Note = await getNoteModel();
  const body = await req.json();
  const n = await Note.findOne({ _id: body.id, staffId: session.staffId });
  if (!n) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (body.text !== undefined) n.text = body.text;
  if (body.done !== undefined) { n.done = body.done; n.doneAt = body.done ? new Date() : null; }
  await n.save();
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;
  await connectDB();
  const Note = await getNoteModel();
  const body = await req.json();
  await Note.deleteOne({ _id: body.id, staffId: session.staffId });
  return NextResponse.json({ ok: true });
}
