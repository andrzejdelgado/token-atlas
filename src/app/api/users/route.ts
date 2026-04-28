import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { User } from "@/lib/db/models/user.model";
import { Invite } from "@/lib/db/models/invite.model";
import { isAdmin } from "@/lib/utils/permissions";
import bcrypt from "bcryptjs";
import type { UserRole } from "@/types/token";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string }).role as UserRole;
  if (!isAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!process.env.MONGODB_URI) return NextResponse.json({ data: [] });
  await connectToDatabase();
  const users = await User.find({}, "-passwordHash").sort({ createdAt: -1 }).lean();
  return NextResponse.json({ data: JSON.parse(JSON.stringify(users)) });
}

export async function POST(req: NextRequest) {
  if (!process.env.MONGODB_URI)
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  await connectToDatabase();

  const { name, email, password, inviteToken } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const normalised = (email as string).toLowerCase().trim();
  const isFirstUser = (await User.countDocuments()) === 0;

  if (!isFirstUser) {
    if (!inviteToken) {
      return NextResponse.json({ error: "An invite is required to register" }, { status: 403 });
    }
    const invite = await Invite.findOne({
      token: inviteToken,
      usedAt: null,
      expiresAt: { $gt: new Date() },
    });
    if (!invite) {
      return NextResponse.json({ error: "Invalid or expired invite" }, { status: 403 });
    }
    if (invite.email !== normalised) {
      return NextResponse.json({ error: "Email does not match the invite" }, { status: 403 });
    }
    // Consume the invite
    await Invite.updateOne({ _id: invite._id }, { usedAt: new Date() });
  }

  const existing = await User.findOne({ email: normalised });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists" },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await User.create({
    name,
    email: normalised,
    passwordHash,
    role: isFirstUser ? "admin" : "user",
  });

  return NextResponse.json(
    { data: { id: user._id.toString(), email: user.email, name: user.name, role: user.role } },
    { status: 201 }
  );
}
