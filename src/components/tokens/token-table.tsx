"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, SlidersHorizontal, Plus, Columns3, ArrowUpDown, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent } from "@/components/ui/card";
import { TokenRow } from "./token-row";
import { GroupRow } from "./group-row";
import { FloatingActionToolbar } from "./floating-action-toolbar";
import { FilterSheet } from "./filter-sheet";
import { ColumnManagerSheet } from "./column-manager-sheet";
import { AddTokenSheet } from "./add-token-sheet";
import { VersionHistorySheet } from "./version-history-sheet";
import { EditTokenSheet } from "./edit-token-sheet";
import { EditGroupSheet } from "./edit-group-sheet";
import { EmptyState } from "@/components/common/empty-state";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { IToken, ITheme } from "@/types/token";
import type { TokenFilters, ExcludeFilters } from "@/types/api";

interface TokenTableProps {
  collectionId?: string;
  groupId?: string;
  initialThemeId?: string;
  initialFlaggedOnly?: boolean;
  searchQuery?: string;
  initialFilters?: TokenFilters;
  excludeFilters?: ExcludeFilters;
}

interface GroupNode {
  _id: string;
  name: string;
  path: string;
  depth: number;
  parent?: string | null;
  sortPath?: string;
  position?: number;
  children: GroupNode[];
}

interface ColumnDef {
  id: string;
  label: string;
  visible: boolean;
  locked?: boolean;
}

interface ThemeWithCount extends ITheme {
  modificationCount: number;
}

const COLUMN_WIDTHS: Record<string, number> = {
  name: 192,
  type: 88,
  lightValue: 180,
  darkValue: 180,
  flag: 60,
  components: 160,
  labels: 128,
  collection: 128,
  lastModified: 128,
};

