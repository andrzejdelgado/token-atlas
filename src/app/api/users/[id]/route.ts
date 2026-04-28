import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { User } from "@/lib/db/models/user.model";
import { isAdmin } from "@/lib/utils/permissions";
import type { UserRole } from "@/types/token";

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

  // Only admins can change roles
  if ("role" in body && !isAdmin(role)) {
    delete body.role;
  }

  const user = await User.findByIdAndUpdate(id, body, { new: true }).select("-passwordHash").lean();

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: JSON.parse(JSON.stringify(user)) });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string }).role as UserRole;
  if (!isAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!process.env.MONGODB_URI)
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  await connectToDatabase();
  const { id } = await params;
  await User.findByIdAndDelete(id);
  return NextResponse.json({ message: "Deleted" });
}
