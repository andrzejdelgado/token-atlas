import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Group } from "@/lib/db/models/group.model";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.MONGODB_URI) return NextResponse.json({ data: [] });
  await connectToDatabase();

  const { searchParams } = req.nextUrl;
  const collectionId = searchParams.get("collection");
  const ancestorId = searchParams.get("ancestor");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = {};
  if (collectionId) {
    query.collection = collectionId;
  } else if (ancestorId) {
    const ancestor = await Group.findById(ancestorId).select("path").lean();
    if (ancestor) {
      const escaped = ancestor.path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      // matches the group itself AND all descendants
      query.path = { $regex: `^${escaped}(/|$)` };
    }
  }

  const groups = await Group.find(query).sort({ sortPath: 1, path: 1 }).lean();
  return NextResponse.json({ data: JSON.parse(JSON.stringify(groups)) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.MONGODB_URI) return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  await connectToDatabase();
  const { name, collectionId, parentId } = await req.json();

  let path = name.toLowerCase().replace(/\s+/g, "-");
  let depth = 0;

  if (parentId) {
    const parent = await Group.findById(parentId).lean();
    if (!parent) return NextResponse.json({ error: "Parent not found" }, { status: 404 });
    path = `${parent.path}/${path}`;
    depth = parent.depth + 1;
  }

  const group = await Group.create({
    name,
    collection: collectionId,
    parent: parentId ?? null,
    path,
    depth,
  });

  return NextResponse.json({ data: JSON.parse(JSON.stringify(group)) }, { status: 201 });
}
