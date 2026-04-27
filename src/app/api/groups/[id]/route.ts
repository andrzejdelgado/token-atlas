import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Group } from "@/lib/db/models/group.model";
import { Token } from "@/lib/db/models/token.model";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.MONGODB_URI) return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  await connectToDatabase();
  const { id } = await params;
  const group = await Group.findById(id).lean();
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Compute stats
  const escapedPath = group.path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const descendantIds = await Group.distinct("_id", { path: { $regex: `^${escapedPath}/` } });
  const allGroupIds = [group._id, ...descendantIds];

  const [directChildCount, directTokenCount, totalTokenCount] = await Promise.all([
    Group.countDocuments({ parent: id }),
    Token.countDocuments({ group: id }),
    Token.countDocuments({ group: { $in: allGroupIds } }),
  ]);

  return NextResponse.json({
    data: {
      ...JSON.parse(JSON.stringify(group)),
      directChildCount,
      directTokenCount,
      totalTokenCount,
    },
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.MONGODB_URI) return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  await connectToDatabase();
  const { id } = await params;

  const body = await req.json();
  const { name, parentId, collectionId, moveTokens } = body;

  // Simple rename-only (legacy path — no location change keys present)
  if (!("parentId" in body) && !("collectionId" in body)) {
    const group = await Group.findByIdAndUpdate(id, body, { new: true }).lean();
    if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: JSON.parse(JSON.stringify(group)) });
  }

  // Full move/rename — cascade to descendants
  const group = await Group.findById(id).lean();
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const newName = (name ?? group.name) as string;
  const newCollectionId = (collectionId ?? group.collection.toString()) as string;
  const namePart = newName.toLowerCase().replace(/\s+/g, "-");

  // Compute new path and depth based on new parent
  let newPath: string;
  let newDepth: number;
  let newParentId: string | null;

  if ("parentId" in body) {
    if (parentId === null || parentId === "") {
      // Top-level in the collection
      newPath = namePart;
      newDepth = 0;
      newParentId = null;
    } else {
      const parent = await Group.findById(parentId).lean();
      if (!parent) return NextResponse.json({ error: "Parent group not found" }, { status: 400 });
      newPath = `${parent.path}/${namePart}`;
      newDepth = parent.depth + 1;
      newParentId = parentId;
    }
  } else {
    // Same parent, only rename — recompute path leaf
    const parts = group.path.split("/");
    parts[parts.length - 1] = namePart;
    newPath = parts.join("/");
    newDepth = group.depth;
    newParentId = group.parent ? group.parent.toString() : null;
  }

  const oldPath = group.path;

  // Update this group
  await Group.findByIdAndUpdate(id, {
    name: newName,
    path: newPath,
    depth: newDepth,
    parent: newParentId ?? null,
    collection: newCollectionId,
  });

  // Find all descendant groups and cascade path/depth/collection updates
  const escapedPath = oldPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const descendants = await Group.find({
    path: { $regex: `^${escapedPath}/` },
  }).lean();

  const depthDelta = newDepth - group.depth;

  const bulkOps = descendants.map((desc) => ({
    updateOne: {
      filter: { _id: desc._id },
      update: {
        $set: {
          path: newPath + desc.path.slice(oldPath.length),
          depth: desc.depth + depthDelta,
          collection: newCollectionId,
        },
      },
    },
  }));

  if (bulkOps.length > 0) await Group.bulkWrite(bulkOps);

  // Optionally move all tokens to new collection
  if (moveTokens) {
    const allGroupIds = [id, ...descendants.map((d) => d._id.toString())];
    await Token.updateMany(
      { group: { $in: allGroupIds } },
      { $set: { collection: newCollectionId } }
    );
  }

  const updated = await Group.findById(id).lean();
  return NextResponse.json({ data: JSON.parse(JSON.stringify(updated)) });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.MONGODB_URI) return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  await connectToDatabase();
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const { tokenTargetGroupId } = body as { tokenTargetGroupId?: string };

  const group = await Group.findById(id).lean();
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Find all descendants
  const escapedPath = group.path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const descendants = await Group.find({ path: { $regex: `^${escapedPath}/` } }).lean();

  // Direct children of the deleted group (to be promoted to top-level)
  const directChildren = descendants.filter(
    (d) => d.parent?.toString() === id
  );

  // Promote direct children to top-level, cascade their descendants
  const bulkOps: Parameters<typeof Group.bulkWrite>[0] = [];

  for (const child of directChildren) {
    const leafName = child.path.split("/").pop() ?? child.name.toLowerCase().replace(/\s+/g, "-");
    const newChildPath = leafName;
    const oldChildPath = child.path;
    const depthDelta = -child.depth; // bring to depth 0

    // Promote the direct child
    bulkOps.push({
      updateOne: {
        filter: { _id: child._id },
        update: { $set: { path: newChildPath, depth: 0, parent: null } },
      },
    });

    // Cascade path/depth to grandchildren (descendants of this child)
    const childDescendants = descendants.filter(
      (d) => d.path.startsWith(oldChildPath + "/")
    );
    for (const grandchild of childDescendants) {
      bulkOps.push({
        updateOne: {
          filter: { _id: grandchild._id },
          update: {
            $set: {
              path: newChildPath + grandchild.path.slice(oldChildPath.length),
              depth: grandchild.depth + depthDelta,
            },
          },
        },
      });
    }
  }

  if (bulkOps.length > 0) await Group.bulkWrite(bulkOps);

  // Handle tokens directly in the deleted group
  if (tokenTargetGroupId) {
    // Move to user-specified group
    await Token.updateMany({ group: id }, { $set: { group: tokenTargetGroupId } });
  } else {
    // No target — delete orphaned tokens
    await Token.deleteMany({ group: id });
  }

  // Delete the group itself
  await Group.findByIdAndDelete(id);

  return NextResponse.json({ message: "Deleted" });
}
