import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Notification } from "@/lib/db/models/notification.model";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.MONGODB_URI) return NextResponse.json({ data: [] });
  if (!mongoose.Types.ObjectId.isValid(session.user.id)) return NextResponse.json({ data: [] });

  await connectToDatabase();
  const notifications = await Notification.find({ userId: session.user.id })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  return NextResponse.json({ data: JSON.parse(JSON.stringify(notifications)) });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.MONGODB_URI) return NextResponse.json({ message: "Updated" });
  if (!mongoose.Types.ObjectId.isValid(session.user.id))
    return NextResponse.json({ message: "Updated" });

  await connectToDatabase();
  const { id, all } = await req.json();

  if (all) {
    await Notification.updateMany({ userId: session.user.id }, { read: true });
  } else if (id) {
    await Notification.findByIdAndUpdate(id, { read: true });
  }

  return NextResponse.json({ message: "Updated" });
}
