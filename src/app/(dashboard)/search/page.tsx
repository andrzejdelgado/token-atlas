"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  X,
  Search,
  MinusCircle,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  Trash2,
  BookmarkPlus,
  Clock,
  Bookmark,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { TokenTable } from "@/components/tokens/token-table";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { TokenFilters, ExcludeFilters } from "@/types/api";
import { useDistinctTokenValues } from "@/hooks/use-distinct-token-values";

const POPULAR_COUNT = 5;

// ── Types ──────────────────────────────────────────────────────────────────────

type Field =
  | "name"
  | "value"
  | "type"
  | "collection"
  | "group"
  | "theme"
  | "flagged"
  | "label"
  | "component"
  | "lastModified";

type Operator = "contains" | "equals" | "starts_with" | "is" | "is_not" | "after" | "before";

interface Criterion {
  id: string;
  field: Field;
  operator: Operator;
  value: string;
}

interface SavedQuery {
  _id: string;
  name: string;
  criteria: Criterion[];
  excludeCriteria: Criterion[];
  createdAt: string;
}

interface TableSearchProps {
  searchQuery?: string;
  collectionId?: string;
  groupId?: string;
  themeId?: string;
  initialFlaggedOnly?: boolean;
  initialFilters?: TokenFilters;
  excludeFilters?: ExcludeFilters;
}

interface Collection {
  _id: string;
  name: string;
}
interface Group {
  _id: string;
  name: string;
  depth: number;
}
interface Theme {
  _id: string;
  name: string;
}

// ── Field / operator config ────────────────────────────────────────────────────

const FIELDS: { value: Field; label: string }[] = [
  { value: "name", label: "Name" },
  { value: "value", label: "Value" },
  { value: "type", label: "Type" },
  { value: "collection", label: "Collection" },
  { value: "group", label: "Group" },
  { value: "theme", label: "Theme" },
  { value: "label", label: "Label" },
  { value: "component", label: "Component" },
  { value: "flagged", label: "Flagged" },
  { value: "lastModified", label: "Last modified" },
];

const TOKEN_TYPES = [
  { value: "Color", label: "Color" },
  { value: "Number", label: "Number" },
  { value: "String", label: "String" },
  { value: "Boolean", label: "Boolean" },
];

