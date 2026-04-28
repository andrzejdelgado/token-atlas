import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Theme } from "@/lib/db/models/theme.model";
import { ThemeOverride } from "@/lib/db/models/theme-override.model";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.MONGODB_URI) return NextResponse.json({ data: [] });
  await connectToDatabase();

  const includeDrafts = req.nextUrl.searchParams.get("includeDrafts") === "true";
  const query = includeDrafts
    ? {}
    : { $or: [{ status: "approved" }, { status: { $exists: false } }] };
  const themes = await Theme.find(query).sort({ position: 1, name: 1 }).lean();

  // Count how many token overrides each theme has (baseTheme always 0)
  const countResults = await ThemeOverride.aggregate([
    { $group: { _id: "$theme", count: { $sum: 1 } } },
  ]);
  const countMap = new Map(countResults.map((r) => [r._id.toString(), r.count]));

  const data = themes.map((t) => ({
    ...JSON.parse(JSON.stringify(t)),
    isBase: !!t.isBase,
    status: t.status ?? "approved",
    modificationCount: t.isBase ? 0 : (countMap.get(t._id.toString()) ?? 0),
  }));

  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.MONGODB_URI)
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  await connectToDatabase();
  const { name, slug, description, isBase } = await req.json();

  const existing = await Theme.findOne({ slug });
  if (existing)
    return NextResponse.json({ error: "Theme with this slug already exists" }, { status: 409 });

  // Modifier themes start as draft; base themes start as approved
  const status = isBase ? "approved" : "draft";
  const theme = await Theme.create({ name, slug, description, isBase: !!isBase, status });

  // Re-sort all themes of the same type alphabetically and assign positions
  const siblings = await Theme.find({ isBase: !!isBase }).sort({ name: 1 }).lean();
  await Theme.bulkWrite(
    siblings.map((t, i) => ({
      updateOne: { filter: { _id: t._id }, update: { $set: { position: i } } },
    }))
  );

  return NextResponse.json({ data: JSON.parse(JSON.stringify(theme)) }, { status: 201 });
}
