import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { AuditLog } from "@/lib/db/models/audit-log.model";
import "@/lib/db/models/user.model";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.MONGODB_URI) return NextResponse.json({ data: [] });
  await connectToDatabase();
  const { id } = await params;

  const logs = await AuditLog.find({ tokenId: id })
    .sort({ timestamp: -1 })
    .limit(100)
    .populate("userId", "name email avatarUrl")
    .lean();

  return NextResponse.json({ data: JSON.parse(JSON.stringify(logs)) });
}
