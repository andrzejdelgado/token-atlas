import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Invite } from "@/lib/db/models/invite.model";
import { isAdmin } from "@/lib/utils/permissions";
import type { UserRole } from "@/types/token";

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  if (!process.env.MONGODB_URI)
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  await connectToDatabase();

  const invite = await Invite.findOne({
    token,
    usedAt: null,
    expiresAt: { $gt: new Date() },
  }).lean();

  if (!invite) return NextResponse.json({ error: "Invalid or expired invite" }, { status: 404 });
  return NextResponse.json({ data: { email: invite.email } });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role as UserRole;
  if (!isAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!process.env.MONGODB_URI)
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  await connectToDatabase();

  const { token } = await params;
  await Invite.deleteOne({ token });
  return NextResponse.json({ message: "Revoked" });
}
