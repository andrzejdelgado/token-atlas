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
    isCollectionActive: (id: string) => pathname === "/tokens" && searchParams.get("collection") === id,
  };
}

function TokenBadge({ count }: { count: number }) {
  return (
    <Badge variant="secondary" className="ml-auto h-4 px-1.5 text-[10px] font-normal shrink-0 pointer-events-none">
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
          if (e.key === "Enter") { e.preventDefault(); commit(); }
          if (e.key === "Escape") onCancel();
        }}
        className="h-6 text-xs px-2 py-0"
      />
    </div>
  );
}

// ── Hover action buttons ──────────────────────────────────────────────────────

function HoverActions({
  onRename,
  onAddChild,
}: {
  onRename: () => void;
  onAddChild: () => void;
}) {
  return (
    <div className="hidden group-hover/item:flex items-center gap-0.5 shrink-0">
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRename(); }}
        className="h-5 w-5 flex items-center justify-center rounded hover:bg-sidebar-accent transition-colors"
        title="Rename"
      >
        <Pencil className="h-3 w-3 text-muted-foreground" />
      </button>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAddChild(); }}
        className="h-5 w-5 flex items-center justify-center rounded hover:bg-sidebar-accent transition-colors"
        title="Add sub-group"
      >
        <Plus className="h-3 w-3 text-muted-foreground" />
      </button>
    </div>
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
    else { router.refresh(); onGroupCreated(); }
  }

  async function handleRename(name: string) {
    setRenaming(false);
    const res = await fetch(`/api/groups/${group._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) toast.error("Failed to rename group");
    else { router.refresh(); onGroupRenamed(); }
  }

  const content = (
    <SidebarMenuItem>
      {hasChildren ? (
        <>
          <div className="group/item flex items-center w-full pr-1">
            <CollapsibleTrigger className="flex items-center justify-center w-6 h-6 shrink-0 rounded hover:bg-sidebar-accent transition-colors">
              <ChevronRight className="h-3.5 w-3.5 transition-transform group-data-[state=open]/collapsible:rotate-90 text-muted-foreground" />
            </CollapsibleTrigger>
            <SidebarMenuButton size="sm" isActive={isActive} asChild className="flex-1 min-w-0">
              <Link href={`/tokens?group=${group._id}`}>
                <span className="capitalize truncate">{group.name}</span>
              </Link>
            </SidebarMenuButton>
            <span className="group-hover/item:hidden shrink-0">
              <TokenBadge count={group.tokenCount} />
            </span>
            <HoverActions onRename={() => setRenaming(true)} onAddChild={() => setAddingChild(true)} />
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
          <div className="group/item flex items-center w-full pr-1">
            <SidebarMenuButton size="sm" isActive={isActive} asChild className="flex-1 min-w-0">
              <Link href={`/tokens?group=${group._id}`}>
                <span className="capitalize truncate">{group.name}</span>
              </Link>
            </SidebarMenuButton>
            <span className="group-hover/item:hidden shrink-0">
              <TokenBadge count={group.tokenCount} />
            </span>
            <HoverActions onRename={() => setRenaming(true)} onAddChild={() => setAddingChild(true)} />
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
    else { router.refresh(); onGroupCreated(); }
  }

  async function handleRename(name: string) {
    setRenaming(false);
    const res = await fetch(`/api/groups/${group._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) toast.error("Failed to rename group");
    else { router.refresh(); onGroupRenamed(); }
  }

  const content = (
    <SidebarMenuSubItem>
      {hasChildren ? (
        <>
          <div className="group/item flex items-center w-full pr-1">
            <CollapsibleTrigger className="flex items-center justify-center w-5 h-5 shrink-0 rounded hover:bg-sidebar-accent transition-colors">
              <ChevronRight className="h-3 w-3 transition-transform group-data-[state=open]/collapsible:rotate-90 text-muted-foreground" />
            </CollapsibleTrigger>
            <SidebarMenuSubButton size="sm" isActive={isActive} asChild className="flex-1 min-w-0">
              <Link href={`/tokens?group=${group._id}`}>
                <span className="capitalize truncate">{group.name}</span>
              </Link>
            </SidebarMenuSubButton>
            <span className="group-hover/item:hidden shrink-0">
              <TokenBadge count={group.tokenCount} />
            </span>
            <HoverActions onRename={() => setRenaming(true)} onAddChild={() => setAddingChild(true)} />
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
          <div className="group/item flex items-center w-full pr-1">
            <SidebarMenuSubButton size="sm" isActive={isActive} asChild className="flex-1 min-w-0">
              <Link href={`/tokens?group=${group._id}`}>
                <span className="capitalize truncate">{group.name}</span>
              </Link>
            </SidebarMenuSubButton>
            <span className="group-hover/item:hidden shrink-0">
              <TokenBadge count={group.tokenCount} />
            </span>
            <HoverActions onRename={() => setRenaming(true)} onAddChild={() => setAddingChild(true)} />
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
        const coll = typeof g.collection === "string" ? g.collection : (g.collection as { _id: string })._id;
        return coll === activeCollectionId;
      })
    : groups;

  function handleCollectionChange(collectionId: string) {
    if (!collectionId) return;
    document.cookie = `active_collection=${collectionId}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
    router.push(`/tokens?collection=${collectionId}`);
  }

  async function handleAddGroup(name: string) {
    setAddingGroup(false);
    if (!activeCollectionId) { toast.error("Select a collection first"); return; }
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
        <SidebarHeader className="h-14 flex-row items-center gap-2 px-4 py-0 border-b shrink-0">
          <Globe className="h-5 w-5 shrink-0" />
          <span className="font-semibold">Token Atlas</span>
        </SidebarHeader>

        <SidebarContent className="gap-0 [&::-webkit-scrollbar]:w-[2px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full">

          {/* Collections — toggle */}
          <SidebarGroup className="py-2 px-3">
            <SidebarGroupContent>
              <Tabs value={activeCollectionId ?? ""} onValueChange={handleCollectionChange}>
                <TabsList className="w-full h-8">
                  {collections.map((col) => (
                    <TabsTrigger key={col._id} value={col._id} className="flex-1 text-xs gap-1.5">
                      {col.name}
                      <Badge variant="secondary" className="h-4 px-1.5 text-[10px] font-normal pointer-events-none">
                        {col.tokenCount}
                      </Badge>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Groups */}
          <SidebarGroup className="py-1 px-2">
            <div className="flex items-center justify-between h-6 px-2">
              <span className="text-xs font-medium text-muted-foreground">Groups</span>
              <button
                title="Add group"
                onClick={() => setAddingGroup(true)}
                className="flex items-center justify-center h-4 w-4 rounded hover:bg-sidebar-accent transition-colors"
              >
                <Plus className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
            <SidebarGroupContent>
              {addingGroup && (
                <InlineInput onSave={handleAddGroup} onCancel={() => setAddingGroup(false)} />
              )}
              <SidebarMenu>
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