function getOperators(field: Field): { value: Operator; label: string }[] {
  if (field === "flagged") return [{ value: "is", label: "is flagged" }];
  if (field === "lastModified")
    return [
      { value: "after", label: "after" },
      { value: "before", label: "before" },
    ];
  if (["type", "collection", "group", "theme"].includes(field))
    return [
      { value: "is", label: "is" },
      { value: "is_not", label: "is not" },
    ];
  return [
    { value: "contains", label: "contains" },
    { value: "equals", label: "equals" },
    { value: "starts_with", label: "starts with" },
  ];
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function makeCriterion(field: Field = "name"): Criterion {
  return { id: uid(), field, operator: getOperators(field)[0].value, value: "" };
}

// ── Criterion summary for sidebar / auto-name ─────────────────────────────────

function criterionSummary(
  c: Criterion,
  opts: { collections: Collection[]; groups: Group[]; themes: Theme[] }
): string {
  if (c.field === "flagged") return "Is flagged";
  const fieldLabel = FIELDS.find((f) => f.value === c.field)?.label ?? c.field;
  const opLabel = getOperators(c.field).find((o) => o.value === c.operator)?.label ?? c.operator;
  let val = c.value;
  if (c.field === "collection") val = opts.collections.find((x) => x._id === val)?.name ?? val;
  if (c.field === "group") val = opts.groups.find((x) => x._id === val)?.name ?? val;
  if (c.field === "theme") val = opts.themes.find((x) => x._id === val)?.name ?? val;
  if (c.field === "type") val = TOKEN_TYPES.find((t) => t.value === val)?.label ?? val;
  return val ? `${fieldLabel} ${opLabel} "${val}"` : `${fieldLabel} ${opLabel}`;
}

function autoName(
  criteria: Criterion[],
  excludeCriteria: Criterion[],
  opts: { collections: Collection[]; groups: Group[]; themes: Theme[] }
): string {
  const parts = criteria.map((c) => criterionSummary(c, opts));
  if (excludeCriteria.length)
    parts.push(`Excluding: ${excludeCriteria.map((c) => criterionSummary(c, opts)).join(", ")}`);
  return parts.join(" AND ") || "Untitled query";
}

// ── Criterion row ─────────────────────────────────────────────────────────────

function CriterionRow({
  criterion,
  isFirst,
  isExclude,
  collections,
  groups,
  themes,
  labels,
  components,
  onChange,
  onRemove,
}: {
  criterion: Criterion;
  isFirst: boolean;
  isExclude: boolean;
  collections: Collection[];
  groups: Group[];
  themes: Theme[];
  labels: string[];
  components: string[];
  onChange: (c: Criterion) => void;
  onRemove: () => void;
}) {
  const [suggestionOpen, setSuggestionOpen] = useState(false);
  const operators = getOperators(criterion.field);
  const showOp = criterion.field !== "flagged";
  const showVal = criterion.field !== "flagged";

  function handleFieldChange(field: Field) {
    onChange({ ...criterion, field, operator: getOperators(field)[0].value, value: "" });
  }

  function renderValue() {
    if (!showVal) return <div className="flex-1" />;

    if (criterion.field === "type")
      return (
        <Select value={criterion.value} onValueChange={(v) => onChange({ ...criterion, value: v })}>
          <SelectTrigger className="h-8 min-w-0 flex-1">
            <SelectValue placeholder="Select type…" />
          </SelectTrigger>
          <SelectContent>
            {TOKEN_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    if (criterion.field === "collection")
      return (
        <Select value={criterion.value} onValueChange={(v) => onChange({ ...criterion, value: v })}>
          <SelectTrigger className="h-8 min-w-0 flex-1">
            <SelectValue placeholder="Select collection…" />
          </SelectTrigger>
          <SelectContent>
            {collections.map((c) => (
              <SelectItem key={c._id} value={c._id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    if (criterion.field === "group")
      return (
        <Select value={criterion.value} onValueChange={(v) => onChange({ ...criterion, value: v })}>
          <SelectTrigger className="h-8 min-w-0 flex-1">
            <SelectValue placeholder="Select group…" />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {groups.map((g) => (
              <SelectItem key={g._id} value={g._id}>
                <span className="text-xs" style={{ paddingLeft: `${g.depth * 12}px` }}>
                  {g.depth > 0 && <span className="text-muted-foreground mr-1">└</span>}
                  {g.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    if (criterion.field === "theme")
      return (
        <Select value={criterion.value} onValueChange={(v) => onChange({ ...criterion, value: v })}>
          <SelectTrigger className="h-8 min-w-0 flex-1">
            <SelectValue placeholder="Select theme…" />
          </SelectTrigger>
          <SelectContent>
            {themes.map((t) => (
              <SelectItem key={t._id} value={t._id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    if (criterion.field === "lastModified")
      return (
        <input
          type="date"
          className="border-input bg-background h-9 min-w-0 flex-1 rounded-md border px-3 text-sm"
          value={criterion.value}
          onChange={(e) => onChange({ ...criterion, value: e.target.value })}
        />
      );

    if (criterion.field === "label" || criterion.field === "component") {
      const opts = criterion.field === "label" ? labels : components;
      const popular = opts.slice(0, POPULAR_COUNT);
      const rest = opts.filter((o) => !popular.includes(o));
      return (
        <Popover open={suggestionOpen} onOpenChange={setSuggestionOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              role="combobox"
              className="h-8 min-w-0 flex-1 justify-between text-sm font-normal"
            >
              {criterion.value ? (
                <span className="truncate">{criterion.value}</span>
              ) : (
                <span className="text-muted-foreground">
                  {criterion.field === "label" ? "e.g. deprecated" : "e.g. Button"}
                </span>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
            <Command>
              <CommandInput
                placeholder={`Search ${criterion.field === "label" ? "labels" : "components"}…`}
                value={criterion.value}
                onValueChange={(v) => onChange({ ...criterion, value: v })}
              />
              <CommandList>
                <CommandEmpty>
                  <button
                    className="hover:bg-muted w-full px-4 py-2 text-left text-sm"
                    onClick={() => {
                      setSuggestionOpen(false);
                    }}
                  >
                    Use "{criterion.value}"
                  </button>
                </CommandEmpty>
                {popular.length > 0 && (
                  <CommandGroup heading="Popular">
                    {popular.map((o) => (
                      <CommandItem
                        key={o}
                        value={o}
                        onSelect={() => {
                          onChange({ ...criterion, value: o });
                          setSuggestionOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4 shrink-0",
                            criterion.value === o ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {o}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                {rest.length > 0 && (
                  <CommandGroup heading={popular.length > 0 ? "All" : undefined}>
                    {rest.map((o) => (
                      <CommandItem
                        key={o}
                        value={o}
                        onSelect={() => {
                          onChange({ ...criterion, value: o });
                          setSuggestionOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4 shrink-0",
                            criterion.value === o ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {o}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      );
    }

    return (
      <Input
        className="h-9 min-w-0 flex-1"
        placeholder={
          criterion.field === "name"
            ? "e.g. button-primary"
            : criterion.field === "value"
              ? "e.g. #0066cc"
              : "e.g. value"
        }
        value={criterion.value}
        onChange={(e) => onChange({ ...criterion, value: e.target.value })}
      />
    );
  }

  return (
    <div className="flex items-center gap-2">
      {/* AND / empty slot */}
      <div className="flex w-12 shrink-0 justify-center">
        {!isFirst && !isExclude && (
          <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
            AND
          </Badge>
        )}
      </div>

      {/* Field */}
      <Select value={criterion.field} onValueChange={(v) => handleFieldChange(v as Field)}>
        <SelectTrigger className="h-8 w-36 shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FIELDS.map((f) => (
            <SelectItem key={f.value} value={f.value}>
              {f.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Operator */}
      {showOp ? (
        <Select
          value={criterion.operator}
          onValueChange={(v) => onChange({ ...criterion, operator: v as Operator })}
        >
          <SelectTrigger className="h-8 w-28 shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {operators.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <span className="text-muted-foreground flex h-9 w-28 shrink-0 items-center px-3 text-sm">
          {operators[0].label}
        </span>
      )}

      {/* Value */}
      {renderValue()}

      {/* Remove */}
      <button
        onClick={onRemove}
        className="text-muted-foreground hover:text-foreground hover:bg-muted shrink-0 rounded p-1.5 transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ── Save query dialog ─────────────────────────────────────────────────────────

function SaveQueryDialog({
  criteria,
  excludeCriteria,
  collections,
  groups,
  themes,
  onSaved,
  onClose,
}: {
  criteria: Criterion[];
  excludeCriteria: Criterion[];
  collections: Collection[];
  groups: Group[];
  themes: Theme[];
  onSaved: (q: SavedQuery) => void;
  onClose: () => void;
}) {
  const opts = { collections, groups, themes };
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/search/queries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), criteria, excludeCriteria }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to save");
      toast.success("Query saved");
      onSaved(json.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save query");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-background w-96 space-y-4 rounded-xl border p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h2 className="text-base font-semibold">Save query</h2>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Name this query so you can reuse it later.
          </p>
        </div>

        <div className="space-y-1.5">
          <Input
            autoFocus
            placeholder="Query name…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") onClose();
            }}
          />
          <button
            onClick={() => setName(autoName(criteria, excludeCriteria, opts))}
            className="text-primary text-xs underline-offset-2 hover:underline"
          >
            Auto-generate name
          </button>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!name.trim() || saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Queries sidebar ────────────────────────────────────────────────────────────

function QueriesSidebar({
  savedQueries,
  recentQueries,
  collections,
  groups,
  themes,
  onLoadQuery,
  onDeleteSaved,
}: {
  savedQueries: SavedQuery[];
  recentQueries: { criteria: Criterion[]; excludeCriteria: Criterion[]; timestamp: string }[];
  collections: Collection[];
  groups: Group[];
  themes: Theme[];
  onLoadQuery: (criteria: Criterion[], excludeCriteria: Criterion[]) => void;
  onDeleteSaved: (id: string) => void;
}) {
  const [tab, setTab] = useState<"recent" | "saved">("recent");
  const opts = { collections, groups, themes };

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border">
      {/* Tabs */}
      <div className="flex shrink-0 border-b">
        {(["recent", "saved"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 py-3.5 text-sm font-medium capitalize transition-colors",
              tab === t
                ? "text-foreground border-primary -mb-px border-b-2"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t === "recent" ? (
              <span className="flex items-center justify-center gap-1.5">
                <Clock className="h-3 w-3" />
                Recent
              </span>
            ) : (
              <span className="flex items-center justify-center gap-1.5">
                <Bookmark className="h-3 w-3" />
                Saved
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 divide-y overflow-auto">
        {tab === "recent" &&
          (recentQueries.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-3 py-8 text-center">
              <Clock className="text-muted-foreground/30 h-5 w-5" />
              <p className="text-muted-foreground text-xs">No recent searches yet</p>
            </div>
          ) : (
            recentQueries.map((q, qi) => (
              <button
                key={qi}
                onClick={() => onLoadQuery(q.criteria, q.excludeCriteria)}
                className="hover:bg-muted/50 w-full space-y-1 px-3 py-3 text-left transition-colors"
              >
                {q.criteria.map((c, i) => (
                  <div key={c.id} className="flex items-start gap-1.5">
                    {i > 0 && (
                      <Badge variant="outline" className="mt-0.5 h-4 shrink-0 px-1 text-[9px]">
                        AND
                      </Badge>
                    )}
                    <p className="text-muted-foreground text-[11px] leading-snug break-all">
                      {criterionSummary(c, opts)}
                    </p>
                  </div>
                ))}
                {q.excludeCriteria.length > 0 && (
                  <p className="text-muted-foreground/60 pl-1 text-[10px] italic">
                    + {q.excludeCriteria.length} exclusion{q.excludeCriteria.length > 1 ? "s" : ""}
                  </p>
                )}
              </button>
            ))
          ))}

        {tab === "saved" &&
          (savedQueries.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-3 py-8 text-center">
              <Bookmark className="text-muted-foreground/30 h-5 w-5" />
              <p className="text-muted-foreground text-xs">No saved queries</p>
              <p className="text-muted-foreground/60 text-[11px]">
                Save a query to reuse it across sessions
              </p>
            </div>
          ) : (
            savedQueries.map((q) => (
              <div key={q._id} className="hover:bg-muted/50 group px-3 py-3 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <button
                    onClick={() => onLoadQuery(q.criteria, q.excludeCriteria)}
                    className="min-w-0 flex-1 space-y-1 text-left"
                  >
                    <p className="truncate text-xs font-medium">{q.name}</p>
                    {q.criteria.slice(0, 2).map((c, i) => (
                      <p
                        key={i}
                        className="text-muted-foreground truncate text-[11px] leading-snug"
                      >
                        {i > 0 && "AND "}
                        {criterionSummary(c, opts)}
                      </p>
                    ))}
                    {q.criteria.length > 2 && (
                      <p className="text-muted-foreground/60 text-[10px]">
                        +{q.criteria.length - 2} more
                      </p>
                    )}
                  </button>
                  <button
                    onClick={() => onDeleteSaved(q._id)}
                    className="text-muted-foreground hover:text-destructive hover:bg-muted shrink-0 rounded p-1 opacity-0 transition-all group-hover:opacity-100"
                    title="Delete query"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          ))}
      </div>
    </div>
  );
}

// ── Criteria → TokenTable props ───────────────────────────────────────────────

function buildTableProps(criteria: Criterion[], excludeCriteria: Criterion[]): TableSearchProps {
  let searchQuery: string | undefined;
  let collectionId: string | undefined;
  let groupId: string | undefined;
  let themeId: string | undefined;
  let initialFlaggedOnly = false;
  const initialFilters: TokenFilters = {};
  const excludeFilters: ExcludeFilters = {};

  for (const c of criteria) {
    if (!c.value && c.field !== "flagged") continue;
    switch (c.field) {
      case "name":
      case "value":
        searchQuery = c.value;
        break;
      case "type":
        if (c.operator === "is")
          initialFilters.tokenTypes = [...(initialFilters.tokenTypes ?? []), c.value];
        else if (c.operator === "is_not")
          excludeFilters.tokenTypes = [...(excludeFilters.tokenTypes ?? []), c.value];
        break;
      case "collection":
        if (c.operator === "is") collectionId = c.value;
        else if (c.operator === "is_not") excludeFilters.collectionId = c.value;
        break;
      case "group":
        if (c.operator === "is") groupId = c.value;
        else if (c.operator === "is_not") excludeFilters.groupId = c.value;
        break;
      case "theme":
        if (c.operator === "is") themeId = c.value;
        else if (c.operator === "is_not") excludeFilters.themeId = c.value;
        break;
      case "flagged":
        initialFlaggedOnly = true;
        break;
      case "label":
        initialFilters.labels = [...(initialFilters.labels ?? []), c.value];
        break;
      case "component":
        initialFilters.components = [...(initialFilters.components ?? []), c.value];
        break;
      case "lastModified":
        if (c.operator === "after") initialFilters.modifiedAfter = c.value;
        else if (c.operator === "before") initialFilters.modifiedBefore = c.value;
        break;
    }
  }

  for (const c of excludeCriteria) {
    if (!c.value && c.field !== "flagged") continue;
    switch (c.field) {
      case "name":
      case "value":
        excludeFilters.search = c.value;
        break;
      case "type":
        excludeFilters.tokenTypes = [...(excludeFilters.tokenTypes ?? []), c.value];
        break;
      case "collection":
        excludeFilters.collectionId = c.value;
        break;
      case "group":
        excludeFilters.groupId = c.value;
        break;
      case "theme":
        excludeFilters.themeId = c.value;
        break;
      case "flagged":
        excludeFilters.flagged = true;
        break;
      case "label":
        excludeFilters.labels = [...(excludeFilters.labels ?? []), c.value];
        break;
      case "component":
        excludeFilters.components = [...(excludeFilters.components ?? []), c.value];
        break;
    }
  }

  return {
    searchQuery,
    collectionId,
    groupId,
    themeId,
    initialFlaggedOnly,
    initialFilters,
    excludeFilters,
  };
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdvancedSearchPage() {
  const [criteria, setCriteria] = useState<Criterion[]>([makeCriterion("name")]);
  const [excludeCriteria, setExcludeCriteria] = useState<Criterion[]>([]);
  const [showExclude, setShowExclude] = useState(false);
  const [builderCollapsed, setBuilderCollapsed] = useState(false);
  const [tableProps, setTableProps] = useState<TableSearchProps | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [recentQueries, setRecentQueries] = useState<
    { criteria: Criterion[]; excludeCriteria: Criterion[]; timestamp: string }[]
  >([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/themes").then((r) => r.json()),
      fetch("/api/collections").then((r) => r.json()),
      fetch("/api/groups").then((r) => r.json()),
      fetch("/api/search/queries").then((r) => r.json()),
    ]).then(([t, c, g, sq]) => {
      setThemes(t.data ?? []);
      setCollections(c.data ?? []);
      setGroups(g.data ?? []);
      setSavedQueries(sq.data ?? []);
    });
    try {
      const stored = localStorage.getItem("ta_search_recent");
      if (stored) setRecentQueries(JSON.parse(stored));
    } catch {}
  }, []);

  function handleSearch() {
    const props = buildTableProps(criteria, excludeCriteria);
    setTableProps(props);
    setBuilderCollapsed(true);

    const entry = {
      criteria: [...criteria],
      excludeCriteria: [...excludeCriteria],
      timestamp: new Date().toISOString(),
    };
    setRecentQueries((prev) => {
      const next = [entry, ...prev].slice(0, 10);
      try {
        localStorage.setItem("ta_search_recent", JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  function handleClear() {
    setCriteria([makeCriterion("name")]);
    setExcludeCriteria([]);
    setShowExclude(false);
    setTableProps(null);
    setBuilderCollapsed(false);
  }

  function loadQuery(inCriteria: Criterion[], inExclude: Criterion[]) {
    setCriteria(inCriteria.map((c) => ({ ...c, id: uid() })));
    setExcludeCriteria(inExclude.map((c) => ({ ...c, id: uid() })));
    setShowExclude(inExclude.length > 0);
    setTableProps(null);
    setBuilderCollapsed(false);
  }

  async function handleDeleteSaved(id: string) {
    const res = await fetch(`/api/search/queries/${id}`, { method: "DELETE" });
    if (res.ok) setSavedQueries((prev) => prev.filter((q) => q._id !== id));
    else toast.error("Failed to delete query");
  }

  const activeCriteriaCount = criteria.length + excludeCriteria.length;
  const { labels: distinctLabels, components: distinctComponents } = useDistinctTokenValues();
  const sharedOptions = {
    collections,
    groups,
    themes,
    labels: distinctLabels,
    components: distinctComponents,
  };

  return (
    <div className="space-y-6">
      <div className="max-w-4xl space-y-1">
        <Link
          href="/tokens"
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Semantics
        </Link>
        <h1 className="text-xl font-semibold tracking-tight">Build Query</h1>
        <p className="text-muted-foreground text-sm">
          Build queries with multiple criteria to find exactly the tokens you need.
        </p>
      </div>

      <div className="flex items-start gap-5">
        {/* ── Query builder card ── */}
        <div className="bg-card min-w-0 flex-1 rounded-xl border">
          {/* Card header — always visible */}
          <div className="flex items-center justify-between border-b px-5 py-3.5">
            <div className="flex items-center gap-2">
              <Search className="text-muted-foreground h-4 w-4 shrink-0" />
              <span className="text-sm font-medium">Query builder</span>
              {builderCollapsed && tableProps && (
                <span className="text-muted-foreground text-xs">
                  — {activeCriteriaCount} criterion{activeCriteriaCount !== 1 ? "a" : ""} active
                </span>
              )}
            </div>
            {tableProps && (
              <button
                onClick={() => setBuilderCollapsed((v) => !v)}
                className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
              >
                {builderCollapsed ? (
                  <>
                    <ChevronDown className="h-3.5 w-3.5" />
                    Edit search
                  </>
                ) : (
                  <>
                    <ChevronUp className="h-3.5 w-3.5" />
                    Collapse
                  </>
                )}
              </button>
            )}
          </div>

          {/* Collapsible body */}
          {!builderCollapsed && (
            <div className="space-y-3 p-5">
              {/* Column headers */}
              <div className="border-border flex items-center gap-2 border-b pb-2">
                <div className="w-12 shrink-0" />
                <span className="text-muted-foreground w-36 shrink-0 text-xs font-medium">
                  Field
                </span>
                <span className="text-muted-foreground w-28 shrink-0 text-xs font-medium">
                  Operator
                </span>
                <span className="text-muted-foreground flex-1 text-xs font-medium">Value</span>
              </div>

              {/* Include criteria */}
              {criteria.map((c, i) => (
                <CriterionRow
                  key={c.id}
                  criterion={c}
                  isFirst={i === 0}
                  isExclude={false}
                  {...sharedOptions}
                  onChange={(updated) =>
                    setCriteria((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
                  }
                  onRemove={() =>
                    criteria.length > 1 && setCriteria((prev) => prev.filter((r) => r.id !== c.id))
                  }
                />
              ))}

              <div className="pl-14">
                <button
                  onClick={() => setCriteria((prev) => [...prev, makeCriterion("name")])}
                  className="text-primary flex items-center gap-1.5 text-sm underline-offset-2 hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" /> Add criteria
                </button>
              </div>

              {/* Exclude section */}
              {showExclude && (
                <>
                  <div className="relative flex items-center py-1">
                    <div className="ml-12 flex-1 border-t" />
                    <span className="text-muted-foreground bg-card px-3 text-[10px] font-semibold tracking-widest uppercase">
                      Exclude
                    </span>
                    <div className="flex-1 border-t" />
                  </div>

                  {excludeCriteria.map((c, i) => (
                    <CriterionRow
                      key={c.id}
                      criterion={c}
                      isFirst={i === 0}
                      isExclude={true}
                      {...sharedOptions}
                      onChange={(updated) =>
                        setExcludeCriteria((prev) =>
                          prev.map((r) => (r.id === updated.id ? updated : r))
                        )
                      }
                      onRemove={() => {
                        if (excludeCriteria.length === 1) {
                          setExcludeCriteria([]);
                          setShowExclude(false);
                        } else setExcludeCriteria((prev) => prev.filter((r) => r.id !== c.id));
                      }}
                    />
                  ))}

                  <div className="pl-14">
                    <button
                      onClick={() => setExcludeCriteria((prev) => [...prev, makeCriterion("type")])}
                      className="text-primary flex items-center gap-1.5 text-sm underline-offset-2 hover:underline"
                    >
                      <Plus className="h-3.5 w-3.5" /> Exclude more
                    </button>
                  </div>
                </>
              )}

              {!showExclude && (
                <div className="pl-14">
                  <button
                    onClick={() => {
                      setShowExclude(true);
                      setExcludeCriteria([makeCriterion("type")]);
                    }}
                    className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm transition-colors"
                  >
                    <MinusCircle className="h-3.5 w-3.5" /> Add exclusion
                  </button>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between border-t pt-4">
                <button
                  onClick={handleClear}
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  Clear
                </button>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSaveDialog(true)}
                    className="gap-1.5"
                  >
                    <BookmarkPlus className="h-3.5 w-3.5" /> Save query
                  </Button>
                  <Button size="sm" onClick={handleSearch} className="gap-1.5">
                    <Search className="h-3.5 w-3.5" /> Search
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Queries sidebar ── */}
        <div className="w-96 shrink-0">
          <QueriesSidebar
            savedQueries={savedQueries}
            recentQueries={recentQueries}
            {...sharedOptions}
            onLoadQuery={loadQuery}
            onDeleteSaved={handleDeleteSaved}
          />
        </div>
      </div>

      {/* ── Results ── */}
      {tableProps && (
        <div className="max-w-4xl space-y-4">
          <Separator />
          <TokenTable
            searchQuery={tableProps.searchQuery}
            collectionId={tableProps.collectionId}
            groupId={tableProps.groupId}
            initialThemeId={tableProps.themeId}
            initialFlaggedOnly={tableProps.initialFlaggedOnly}
            initialFilters={tableProps.initialFilters}
            excludeFilters={tableProps.excludeFilters}
          />
        </div>
      )}

      {/* ── Save query dialog ── */}
      {showSaveDialog && (
        <SaveQueryDialog
          criteria={criteria}
          excludeCriteria={excludeCriteria}
          {...sharedOptions}
          onSaved={(q) => {
            setSavedQueries((prev) => [q, ...prev]);
            setShowSaveDialog(false);
          }}
          onClose={() => setShowSaveDialog(false)}
        />
      )}
    </div>
  );
}
