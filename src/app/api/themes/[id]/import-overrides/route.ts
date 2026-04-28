import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Theme } from "@/lib/db/models/theme.model";
import { Token } from "@/lib/db/models/token.model";
import { ThemeOverride } from "@/lib/db/models/theme-override.model";
import { Collection } from "@/lib/db/models/collection.model";
import { Group } from "@/lib/db/models/group.model";
import { flattenW3C, w3cTypeToTokenType, type W3CTree } from "@/lib/utils/w3c-tokens";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { tokens: rawTokens, confirm = false, flaggedNames = [] } = await req.json();

  if (!process.env.MONGODB_URI)
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  await connectToDatabase();

  const theme = await Theme.findById(id).lean();
  if (!theme) return NextResponse.json({ error: "Theme not found" }, { status: 404 });
  if (theme.isBase)
    return NextResponse.json({ error: "Cannot import overrides for base theme" }, { status: 400 });

  const flat = flattenW3C(rawTokens as W3CTree);

  // Load all existing base tokens keyed by name
  const baseTokens = await Token.find({}).select("_id name lightValue darkValue tokenType").lean();
  const baseMap = new Map(baseTokens.map((t) => [t.name, t]));

  // Categorise each imported token
  const newOverrides: typeof flat = [];
  const updatedOverrides: typeof flat = [];
  const unmatched: typeof flat = [];

  // Load existing overrides for this theme
  const existingOverrides = await ThemeOverride.find({ theme: id })
    .select("token lightValue")
    .lean();
  const existingOverrideMap = new Map(existingOverrides.map((o) => [o.token.toString(), o]));

  for (const t of flat) {
    const base = baseMap.get(t.name);
    if (!base) {
      unmatched.push(t);
      continue;
    }
    // Only create override if value differs from base
    if (t.value === base.lightValue) continue;

    const hasExisting = existingOverrideMap.has(base._id.toString());
    if (hasExisting) {
      updatedOverrides.push(t);
    } else {
      newOverrides.push(t);
    }
  }

  if (!confirm) {
    return NextResponse.json({ newOverrides, updatedOverrides, unmatched });
  }

  // ── Confirm: apply overrides ──────────────────────────────────────────────
  const userId = session.user.id;

  // Upsert overrides for matching tokens
  for (const t of [...newOverrides, ...updatedOverrides]) {
    const base = baseMap.get(t.name)!;
    const isFlagged = flaggedNames.includes(t.name);
    await ThemeOverride.findOneAndUpdate(
      { theme: id, token: base._id },
      { lightValue: t.value, darkValue: t.value, disabled: false },
      { upsert: true, new: true }
    );
    if (isFlagged) {
      await Token.findByIdAndUpdate(base._id, { flagged: true });
    }
  }

  // Handle unmatched: create as new base tokens, flag them, create flagged overrides in all other modifier themes
  if (unmatched.length > 0) {
    const unmatchedFlaggedNames = new Set([...unmatched.map((t) => t.name), ...flaggedNames]);

    const globalCollection = await Collection.findOne({ name: "Global" }).lean();
    const defaultGroup = globalCollection
      ? await Group.findOne({ collection: globalCollection._id, depth: 0 }).lean()
      : null;

    const otherModifiers = await Theme.find({
      _id: { $ne: id },
      isBase: false,
      status: { $ne: "draft" },
    })
      .select("_id")
      .lean();

    for (const t of unmatched) {
      const shouldFlag = unmatchedFlaggedNames.has(t.name);
      const newToken = await Token.create({
        name: t.name,
        tokenType: w3cTypeToTokenType(t.type),
        collection: globalCollection?._id,
        group: defaultGroup?._id ?? globalCollection?._id,
        lightValue: t.value,
        darkValue: t.value,
        flagged: shouldFlag,
        labels: [],
        createdBy: userId,
        updatedBy: userId,
      });

      // Create override for the target theme
      await ThemeOverride.create({
        theme: id,
        token: newToken._id,
        lightValue: t.value,
        darkValue: t.value,
      });

      // Create flagged overrides in all other modifier themes
      for (const modifier of otherModifiers) {
        await ThemeOverride.findOneAndUpdate(
          { theme: modifier._id, token: newToken._id },
          { lightValue: t.value, darkValue: t.value, disabled: false },
          { upsert: true, new: true }
        );
        if (shouldFlag) {
          await Token.findByIdAndUpdate(newToken._id, { flagged: true });
        }
      }
    }
  }

  return NextResponse.json({
    message: "Overrides imported",
    counts: {
      newOverrides: newOverrides.length,
      updatedOverrides: updatedOverrides.length,
      unmatched: unmatched.length,
    },
  });
}
