import type React from "react";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Token } from "@/lib/db/models/token.model";
import { Collection, type ICollectionDoc } from "@/lib/db/models/collection.model";
import { Group, type IGroupDoc } from "@/lib/db/models/group.model";
import { AppSidebar } from "@/components/layout/sidebar";
import { TopNav } from "@/components/layout/top-nav";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import type { ICollection, GroupTree } from "@/types/token";
import type mongoose from "mongoose";

type LeanDoc<T> = Omit<T, "_id"> & { _id: mongoose.Types.ObjectId };

async function getSidebarData() {
  if (!process.env.MONGODB_URI) {
    return { collections: [], groups: [], defaultCollectionId: undefined };
  }
  await connectToDatabase();

  const [collections, groups] = await Promise.all([
    Collection.find({}).sort({ position: 1, name: 1 }).lean<LeanDoc<ICollectionDoc>[]>(),
    Group.find({}).lean<LeanDoc<IGroupDoc>[]>(),
  ]);

  // Token counts per collection
  const collectionCountResults = await Token.aggregate([
    { $group: { _id: "$collection", count: { $sum: 1 } } },
  ]);
  const collectionCountMap = new Map(
    collectionCountResults.map((r) => [r._id.toString(), r.count])
  );

  // Token counts per group
  const groupCountResults = await Token.aggregate([
    { $group: { _id: "$group", count: { $sum: 1 } } },
  ]);
  const groupCountMap = new Map(groupCountResults.map((r) => [r._id.toString(), r.count]));

  const themedCollections = collections.map((c) => ({
    _id: c._id.toString(),
    name: c.name,
    description: c.description,
    tokenCount: collectionCountMap.get(c._id.toString()) ?? 0,
  })) as (ICollection & { tokenCount: number })[];

  // Build group tree
  const groupMap = new Map<string, GroupTree>();
  const rootGroups: GroupTree[] = [];

  for (const g of groups) {
    groupMap.set(g._id.toString(), {
      _id: g._id.toString(),
      name: g.name,
      collection: g.collection.toString(),
      parent: g.parent?.toString() ?? null,
      path: g.path,
      depth: g.depth,
      position: g.position ?? 0,
      sortPath: g.sortPath ?? "",
      children: [],
      tokenCount: groupCountMap.get(g._id.toString()) ?? 0,
    });
  }

  for (const [, group] of groupMap) {
    if (!group.parent) {
      rootGroups.push(group);
    } else {
      const parent = groupMap.get(group.parent.toString());
      parent?.children.push(group);
    }
  }

  function sortByPosition(groupList: GroupTree[]) {
    groupList.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    groupList.forEach((g) => sortByPosition(g.children));
  }
  sortByPosition(rootGroups);

  function rollUpCounts(group: GroupTree): number {
    const childTotal = group.children.reduce((sum, child) => sum + rollUpCounts(child), 0);
    group.tokenCount = group.tokenCount + childTotal;
    return group.tokenCount;
  }
  rootGroups.forEach(rollUpCounts);

  // Default collection from cookie — fall back to "Global"
  const cookieStore = await cookies();
  const cookieCollectionId = cookieStore.get("active_collection")?.value;
  const globalCollection = themedCollections.find((c) => c.name === "Global");
  const defaultCollectionId =
    cookieCollectionId && themedCollections.some((c) => c._id === cookieCollectionId)
      ? cookieCollectionId
      : globalCollection?._id;

  return { collections: themedCollections, groups: rootGroups, defaultCollectionId };
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { collections, groups, defaultCollectionId } = await getSidebarData();

  return (
    <SidebarProvider>
      <Suspense fallback={null}>
        <AppSidebar
          collections={collections}
          groups={groups}
          defaultCollectionId={defaultCollectionId}
        />
      </Suspense>
      <SidebarInset className="flex flex-col overflow-hidden">
        <div className="bg-muted text-muted-foreground flex shrink-0 items-center justify-center border-b p-4 text-sm lg:hidden">
          Read-only mode — Token Atlas requires a desktop browser (1024px+) for editing.
        </div>
        <TopNav />
        <div className="flex-1 overflow-auto px-6 py-4">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
