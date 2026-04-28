import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { SavedQuery } from "@/lib/db/models/saved-query.model";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.MONGODB_URI) return NextResponse.json({ data: [] });
  await connectToDatabase();

  const queries = await SavedQuery.find({}).sort({ createdAt: -1 }).lean();
  return NextResponse.json({ data: JSON.parse(JSON.stringify(queries)) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.MONGODB_URI)
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  await connectToDatabase();

  const body = await req.json();
  const { name, criteria, excludeCriteria } = body;

  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const query = await SavedQuery.create({
    name: name.trim(),
    criteria: criteria ?? [],
    excludeCriteria: excludeCriteria ?? [],
  });
  return NextResponse.json({ data: JSON.parse(JSON.stringify(query.toObject())) }, { status: 201 });
}
