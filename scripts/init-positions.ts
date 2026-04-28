/**
 * One-time script to initialize position and sortPath fields on all groups,
 * and position fields on themes and collections.
 *
 * Run: npx tsx scripts/init-positions.ts
 */

import mongoose from "mongoose";
import { readFileSync } from "fs";
import { resolve } from "path";

// Manually load .env.local (dotenv not installed)
try {
  const envFile = readFileSync(resolve(".env.local"), "utf-8");
  for (const line of envFile.split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  }
} catch {
  /* no .env.local */
}

// ─── Minimal schemas ────────────────────────────────────────────────────────

const GroupSchema = new mongoose.Schema(
  {
    name: String,
    collection: mongoose.Schema.Types.ObjectId,
    parent: { type: mongoose.Schema.Types.ObjectId, default: null },
    path: String,
    depth: Number,
    position: { type: Number, default: 0 },
    sortPath: { type: String, default: "" },
  },
  { timestamps: false }
);

const ThemeSchema = new mongoose.Schema(
  {
    name: String,
    slug: String,
    description: String,
    position: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const CollectionSchema = new mongoose.Schema(
  {
    name: String,
    description: String,
    position: { type: Number, default: 0 },
  },
  { timestamps: false }
);

const Group = mongoose.model("Group", GroupSchema);
const Theme = mongoose.model("Theme", ThemeSchema);
const Collection = mongoose.model("Collection", CollectionSchema);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function padPosition(pos: number): string {
  return String(pos).padStart(5, "0");
}

interface GroupDoc {
  _id: mongoose.Types.ObjectId;
  name: string;
  parent: mongoose.Types.ObjectId | null;
  position: number;
  sortPath: string;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI not set — make sure .env.local is present");

  await mongoose.connect(uri);
  console.log("✓ Connected to MongoDB\n");

  // 1. Themes — sort alphabetically by name, assign position
  console.log("Initializing theme positions…");
  const themes = await Theme.find({}).sort({ name: 1 }).lean<GroupDoc[]>();
  for (let i = 0; i < themes.length; i++) {
    await Theme.updateOne({ _id: themes[i]._id }, { $set: { position: i } });
  }
  console.log(`  ✓ ${themes.length} themes updated`);

  // 2. Collections — sort alphabetically by name, assign position
  console.log("Initializing collection positions…");
  const collections = await Collection.find({}).sort({ name: 1 }).lean<GroupDoc[]>();
  for (let i = 0; i < collections.length; i++) {
    await Collection.updateOne({ _id: collections[i]._id }, { $set: { position: i } });
  }
  console.log(`  ✓ ${collections.length} collections updated`);

  // 3. Groups — recursive traversal
  console.log("Initializing group positions and sortPaths…");
  const allGroups = await Group.find({}).lean<GroupDoc[]>();

  // Build tree in memory
  const groupMap = new Map<string, GroupDoc & { children: GroupDoc[] }>();
  for (const g of allGroups) {
    groupMap.set(g._id.toString(), { ...g, children: [] });
  }

  const roots: (GroupDoc & { children: GroupDoc[] })[] = [];
  for (const [, g] of groupMap) {
    if (!g.parent) {
      roots.push(g);
    } else {
      const parent = groupMap.get(g.parent.toString());
      if (parent) parent.children.push(g as GroupDoc & { children: GroupDoc[] });
    }
  }

  // Sort roots alphabetically by name, then recursively assign positions
  let updatedCount = 0;

  async function assignPositions(
    nodes: (GroupDoc & { children: GroupDoc[] })[],
    parentSortPath: string
  ) {
    // Sort alphabetically within siblings
    nodes.sort((a, b) => a.name.localeCompare(b.name));

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const paddedPos = padPosition(i);
      const sortPath = parentSortPath ? `${parentSortPath}/${paddedPos}` : paddedPos;

      await Group.updateOne({ _id: node._id }, { $set: { position: i, sortPath } });
      updatedCount++;

      if (node.children.length > 0) {
        await assignPositions(node.children as (GroupDoc & { children: GroupDoc[] })[], sortPath);
      }
    }
  }

  await assignPositions(roots, "");
  console.log(`  ✓ ${updatedCount} groups updated`);

  console.log(`\n✅ Position initialization complete!`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("\n❌ Init failed:", err.message);
  process.exit(1);
});