const DEFAULT_COLUMNS: ColumnDef[] = [
  { id: "name", label: "Name", visible: true, locked: true },
  { id: "type", label: "Type", visible: true },
  { id: "lightValue", label: "Light", visible: true },
  { id: "darkValue", label: "Dark", visible: true },
  { id: "flag", label: "Flag", visible: true },
  { id: "components", label: "Components", visible: true },
  { id: "labels", label: "Labels", visible: true },
  { id: "collection", label: "Collection", visible: false },
  { id: "lastModified", label: "Last modified", visible: true },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function getSubtreeTokenIds(
  node: GroupNode,
  tokensByGroupId: Map<string, { _id: string }[]>
): string[] {
  const direct = (tokensByGroupId.get(node._id) ?? []).map((t) => t._id);
  return [...direct, ...node.children.flatMap((c) => getSubtreeTokenIds(c, tokensByGroupId))];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderGroupNodes(
  nodes: GroupNode[],
  tokensByGroupId: Map<string, (IToken & { updatedAt: Date | string })[]>,
  selectedIds: Set<string>,
  toggleGroup: (ids: string[], checked: boolean) => void,
  toggleOne: (id: string, checked: boolean) => void,
  handleDelete: (id: string) => void,
  handleFlagToggle: (id: string, flagged: boolean) => void,
  handleRename: (id: string, name: string) => void,
  setHistoryTokenId: (id: string) => void,
  setEditTokenId: (id: string) => void,
  setEditGroupId: (id: string) => void,
  columns: ColumnDef[],
  activeThemeIsBase: boolean
): React.ReactNode {
  return nodes.map((node) => {
    const directTokens = tokensByGroupId.get(node._id) ?? [];
    const subtreeIds = getSubtreeTokenIds(node, tokensByGroupId);
    if (subtreeIds.length === 0) return null;

    return (
      <GroupRow
        key={node._id}
        groupId={node._id}
        groupName={node.name}
        groupPath={node.path}
        tokenCount={subtreeIds.length}
        depth={node.depth}
        selectedCount={subtreeIds.filter((id) => selectedIds.has(id)).length}
        onSelectAll={(checked) => toggleGroup(subtreeIds, checked)}
        onEditOpen={setEditGroupId}
      >
        {directTokens.map((token) => (
          <TokenRow
            key={token._id}
            token={token}
            selected={selectedIds.has(token._id)}
            overridden={!activeThemeIsBase && !!token._overridden}
            overrideDisabled={!activeThemeIsBase && !!token._overrideDisabled}
            onSelect={toggleOne}
            onDelete={handleDelete}
            onFlagToggle={handleFlagToggle}
            onRename={handleRename}
            onHistoryOpen={setHistoryTokenId}
            onEditOpen={setEditTokenId}
            columns={columns}
          />
        ))}
        {node.children.length > 0 &&
          renderGroupNodes(
            node.children,
            tokensByGroupId,
            selectedIds,
            toggleGroup,
            toggleOne,
            handleDelete,
            handleFlagToggle,
            handleRename,
            setHistoryTokenId,
            setEditTokenId,
            setEditGroupId,
            columns,
            activeThemeIsBase
          )}
      </GroupRow>
    );
  });
}

export function TokenTable({
  collectionId,
  groupId,
  initialThemeId,
  initialFlaggedOnly = false,
  searchQuery: externalSearch,
  initialFilters,
  excludeFilters,
}: TokenTableProps) {
  const [tokens, setTokens] = useState<(IToken & { updatedAt: Date | string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [search, setSearch] = useState(externalSearch ?? "");
  const [flaggedOnly, setFlaggedOnly] = useState(initialFlaggedOnly);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [columns, setColumns] = useState<ColumnDef[]>(DEFAULT_COLUMNS);
  const [filters, setFilters] = useState<TokenFilters>(initialFilters ?? {});
  const [filterOpen, setFilterOpen] = useState(false);
  const [columnManagerOpen, setColumnManagerOpen] = useState(false);
  const [addTokenOpen, setAddTokenOpen] = useState(false);
  const [historyTokenId, setHistoryTokenId] = useState<string | null>(null);
  const [editTokenId, setEditTokenId] = useState<string | null>(null);
  const [editGroupId, setEditGroupId] = useState<string | null>(null);
  const [groupTree, setGroupTree] = useState<GroupNode[]>([]);
  const [themes, setThemes] = useState<ThemeWithCount[]>([]);
  const [activeThemeId, setActiveThemeId] = useState<string>(initialThemeId ?? "");
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isThemeInit = useRef(false);
  const router = useRouter();

  // Derive whether the active theme is base
  const activeTheme = themes.find((t) => t._id === activeThemeId);
  const activeThemeIsBase = !activeTheme || !!activeTheme.isBase;
  const baseThemes = themes.filter((t) => t.isBase).sort((a, b) => a.name.localeCompare(b.name));
  const modifierThemes = themes
    .filter((t) => !t.isBase)
    .sort((a, b) => a.name.localeCompare(b.name));
  const visibleModifiers = modifierThemes.slice(0, 10);
  const overflowModifiers = modifierThemes.slice(10);
  const activeIsOverflow = overflowModifiers.some((t) => t._id === activeThemeId);

  // Sync active theme to URL so it survives navigation
  useEffect(() => {
    if (!isThemeInit.current) {
      isThemeInit.current = true;
      return;
    }
    if (!activeThemeId) return;
    const sp = new URLSearchParams(window.location.search);
    sp.set("theme", activeThemeId);
    router.replace(`${window.location.pathname}?${sp.toString()}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeThemeId]);

  // Fetch themes once on mount
  useEffect(() => {
    fetch("/api/themes")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.data) return;
        const list: ThemeWithCount[] = data.data;
        setThemes(list);
        // Default to base theme if no initial theme is set
        if (!initialThemeId) {
          const base = list.find((t) => t.isBase);
          if (base) setActiveThemeId(base._id);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch all groups in scope so every intermediate header is visible
  useEffect(() => {
    if (!groupId && !collectionId) {
      setGroupTree([]);
      return;
    }
    const url = groupId
      ? `/api/groups?ancestor=${groupId}`
      : `/api/groups?collection=${collectionId}`;
    fetch(url)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.data) return;
        const map = new Map<string, GroupNode>();
        for (const g of data.data) map.set(g._id, { ...g, children: [] });
        const roots: GroupNode[] = [];
        for (const [, node] of map) {
          const parentId = node.parent ? String(node.parent) : null;
          if (parentId && map.has(parentId)) {
            map.get(parentId)!.children.push(node);
          } else {
            roots.push(node);
          }
        }
        function sortNodes(nodes: GroupNode[]) {
          nodes.sort(
            (a, b) =>
              (a.position ?? 0) - (b.position ?? 0) ||
              (a.sortPath || a.path).localeCompare(b.sortPath || b.path)
          );
          nodes.forEach((n) => sortNodes(n.children));
        }
        sortNodes(roots);
        setGroupTree(roots);
      })
      .catch(() => setGroupTree([]));
  }, [groupId, collectionId]);

  const buildQuery = useCallback(
    (cursor?: string) => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (collectionId) params.set("collection", collectionId);
      if (groupId) params.set("group", groupId);
      if (activeThemeId) params.set("theme", activeThemeId);
      if (flaggedOnly) params.set("flagged", "true");
      if (cursor) params.set("cursor", cursor);
      filters.tokenTypes?.forEach((t) => params.append("tokenType", t));
      filters.labels?.forEach((l) => params.append("label", l));
      filters.components?.forEach((c) => params.append("component", c));
      if (filters.modifiedAfter) params.set("modifiedAfter", filters.modifiedAfter);
      if (filters.modifiedBefore) params.set("modifiedBefore", filters.modifiedBefore);
      if (excludeFilters?.search) params.set("excludeSearch", excludeFilters.search);
      if (excludeFilters?.collectionId)
        params.set("excludeCollection", excludeFilters.collectionId);
      if (excludeFilters?.groupId) params.set("excludeGroup", excludeFilters.groupId);
      if (excludeFilters?.flagged) params.set("excludeFlagged", "true");
      excludeFilters?.tokenTypes?.forEach((t) => params.append("excludeTokenType", t));
      excludeFilters?.labels?.forEach((l) => params.append("excludeLabel", l));
      excludeFilters?.components?.forEach((c) => params.append("excludeComponent", c));
      return params.toString();
    },
    [search, collectionId, groupId, activeThemeId, flaggedOnly, filters, excludeFilters]
  );

  async function fetchTokens(cursor?: string) {
    if (cursor) setLoadingMore(true);
    else setLoading(true);

    try {
      const res = await fetch(`/api/tokens?${buildQuery(cursor)}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (cursor) {
        setTokens((prev) => [...prev, ...(data.data ?? [])]);
      } else {
        setTokens(data.data ?? []);
      }
      setHasMore(data.hasMore ?? false);
      setNextCursor(data.nextCursor);
    } catch {
      toast.error("Failed to load tokens");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    setTokens([]);
    setNextCursor(undefined);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    fetchTokens();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildQuery]);

  // Infinite scroll
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loadingMore) {
          fetchTokens(nextCursor);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loadingMore, nextCursor]);

  // Map of groupId → direct tokens
  const tokensByGroupId = new Map<string, (IToken & { updatedAt: Date | string })[]>();
  for (const token of tokens) {
    const gId =
      typeof token.group === "object" && token.group !== null
        ? (token.group as { _id: string })._id
        : String(token.group);
    if (!tokensByGroupId.has(gId)) tokensByGroupId.set(gId, []);
    tokensByGroupId.get(gId)!.push(token);
  }

  // Flat grouping fallback when no tree (all-tokens view)
  const flatGrouped =
    groupTree.length === 0
      ? Array.from(
          (() => {
            const m = new Map<
              string,
              {
                groupName: string;
                path: string;
                sortPath: string;
                depth: number;
                tokens: (IToken & { updatedAt: Date | string })[];
              }
            >();
            for (const token of tokens) {
              const g =
                typeof token.group === "object" && token.group !== null
                  ? (token.group as {
                      _id: string;
                      name: string;
                      path: string;
                      depth?: number;
                      sortPath?: string;
                    })
                  : {
                      _id: String(token.group),
                      name: "Unknown",
                      path: "Unknown",
                      depth: 0,
                      sortPath: undefined,
                    };
              if (!m.has(g._id))
                m.set(g._id, {
                  groupName: g.name,
                  path: g.path,
                  sortPath: g.sortPath ?? "",
                  depth: g.depth ?? 0,
                  tokens: [],
                });
              m.get(g._id)!.tokens.push(token);
            }
            return m;
          })()
        ).sort(([, a], [, b]) => (a.sortPath || a.path).localeCompare(b.sortPath || b.path))
      : [];

  const allIds = tokens.map((t) => t._id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
  const indeterminate = selectedIds.size > 0 && !allSelected;

  function toggleAll(checked: boolean) {
    if (checked) setSelectedIds(new Set(allIds));
    else setSelectedIds(new Set());
  }

  function toggleOne(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleGroup(groupTokenIds: string[], checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of groupTokenIds) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/tokens/${id}`, { method: "DELETE" });
    if (res.ok) {
      setTokens((prev) => prev.filter((t) => t._id !== id));
      setSelectedIds((prev) => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
    } else {
      toast.error("Failed to delete token");
    }
  }

  async function handleBulkDelete(ids: string[]) {
    const res = await fetch("/api/tokens/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", tokenIds: ids }),
    });
    if (res.ok) {
      const idSet = new Set(ids);
      setTokens((prev) => prev.filter((t) => !idSet.has(t._id)));
      setSelectedIds(new Set());
    } else {
      toast.error("Failed to delete tokens");
    }
  }

  function handleRename(id: string, name: string) {
    setTokens((prev) => prev.map((t) => (t._id === id ? { ...t, name } : t)));
  }

  function handleFlagToggle(id: string, flagged: boolean) {
    setTokens((prev) => prev.map((t) => (t._id === id ? { ...t, flagged } : t)));
    if (flaggedOnly && !flagged) {
      setTokens((prev) => prev.filter((t) => t._id !== id));
    }
  }

  function handleTokenAdded(token: IToken & { updatedAt: Date | string }) {
    setTokens((prev) => [token, ...prev]);
  }

  const visibleColumns = columns.filter((c) => c.visible);
  const activeFilterCount = Object.values(filters).filter((v) =>
    Array.isArray(v) ? v.length > 0 : !!v
  ).length;

  return (
    <>
      <Card className="flex h-[calc(100vh-11rem)] flex-col overflow-hidden py-2">
        <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
          {/* Theme selector */}
          {themes.length > 0 && (
            <div className="flex shrink-0 items-center gap-1.5 border-b px-4 py-2">
              {/* Base theme */}
              <ToggleGroup
                type="single"
                value={baseThemes.some((t) => t._id === activeThemeId) ? activeThemeId : ""}
                onValueChange={(v) => {
                  if (v) setActiveThemeId(v);
                }}
                className="gap-1"
              >
                {baseThemes.map((theme) => (
                  <ToggleGroupItem
                    key={theme._id}
                    value={theme._id}
                    variant="outline"
                    className="h-7 px-2.5 text-xs"
                  >
                    {theme.name}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>

              {/* Modifier themes — first 4 inline */}
              {visibleModifiers.length > 0 && (
                <ToggleGroup
                  type="single"
                  value={visibleModifiers.some((t) => t._id === activeThemeId) ? activeThemeId : ""}
                  onValueChange={(v) => {
                    if (v) setActiveThemeId(v);
                  }}
                  className="gap-0"
                >
                  {visibleModifiers.map((theme) => (
                    <ToggleGroupItem
                      key={theme._id}
                      value={theme._id}
                      variant="outline"
                      className="h-7 gap-1.5 px-2.5 text-xs"
                    >
                      {theme.name}
                      {theme.modificationCount > 0 && (
                        <Badge
                          variant="secondary"
                          className="pointer-events-none h-4 px-1.5 text-[10px] font-normal"
                        >
                          {theme.modificationCount}
                        </Badge>
                      )}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              )}

              {/* Overflow themes — tucked into a popover */}
              {overflowModifiers.length > 0 && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "h-7 gap-1 px-2.5 text-xs",
                        activeIsOverflow && "border-primary text-primary bg-primary/5"
                      )}
                    >
                      +{overflowModifiers.length}
                      {activeIsOverflow && (
                        <Badge
                          variant="secondary"
                          className="pointer-events-none h-4 px-1.5 text-[10px] font-normal"
                        >
                          {activeTheme?.name}
                        </Badge>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2" align="start">
                    <ToggleGroup
                      type="single"
                      value={
                        overflowModifiers.some((t) => t._id === activeThemeId) ? activeThemeId : ""
                      }
                      onValueChange={(v) => {
                        if (v) setActiveThemeId(v);
                      }}
                      className="flex flex-col items-stretch gap-0"
                    >
                      {overflowModifiers.map((theme) => (
                        <ToggleGroupItem
                          key={theme._id}
                          value={theme._id}
                          variant="outline"
                          className="h-7 w-full justify-between gap-3 px-2.5 text-xs"
                        >
                          {theme.name}
                          {theme.modificationCount > 0 && (
                            <Badge
                              variant="secondary"
                              className="pointer-events-none h-4 px-1.5 text-[10px] font-normal"
                            >
                              {theme.modificationCount}
                            </Badge>
                          )}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          )}

          {/* Toolbar */}
          <div className="flex shrink-0 items-center gap-2 border-b px-4 py-2">
            <div className="relative max-w-sm flex-1">
              <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
              <Input
                placeholder="Search tokens…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pr-24 pl-8 text-sm"
              />
              <Link
                href="/search"
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 text-[11px] transition-colors"
              >
                Build query
              </Link>
            </div>

            <Tabs
              value={flaggedOnly ? "flagged" : "all"}
              onValueChange={(v) => setFlaggedOnly(v === "flagged")}
            >
              <TabsList className="h-8">
                <TabsTrigger value="all" className="px-3 text-xs">
                  All
                </TabsTrigger>
                <TabsTrigger value="flagged" className="px-3 text-xs">
                  Flagged
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div
              className={cn(
                "border-input inline-flex h-8 items-center rounded-md border text-xs transition-colors",
                activeFilterCount > 0
                  ? "border-primary text-primary"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <button
                className="flex h-full items-center gap-1.5 rounded-l-md px-3 transition-opacity hover:opacity-70"
                onClick={() => setFilterOpen(true)}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge className="pointer-events-none ml-0.5 h-4 px-1.5 text-[10px] font-normal">
                    {activeFilterCount}
                  </Badge>
                )}
              </button>
              {activeFilterCount > 0 && (
                <button
                  className="flex h-full items-center rounded-r-md pr-3 transition-opacity hover:opacity-70"
                  onClick={() => setFilters({})}
                  title="Clear all filters"
                >
                  <span
                    className="bg-muted flex h-4 w-4 items-center justify-center rounded-full border"
                    style={{
                      borderColor: "color-mix(in oklab, var(--ring) 50%, transparent)",
                    }}
                  >
                    <X className="text-primary h-2.5 w-2.5" />
                  </span>
                </button>
              )}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setColumnManagerOpen(true)}
                title="Manage columns"
              >
                <Columns3 className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => setAddTokenOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                Add token
              </Button>
            </div>
          </div>

          {/* Scrollable table area */}
          <div
            ref={scrollRef}
            className="[&::-webkit-scrollbar-thumb]:bg-border min-h-0 flex-1 overflow-auto [&::-webkit-scrollbar]:h-[3px] [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent"
          >
            <table className="min-w-full table-fixed text-sm">
              <thead>
                <tr className="border-b">
                  <th
                    className="bg-muted sticky top-0 z-20 text-center"
                    style={{ width: 40, minWidth: 40, maxWidth: 40 }}
                  >
                    <Checkbox
                      checked={allSelected}
                      data-state={
                        indeterminate ? "indeterminate" : allSelected ? "checked" : "unchecked"
                      }
                      onCheckedChange={toggleAll}
                    />
                  </th>
                  {visibleColumns.map((col, idx) => (
                    <th
                      key={col.id}
                      className={cn(
                        "text-muted-foreground bg-muted sticky top-0 px-4 py-2 text-left text-xs font-medium whitespace-nowrap",
                        idx === 0 && "z-20",
                        idx !== 0 && "z-20"
                      )}
                      style={{ width: COLUMN_WIDTHS[col.id] }}
                    >
                      <button className="hover:text-foreground flex items-center gap-1 transition-colors">
                        {col.label}
                        <ArrowUpDown className="h-3 w-3 opacity-40" />
                      </button>
                    </th>
                  ))}
                  <th className="bg-muted sticky top-0 z-20" style={{ width: 120 }} />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      <td className="w-10 py-2 pr-1 pl-3">
                        <Skeleton className="h-4 w-4 rounded" />
                      </td>
                      {visibleColumns.map((col) => (
                        <td key={col.id} className="px-4 py-2">
                          <Skeleton className="h-4 w-full max-w-[120px]" />
                        </td>
                      ))}
                      <td />
                    </tr>
                  ))
                ) : tokens.length === 0 ? (
                  <tr>
                    <td colSpan={visibleColumns.length + 2}>
                      <EmptyState
                        title={
                          flaggedOnly
                            ? "No flagged tokens"
                            : search
                              ? "No tokens match your search"
                              : "No tokens yet"
                        }
                        description={
                          flaggedOnly
                            ? "Flag tokens to track items that need rework or discussion"
                            : search
                              ? "Try adjusting your filters or search query"
                              : "Add your first token to get started"
                        }
                        action={
                          !flaggedOnly && !search
                            ? { label: "Add token", onClick: () => setAddTokenOpen(true) }
                            : undefined
                        }
                      />
                    </td>
                  </tr>
                ) : groupTree.length > 0 ? (
                  renderGroupNodes(
                    groupTree,
                    tokensByGroupId,
                    selectedIds,
                    toggleGroup,
                    toggleOne,
                    handleDelete,
                    handleFlagToggle,
                    handleRename,
                    setHistoryTokenId,
                    setEditTokenId,
                    setEditGroupId,
                    columns,
                    activeThemeIsBase
                  )
                ) : (
                  flatGrouped.map(([gId, { groupName, path, depth, tokens: groupTokens }]) => (
                    <GroupRow
                      key={gId}
                      groupId={gId}
                      groupName={groupName}
                      groupPath={path}
                      tokenCount={groupTokens.length}
                      depth={depth}
                      selectedCount={groupTokens.filter((t) => selectedIds.has(t._id)).length}
                      onSelectAll={(checked) =>
                        toggleGroup(
                          groupTokens.map((t) => t._id),
                          checked
                        )
                      }
                      onEditOpen={setEditGroupId}
                    >
                      {groupTokens.map((token) => (
                        <TokenRow
                          key={token._id}
                          token={token}
                          selected={selectedIds.has(token._id)}
                          overridden={!activeThemeIsBase && !!token._overridden}
                          overrideDisabled={!activeThemeIsBase && !!token._overrideDisabled}
                          onSelect={toggleOne}
                          onDelete={handleDelete}
                          onFlagToggle={handleFlagToggle}
                          onRename={handleRename}
                          onHistoryOpen={setHistoryTokenId}
                          onEditOpen={setEditTokenId}
                          columns={columns}
                        />
                      ))}
                    </GroupRow>
                  ))
                )}
              </tbody>
            </table>

            <div ref={sentinelRef} className="h-1" />
            {loadingMore && (
              <div className="flex justify-center py-3">
                <div className="border-border border-t-foreground h-5 w-5 animate-spin rounded-full border-2" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <FloatingActionToolbar
        selectedIds={Array.from(selectedIds)}
        selectedTokens={Array.from(selectedIds).map((id) => {
          const t = tokens.find((tk) => tk._id === id);
          return { _id: id, flagged: t?.flagged ?? false };
        })}
        onDeselect={() => setSelectedIds(new Set())}
        onBulkDelete={handleBulkDelete}
        onBulkApplied={() => fetchTokens()}
      />

      <FilterSheet
        open={filterOpen}
        onOpenChange={setFilterOpen}
        filters={filters}
        onFiltersChange={setFilters}
        collectionId={collectionId}
      />
      <ColumnManagerSheet
        open={columnManagerOpen}
        onOpenChange={setColumnManagerOpen}
        columns={columns}
        onColumnsChange={setColumns}
      />
      <AddTokenSheet
        open={addTokenOpen}
        onOpenChange={setAddTokenOpen}
        onTokenAdded={handleTokenAdded}
      />
      {historyTokenId && (
        <VersionHistorySheet
          open={!!historyTokenId}
          onOpenChange={(open) => !open && setHistoryTokenId(null)}
          tokenId={historyTokenId}
          tokenName={tokens.find((t) => t._id === historyTokenId)?.name ?? ""}
        />
      )}

      <EditTokenSheet
        open={!!editTokenId}
        onOpenChange={(open) => !open && setEditTokenId(null)}
        token={tokens.find((t) => t._id === editTokenId) ?? null}
        onSaved={fetchTokens}
        activeThemeId={activeThemeId}
        activeThemeName={activeTheme?.name}
        activeThemeIsBase={activeThemeIsBase}
      />

      <EditGroupSheet
        groupId={editGroupId}
        open={!!editGroupId}
        onOpenChange={(open) => !open && setEditGroupId(null)}
        onSaved={fetchTokens}
      />
    </>
  );
}
