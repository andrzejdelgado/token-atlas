import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Token } from "@/lib/db/models/token.model";
import { Collection } from "@/lib/db/models/collection.model";
import { Group } from "@/lib/db/models/group.model";
import { Notification } from "@/lib/db/models/notification.model";

interface W3CToken {
  $value: string | number | boolean;
  $type?: string;
}

type W3CTree = { [key: string]: W3CToken | W3CTree };

function flattenW3C(tree: W3CTree, prefix = ""): Array<{ name: string; value: string; type: string }> {
  const result: Array<{ name: string; value: string; type: string }> = [];
  for (const [key, val] of Object.entries(tree)) {
    const path = prefix ? `${prefix}/${key}` : key;
    if (val && typeof val === "object" && "$value" in val) {
      const token = val as W3CToken;
      result.push({
        name: path,
        value: String(token.$value),
        type: token.$type ?? "String",
      });
    } else {
      result.push(...flattenW3C(val as W3CTree, path));
    }
  }
  return result;
}

function w3cTypeToTokenType(type: string): string {
  switch (type.toLowerCase()) {
    case "color": return "Color";
    case "number": return "Number";
    case "boolean": return "Boolean";
    default: return "String";
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.MONGODB_URI) return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  await connectToDatabase();
  const { tokens: rawTokens, confirm = false } = await req.json();

  const flat = flattenW3C(rawTokens as W3CTree);

  const foundations = await Collection.findOne({ name: "Global" }).lean();
  if (!foundations) return NextResponse.json({ error: "Collections not seeded" }, { status: 500 });

  const defaultGroup = await Group.findOne({ collection: foundations._id, depth: 0 }).lean();

  // Check conflicts
  const names = flat.map((t) => t.name);
  const conflicts = await Token.find({ name: { $in: names } }, "name").lean();
  const conflictNames = new Set(conflicts.map((c) => c.name));

  if (!confirm) {
    return NextResponse.json({
      data: flat,
      conflicts: conflicts.map((c) => c.name),
      count: flat.length,
    });
  }

  // Perform import
  const userId = session.user.id;
  let imported = 0;

  for (const t of flat) {
    if (conflictNames.has(t.name)) {
      await Token.findOneAndUpdate(
        { name: t.name },
        { lightValue: t.value, updatedBy: userId },
        { new: true }
      );
    } else {
      await Token.create({
        name: t.name,
        tokenType: w3cTypeToTokenType(t.type),
        collection: foundations._id,
        group: defaultGroup?._id ?? foundations._id,
        lightValue: t.value,
        darkValue: t.value,
        themes: [],
        flagged: false,
        labels: [],
        createdBy: userId,
        updatedBy: userId,
      });
    }
    imported++;
  }

  await Notification.create({
    userId,
    type: "import",
    message: `Imported ${imported} tokens`,
    metadata: { count: imported },
  });

  return NextResponse.json({ message: `Imported ${imported} tokens`, count: imported });
}
