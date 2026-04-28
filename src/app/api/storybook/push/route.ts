import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Token } from "@/lib/db/models/token.model";
import { Settings } from "@/lib/db/models/settings.model";
import { Notification } from "@/lib/db/models/notification.model";
import { formatToW3C } from "@/lib/storybook/formatter";
import { pushToStorybook } from "@/lib/storybook/push";
import { canPushToStorybook } from "@/lib/utils/permissions";
import type { IToken } from "@/types/token";
import type { UserRole } from "@/types/token";

export async function POST(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string }).role as UserRole;
  if (!canPushToStorybook(role)) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  if (!process.env.MONGODB_URI)
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  await connectToDatabase();
  const settings = await Settings.findOne({}).lean();

  if (!settings?.storybookGithubToken || !settings?.storybookRepoUrl) {
    return NextResponse.json({ error: "Storybook not configured" }, { status: 400 });
  }

  const tokens = await Token.find({}).lean();
  const w3c = formatToW3C(tokens as unknown as IToken[]);

  await pushToStorybook({
    token: settings.storybookGithubToken,
    repoUrl: settings.storybookRepoUrl,
    branch: settings.storybookBranch ?? "main",
    tokenPath: settings.storybookTokenPath ?? "tokens/tokens.json",
    content: JSON.stringify(w3c, null, 2),
  });

  await Promise.all([
    Settings.updateOne({}, { lastStorybookSync: new Date() }),
    Notification.create({
      userId: session.user.id,
      type: "storybook_sync",
      message: `Pushed ${tokens.length} tokens to Storybook`,
      metadata: { count: tokens.length },
    }),
  ]);

  return NextResponse.json({ message: `Pushed ${tokens.length} tokens to Storybook` });
}
