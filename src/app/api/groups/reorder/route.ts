import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Group } from "@/lib/db/models/group.model";

function padPosition(pos: number): string {
  return String(pos).padStart(5, "0");
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.MONGODB_URI) return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  await connectToDatabase();

  const { items } = await req.json() as {
    items: Array<{ id: string; parentId: string | null; position: number }>;
  };

  // Process each item: update its path, depth, position, and sortPath
  for (const item of items) {
    const group = await Group.findById(item.id);
    if (!group) continue;

    let newPath: string;
    let newDepth: number;
    let parentSortPath: string;

    if (item.parentId) {
      const parent = await Group.findById(item.parentId);
      if (!parent) continue;
      newPath = `${parent.path}/${group.name.toLowerCase().replace(/\s+/g, "-")}`;
      newDepth = parent.depth + 1;
      parentSortPath = parent.sortPath || "";
    } else {
      newPath = group.name.toLowerCase().replace(/\s+/g, "-");
      newDepth = 0;
      parentSortPath = "";
    }

    const newSortPath = parentSortPath
      ? `${parentSortPath}/${padPosition(item.position)}`
      : padPosition(item.position);

    const oldPath = group.path;
    const oldDepth = group.depth;

    await Group.updateOne(
      { _id: item.id },
      {
        $set: {
          parent: item.parentId ?? null,
          path: newPath,
          depth: newDepth,
          position: item.position,
          sortPath: newSortPath,
        },
      }
    );

    // Cascade updates to all descendants if path or depth changed
    if (oldPath !== newPath || oldDepth !== newDepth) {
      const depthDiff = newDepth - oldDepth;
      const descendants = await Group.find({
        path: { $regex: `^${oldPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/` },
      });

      for (const descendant of descendants) {
        const descendantNewPath = newPath + descendant.path.slice(oldPath.length);
        const descendantNewDepth = descendant.depth + depthDiff;

        // Build new sortPath for descendant: replace old prefix in path with new one
        // We need to recompute sortPath based on its position within its own parent
        // For simplicity, preserve descendant's position and recompute only the path prefix
        let descendantSortPath = descendant.sortPath || "";
        if (descendantSortPath && descendant.sortPath) {
          // The descendant's sortPath starts with the moved group's old sortPath prefix
          // Replace it with the new sortPath
          const oldGroupSortPath = group.sortPath || "";
          if (oldGroupSortPath && descendantSortPath.startsWith(oldGroupSortPath)) {
            descendantSortPath = newSortPath + descendantSortPath.slice(oldGroupSortPath.length);
          }
        }

        await Group.updateOne(
          { _id: descendant._id },
          {
            $set: {
              path: descendantNewPath,
              depth: descendantNewDepth,
              sortPath: descendantSortPath,
            },
          }
        );
      }
    }
  }

  return NextResponse.json({ message: "Reordered" });
}
