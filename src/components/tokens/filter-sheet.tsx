"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { X, Check, ChevronsUpDown } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import type { TokenFilters } from "@/types/api";

const POPULAR_COUNT = 5;

interface Group {
  _id: string;
  name: string;
  path: string;
  depth: number;
}

interface FilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: TokenFilters;
  onFiltersChange: (filters: TokenFilters) => void;
  collectionId?: string;
}

const TOKEN_TYPES = ["Color", "Number", "String", "Boolean"];

function MultiSelectCombobox({
  label,
  placeholder,
  options,
  popular,
  selected,
  onToggle,
}: {
  label: string;
  placeholder: string;
  options: string[];
  popular: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rest = useMemo(() => options.filter((o) => !popular.includes(o)), [options, popular]);

  return (
    <div className="space-y-2">
      <Label className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        {label}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-9 w-full justify-between text-sm font-normal"
          >
            {selected.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              <span className="truncate">
                {selected.length === 1 ? selected[0] : `${selected.length} selected`}
              </span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder={`Search ${label.toLowerCase()}…`} />
            <CommandList>
              <CommandEmpty>No {label.toLowerCase()} found.</CommandEmpty>
              {popular.length > 0 && (
                <CommandGroup heading="Popular">
                  {popular.map((opt) => (
                    <CommandItem key={opt} value={opt} onSelect={() => onToggle(opt)}>
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 shrink-0",
                          selected.includes(opt) ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {opt}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {rest.length > 0 && (
                <CommandGroup heading={popular.length > 0 ? "All" : undefined}>
                  {rest.map((opt) => (
                    <CommandItem key={opt} value={opt} onSelect={() => onToggle(opt)}>
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 shrink-0",
                          selected.includes(opt) ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {opt}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map((s) => (
            <Badge key={s} variant="secondary" className="gap-1 text-xs">
              {s}
              <button onClick={() => onToggle(s)}>
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function GroupCombobox({
  groups,
  selected,
  onToggle,
}: {
  groups: Group[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const selectedNames = selected
    .map((id) => groups.find((g) => g._id === id)?.name)
    .filter(Boolean) as string[];

  return (
    <div className="space-y-2">
      <Label className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        Group
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-9 w-full justify-between text-sm font-normal"
          >
            {selected.length === 0 ? (
              <span className="text-muted-foreground">Filter by group…</span>
            ) : (
              <span className="truncate">
                {selected.length === 1 ? selectedNames[0] : `${selected.length} groups`}
              </span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search groups…" />
            <CommandList>
              <CommandEmpty>No groups found.</CommandEmpty>
              <CommandGroup>
                {groups.map((g) => (
                  <CommandItem key={g._id} value={g.name} onSelect={() => onToggle(g._id)}>
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        selected.includes(g._id) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span style={{ paddingLeft: `${g.depth * 12}px` }}>{g.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map((id) => {
            const g = groups.find((gr) => gr._id === id);
            return g ? (
              <Badge key={id} variant="secondary" className="gap-1 text-xs">
                {g.name}
                <button onClick={() => onToggle(id)}>
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}

export function FilterSheet({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
  collectionId,
}: FilterSheetProps) {
  const [local, setLocal] = useState<TokenFilters>(filters);
  const [groups, setGroups] = useState<Group[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [components, setComponents] = useState<string[]>([]);

  useEffect(() => {
    setLocal(filters);
  }, [filters, open]);

  const fetchData = useCallback(async () => {
    const [groupsRes, distinctRes] = await Promise.all([
      collectionId
        ? fetch(`/api/groups?collection=${collectionId}`).then((r) => (r.ok ? r.json() : null))
        : Promise.resolve(null),
      fetch(
        collectionId ? `/api/tokens/distinct?collection=${collectionId}` : "/api/tokens/distinct"
      ).then((r) => (r.ok ? r.json() : null)),
    ]);
    if (groupsRes?.data) setGroups(groupsRes.data);
    if (distinctRes) {
      setLabels(distinctRes.labels ?? []);
      setComponents(distinctRes.components ?? []);
    }
  }, [collectionId]);

  useEffect(() => {
    if (open) fetchData();
  }, [open, fetchData]);

  function toggleType(type: string) {
    setLocal((prev) => {
      const types = prev.tokenTypes ?? [];
      return {
        ...prev,
        tokenTypes: types.includes(type) ? types.filter((t) => t !== type) : [...types, type],
      };
    });
  }

  function toggleGroup(id: string) {
    setLocal((prev) => {
      const ids = prev.groupIds ?? [];
      return { ...prev, groupIds: ids.includes(id) ? ids.filter((g) => g !== id) : [...ids, id] };
    });
  }

  function toggleLabel(label: string) {
    setLocal((prev) => {
      const ls = prev.labels ?? [];
      return {
        ...prev,
        labels: ls.includes(label) ? ls.filter((l) => l !== label) : [...ls, label],
      };
    });
  }

  function toggleComponent(comp: string) {
    setLocal((prev) => {
      const cs = prev.components ?? [];
      return {
        ...prev,
        components: cs.includes(comp) ? cs.filter((c) => c !== comp) : [...cs, comp],
      };
    });
  }

  function clearAll() {
    setLocal({});
    onFiltersChange({});
  }
  function apply() {
    onFiltersChange(local);
    onOpenChange(false);
  }

  // ── Chips ─────────────────────────────────────────────────────────────────

  type ChipKind =
    | "type"
    | "group"
    | "label"
    | "component"
    | "flagged"
    | "modifiedAfter"
    | "modifiedBefore";
  type ChipDef = { kind: ChipKind; value: string; display: string };

  const CHIP_COLORS: Record<ChipKind, string> = {
    type: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-transparent hover:bg-blue-500/20",
    group:
      "bg-violet-500/10 text-violet-700 dark:text-violet-400 border-transparent hover:bg-violet-500/20",
    label:
      "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-transparent hover:bg-amber-500/20",
    component:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-transparent hover:bg-emerald-500/20",
    flagged:
      "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-transparent hover:bg-rose-500/20",
    modifiedAfter:
      "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-transparent hover:bg-slate-500/20",
    modifiedBefore:
      "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-transparent hover:bg-slate-500/20",
  };

  function buildChips(): ChipDef[] {
    const chips: ChipDef[] = [];
    local.tokenTypes?.forEach((t) => chips.push({ kind: "type", value: t, display: t }));
    local.groupIds?.forEach((id) => {
      const g = groups.find((gr) => gr._id === id);
      chips.push({ kind: "group", value: id, display: g?.name ?? id });
    });
    local.labels?.forEach((l) => chips.push({ kind: "label", value: l, display: l }));
    local.components?.forEach((c) => chips.push({ kind: "component", value: c, display: c }));
    if (local.flagged) chips.push({ kind: "flagged", value: "flagged", display: "Flagged" });
    if (local.modifiedAfter)
      chips.push({
        kind: "modifiedAfter",
        value: local.modifiedAfter,
        display: `From ${local.modifiedAfter}`,
      });
    if (local.modifiedBefore)
      chips.push({
        kind: "modifiedBefore",
        value: local.modifiedBefore,
        display: `To ${local.modifiedBefore}`,
      });
    return chips;
  }

  function removeChip(chip: ChipDef) {
    setLocal((prev) => {
      switch (chip.kind) {
        case "type":
          return { ...prev, tokenTypes: prev.tokenTypes?.filter((t) => t !== chip.value) };
        case "group":
          return { ...prev, groupIds: prev.groupIds?.filter((g) => g !== chip.value) };
        case "label":
          return { ...prev, labels: prev.labels?.filter((l) => l !== chip.value) };
        case "component":
          return { ...prev, components: prev.components?.filter((c) => c !== chip.value) };
        case "flagged":
          return { ...prev, flagged: undefined };
        case "modifiedAfter":
          return { ...prev, modifiedAfter: undefined };
        case "modifiedBefore":
          return { ...prev, modifiedBefore: undefined };
        default:
          return prev;
      }
    });
  }

  const chips = buildChips();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-[440px] flex-col gap-0 p-0 sm:w-[500px]">
        <SheetHeader className="border-b px-6 py-5">
          <SheetTitle className="text-base">Filters</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {/* ── Active chips ─────────────────────── */}
          {chips.length > 0 && (
            <div className="space-y-3 px-6 py-4">
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                  Active filters
                </p>
                <button onClick={clearAll} className="text-destructive text-xs hover:underline">
                  Clear all
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {chips.map((chip) => (
                  <Badge
                    key={`${chip.kind}-${chip.value}`}
                    variant="secondary"
                    className={cn("gap-1 text-xs", CHIP_COLORS[chip.kind])}
                  >
                    {chip.display}
                    <button onClick={() => removeChip(chip)}>
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {chips.length > 0 && <Separator />}

          {/* ── Token type ───────────────────────── */}
          <div className="space-y-3 px-6 py-5">
            <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              Token type
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {TOKEN_TYPES.map((type) => (
                <div key={type} className="flex items-center gap-2">
                  <Checkbox
                    id={`type-${type}`}
                    checked={local.tokenTypes?.includes(type) ?? false}
                    onCheckedChange={() => toggleType(type)}
                  />
                  <Label htmlFor={`type-${type}`} className="cursor-pointer text-sm font-normal">
                    {type}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* ── Group ────────────────────────────── */}
          {groups.length > 0 && (
            <>
              <div className="px-6 py-5">
                <GroupCombobox
                  groups={groups}
                  selected={local.groupIds ?? []}
                  onToggle={toggleGroup}
                />
              </div>
              <Separator />
            </>
          )}

          {/* ── Labels ───────────────────────────── */}
          <div className="px-6 py-5">
            <MultiSelectCombobox
              label="Labels"
              placeholder="Filter by label…"
              options={labels}
              popular={labels.slice(0, POPULAR_COUNT)}
              selected={local.labels ?? []}
              onToggle={toggleLabel}
            />
          </div>

          <Separator />

          {/* ── Components ───────────────────────── */}
          <div className="px-6 py-5">
            <MultiSelectCombobox
              label="Components"
              placeholder="Filter by component…"
              options={components}
              popular={components.slice(0, POPULAR_COUNT)}
              selected={local.components ?? []}
              onToggle={toggleComponent}
            />
          </div>

          <Separator />

          {/* ── Flagged ──────────────────────────── */}
          <div className="flex items-center justify-between px-6 py-5">
            <div>
              <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                Flagged only
              </p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                Show only tokens marked for review
              </p>
            </div>
            <Switch
              checked={local.flagged ?? false}
              onCheckedChange={(v) => setLocal((prev) => ({ ...prev, flagged: v || undefined }))}
            />
          </div>

          <Separator />

          {/* ── Date range ───────────────────────── */}
          <div className="space-y-3 px-6 py-5">
            <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              Last modified
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">From</Label>
                <input
                  type="date"
                  className="border-input bg-background w-full rounded-md border px-3 py-1.5 text-sm"
                  value={local.modifiedAfter ?? ""}
                  onChange={(e) =>
                    setLocal((prev) => ({ ...prev, modifiedAfter: e.target.value || undefined }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">To</Label>
                <input
                  type="date"
                  className="border-input bg-background w-full rounded-md border px-3 py-1.5 text-sm"
                  value={local.modifiedBefore ?? ""}
                  onChange={(e) =>
                    setLocal((prev) => ({ ...prev, modifiedBefore: e.target.value || undefined }))
                  }
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ───────────────────────────── */}
        <div className="flex gap-2 border-t px-6 py-4">
          <Button variant="outline" className="flex-1" onClick={clearAll}>
            Reset filters
          </Button>
          <Button className="flex-1" onClick={apply}>
            Apply filters
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
