"use client";

import { useState, useEffect } from "react";
import { Loader2, Layers } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { TagCombobox } from "./tag-combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useDistinctTokenValues } from "@/hooks/use-distinct-token-values";
import type { IToken } from "@/types/token";

const POPULAR_COUNT = 5;
const TOKEN_TYPES = ["Color", "Number", "String", "Boolean"] as const;
type TokenType = (typeof TOKEN_TYPES)[number];

const TYPE_COLORS: Record<TokenType, string> = {
  Color:
    "data-[active=true]:bg-blue-500/15 data-[active=true]:text-blue-700 dark:data-[active=true]:text-blue-400 data-[active=true]:border-blue-500/30",
  Number:
    "data-[active=true]:bg-emerald-500/15 data-[active=true]:text-emerald-700 dark:data-[active=true]:text-emerald-400 data-[active=true]:border-emerald-500/30",
  String:
    "data-[active=true]:bg-amber-500/15 data-[active=true]:text-amber-700 dark:data-[active=true]:text-amber-400 data-[active=true]:border-amber-500/30",
  Boolean:
    "data-[active=true]:bg-purple-500/15 data-[active=true]:text-purple-700 dark:data-[active=true]:text-purple-400 data-[active=true]:border-purple-500/30",
};

const isColorValue = (v: string) => /^#|^rgb|^hsl|^oklch/.test(v);

interface Collection {
  _id: string;
  name: string;
}
interface Group {
  _id: string;
  name: string;
  path: string;
  depth: number;
}

// ── Color input with swatch ───────────────────────────────────────────────────

