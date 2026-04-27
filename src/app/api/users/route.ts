import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { User } from "@/lib/db/models/user.model";
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
  if (!process.env.MONGODB_URI) return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  await connectToDatabase();
  const { name, email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const isFirstUser = (await User.countDocuments()) === 0;

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash,
    role: isFirstUser ? "admin" : "user",
  });

  return NextResponse.json(
    { data: { id: user._id.toString(), email: user.email, name: user.name, role: user.role } },
    { status: 201 }
  );
}
