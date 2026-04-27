import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { ThemeOverride } from "@/lib/db/models/theme-override.model";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.MONGODB_URI) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  await connectToDatabase();
  const { id } = await params;
  const themeId = req.nextUrl.searchParams.get("themeId");
  if (!themeId) return NextResponse.json({ error: "themeId is required" }, { status: 400 });

  const override = await ThemeOverride.findOne({ theme: themeId, token: id }).lean();
  return NextResponse.json({ data: override ? JSON.parse(JSON.stringify(override)) : null });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.MONGODB_URI) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  await connectToDatabase();
  const { id } = await params;
  const { themeId, lightValue, darkValue } = await req.json();
  if (!themeId) return NextResponse.json({ error: "themeId is required" }, { status: 400 });

  const override = await ThemeOverride.findOneAndUpdate(
    { theme: themeId, token: id },
    { $set: { lightValue, darkValue } },
    { upsert: true, new: true }
  ).lean();

  return NextResponse.json({ data: JSON.parse(JSON.stringify(override)) });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.MONGODB_URI) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  await connectToDatabase();
  const { id } = await params;
  const themeId = req.nextUrl.searchParams.get("themeId");
  if (!themeId) return NextResponse.json({ error: "themeId is required" }, { status: 400 });

  await ThemeOverride.findOneAndDelete({ theme: themeId, token: id });
  return NextResponse.json({ message: "Deleted" });
}