function ColorInput({
  id,
  value,
  onChange,
  placeholder,
  showSwatch,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  showSwatch: boolean;
}) {
  const hasSwatch = showSwatch && isColorValue(value);
  return (
    <div className="relative flex items-center">
      {hasSwatch && (
        <span
          className="border-border/50 absolute left-2.5 h-3.5 w-3.5 shrink-0 rounded-sm border"
          style={{ backgroundColor: value }}
        />
      )}
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn("text-sm", hasSwatch && "pl-8")}
        placeholder={placeholder}
      />
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface EditTokenSheetProps {
  token: IToken | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  activeThemeId?: string;
  activeThemeName?: string;
  activeThemeIsBase?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function EditTokenSheet({
  token,
  open,
  onOpenChange,
  onSaved,
  activeThemeId,
  activeThemeName,
  activeThemeIsBase = true,
}: EditTokenSheetProps) {
  const { labels: allLabels, components: allComponents } = useDistinctTokenValues();

  // Base fields
  const [name, setName] = useState("");
  const [tokenType, setTokenType] = useState<TokenType>("Color");
  const [lightValue, setLightValue] = useState("");
  const [darkValue, setDarkValue] = useState("");
  const [flagged, setFlagged] = useState(false);
  const [labels, setLabels] = useState<string[]>([]);
  const [components, setComponents] = useState<string[]>([]);
  const [collectionId, setCollectionId] = useState("");
  const [groupId, setGroupId] = useState("");

  // Theme override fields (only populated when non-base theme is active)
  const [overrideLight, setOverrideLight] = useState("");
  const [overrideDark, setOverrideDark] = useState("");
  const [hasExistingOverride, setHasExistingOverride] = useState(false);
  const [overrideDisabled, setOverrideDisabled] = useState(false);
  const [loadingOverride, setLoadingOverride] = useState(false);
  const [removingOverride, setRemovingOverride] = useState(false);
  const [togglingOverride, setTogglingOverride] = useState(false);

  const [collections, setCollections] = useState<Collection[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [saving, setSaving] = useState(false);

  const showOverrideSection = !activeThemeIsBase && !!activeThemeId;

  // Populate form when token or open state changes
  useEffect(() => {
    if (!token || !open) return;

    // Always populate non-value fields from token
    setName(token.name);
    setTokenType(token.tokenType as TokenType);
    setFlagged(token.flagged);
    setLabels(token.labels ?? []);
    setComponents(token.associatedComponents ?? []);

    const colId = typeof token.collection === "object" ? token.collection._id : token.collection;
    const grpId = typeof token.group === "object" ? token.group._id : token.group;
    setCollectionId(colId);
    setGroupId(grpId);

    if (!showOverrideSection) {
      // Base theme — use token values directly
      setLightValue(token.lightValue);
      setDarkValue(token.darkValue ?? "");
      return;
    }

    // Non-base theme: base values come from _baseLightValue/_baseDarkValue when the token was
    // fetched with a theme active and an override exists. If those fields are missing (stale
    // data from before this feature was added, or no override exists), fall back to a direct
    // raw-token fetch so we never accidentally display the override value as the base.
    setLoadingOverride(true);

    const resolveBase =
      token._overridden && token._baseLightValue === undefined
        ? fetch(`/api/tokens/${token._id}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((raw) => ({
              lv: raw?.data?.lightValue ?? token.lightValue,
              dv: raw?.data?.darkValue ?? token.darkValue ?? "",
            }))
            .catch(() => ({ lv: token.lightValue, dv: token.darkValue ?? "" }))
        : Promise.resolve({
            lv: token._baseLightValue ?? token.lightValue,
            dv: token._baseDarkValue ?? token.darkValue ?? "",
          });

    const resolveOverride = fetch(`/api/tokens/${token._id}/override?themeId=${activeThemeId}`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);

    Promise.all([resolveBase, resolveOverride])
      .then(([{ lv: baseLv, dv: baseDv }, overrideData]) => {
        setLightValue(baseLv);
        setDarkValue(baseDv);
        if (overrideData?.data) {
          setHasExistingOverride(true);
          setOverrideDisabled(!!overrideData.data.disabled);
          setOverrideLight(overrideData.data.lightValue ?? baseLv);
          setOverrideDark(overrideData.data.darkValue ?? baseDv);
        } else {
          setHasExistingOverride(false);
          setOverrideDisabled(false);
          setOverrideLight(baseLv);
          setOverrideDark(baseDv);
        }
      })
      .catch(() => toast.error("Failed to load override values"))
      .finally(() => setLoadingOverride(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token?._id, open, activeThemeId, showOverrideSection]);

  // Fetch collections once
  useEffect(() => {
    if (!open) return;
    fetch("/api/collections")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setCollections(d.data ?? []))
      .catch(() => {});
  }, [open]);

  // Fetch groups whenever collection changes
  useEffect(() => {
    if (!collectionId) {
      setGroups([]);
      return;
    }
    fetch(`/api/groups?collection=${collectionId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setGroups(d.data ?? []))
      .catch(() => {});
  }, [collectionId]);

  function handleCollectionChange(id: string) {
    setCollectionId(id);
    setGroupId("");
  }

  function toggleLabel(l: string) {
    setLabels((prev) => (prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]));
  }

  function toggleComponent(c: string) {
    setComponents((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  function groupLabel(g: Group) {
    return g.path.split("/").join(" › ");
  }

  async function handleSave() {
    if (!token) return;
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!lightValue.trim()) {
      toast.error("Light value is required");
      return;
    }
    if (!groupId) {
      toast.error("Group is required");
      return;
    }

    setSaving(true);
    try {
      // Always save base token
      const tokenRes = await fetch(`/api/tokens/${token._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          tokenType,
          lightValue: lightValue.trim(),
          darkValue: darkValue.trim() || undefined,
          flagged,
          labels,
          associatedComponents: components,
          collection: collectionId,
          group: groupId,
        }),
      });
      if (!tokenRes.ok) throw new Error("Failed to save token");

      // If non-base theme: upsert the override
      if (showOverrideSection) {
        const overrideRes = await fetch(`/api/tokens/${token._id}/override`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            themeId: activeThemeId,
            lightValue: overrideLight.trim() || undefined,
            darkValue: overrideDark.trim() || undefined,
          }),
        });
        if (!overrideRes.ok) throw new Error("Failed to save override");
        setHasExistingOverride(true);
      }

      toast.success("Token saved");
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save token");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveOverride() {
    if (!token || !activeThemeId) return;
    setRemovingOverride(true);
    try {
      const res = await fetch(`/api/tokens/${token._id}/override?themeId=${activeThemeId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      setHasExistingOverride(false);
      setOverrideDisabled(false);
      setOverrideLight(lightValue);
      setOverrideDark(darkValue);
      toast.success("Override removed");
      onSaved();
    } catch {
      toast.error("Failed to remove override");
    } finally {
      setRemovingOverride(false);
    }
  }

  async function handleToggleOverride() {
    if (!token || !activeThemeId) return;
    setTogglingOverride(true);
    const newDisabled = !overrideDisabled;
    try {
      const res = await fetch(`/api/tokens/${token._id}/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ themeId: activeThemeId, disabled: newDisabled }),
      });
      if (!res.ok) throw new Error();
      setOverrideDisabled(newDisabled);
      toast.success(newDisabled ? "Override deactivated" : "Override activated");
      onSaved();
    } catch {
      toast.error("Failed to update override");
    } finally {
      setTogglingOverride(false);
    }
  }

  const popularLabels = allLabels.slice(0, POPULAR_COUNT);
  const popularComponents = allComponents.slice(0, POPULAR_COUNT);
  const showSwatch = tokenType === "Color";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-[440px] flex-col gap-0 p-0 sm:w-[500px]">
        <SheetHeader className="border-b px-6 py-5">
          <SheetTitle className="text-base">Edit token</SheetTitle>
          {token && <p className="text-muted-foreground truncate text-xs">{token.name}</p>}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {/* ── Identity ─────────────────────────────── */}
          <div className="space-y-4 px-6 py-5">
            <div className="space-y-1.5">
              <Label
                htmlFor="edit-name"
                className="text-muted-foreground text-xs font-semibold tracking-wide uppercase"
              >
                Name
              </Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-sm"
                placeholder="e.g. color/brand/primary"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                Type
              </Label>
              <div className="flex gap-1.5">
                {TOKEN_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    data-active={tokenType === t}
                    onClick={() => setTokenType(t)}
                    className={cn(
                      "flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors",
                      "border-border text-muted-foreground hover:text-foreground hover:bg-muted",
                      TYPE_COLORS[t]
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Separator />

          {/* ── Base Values ───────────────────────────── */}
          <div className="space-y-3 px-6 py-5">
            <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              {showOverrideSection ? "Base values" : "Values"}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-light" className="text-muted-foreground text-xs">
                  Light
                </Label>
                <ColorInput
                  id="edit-light"
                  value={lightValue}
                  onChange={setLightValue}
                  placeholder="#FFFFFF"
                  showSwatch={showSwatch}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-dark" className="text-muted-foreground text-xs">
                  Dark
                </Label>
                <ColorInput
                  id="edit-dark"
                  value={darkValue}
                  onChange={setDarkValue}
                  placeholder="#0A0A0A"
                  showSwatch={showSwatch}
                />
              </div>
            </div>
          </div>

          {/* ── Theme override section ─────────────────── */}
          {showOverrideSection && (
            <>
              <Separator />
              <div className="space-y-3 px-6 py-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="text-muted-foreground h-3.5 w-3.5" />
                    <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                      Override for {activeThemeName ?? "theme"}
                    </p>
                  </div>
                  {hasExistingOverride && (
                    <Badge variant="secondary" className="gap-1.5 px-2 py-0.5 text-[10px]">
                      <span
                        className={cn(
                          "h-2 w-2 shrink-0 rounded-full",
                          overrideDisabled ? "bg-red-500" : "bg-green-500"
                        )}
                      />
                      {overrideDisabled ? "Inactive" : "Active"}
                    </Badge>
                  )}
                </div>

                {loadingOverride ? (
                  <div className="text-muted-foreground flex items-center gap-2 py-2 text-xs">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Loading override values…
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-muted-foreground text-xs">Light override</Label>
                        <ColorInput
                          value={overrideLight}
                          onChange={setOverrideLight}
                          placeholder="#FFFFFF"
                          showSwatch={showSwatch}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-muted-foreground text-xs">Dark override</Label>
                        <ColorInput
                          value={overrideDark}
                          onChange={setOverrideDark}
                          placeholder="#0A0A0A"
                          showSwatch={showSwatch}
                        />
                      </div>
                    </div>
                    {hasExistingOverride && (
                      <div className="flex gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={handleRemoveOverride}
                          disabled={removingOverride || togglingOverride}
                        >
                          {removingOverride && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                          Remove Override
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={handleToggleOverride}
                          disabled={togglingOverride || removingOverride}
                        >
                          {togglingOverride && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                          {overrideDisabled ? "Activate" : "Deactivate"}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          <Separator />

          {/* ── Status & Taxonomy ─────────────────────── */}
          <div className="space-y-5 px-6 py-5">
            {/* Flagged */}
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                Flag Status
              </Label>
              <div className="flex items-center justify-between">
                <Switch checked={flagged} onCheckedChange={setFlagged} />
              </div>
            </div>

            <TagCombobox
              label="Labels"
              options={allLabels}
              popular={popularLabels}
              selected={labels}
              onToggle={toggleLabel}
            />

            <TagCombobox
              label="Components"
              options={allComponents}
              popular={popularComponents}
              selected={components}
              onToggle={toggleComponent}
            />
          </div>

          <Separator />

          {/* ── Location ─────────────────────────────── */}
          <div className="space-y-4 px-6 py-5">
            <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              Location
            </p>

            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Collection</Label>
              <Select value={collectionId} onValueChange={handleCollectionChange}>
                <SelectTrigger className="h-9 w-full text-sm">
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
            </div>

            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Group</Label>
              <Select
                value={groupId}
                onValueChange={setGroupId}
                disabled={!collectionId || groups.length === 0}
              >
                <SelectTrigger className="h-9 w-full text-sm">
                  <SelectValue
                    placeholder={!collectionId ? "Select a collection first…" : "Select group…"}
                  />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {groups.map((g) => (
                    <SelectItem key={g._id} value={g._id}>
                      <span className="flex items-center gap-1">
                        {g.depth > 0 && (
                          <span
                            className="text-muted-foreground text-xs"
                            style={{ paddingLeft: `${(g.depth - 1) * 10}px` }}
                          >
                            └
                          </span>
                        )}
                        <span className="truncate">{groupLabel(g)}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* ── Footer ───────────────────────────────── */}
        <div className="flex gap-2 border-t px-6 py-4">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleSave} disabled={saving || loadingOverride}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
