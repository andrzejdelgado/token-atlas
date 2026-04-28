import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { ThemeOverride } from "@/lib/db/models/theme-override.model";
import "@/lib/db/models/token.model";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  if (!process.env.MONGODB_URI) return NextResponse.json({ data: [] });
  await connectToDatabase();

  const overrides = await ThemeOverride.find({ theme: id })
    .populate("token", "name tokenType lightValue darkValue flagged")
    .sort({ "token.name": 1 })
    .lean();

  return NextResponse.json({ data: JSON.parse(JSON.stringify(overrides)) });
}
