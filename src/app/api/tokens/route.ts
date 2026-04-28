import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Token } from "@/lib/db/models/token.model";
import "@/lib/db/models/collection.model";
import { Theme } from "@/lib/db/models/theme.model";
import { ThemeOverride } from "@/lib/db/models/theme-override.model";
import { Group } from "@/lib/db/models/group.model";
import { AuditLog } from "@/lib/db/models/audit-log.model";
import { Notification } from "@/lib/db/models/notification.model";

const PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.MONGODB_URI) return NextResponse.json({ data: [], hasMore: false });
  try {
    await connectToDatabase();

    const { searchParams } = req.nextUrl;
    const cursor = searchParams.get("cursor");
    const search = searchParams.get("search");
    const collectionId = searchParams.get("collection");
    const groupId = searchParams.get("group");
    const themeId = searchParams.get("theme");
    const flagged = searchParams.get("flagged");
    const tokenTypes = searchParams.getAll("tokenType");
    const labels = searchParams.getAll("label");
    const components = searchParams.getAll("component");
    const modifiedAfter = searchParams.get("modifiedAfter");
    const modifiedBefore = searchParams.get("modifiedBefore");
    const excludeSearch = searchParams.get("excludeSearch");
    const excludeCollectionId = searchParams.get("excludeCollection");
    const excludeGroupId = searchParams.get("excludeGroup");
    const excludeFlagged = searchParams.get("excludeFlagged");
    const excludeTokenTypes = searchParams.getAll("excludeTokenType");
    const excludeLabels = searchParams.getAll("excludeLabel");
    const excludeComponents = searchParams.getAll("excludeComponent");
    const ids = searchParams.getAll("id");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: Record<string, any> = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { labels: { $in: [new RegExp(search, "i")] } },
        { lightValue: { $regex: search, $options: "i" } },
      ];
    }
    if (collectionId) query.collection = collectionId;
    if (groupId) {
      const selectedGroup = await Group.findById(groupId).select("path collection").lean();
      if (selectedGroup) {
        const escapedPath = selectedGroup.path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const allGroupIds = await Group.find({
          collection: selectedGroup.collection,
          path: { $regex: `^${escapedPath}` },
        })
          .select("_id")
          .lean();
        query.group = { $in: allGroupIds.map((g) => g._id) };
      } else {
        query.group = groupId;
      }
    }
    if (flagged === "true") query.flagged = true;
    if (tokenTypes.length) query.tokenType = { $in: tokenTypes };
    if (labels.length) query.labels = { $in: labels };
    if (components.length) query.associatedComponents = { $in: components };
    if (modifiedAfter || modifiedBefore) {
      query.updatedAt = {};
      if (modifiedAfter) query.updatedAt.$gte = new Date(modifiedAfter);
      if (modifiedBefore) query.updatedAt.$lte = new Date(modifiedBefore);
    }
    if (excludeSearch) {
      const notPattern = new RegExp(excludeSearch, "i");
      query.$and = [
        ...(query.$and ?? []),
        { name: { $not: notPattern } },
        { lightValue: { $not: notPattern } },
      ];
    }
    if (excludeCollectionId)
      query.collection = { ...(query.collection ?? {}), $ne: excludeCollectionId };
    if (excludeGroupId) query.group = { ...(query.group ?? {}), $nin: [excludeGroupId] };
    if (excludeFlagged === "true") query.flagged = { $ne: true };
    if (excludeTokenTypes.length)
      query.tokenType = { ...(query.tokenType ?? {}), $nin: excludeTokenTypes };
    if (excludeLabels.length) query.labels = { ...(query.labels ?? {}), $nin: excludeLabels };
    if (excludeComponents.length)
      query.associatedComponents = {
        ...(query.associatedComponents ?? {}),
        $nin: excludeComponents,
      };

    if (ids.length) {
      query._id = { $in: ids };
    } else if (cursor) {
      query._id = { $gt: cursor };
    }

    const tokens = await Token.find(query)
      .sort({ _id: 1 })
      .limit(ids.length || PAGE_SIZE + 1)
      .populate("collection", "name")
      .populate("group", "name path depth sortPath")
      .lean();

    const hasMore = ids.length ? false : tokens.length > PAGE_SIZE;
    const page = hasMore ? tokens.slice(0, PAGE_SIZE) : tokens;
    const nextCursor = hasMore ? page[page.length - 1]._id.toString() : undefined;

    // If a specific non-base theme is requested, apply its overrides
    const overrideMap = new Map<string, { lightValue?: string; darkValue?: string }>();
    if (themeId) {
      const theme = await Theme.findById(themeId).select("isBase").lean();
      if (theme && !theme.isBase) {
        const overrides = await ThemeOverride.find({
          theme: themeId,
          token: { $in: page.map((t) => t._id) },
        })
          .select("token lightValue darkValue")
          .lean();
        for (const o of overrides) {
          overrideMap.set(o.token.toString(), { lightValue: o.lightValue, darkValue: o.darkValue });
        }
      }
    }

    const data = page.map((token) => {
      const override = overrideMap.get(token._id.toString());
      return serialize({
        ...token,
        lightValue: override?.lightValue ?? token.lightValue,
        darkValue: override?.darkValue ?? token.darkValue,
        _overridden: !!override,
      });
    });

    return NextResponse.json({ data, hasMore, nextCursor });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.MONGODB_URI)
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  await connectToDatabase();
  const body = await req.json();

  const token = await Token.create({
    ...body,
    createdBy: session.user.id,
    updatedBy: session.user.id,
  });

  await Promise.all([
    AuditLog.create({
      tokenId: token._id,
      userId: session.user.id,
      action: "created",
      after: { name: token.name },
      timestamp: new Date(),
    }),
    Notification.create({
      userId: session.user.id,
      type: "token_created",
      message: `Token "${token.name}" created`,
    }),
  ]);

  return NextResponse.json({ data: serialize(token.toObject()) }, { status: 201 });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serialize(doc: any) {
  return JSON.parse(JSON.stringify(doc));
}
