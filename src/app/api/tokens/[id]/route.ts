import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Token } from "@/lib/db/models/token.model";
import { AuditLog } from "@/lib/db/models/audit-log.model";
import { Notification } from "@/lib/db/models/notification.model";
import "@/lib/db/models/collection.model";
import "@/lib/db/models/group.model";
import "@/lib/db/models/theme.model";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.MONGODB_URI) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await connectToDatabase();
  const { id } = await params;
  const token = await Token.findById(id)
    .populate("collection", "name")
    .populate("group", "name path")
    .populate("themes", "name slug")
    .lean();

  if (!token) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: JSON.parse(JSON.stringify(token)) });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.MONGODB_URI) return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  await connectToDatabase();
  const { id } = await params;
  const body = await req.json();

  const before = await Token.findById(id).lean();
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updatePayload: Record<string, unknown> = { ...body };
  if (/^[a-f\d]{24}$/i.test(session.user.id)) {
    updatePayload.updatedBy = session.user.id;
  }

  const updated = await Token.findByIdAndUpdate(
    id,
    updatePayload,
    { new: true }
  ).lean();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Determine action type
  let action: string = "value_changed";
  if ("name" in body && body.name !== before.name) action = "renamed";
  else if ("group" in body) action = "moved";
  else if ("flagged" in body) action = body.flagged ? "flagged" : "unflagged";
  else if ("labels" in body) action = "labeled";

  try {
    await AuditLog.create({
      tokenId: id,
      userId: session.user.id,
      action,
      before: JSON.parse(JSON.stringify(before)),
      after: JSON.parse(JSON.stringify(updated)),
      timestamp: new Date(),
    });
  } catch {
    // Audit logging is best-effort; don't fail the main operation
  }

  return NextResponse.json({ data: JSON.parse(JSON.stringify(updated)) });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.MONGODB_URI) return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  await connectToDatabase();
  const { id } = await params;
  const token = await Token.findByIdAndDelete(id).lean();

  if (!token) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await Promise.all([
    AuditLog.create({
      tokenId: id,
      userId: session.user.id,
      action: "deleted",
      before: JSON.parse(JSON.stringify(token)),
      timestamp: new Date(),
    }),
    Notification.create({
      userId: session.user.id,
      type: "token_deleted",
      message: `Token "${token.name}" deleted`,
    }),
  ]);

  return NextResponse.json({ message: "Deleted" });
}
