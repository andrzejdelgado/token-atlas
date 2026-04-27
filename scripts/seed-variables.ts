/**
 * Seed script — imports foundations.json and text.json into MongoDB.
 * Run: npx tsx scripts/seed-variables.ts
 *
 * Collections created : Foundations, Text
 * Themes created      : XTB, ATS, SPX, DDX
 * All tokens are assigned to all four themes.
 */

import mongoose, { type Types } from "mongoose";
import { readFileSync } from "fs";
import { resolve } from "path";
// Manually load .env.local (dotenv not installed)
try {
  const envFile = readFileSync(resolve(".env.local"), "utf-8");
  for (const line of envFile.split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  }
} catch { /* no .env.local */ }

// ─── Minimal schemas (standalone, no Next.js imports needed) ────────────────

const CollectionSchema = new mongoose.Schema(
  { name: String, description: String },
  { timestamps: true }
);
const GroupSchema = new mongoose.Schema(
  {
    name: String,
    collection: mongoose.Schema.Types.ObjectId,
    parent: { type: mongoose.Schema.Types.ObjectId, default: null },
    path: String,
    depth: Number,
  },
  { timestamps: true }
);
const ThemeSchema = new mongoose.Schema(
  { name: String, slug: String, description: String },
  { timestamps: true }
);
const TokenSchema = new mongoose.Schema(
  {
    name: String,
    tokenType: String,
    lightValue: String,
    darkValue: String,
    collection: mongoose.Schema.Types.ObjectId,
    group: mongoose.Schema.Types.ObjectId,
    themes: [mongoose.Schema.Types.ObjectId],
    flagged: { type: Boolean, default: false },
    labels: [String],
    createdBy: String,
    updatedBy: String,
  },
  { timestamps: true }
);

const Collection = mongoose.model("Collection", CollectionSchema);
const Group = mongoose.model("Group", GroupSchema);
const Theme = mongoose.model("Theme", ThemeSchema);
const Token = mongoose.model("Token", TokenSchema);

// ─── Helpers ────────────────────────────────────────────────────────────────

function isToken(val: unknown): val is { $type: string; $value: unknown } {
  return (
    typeof val === "object" &&
    val !== null &&
    "$value" in (val as object)
  );
}

function mapTokenType(type: string): string {
  switch (type.toLowerCase()) {
    case "color":
      return "Color";
    case "float":
    case "number":
      return "Number";
    case "boolean":
      return "Boolean";
    default:
      return "String";
  }
}

// ─── State ──────────────────────────────────────────────────────────────────

const groupCache = new Map<string, Types.ObjectId>(); // `collId:path` → _id
let themeIds: Types.ObjectId[] = [];
let tokensCreated = 0;
let groupsCreated = 0;
const SEED_USER_ID = new mongoose.Types.ObjectId(); // dummy ObjectId for seed user

// ─── DB helpers ─────────────────────────────────────────────────────────────

async function getOrCreateGroup(
  name: string,
  collectionId: Types.ObjectId,
  parentId: Types.ObjectId | null,
  path: string,
  depth: number
): Promise<Types.ObjectId> {
  const key = `${collectionId}:${path}`;
  if (groupCache.has(key)) return groupCache.get(key)!;

  let doc = await Group.findOne({ collection: collectionId, path }).lean();
  if (!doc) {
    doc = (await Group.create({ name, collection: collectionId, parent: parentId, path, depth })).toObject();
    groupsCreated++;
  }
  const id = doc._id as Types.ObjectId;
  groupCache.set(key, id);
  return id;
}

async function createToken(
  name: string,
  lightValue: unknown,
  darkValue: unknown,
  type: string,
  collectionId: Types.ObjectId,
  groupId: Types.ObjectId
) {
  const exists = await Token.exists({ name, group: groupId });
  if (exists) return;

  await Token.create({
    name,
    tokenType: mapTokenType(type),
    lightValue: String(lightValue ?? ""),
    darkValue: String(darkValue ?? lightValue ?? ""),
    collection: collectionId,
    group: groupId,
    flagged: false,
    labels: [],
    createdBy: SEED_USER_ID,
    updatedBy: SEED_USER_ID,
  });
  tokensCreated++;
}

// ─── Foundations processor (array format with modes) ────────────────────────

type ModeNode = Record<string, unknown>;

async function processFoundationsNode(
  lightNode: ModeNode,
  darkNode: ModeNode | null,
  collectionId: Types.ObjectId,
  parentGroupId: Types.ObjectId,
  pathPrefix: string,
  depth: number
) {
  for (const [key, val] of Object.entries(lightNode)) {
    if (key.startsWith("$")) continue;

    if (isToken(val)) {
      // Leaf token
      const darkEntry = darkNode?.[key];
      const darkValue = isToken(darkEntry) ? darkEntry.$value : val.$value;
      await createToken(key, val.$value, darkValue, val.$type, collectionId, parentGroupId);
    } else if (typeof val === "object" && val !== null) {
      // Sub-group — recurse
      const subPath = `${pathPrefix}/${key.toLowerCase().replace(/\s+/g, "-")}`;
      const subGroupId = await getOrCreateGroup(key, collectionId, parentGroupId, subPath, depth);
      const darkSub = (darkNode?.[key] ?? null) as ModeNode | null;
      await processFoundationsNode(
        val as ModeNode,
        darkSub,
        collectionId,
        subGroupId,
        subPath,
        depth + 1
      );
    }
  }
}

