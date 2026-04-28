import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Theme } from "@/lib/db/models/theme.model";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.MONGODB_URI)
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  await connectToDatabase();
  const { id } = await params;
  const body = await req.json();
  const theme = await Theme.findByIdAndUpdate(id, body, { new: true }).lean();

  if (!theme) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: JSON.parse(JSON.stringify(theme)) });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.MONGODB_URI)
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  await connectToDatabase();
  const { id } = await params;
  await Theme.findByIdAndDelete(id);
  return NextResponse.json({ message: "Deleted" });
}
