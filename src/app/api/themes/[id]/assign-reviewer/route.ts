import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Theme } from "@/lib/db/models/theme.model";
import { Notification } from "@/lib/db/models/notification.model";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { reviewerId } = await req.json();
  if (!reviewerId) return NextResponse.json({ error: "reviewerId required" }, { status: 400 });

  if (!process.env.MONGODB_URI)
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  await connectToDatabase();

  const theme = await Theme.findByIdAndUpdate(id, { reviewerId }, { new: true }).lean();
  if (!theme) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await Notification.create({
    userId: reviewerId,
    type: "peer_review_assigned",
    message: `You have been assigned to peer review the theme "${theme.name}"`,
    metadata: { themeId: id, themeName: theme.name, assignedBy: session.user.id },
  });

  return NextResponse.json({ data: JSON.parse(JSON.stringify(theme)) });
}
