import { cookies } from "next/headers";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Collection } from "@/lib/db/models/collection.model";
import { TokenTable } from "@/components/tokens/token-table";

interface TokensPageProps {
  searchParams: Promise<{
    collection?: string;
    group?: string;
    theme?: string;
    flagged?: string;
    q?: string;
  }>;
}

export default async function TokensPage({ searchParams }: TokensPageProps) {
  const params = await searchParams;

  // Resolve the active collection: URL param → cookie → Global default
  let collectionId = params.collection;
  if (!collectionId) {
    const cookieStore = await cookies();
    const cookieId = cookieStore.get("active_collection")?.value;
    if (cookieId) {
      collectionId = cookieId;
    } else if (process.env.MONGODB_URI) {
      await connectToDatabase();
      const global = await Collection.findOne({ name: "Global" }).select("_id").lean();
      if (global) collectionId = global._id.toString();
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Semantics</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Browse and filter all design tokens across collections, groups, and themes.
        </p>
      </div>
      <TokenTable
        collectionId={collectionId}
        groupId={params.group}
        initialThemeId={params.theme}
        initialFlaggedOnly={params.flagged === "true"}
        searchQuery={params.q}
      />
    </div>
  );
}
