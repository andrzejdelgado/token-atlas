"use client";

import React, { useState, createContext, useContext } from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { Globe, Plus, ChevronRight, Pencil } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserAvatarMenu } from "./user-avatar-menu";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import type { ICollection, GroupTree } from "@/types/token";

// ── Context for passing collection id + refresh down the tree ──────────────────

interface SidebarCtx {
  collectionId: string | null;
  onGroupCreated: () => void;
  onGroupRenamed: () => void;
}

const SidebarContext = createContext<SidebarCtx>({
  collectionId: null,
  onGroupCreated: () => {},
  onGroupRenamed: () => {},
});

// ── Helpers ───────────────────────────────────────────────────────────────────

interface AppSidebarProps {
  collections: Array<ICollection & { tokenCount: number }>;
  groups: GroupTree[];
  defaultCollectionId?: string;
}

function useActiveParam() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return {
    isGroupActive: (id: string) => pathname === "/tokens" && searchParams.get("group") === id,
    isCollectionActive: (id: string) =>
      pathname === "/tokens" && searchParams.get("collection") === id,
    isAllActive: () => pathname === "/tokens" && !searchParams.get("group"),
  };
}

function TokenBadge({ count }: { count: number }) {
  return (
    <Badge
      variant="secondary"
      className="pointer-events-none ml-auto h-4 shrink-0 px-1.5 text-[10px] font-normal"
    >
      {count}
    </Badge>
  );
}

// ── Inline inputs ─────────────────────────────────────────────────────────────

function InlineInput({
  defaultValue = "",
  placeholder = "Name…",
  onSave,
  onCancel,
}: {
  defaultValue?: string;
  placeholder?: string;
  onSave: (v: string) => void;
  onCancel: () => void;
}) {
  const [val, setVal] = useState(defaultValue);
  function commit() {
    const trimmed = val.trim();
    if (trimmed) onSave(trimmed);
    else onCancel();
  }
  return (
    <div className="px-2 pb-1">
      <Input
        value={val}
        autoFocus
        placeholder={placeholder}
        onChange={(e) => setVal(e.target.value)}
        onBlur={onCancel}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
          if (e.key === "Escape") onCancel();
        }}
        className="h-6 px-2 py-0 text-xs"
      />
    </div>
  );
}

// ── Hover action buttons ──────────────────────────────────────────────────────

function HoverActions({ onRename, onAddChild }: { onRename: () => void; onAddChild: () => void }) {
  return (
    <div className="hidden shrink-0 items-center gap-0.5 group-hover/item:flex">
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRename();
        }}
        className="hover:bg-sidebar-accent flex h-5 w-5 items-center justify-center rounded transition-colors"
        title="Rename"
      >
        <Pencil className="text-muted-foreground h-3 w-3" />
      </button>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onAddChild();
        }}
        className="hover:bg-sidebar-accent flex h-5 w-5 items-center justify-center rounded transition-colors"
        title="Add sub-group"
      >
        <Plus className="text-muted-foreground h-3 w-3" />
      </button>
    </div>
  );
}

// ── AllItem ───────────────────────────────────────────────────────────────────

function AllItem({
  collectionId,
  tokenCount,
}: {
  collectionId: string | null;
  tokenCount: number;
}) {
  const { isAllActive } = useActiveParam();
  const href = collectionId ? `/tokens?collection=${collectionId}` : "/tokens";

  return (
    <SidebarMenuItem>
      <div className="flex w-full items-center pr-1">
        <SidebarMenuButton size="sm" isActive={isAllActive()} asChild className="min-w-0 flex-1">
          <Link href={href}>
            <span>All</span>
          </Link>
        </SidebarMenuButton>
        <TokenBadge count={tokenCount} />
      </div>
    </SidebarMenuItem>
  );
}

// ── GroupItem ─────────────────────────────────────────────────────────────────

