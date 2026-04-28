import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Settings } from "@/lib/db/models/settings.model";
import { isAdmin } from "@/lib/utils/permissions";
import type { UserRole } from "@/types/token";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.MONGODB_URI) return NextResponse.json({ data: null });
  await connectToDatabase();
  const settings = await Settings.findOne({}).lean();

  if (!settings) {
    const created = await Settings.create({
      storybookBranch: "main",
      storybookTokenPath: "tokens/tokens.json",
    });
    return NextResponse.json({ data: JSON.parse(JSON.stringify(created)) });
  }

  const role = (session.user as { role?: string }).role as UserRole;
  // Mask sensitive fields for non-admins
  if (!isAdmin(role)) {
    const masked = { ...JSON.parse(JSON.stringify(settings)) };
    delete masked.figmaPersonalAccessToken;
    delete masked.storybookGithubToken;
    return NextResponse.json({ data: masked });
  }

  return NextResponse.json({ data: JSON.parse(JSON.stringify(settings)) });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string }).role as UserRole;
  if (!isAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!process.env.MONGODB_URI)
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  await connectToDatabase();
  const body = await req.json();

  const settings = await Settings.findOneAndUpdate(
    {},
    { $set: body },
    { new: true, upsert: true }
  ).lean();

  return NextResponse.json({ data: JSON.parse(JSON.stringify(settings)) });
}
