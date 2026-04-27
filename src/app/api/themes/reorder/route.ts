import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Theme } from "@/lib/db/models/theme.model";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.MONGODB_URI) return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  await connectToDatabase();

  const { items } = await req.json() as {
    items: Array<{ id: string; position: number }>;
  };

  await Promise.all(
    items.map(({ id, position }) =>
      Theme.updateOne({ _id: id }, { $set: { position } })
    )
  );

  return NextResponse.json({ message: "Reordered" });
}
