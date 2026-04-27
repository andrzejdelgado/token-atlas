import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Token } from "@/lib/db/models/token.model";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.MONGODB_URI) return NextResponse.json({ labels: [], components: [] });
  await connectToDatabase();

  const { searchParams } = req.nextUrl;
  const collectionId = searchParams.get("collection");

  const match = collectionId ? { collection: collectionId } : {};

  // Global frequency counts (ignore collectionId scope for "popular" ranking)
  const [labelResult, componentResult] = await Promise.all([
    Token.aggregate([
      { $unwind: "$labels" },
      { $group: { _id: "$labels", count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
    ]),
    Token.aggregate([
      { $unwind: "$associatedComponents" },
      { $group: { _id: "$associatedComponents", count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
    ]),
  ]);

  // If collection-scoped, filter the globally-ranked list to only those present in the collection
  const allLabels = labelResult.map((r) => r._id as string);
  const allComponents = componentResult.map((r) => r._id as string);

  if (collectionId) {
    const [scopedLabels, scopedComponents] = await Promise.all([
      Token.distinct("labels", { collection: collectionId }),
      Token.distinct("associatedComponents", { collection: collectionId }),
    ]);
    const labelSet = new Set(scopedLabels as string[]);
    const compSet = new Set(scopedComponents as string[]);
    return NextResponse.json({
      labels: allLabels.filter((l) => labelSet.has(l)),
      components: allComponents.filter((c) => compSet.has(c)),
    });
  }

  return NextResponse.json({
    labels: allLabels,
    components: allComponents,
  });
}
