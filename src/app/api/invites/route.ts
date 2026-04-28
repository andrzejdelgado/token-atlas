import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Invite } from "@/lib/db/models/invite.model";
import { User } from "@/lib/db/models/user.model";
import { isAdmin } from "@/lib/utils/permissions";
import type { UserRole } from "@/types/token";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role as UserRole;
  if (!isAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!process.env.MONGODB_URI) return NextResponse.json({ data: [] });
  await connectToDatabase();

  const invites = await Invite.find({ usedAt: null, expiresAt: { $gt: new Date() } })
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ data: JSON.parse(JSON.stringify(invites)) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role as UserRole;
  if (!isAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!process.env.MONGODB_URI)
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  await connectToDatabase();

  const { email } = await req.json();
  if (!email || typeof email !== "string")
    return NextResponse.json({ error: "Email is required" }, { status: 400 });

  const normalised = email.toLowerCase().trim();

  const existing = await User.findOne({ email: normalised });
  if (existing)
    return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });

  // Replace any pending invite for this email
  await Invite.deleteMany({ email: normalised, usedAt: null });

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const invite = await Invite.create({
    email: normalised,
    token,
    expiresAt,
    createdBy: session.user.id,
  });

  return NextResponse.json(
    {
      data: {
        token: invite.token,
        email: invite.email,
        expiresAt: invite.expiresAt,
      },
    },
    { status: 201 }
  );
}
