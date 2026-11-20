import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/serverAuth";
import { uploadImage } from "@/lib/cloudinary";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { response } = await requireSession();
  if (response) return response;
  const body = await req.json();
  const url = await uploadImage(body.dataUri);
  return NextResponse.json({ url });
}
