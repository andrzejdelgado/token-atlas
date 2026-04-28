/**
 * Full seed script — creates collections, themes, groups, tokens, and ThemeOverrides.
 * Uses inline schemas to avoid Next.js module caching patterns that break in Node ESM.
 * Run: npm run seed
 */

import mongoose, { type Types } from "mongoose";
import bcrypt from "bcryptjs";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env.local
try {
  const env = readFileSync(resolve(".env.local"), "utf-8");
  for (const line of env.split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
} catch {
  /* no .env.local */
}

// ─── Inline schemas ────────────────────────────────────────────────────────

const CollectionSchema = new mongoose.Schema({
  name: String,
  description: String,
  position: { type: Number, default: 0 },
});
const ThemeSchema = new mongoose.Schema(
  {
    name: String,
    slug: String,
    isBase: { type: Boolean, default: false },
    description: String,
    position: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
const GroupSchema = new mongoose.Schema({
  name: String,
  collection: mongoose.Schema.Types.ObjectId,
  parent: { type: mongoose.Schema.Types.ObjectId, default: null },
  path: String,
  depth: Number,
  position: { type: Number, default: 0 },
  sortPath: { type: String, default: "" },
});
const TokenSchema = new mongoose.Schema(
  {
    name: String,
    tokenType: String,
    collection: mongoose.Schema.Types.ObjectId,
    group: mongoose.Schema.Types.ObjectId,
    lightValue: String,
    darkValue: String,
    associatedComponents: [String],
    flagged: { type: Boolean, default: false },
    labels: [String],
    createdBy: mongoose.Schema.Types.ObjectId,
    updatedBy: mongoose.Schema.Types.ObjectId,
  },
  { timestamps: true }
);
const ThemeOverrideSchema = new mongoose.Schema(
  {
    theme: mongoose.Schema.Types.ObjectId,
    token: mongoose.Schema.Types.ObjectId,
    lightValue: String,
    darkValue: String,
  },
  { timestamps: true }
);
const UserSchema = new mongoose.Schema({
  email: String,
  passwordHash: String,
  role: String,
  name: String,
});
const SettingsSchema = new mongoose.Schema({ storybookBranch: String, storybookTokenPath: String });

const Collection = mongoose.model("Collection", CollectionSchema);
const Theme = mongoose.model("Theme", ThemeSchema);
const Group = mongoose.model("Group", GroupSchema);
const Token = mongoose.model("Token", TokenSchema);
const ThemeOverride = mongoose.model("ThemeOverride", ThemeOverrideSchema);
const User = mongoose.model("User", UserSchema);
const Settings = mongoose.model("Settings", SettingsSchema);

// ─── Helpers ───────────────────────────────────────────────────────────────

async function createGroup(
  name: string,
  collection: Types.ObjectId,
  parent: Types.ObjectId | null,
  path: string,
  depth: number
) {
  const doc = await Group.create({ name, collection, parent, path, depth });
  return doc._id as Types.ObjectId;
}

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI not set");
  await mongoose.connect(uri);
  console.log("Connected to MongoDB. Seeding…");

  await Promise.all([
    Collection.deleteMany({}),
    Theme.deleteMany({}),
    Group.deleteMany({}),
    Token.deleteMany({}),
    ThemeOverride.deleteMany({}),
    Settings.deleteMany({}),
  ]);

  // ─── Collections ─────────────────────────────────────────────────────────
  const globalColl = await Collection.create({
    name: "Global",
    description: "Global design tokens",
    position: 0,
  });
  const textColl = await Collection.create({
    name: "Text",
    description: "Typography design tokens",
    position: 1,
  });
  const gId = globalColl._id as Types.ObjectId;
  const tId = textColl._id as Types.ObjectId;

  // ─── Admin user ──────────────────────────────────────────────────────────
  let adminUser = await User.findOne({ email: "admin@tokenatlas.dev" });
  if (!adminUser) {
    adminUser = await User.create({
      email: "admin@tokenatlas.dev",
      passwordHash: await bcrypt.hash("password123", 10),
      role: "admin",
      name: "Admin User",
    });
  }
  const uid = adminUser._id as Types.ObjectId;

  // ─── Themes ──────────────────────────────────────────────────────────────
  const baseTheme = await Theme.create({
    name: "baseTheme",
    slug: "base-theme",
    isBase: true,
    description: "Base design system theme",
    position: 0,
  });
  const atsTheme = await Theme.create({
    name: "ATS",
    slug: "ats",
    isBase: false,
    description: "ATS brand theme",
    position: 1,
  });
  const ddxTheme = await Theme.create({
    name: "DDX",
    slug: "ddx",
    isBase: false,
    description: "DDX brand theme",
    position: 2,
  });
  const spxTheme = await Theme.create({
    name: "SPX",
    slug: "spx",
    isBase: false,
    description: "SPX brand theme",
    position: 3,
  });
  const xtbTheme = await Theme.create({
    name: "XTB",
    slug: "xtb",
    isBase: false,
    description: "XTB brand theme",
    position: 4,
  });
  console.log(`Created themes: baseTheme, ATS, DDX, SPX, XTB`);

  // ─── Groups: Global ──────────────────────────────────────────────────────
  const colorGrp = await createGroup("color", gId, null, "color", 0);
  const colorBg = await createGroup("background", gId, colorGrp, "color/background", 1);
  const colorFg = await createGroup("foreground", gId, colorGrp, "color/foreground", 1);
  const colorBorder = await createGroup("border", gId, colorGrp, "color/border", 1);
  const colorInteract = await createGroup("interactive", gId, colorGrp, "color/interactive", 1);
  const colorStatus = await createGroup("status", gId, colorGrp, "color/status", 1);

  const spacingGrp = await createGroup("spacing", gId, null, "spacing", 0);
  const spacingComp = await createGroup("component", gId, spacingGrp, "spacing/component", 1);
  const spacingLay = await createGroup("layout", gId, spacingGrp, "spacing/layout", 1);

  const radiusGrp = await createGroup("radius", gId, null, "radius", 0);
  const shadowGrp = await createGroup("shadow", gId, null, "shadow", 0);
  const elevationGrp = await createGroup("elevation", gId, shadowGrp, "shadow/elevation", 1);

  // ─── Groups: Text ────────────────────────────────────────────────────────
  const typGrp = await createGroup("typography", tId, null, "typography", 0);
  const bodyGrp = await createGroup("body", tId, typGrp, "typography/body", 1);
  const headingGrp = await createGroup("heading", tId, typGrp, "typography/heading", 1);
  const labelGrp = await createGroup("label", tId, typGrp, "typography/label", 1);

  console.log("Created groups.");

  // ─── Tokens ──────────────────────────────────────────────────────────────
  // Each token's lightValue/darkValue represents the baseTheme value.
  // Non-base themes override via ThemeOverride documents.
  type TokenDef = {
    name: string;
    tokenType: string;
    collection: Types.ObjectId;
    group: Types.ObjectId;
    lightValue: string;
    darkValue?: string;
    labels?: string[];
    associatedComponents?: string[];
    flagged?: boolean;
  };

  const tokenDefs: TokenDef[] = [
    // color/background
    {
      name: "color/background/surface/primary",
      tokenType: "Color",
      collection: gId,
      group: colorBg,
      lightValue: "#FFFFFF",
      darkValue: "#0A0A0A",
      labels: ["surface"],
      associatedComponents: ["Card", "Modal"],
    },
    {
      name: "color/background/surface/secondary",
      tokenType: "Color",
      collection: gId,
      group: colorBg,
      lightValue: "#F5F5F5",
      darkValue: "#1A1A1A",
      labels: ["surface"],
    },
    {
      name: "color/background/surface/tertiary",
      tokenType: "Color",
      collection: gId,
      group: colorBg,
      lightValue: "#EBEBEB",
      darkValue: "#262626",
      labels: ["surface"],
    },
    {
      name: "color/background/overlay",
      tokenType: "Color",
      collection: gId,
      group: colorBg,
      lightValue: "rgba(0,0,0,0.5)",
      darkValue: "rgba(0,0,0,0.7)",
      labels: ["overlay"],
    },
    {
      name: "color/background/brand/primary",
      tokenType: "Color",
      collection: gId,
      group: colorBg,
      lightValue: "#1B6EF3",
      darkValue: "#1B6EF3",
      labels: ["brand"],
      associatedComponents: ["Button"],
    },
    {
      name: "color/background/brand/hover",
      tokenType: "Color",
      collection: gId,
      group: colorBg,
      lightValue: "#1557C0",
      darkValue: "#1557C0",
      labels: ["brand"],
    },
    {
      name: "color/background/brand/subtle",
      tokenType: "Color",
      collection: gId,
      group: colorBg,
      lightValue: "#EBF2FE",
      darkValue: "#0D2449",
      labels: ["brand"],
    },
    // color/foreground
    {
      name: "color/foreground/default",
      tokenType: "Color",
      collection: gId,
      group: colorFg,
      lightValue: "#0A0A0A",
      darkValue: "#F5F5F5",
      labels: ["text"],
    },
    {
      name: "color/foreground/muted",
      tokenType: "Color",
      collection: gId,
      group: colorFg,
      lightValue: "#737373",
      darkValue: "#A3A3A3",
      labels: ["text"],
    },
    {
      name: "color/foreground/disabled",
      tokenType: "Color",
      collection: gId,
      group: colorFg,
      lightValue: "#C2C2C2",
      darkValue: "#525252",
      labels: ["text"],
      flagged: true,
    },
    {
      name: "color/foreground/onBrand",
      tokenType: "Color",
      collection: gId,
      group: colorFg,
      lightValue: "#FFFFFF",
      darkValue: "#FFFFFF",
      labels: ["text", "brand"],
    },
    {
      name: "color/foreground/link",
      tokenType: "Color",
      collection: gId,
      group: colorFg,
      lightValue: "#1B6EF3",
      darkValue: "#5B9CF6",
      labels: ["text", "interactive"],
      associatedComponents: ["Link", "TextButton"],
    },
    // color/border
    {
      name: "color/border/default",
      tokenType: "Color",
      collection: gId,
      group: colorBorder,
      lightValue: "#E5E5E5",
      darkValue: "#2E2E2E",
    },
    {
      name: "color/border/strong",
      tokenType: "Color",
      collection: gId,
      group: colorBorder,
      lightValue: "#A3A3A3",
      darkValue: "#525252",
    },
    {
      name: "color/border/focus",
      tokenType: "Color",
      collection: gId,
      group: colorBorder,
      lightValue: "#1B6EF3",
      darkValue: "#1B6EF3",
      labels: ["interactive"],
    },
    {
      name: "color/border/brand",
      tokenType: "Color",
      collection: gId,
      group: colorBorder,
      lightValue: "#1B6EF3",
      darkValue: "#5B9CF6",
      labels: ["brand"],
    },
    // color/interactive
    {
      name: "color/interactive/primary/default",
      tokenType: "Color",
      collection: gId,
      group: colorInteract,
      lightValue: "#1B6EF3",
      darkValue: "#1B6EF3",
      labels: ["interactive"],
      associatedComponents: ["Button"],
    },
    {
      name: "color/interactive/primary/hover",
      tokenType: "Color",
      collection: gId,
      group: colorInteract,
      lightValue: "#1557C0",
      darkValue: "#2B7BF5",
      labels: ["interactive"],
    },
    {
      name: "color/interactive/primary/active",
      tokenType: "Color",
      collection: gId,
      group: colorInteract,
      lightValue: "#0E3E8E",
      darkValue: "#4089F7",
      labels: ["interactive"],
    },
    {
      name: "color/interactive/secondary/default",
      tokenType: "Color",
      collection: gId,
      group: colorInteract,
      lightValue: "#F5F5F5",
      darkValue: "#262626",
      labels: ["interactive"],
    },
    {
      name: "color/interactive/destructive/default",
      tokenType: "Color",
      collection: gId,
      group: colorInteract,
      lightValue: "#DC2626",
      darkValue: "#EF4444",
      labels: ["interactive", "destructive"],
    },
    // color/status
    {
      name: "color/status/success/default",
      tokenType: "Color",
      collection: gId,
      group: colorStatus,
      lightValue: "#16A34A",
      darkValue: "#22C55E",
      labels: ["status"],
    },
    {
      name: "color/status/success/subtle",
      tokenType: "Color",
      collection: gId,
      group: colorStatus,
      lightValue: "#DCFCE7",
      darkValue: "#052E16",
      labels: ["status"],
    },
    {
      name: "color/status/warning/default",
      tokenType: "Color",
      collection: gId,
      group: colorStatus,
      lightValue: "#CA8A04",
      darkValue: "#EAB308",
      labels: ["status"],
    },
    {
      name: "color/status/warning/subtle",
      tokenType: "Color",
      collection: gId,
      group: colorStatus,
      lightValue: "#FEF9C3",
      darkValue: "#2D2000",
      labels: ["status"],
    },
    {
      name: "color/status/error/default",
      tokenType: "Color",
      collection: gId,
      group: colorStatus,
      lightValue: "#DC2626",
      darkValue: "#EF4444",
      labels: ["status"],
    },
    {
      name: "color/status/error/subtle",
      tokenType: "Color",
      collection: gId,
      group: colorStatus,
      lightValue: "#FEE2E2",
      darkValue: "#2D0000",
      labels: ["status"],
    },
    {
      name: "color/status/info/default",
      tokenType: "Color",
      collection: gId,
      group: colorStatus,
      lightValue: "#2563EB",
      darkValue: "#3B82F6",
      labels: ["status"],
    },
    // spacing/component
    {
      name: "spacing/component/button/padding-x",
      tokenType: "Number",
      collection: gId,
      group: spacingComp,
      lightValue: "16",
      darkValue: "16",
      labels: ["spacing"],
      associatedComponents: ["Button"],
    },
    {
      name: "spacing/component/button/padding-y",
      tokenType: "Number",
      collection: gId,
      group: spacingComp,
      lightValue: "8",
      darkValue: "8",
      labels: ["spacing"],
      associatedComponents: ["Button"],
    },
    {
      name: "spacing/component/input/padding-x",
      tokenType: "Number",
      collection: gId,
      group: spacingComp,
      lightValue: "12",
      darkValue: "12",
      labels: ["spacing"],
      associatedComponents: ["Input"],
    },
    {
      name: "spacing/component/input/padding-y",
      tokenType: "Number",
      collection: gId,
      group: spacingComp,
      lightValue: "8",
      darkValue: "8",
      labels: ["spacing"],
      associatedComponents: ["Input"],
    },
    {
      name: "spacing/component/card/padding",
      tokenType: "Number",
      collection: gId,
      group: spacingComp,
      lightValue: "24",
      darkValue: "24",
      labels: ["spacing"],
      associatedComponents: ["Card"],
    },
    {
      name: "spacing/component/badge/padding-x",
      tokenType: "Number",
      collection: gId,
      group: spacingComp,
      lightValue: "8",
      darkValue: "8",
      labels: ["spacing"],
      associatedComponents: ["Badge"],
    },
    {
      name: "spacing/component/tag/gap",
      tokenType: "Number",
      collection: gId,
      group: spacingComp,
      lightValue: "4",
      darkValue: "4",
      labels: ["spacing"],
    },
    // spacing/layout
    {
      name: "spacing/layout/page/padding-x",
      tokenType: "Number",
      collection: gId,
      group: spacingLay,
      lightValue: "32",
      darkValue: "32",
      labels: ["spacing", "layout"],
    },
    {
      name: "spacing/layout/section/gap",
      tokenType: "Number",
      collection: gId,
      group: spacingLay,
      lightValue: "48",
      darkValue: "48",
      labels: ["spacing", "layout"],
    },
    {
      name: "spacing/layout/sidebar/width",
      tokenType: "Number",
      collection: gId,
      group: spacingLay,
      lightValue: "256",
      darkValue: "256",
      labels: ["spacing", "layout"],
    },
    {
      name: "spacing/layout/content/max-width",
      tokenType: "Number",
      collection: gId,
      group: spacingLay,
      lightValue: "1280",
      darkValue: "1280",
      labels: ["spacing", "layout"],
    },
    // radius
    {
      name: "radius/xs",
      tokenType: "Number",
      collection: gId,
      group: radiusGrp,
      lightValue: "2",
      darkValue: "2",
    },
    {
      name: "radius/sm",
      tokenType: "Number",
      collection: gId,
      group: radiusGrp,
      lightValue: "4",
      darkValue: "4",
    },
    {
      name: "radius/md",
      tokenType: "Number",
      collection: gId,
      group: radiusGrp,
      lightValue: "6",
      darkValue: "6",
    },
    {
      name: "radius/lg",
      tokenType: "Number",
      collection: gId,
      group: radiusGrp,
      lightValue: "8",
      darkValue: "8",
    },
    {
      name: "radius/xl",
      tokenType: "Number",
      collection: gId,
      group: radiusGrp,
      lightValue: "12",
      darkValue: "12",
    },
    {
      name: "radius/full",
      tokenType: "Number",
      collection: gId,
      group: radiusGrp,
      lightValue: "9999",
      darkValue: "9999",
    },
    // shadow/elevation
    {
      name: "shadow/elevation/sm",
      tokenType: "String",
      collection: gId,
      group: elevationGrp,
      lightValue: "0 1px 2px rgba(0,0,0,0.05)",
      darkValue: "0 1px 2px rgba(0,0,0,0.2)",
    },
    {
      name: "shadow/elevation/md",
      tokenType: "String",
      collection: gId,
      group: elevationGrp,
      lightValue: "0 4px 6px rgba(0,0,0,0.07)",
      darkValue: "0 4px 6px rgba(0,0,0,0.3)",
    },
    {
      name: "shadow/elevation/lg",
      tokenType: "String",
      collection: gId,
      group: elevationGrp,
      lightValue: "0 10px 15px rgba(0,0,0,0.1)",
      darkValue: "0 10px 15px rgba(0,0,0,0.4)",
    },
    {
      name: "shadow/elevation/xl",
      tokenType: "String",
      collection: gId,
      group: elevationGrp,
      lightValue: "0 20px 25px rgba(0,0,0,0.1)",
      darkValue: "0 20px 25px rgba(0,0,0,0.5)",
    },
    // typography/body
    {
      name: "typography/body/font-size/xs",
      tokenType: "Number",
      collection: tId,
      group: bodyGrp,
      lightValue: "12",
      darkValue: "12",
      labels: ["font-size"],
    },
    {
      name: "typography/body/font-size/sm",
      tokenType: "Number",
      collection: tId,
      group: bodyGrp,
      lightValue: "14",
      darkValue: "14",
      labels: ["font-size"],
    },
    {
      name: "typography/body/font-size/md",
      tokenType: "Number",
      collection: tId,
      group: bodyGrp,
      lightValue: "16",
      darkValue: "16",
      labels: ["font-size"],
    },
    {
      name: "typography/body/font-size/lg",
      tokenType: "Number",
      collection: tId,
      group: bodyGrp,
      lightValue: "18",
      darkValue: "18",
      labels: ["font-size"],
    },
    {
      name: "typography/body/line-height/sm",
      tokenType: "Number",
      collection: tId,
      group: bodyGrp,
      lightValue: "20",
      darkValue: "20",
      labels: ["line-height"],
    },
    {
      name: "typography/body/line-height/md",
      tokenType: "Number",
      collection: tId,
      group: bodyGrp,
      lightValue: "24",
      darkValue: "24",
      labels: ["line-height"],
    },
    {
      name: "typography/body/line-height/lg",
      tokenType: "Number",
      collection: tId,
      group: bodyGrp,
      lightValue: "28",
      darkValue: "28",
      labels: ["line-height"],
    },
    {
      name: "typography/body/font-weight/regular",
      tokenType: "Number",
      collection: tId,
      group: bodyGrp,
      lightValue: "400",
      darkValue: "400",
      labels: ["font-weight"],
    },
    {
      name: "typography/body/font-weight/medium",
      tokenType: "Number",
      collection: tId,
      group: bodyGrp,
      lightValue: "500",
      darkValue: "500",
      labels: ["font-weight"],
    },
    // typography/heading
    {
      name: "typography/heading/font-size/h1",
      tokenType: "Number",
      collection: tId,
      group: headingGrp,
      lightValue: "48",
      darkValue: "48",
      labels: ["font-size", "heading"],
    },
    {
      name: "typography/heading/font-size/h2",
      tokenType: "Number",
      collection: tId,
      group: headingGrp,
      lightValue: "36",
      darkValue: "36",
      labels: ["font-size", "heading"],
    },
    {
      name: "typography/heading/font-size/h3",
      tokenType: "Number",
      collection: tId,
      group: headingGrp,
      lightValue: "30",
      darkValue: "30",
      labels: ["font-size", "heading"],
    },
    {
      name: "typography/heading/font-size/h4",
      tokenType: "Number",
      collection: tId,
      group: headingGrp,
      lightValue: "24",
      darkValue: "24",
      labels: ["font-size", "heading"],
    },
    {
      name: "typography/heading/font-weight/default",
      tokenType: "Number",
      collection: tId,
      group: headingGrp,
      lightValue: "700",
      darkValue: "700",
      labels: ["font-weight", "heading"],
    },
    {
      name: "typography/heading/line-height/tight",
      tokenType: "Number",
      collection: tId,
      group: headingGrp,
      lightValue: "1.1",
      darkValue: "1.1",
      labels: ["line-height", "heading"],
    },
    // typography/label
    {
      name: "typography/label/font-size/xs",
      tokenType: "Number",
      collection: tId,
      group: labelGrp,
      lightValue: "10",
      darkValue: "10",
      labels: ["font-size"],
    },
    {
      name: "typography/label/font-size/sm",
      tokenType: "Number",
      collection: tId,
      group: labelGrp,
      lightValue: "12",
      darkValue: "12",
      labels: ["font-size"],
    },
    {
      name: "typography/label/font-weight/default",
      tokenType: "Number",
      collection: tId,
      group: labelGrp,
      lightValue: "600",
      darkValue: "600",
      labels: ["font-weight"],
    },
    {
      name: "typography/label/letter-spacing/default",
      tokenType: "Number",
      collection: tId,
      group: labelGrp,
      lightValue: "0.025",
      darkValue: "0.025",
    },
  ];

  const inserted = await Token.insertMany(
    tokenDefs.map((t) => ({
      ...t,
      flagged: t.flagged ?? false,
      associatedComponents: t.associatedComponents ?? [],
      labels: t.labels ?? [],
      createdBy: uid,
      updatedBy: uid,
    }))
  );
  console.log(`Created ${inserted.length} tokens.`);

  // Build name→_id map
  const tokenMap = new Map<string, Types.ObjectId>();
  for (const t of inserted)
    tokenMap.set((t as unknown as { name: string }).name, t._id as Types.ObjectId);

  // ─── ThemeOverrides ────────────────────────────────────────────────────────
  type OverrideDef = {
    theme: Types.ObjectId;
    tokenName: string;
    lightValue: string;
    darkValue: string;
  };
  const overrideDefs: OverrideDef[] = [
    // ATS — purple palette
    {
      theme: atsTheme._id as Types.ObjectId,
      tokenName: "color/background/brand/primary",
      lightValue: "#7C3AED",
      darkValue: "#7C3AED",
    },
    {
      theme: atsTheme._id as Types.ObjectId,
      tokenName: "color/background/brand/hover",
      lightValue: "#6D28D9",
      darkValue: "#6D28D9",
    },
    {
      theme: atsTheme._id as Types.ObjectId,
      tokenName: "color/background/brand/subtle",
      lightValue: "#EDE9FE",
      darkValue: "#1E0A4A",
    },
    {
      theme: atsTheme._id as Types.ObjectId,
      tokenName: "color/foreground/link",
      lightValue: "#7C3AED",
      darkValue: "#A78BFA",
    },
    {
      theme: atsTheme._id as Types.ObjectId,
      tokenName: "color/border/focus",
      lightValue: "#7C3AED",
      darkValue: "#7C3AED",
    },
    {
      theme: atsTheme._id as Types.ObjectId,
      tokenName: "color/border/brand",
      lightValue: "#7C3AED",
      darkValue: "#A78BFA",
    },
    {
      theme: atsTheme._id as Types.ObjectId,
      tokenName: "color/interactive/primary/default",
      lightValue: "#7C3AED",
      darkValue: "#7C3AED",
    },
    {
      theme: atsTheme._id as Types.ObjectId,
      tokenName: "color/interactive/primary/hover",
      lightValue: "#6D28D9",
      darkValue: "#8B5CF6",
    },
    {
      theme: atsTheme._id as Types.ObjectId,
      tokenName: "color/interactive/primary/active",
      lightValue: "#5B21B6",
      darkValue: "#A78BFA",
    },
    // DDX — green palette
    {
      theme: ddxTheme._id as Types.ObjectId,
      tokenName: "color/background/brand/primary",
      lightValue: "#16A34A",
      darkValue: "#16A34A",
    },
    {
      theme: ddxTheme._id as Types.ObjectId,
      tokenName: "color/background/brand/hover",
      lightValue: "#15803D",
      darkValue: "#15803D",
    },
    {
      theme: ddxTheme._id as Types.ObjectId,
      tokenName: "color/background/brand/subtle",
      lightValue: "#DCFCE7",
      darkValue: "#052E16",
    },
    {
      theme: ddxTheme._id as Types.ObjectId,
      tokenName: "color/foreground/link",
      lightValue: "#16A34A",
      darkValue: "#4ADE80",
    },
    {
      theme: ddxTheme._id as Types.ObjectId,
      tokenName: "color/border/focus",
      lightValue: "#16A34A",
      darkValue: "#16A34A",
    },
    {
      theme: ddxTheme._id as Types.ObjectId,
      tokenName: "color/border/brand",
      lightValue: "#16A34A",
      darkValue: "#4ADE80",
    },
    {
      theme: ddxTheme._id as Types.ObjectId,
      tokenName: "color/interactive/primary/default",
      lightValue: "#16A34A",
      darkValue: "#16A34A",
    },
    {
      theme: ddxTheme._id as Types.ObjectId,
      tokenName: "color/interactive/primary/hover",
      lightValue: "#15803D",
      darkValue: "#22C55E",
    },
    {
      theme: ddxTheme._id as Types.ObjectId,
      tokenName: "color/interactive/primary/active",
      lightValue: "#166534",
      darkValue: "#4ADE80",
    },
    // SPX — orange palette
    {
      theme: spxTheme._id as Types.ObjectId,
      tokenName: "color/background/brand/primary",
      lightValue: "#EA580C",
      darkValue: "#EA580C",
    },
    {
      theme: spxTheme._id as Types.ObjectId,
      tokenName: "color/background/brand/hover",
      lightValue: "#C2410C",
      darkValue: "#C2410C",
    },
    {
      theme: spxTheme._id as Types.ObjectId,
      tokenName: "color/background/brand/subtle",
      lightValue: "#FFEDD5",
      darkValue: "#431407",
    },
    {
      theme: spxTheme._id as Types.ObjectId,
      tokenName: "color/foreground/link",
      lightValue: "#EA580C",
      darkValue: "#FB923C",
    },
    {
      theme: spxTheme._id as Types.ObjectId,
      tokenName: "color/border/focus",
      lightValue: "#EA580C",
      darkValue: "#EA580C",
    },
    {
      theme: spxTheme._id as Types.ObjectId,
      tokenName: "color/border/brand",
      lightValue: "#EA580C",
      darkValue: "#FB923C",
    },
    {
      theme: spxTheme._id as Types.ObjectId,
      tokenName: "color/interactive/primary/default",
      lightValue: "#EA580C",
      darkValue: "#EA580C",
    },
    {
      theme: spxTheme._id as Types.ObjectId,
      tokenName: "color/interactive/primary/hover",
      lightValue: "#C2410C",
      darkValue: "#F97316",
    },
    {
      theme: spxTheme._id as Types.ObjectId,
      tokenName: "color/interactive/primary/active",
      lightValue: "#9A3412",
      darkValue: "#FB923C",
    },
    // XTB — red palette
    {
      theme: xtbTheme._id as Types.ObjectId,
      tokenName: "color/background/brand/primary",
      lightValue: "#DC2626",
      darkValue: "#DC2626",
    },
    {
      theme: xtbTheme._id as Types.ObjectId,
      tokenName: "color/background/brand/hover",
      lightValue: "#B91C1C",
      darkValue: "#B91C1C",
    },
    {
      theme: xtbTheme._id as Types.ObjectId,
      tokenName: "color/background/brand/subtle",
      lightValue: "#FEE2E2",
      darkValue: "#2D0000",
    },
    {
      theme: xtbTheme._id as Types.ObjectId,
      tokenName: "color/foreground/link",
      lightValue: "#DC2626",
      darkValue: "#F87171",
    },
    {
      theme: xtbTheme._id as Types.ObjectId,
      tokenName: "color/border/focus",
      lightValue: "#DC2626",
      darkValue: "#DC2626",
    },
    {
      theme: xtbTheme._id as Types.ObjectId,
      tokenName: "color/border/brand",
      lightValue: "#DC2626",
      darkValue: "#F87171",
    },
    {
      theme: xtbTheme._id as Types.ObjectId,
      tokenName: "color/interactive/primary/default",
      lightValue: "#DC2626",
      darkValue: "#DC2626",
    },
    {
      theme: xtbTheme._id as Types.ObjectId,
      tokenName: "color/interactive/primary/hover",
      lightValue: "#B91C1C",
      darkValue: "#EF4444",
    },
    {
      theme: xtbTheme._id as Types.ObjectId,
      tokenName: "color/interactive/primary/active",
      lightValue: "#991B1B",
      darkValue: "#F87171",
    },
  ];

  const overrideDocs = overrideDefs
    .map(({ theme, tokenName, lightValue, darkValue }) => {
      const tokenId = tokenMap.get(tokenName);
      return tokenId ? { theme, token: tokenId, lightValue, darkValue } : null;
    })
    .filter(Boolean);

  await ThemeOverride.insertMany(overrideDocs);
  console.log(`Created ${overrideDocs.length} theme overrides (9 per brand theme × 4 themes).`);

  // Settings
  await Settings.create({ storybookBranch: "main", storybookTokenPath: "tokens/tokens.json" });

  const [tokenCount, overrideCount] = await Promise.all([
    Token.countDocuments(),
    ThemeOverride.countDocuments(),
  ]);
  console.log(`\nDone ✓  ${tokenCount} tokens · ${overrideCount} overrides`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
