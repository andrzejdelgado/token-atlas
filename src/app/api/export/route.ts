import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Token } from "@/lib/db/models/token.model";
import { Notification } from "@/lib/db/models/notification.model";
import { formatToW3C } from "@/lib/storybook/formatter";
import type { IToken } from "@/types/token";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.MONGODB_URI)
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  await connectToDatabase();

  const { searchParams } = req.nextUrl;
  const scope = searchParams.get("scope") ?? "all";
  const scopeId = searchParams.get("scopeId");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = {};
  if (scope === "theme" && scopeId) query.themes = scopeId;
  else if (scope === "collection" && scopeId) query.collection = scopeId;
  else if (scope === "group" && scopeId) query.group = scopeId;

  const tokens = await Token.find(query).lean();
  const w3c = formatToW3C(tokens as unknown as IToken[]);

  await Notification.create({
    userId: session.user.id,
    type: "export",
    message: `Exported ${tokens.length} tokens`,
    metadata: { count: tokens.length, scope },
  });

  return new NextResponse(JSON.stringify(w3c, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="tokens.json"`,
    },
  });
}