function GroupItem({ group }: { group: GroupTree }) {
  const { isGroupActive } = useActiveParam();
  const { collectionId, onGroupCreated, onGroupRenamed } = useContext(SidebarContext);
  const router = useRouter();
  const isActive = isGroupActive(group._id);
  const hasChildren = group.children.length > 0;
  const [addingChild, setAddingChild] = useState(false);
  const [renaming, setRenaming] = useState(false);

  async function handleAddChild(name: string) {
    setAddingChild(false);
    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, collectionId, parentId: group._id }),
    });
    if (!res.ok) toast.error("Failed to add sub-group");
    else {
      router.refresh();
      onGroupCreated();
    }
  }

  async function handleRename(name: string) {
    setRenaming(false);
    const res = await fetch(`/api/groups/${group._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) toast.error("Failed to rename group");
    else {
      router.refresh();
      onGroupRenamed();
    }
  }

  const content = (
    <SidebarMenuItem>
      {hasChildren ? (
        <>
          <div className="group/item flex w-full items-center pr-1">
            <CollapsibleTrigger className="hover:bg-sidebar-accent flex h-6 w-6 shrink-0 items-center justify-center rounded transition-colors">
              <ChevronRight className="text-muted-foreground h-3.5 w-3.5 transition-transform group-data-[state=open]/collapsible:rotate-90" />
            </CollapsibleTrigger>
            <SidebarMenuButton size="sm" isActive={isActive} asChild className="min-w-0 flex-1">
              <Link href={`/tokens?group=${group._id}`}>
                <span className="truncate capitalize">{group.name}</span>
              </Link>
            </SidebarMenuButton>
            <span className="shrink-0 group-hover/item:hidden">
              <TokenBadge count={group.tokenCount} />
            </span>
            <HoverActions
              onRename={() => setRenaming(true)}
              onAddChild={() => setAddingChild(true)}
            />
          </div>
          {renaming && (
            <InlineInput
              defaultValue={group.name}
              onSave={handleRename}
              onCancel={() => setRenaming(false)}
            />
          )}
          {addingChild && (
            <InlineInput
              placeholder="Sub-group name…"
              onSave={handleAddChild}
              onCancel={() => setAddingChild(false)}
            />
          )}
          <CollapsibleContent>
            <SidebarMenuSub className="mr-0 pr-0">
              {group.children.map((child) => (
                <SubGroupItem key={child._id} group={child} />
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        </>
      ) : (
        <>
          <div className="group/item flex w-full items-center pr-1">
            <SidebarMenuButton size="sm" isActive={isActive} asChild className="min-w-0 flex-1">
              <Link href={`/tokens?group=${group._id}`}>
                <span className="truncate capitalize">{group.name}</span>
              </Link>
            </SidebarMenuButton>
            <span className="shrink-0 group-hover/item:hidden">
              <TokenBadge count={group.tokenCount} />
            </span>
            <HoverActions
              onRename={() => setRenaming(true)}
              onAddChild={() => setAddingChild(true)}
            />
          </div>
          {renaming && (
            <InlineInput
              defaultValue={group.name}
              onSave={handleRename}
              onCancel={() => setRenaming(false)}
            />
          )}
          {addingChild && (
            <InlineInput
              placeholder="Sub-group name…"
              onSave={handleAddChild}
              onCancel={() => setAddingChild(false)}
            />
          )}
        </>
      )}
    </SidebarMenuItem>
  );

  if (!hasChildren) return content;

  return (
    <Collapsible defaultOpen className="group/collapsible">
      {content}
    </Collapsible>
  );
}

// ── SubGroupItem ──────────────────────────────────────────────────────────────

function SubGroupItem({ group }: { group: GroupTree }) {
  const { isGroupActive } = useActiveParam();
  const { collectionId, onGroupCreated, onGroupRenamed } = useContext(SidebarContext);
  const router = useRouter();
  const isActive = isGroupActive(group._id);
  const hasChildren = group.children.length > 0;
  const [addingChild, setAddingChild] = useState(false);
  const [renaming, setRenaming] = useState(false);

  async function handleAddChild(name: string) {
    setAddingChild(false);
    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, collectionId, parentId: group._id }),
    });
    if (!res.ok) toast.error("Failed to add sub-group");
    else {
      router.refresh();
      onGroupCreated();
    }
  }

  async function handleRename(name: string) {
    setRenaming(false);
    const res = await fetch(`/api/groups/${group._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) toast.error("Failed to rename group");
    else {
      router.refresh();
      onGroupRenamed();
    }
  }

  const content = (
    <SidebarMenuSubItem>
      {hasChildren ? (
        <>
          <div className="group/item flex w-full items-center pr-1">
            <CollapsibleTrigger className="hover:bg-sidebar-accent flex h-5 w-5 shrink-0 items-center justify-center rounded transition-colors">
              <ChevronRight className="text-muted-foreground h-3 w-3 transition-transform group-data-[state=open]/collapsible:rotate-90" />
            </CollapsibleTrigger>
            <SidebarMenuSubButton size="sm" isActive={isActive} asChild className="min-w-0 flex-1">
              <Link href={`/tokens?group=${group._id}`}>
                <span className="truncate capitalize">{group.name}</span>
              </Link>
            </SidebarMenuSubButton>
            <span className="shrink-0 group-hover/item:hidden">
              <TokenBadge count={group.tokenCount} />
            </span>
            <HoverActions
              onRename={() => setRenaming(true)}
              onAddChild={() => setAddingChild(true)}
            />
          </div>
          {renaming && (
            <InlineInput
              defaultValue={group.name}
              onSave={handleRename}
              onCancel={() => setRenaming(false)}
            />
          )}
          {addingChild && (
            <InlineInput
              placeholder="Sub-group name…"
              onSave={handleAddChild}
              onCancel={() => setAddingChild(false)}
            />
          )}
          <CollapsibleContent>
            <SidebarMenuSub className="mr-0 pr-0">
              {group.children.map((child) => (
                <SubGroupItem key={child._id} group={child} />
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        </>
      ) : (
        <>
          <div className="group/item flex w-full items-center pr-1">
            <SidebarMenuSubButton size="sm" isActive={isActive} asChild className="min-w-0 flex-1">
              <Link href={`/tokens?group=${group._id}`}>
                <span className="truncate capitalize">{group.name}</span>
              </Link>
            </SidebarMenuSubButton>
            <span className="shrink-0 group-hover/item:hidden">
              <TokenBadge count={group.tokenCount} />
            </span>
            <HoverActions
              onRename={() => setRenaming(true)}
              onAddChild={() => setAddingChild(true)}
            />
          </div>
          {renaming && (
            <InlineInput
              defaultValue={group.name}
              onSave={handleRename}
              onCancel={() => setRenaming(false)}
            />
          )}
          {addingChild && (
            <InlineInput
              placeholder="Sub-group name…"
              onSave={handleAddChild}
              onCancel={() => setAddingChild(false)}
            />
          )}
        </>
      )}
    </SidebarMenuSubItem>
  );

  if (!hasChildren) return content;

  return (
    <Collapsible defaultOpen className="group/collapsible">
      {content}
    </Collapsible>
  );
}

// ── AppSidebar ────────────────────────────────────────────────────────────────

export function AppSidebar({ collections, groups, defaultCollectionId }: AppSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [addingGroup, setAddingGroup] = useState(false);

  // Active collection: from URL first, then cookie default
  const urlCollection = pathname === "/tokens" ? searchParams.get("collection") : null;
  const activeCollectionId = urlCollection ?? defaultCollectionId ?? collections[0]?._id ?? null;

  const displayedGroups = activeCollectionId
    ? groups.filter((g) => {
        const coll =
          typeof g.collection === "string" ? g.collection : (g.collection as { _id: string })._id;
        return coll === activeCollectionId;
      })
    : groups;

  const activeCollection = collections.find((c) => c._id === activeCollectionId);
  const activeCollectionTokenCount = activeCollection?.tokenCount ?? 0;

  function handleCollectionChange(collectionId: string) {
    if (!collectionId) return;
    document.cookie = `active_collection=${collectionId}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
    router.push(`/tokens?collection=${collectionId}`);
  }

  async function handleAddGroup(name: string) {
    setAddingGroup(false);
    if (!activeCollectionId) {
      toast.error("Select a collection first");
      return;
    }
    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, collectionId: activeCollectionId, parentId: null }),
    });
    if (!res.ok) toast.error("Failed to add group");
    else router.refresh();
  }

  const ctxValue: SidebarCtx = {
    collectionId: activeCollectionId,
    onGroupCreated: () => {},
    onGroupRenamed: () => {},
  };

  return (
    <SidebarContext.Provider value={ctxValue}>
      <Sidebar className="bg-background border-r">
        <SidebarHeader className="h-14 shrink-0 flex-row items-center gap-2 border-b px-4 py-0">
          <Globe className="h-5 w-5 shrink-0" />
          <span className="font-semibold">Token Atlas</span>
        </SidebarHeader>

        <SidebarContent className="[&::-webkit-scrollbar-thumb]:bg-border gap-0 [&::-webkit-scrollbar]:w-[2px] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
          {/* Collections — toggle */}
          <SidebarGroup className="px-3 py-2">
            <SidebarGroupContent>
              <Tabs value={activeCollectionId ?? ""} onValueChange={handleCollectionChange}>
                <TabsList className="h-8 w-full">
                  {collections.map((col) => (
                    <TabsTrigger key={col._id} value={col._id} className="flex-1 gap-1.5 text-xs">
                      {col.name}
                      <Badge
                        variant="secondary"
                        className="pointer-events-none h-4 px-1.5 text-[10px] font-normal"
                      >
                        {col.tokenCount}
                      </Badge>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Groups */}
          <SidebarGroup className="px-2 py-1">
            <div className="flex h-6 items-center justify-between px-2">
              <span className="text-muted-foreground text-xs font-medium">Groups</span>
              <button
                title="Add group"
                onClick={() => setAddingGroup(true)}
                className="hover:bg-sidebar-accent flex h-4 w-4 items-center justify-center rounded transition-colors"
              >
                <Plus className="text-muted-foreground h-3.5 w-3.5" />
              </button>
            </div>
            <SidebarGroupContent>
              {addingGroup && (
                <InlineInput onSave={handleAddGroup} onCancel={() => setAddingGroup(false)} />
              )}
              <SidebarMenu>
                <AllItem
                  collectionId={activeCollectionId}
                  tokenCount={activeCollectionTokenCount}
                />
                {displayedGroups.map((group) => (
                  <GroupItem key={group._id} group={group} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t py-2">
          <UserAvatarMenu />
        </SidebarFooter>
      </Sidebar>
    </SidebarContext.Provider>
  );
}
