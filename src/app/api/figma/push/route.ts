import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Token } from "@/lib/db/models/token.model";
import { Settings } from "@/lib/db/models/settings.model";
import { Notification } from "@/lib/db/models/notification.model";
import { FigmaClient } from "@/lib/figma/client";
import { mapTokensToFigma } from "@/lib/figma/mapper";
import type { IToken } from "@/types/token";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.MONGODB_URI)
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  await connectToDatabase();

  const settings = await Settings.findOne({}).lean();
  if (!settings?.figmaPersonalAccessToken || !settings?.figmaFileKey) {
    return NextResponse.json({ error: "Figma not configured" }, { status: 400 });
  }

  const { themeId } = await req.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = {};
  if (themeId) query.themes = themeId;

  const tokens = await Token.find(query).lean();
  const client = new FigmaClient(settings.figmaPersonalAccessToken);

  // Get existing variable collections to find IDs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existing = (await client.getVariables(settings.figmaFileKey)) as any;
  const collections = existing?.meta?.variableCollections ?? {};
  const colEntries = Object.values(collections) as Array<{
    id: string;
    modes: Array<{ modeId: string; name: string }>;
  }>;

  if (colEntries.length === 0) {
    return NextResponse.json(
      { error: "No variable collections found in Figma file" },
      { status: 400 }
    );
  }

  const col = colEntries[0];
  const lightMode = col.modes.find((m) => m.name.toLowerCase() === "light");
  const darkMode = col.modes.find((m) => m.name.toLowerCase() === "dark");

  if (!lightMode || !darkMode) {
    return NextResponse.json(
      { error: "Figma collection must have Light and Dark modes" },
      { status: 400 }
    );
  }

  const variables = mapTokensToFigma(
    tokens as unknown as IToken[],
    col.id,
    lightMode.modeId,
    darkMode.modeId
  );

  await client.pushVariables(settings.figmaFileKey, { variables });

  await Promise.all([
    Settings.updateOne({}, { lastFigmaSync: new Date() }),
    Notification.create({
      userId: session.user.id,
      type: "figma_sync",
      message: `Pushed ${tokens.length} tokens to Figma`,
      metadata: { count: tokens.length },
    }),
  ]);

  return NextResponse.json({ message: `Pushed ${tokens.length} tokens to Figma` });
}
