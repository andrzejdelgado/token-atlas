import { connectToDatabase } from "@/lib/db/mongodb";
import { Token } from "@/lib/db/models/token.model";

export async function GET() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    return Response.json({ status: "ok", db: "no MONGODB_URI", tokens: null });
  }

  // Extract just the database name from the URI (safe to expose)
  const dbName = uri.match(/\.net\/([^?]+)/)?.[1] ?? "(no db name in URI)";

  try {
    await connectToDatabase();
    const tokens = await Token.countDocuments();
    return Response.json({ status: "ok", db: dbName, tokens });
  } catch (e) {
    return Response.json({ status: "error", db: dbName, error: String(e) });
  }
}
