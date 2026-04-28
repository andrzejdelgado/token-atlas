import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Theme } from "@/lib/db/models/theme.model";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { revert } = await req.json().catch(() => ({}));

  if (!process.env.MONGODB_URI)
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  await connectToDatabase();

  const update = revert
    ? { $set: { status: "draft" }, $unset: { approvedBy: 1, approvedAt: 1 } }
    : { $set: { status: "approved", approvedBy: session.user.id, approvedAt: new Date() } };

  const theme = await Theme.findByIdAndUpdate(id, update, { new: true }).lean();
  if (!theme) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ data: JSON.parse(JSON.stringify(theme)) });
}
