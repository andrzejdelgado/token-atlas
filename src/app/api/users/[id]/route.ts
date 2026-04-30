import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { User } from "@/lib/db/models/user.model";
import { isAdmin } from "@/lib/utils/permissions";
import type { UserRole } from "@/types/token";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string }).role as UserRole;
  const { id } = await params;

  const isSelf = session.user.id === id;
  if (!isSelf && !isAdmin(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!process.env.MONGODB_URI)
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  await connectToDatabase();

  const user = await User.findById(id).select("-passwordHash").lean();
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: JSON.parse(JSON.stringify(user)) });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string }).role as UserRole;
  const { id } = await params;

  // Users can update their own profile; admins can update anything
  const isSelf = session.user.id === id;
  if (!isSelf && !isAdmin(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!process.env.MONGODB_URI)
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  await connectToDatabase();
  const body = await req.json();

  // Whitelist updatable fields; admins can also change role and reset passwords
  const allowed = isAdmin(role) ? ["name", "role", "preferences"] : ["name", "preferences"];
  const update: Record<string, unknown> = Object.fromEntries(
    Object.entries(body).filter(([k]) => allowed.includes(k))
  );

  if (isAdmin(role) && typeof body.newPassword === "string" && body.newPassword.length >= 8) {
    update.passwordHash = await bcrypt.hash(body.newPassword, 10);
  }

  const user = await User.findByIdAndUpdate(id, update, { new: true })
    .select("-passwordHash")
    .lean();

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: JSON.parse(JSON.stringify(user)) });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string }).role as UserRole;
  const { id } = await params;

  const isSelf = session.user.id === id;
  if (!isSelf && !isAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!process.env.MONGODB_URI)
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  await connectToDatabase();

  const target = await User.findById(id).lean();
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (target.role === "admin") {
    const adminCount = await User.countDocuments({ role: "admin" });
    if (adminCount <= 1)
      return NextResponse.json({ error: "Cannot delete the last admin" }, { status: 400 });
  }

  await User.findByIdAndDelete(id);
  return NextResponse.json({ message: "Deleted" });
}