// ─── Text processor (plain W3C-like object, no modes) ───────────────────────

async function processTextNode(
  node: ModeNode,
  collectionId: Types.ObjectId,
  parentGroupId: Types.ObjectId,
  pathPrefix: string,
  depth: number
) {
  for (const [key, val] of Object.entries(node)) {
    if (key.startsWith("$")) continue;

    if (isToken(val)) {
      // Leaf token — same value for light and dark
      await createToken(key, val.$value, val.$value, val.$type, collectionId, parentGroupId);
    } else if (typeof val === "object" && val !== null) {
      // Sub-group — recurse
      const subPath = `${pathPrefix}/${key.toLowerCase().replace(/\s+/g, "-")}`;
      const subGroupId = await getOrCreateGroup(key, collectionId, parentGroupId, subPath, depth);
      await processTextNode(val as ModeNode, collectionId, subGroupId, subPath, depth + 1);
    }
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI not set — make sure .env.local is present");

  await mongoose.connect(uri);
  console.log("✓ Connected to MongoDB\n");

  // 1. Themes — baseTheme is always position 0, rest alphabetical
  console.log("Creating themes…");
  const themeDefs = [
    { name: "baseTheme", slug: "base-theme", isBase: true, position: 0 },
    { name: "ATS", slug: "ats", isBase: false, position: 1 },
    { name: "DDX", slug: "ddx", isBase: false, position: 2 },
    { name: "SPX", slug: "spx", isBase: false, position: 3 },
    { name: "XTB", slug: "xtb", isBase: false, position: 4 },
  ];
  const themesDocs = [];
  for (const def of themeDefs) {
    let t = await Theme.findOne({ slug: def.slug });
    if (!t) {
      t = await Theme.create({ name: def.name, slug: def.slug, isBase: def.isBase, position: def.position, description: `${def.name} theme` });
      console.log(`  + Theme: ${def.name}`);
    } else {
      console.log(`  ~ Theme already exists: ${def.name}`);
    }
    themesDocs.push(t);
  }
  // themeIds used only to satisfy old token schema if needed — not written to tokens
  themeIds = themesDocs.map((t) => t._id as Types.ObjectId);

  // 2. Collections
  console.log("\nCreating collections…");
  let foundationsColl = await Collection.findOne({ name: "Global" });
  if (!foundationsColl) {
    foundationsColl = await Collection.create({ name: "Global", description: "Global design tokens" });
    console.log("  + Collection: Global");
  } else {
    console.log("  ~ Collection already exists: Global");
  }

  let textColl = await Collection.findOne({ name: "Text" });
  if (!textColl) {
    textColl = await Collection.create({ name: "Text", description: "Typography design tokens" });
    console.log("  + Collection: Text");
  } else {
    console.log("  ~ Collection already exists: Text");
  }

  const foundationsCollId = foundationsColl._id as Types.ObjectId; // "Global" collection
  const textCollId = textColl._id as Types.ObjectId;

  // 3. Import foundations.json
  console.log("\nImporting foundations.json…");
  type FoundationsEntry = { [groupName: string]: { modes: { light: ModeNode; dark?: ModeNode } } };
  const foundationsData = JSON.parse(
    readFileSync(resolve("variables/foundations.json"), "utf-8")
  ) as FoundationsEntry[];

  for (const item of foundationsData) {
    for (const [groupName, groupData] of Object.entries(item)) {
      const lightData: ModeNode = groupData.modes?.light ?? {};
      const darkData: ModeNode | null = groupData.modes?.dark ?? null;
      const slug = groupName.toLowerCase().replace(/\s+/g, "-");

      const rootGroupId = await getOrCreateGroup(groupName, foundationsCollId, null, slug, 0);
      await processFoundationsNode(lightData, darkData, foundationsCollId, rootGroupId, slug, 1);
      console.log(`  ✓ ${groupName}`);
    }
  }

  // 4. Import text.json
  console.log("\nImporting text.json…");
  const textData = JSON.parse(
    readFileSync(resolve("variables/text.json"), "utf-8")
  ) as ModeNode;

  for (const [groupName, groupVal] of Object.entries(textData)) {
    if (groupName.startsWith("$")) continue;

    const slug = groupName.toLowerCase().replace(/\s+/g, "-");
    if (isToken(groupVal)) {
      // Top-level token (edge case)
      const rootGroupId = await getOrCreateGroup("root", textCollId, null, "root", 0);
      await createToken(groupName, groupVal.$value, groupVal.$value, groupVal.$type, textCollId, rootGroupId);
    } else if (typeof groupVal === "object" && groupVal !== null) {
      const rootGroupId = await getOrCreateGroup(groupName, textCollId, null, slug, 0);
      await processTextNode(groupVal as ModeNode, textCollId, rootGroupId, slug, 1);
      console.log(`  ✓ ${groupName}`);
    }
  }

  // 5. Summary
  console.log(`\n${"─".repeat(50)}`);
  console.log(`✅ Import complete!`);
  console.log(`   Groups created : ${groupsCreated}`);
  console.log(`   Tokens created : ${tokensCreated}`);
  console.log(`   Themes         : baseTheme, ATS, DDX, SPX, XTB`);
  console.log(`   Note: run seed.ts separately to seed ThemeOverrides for brand themes`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("\n❌ Seed failed:", err.message);
  process.exit(1);
});
