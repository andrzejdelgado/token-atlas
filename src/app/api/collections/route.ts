import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Collection } from "@/lib/db/models/collection.model";
import { Token } from "@/lib/db/models/token.model";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.MONGODB_URI) return NextResponse.json({ data: [] });
  await connectToDatabase();
  const collections = await Collection.find({}).lean();

  const countResults = await Token.aggregate([
    { $group: { _id: "$collection", count: { $sum: 1 } } },
  ]);
  const countMap = new Map(countResults.map((r) => [r._id.toString(), r.count]));

  const data = collections.map((c) => ({
    ...JSON.parse(JSON.stringify(c)),
    tokenCount: countMap.get(c._id.toString()) ?? 0,
  }));

  return NextResponse.json({ data });
}
