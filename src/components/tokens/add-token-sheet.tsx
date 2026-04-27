"use client";

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { IToken, ICollection, IGroup, ITheme } from "@/types/token";

const TOKEN_TYPES = ["Color", "Number", "String", "Boolean"] as const;
type TokenType = (typeof TOKEN_TYPES)[number];

const TYPE_COLORS: Record<TokenType, string> = {
  Color:   "data-[active=true]:bg-blue-500/15 data-[active=true]:text-blue-700 dark:data-[active=true]:text-blue-400 data-[active=true]:border-blue-500/30",
  Number:  "data-[active=true]:bg-emerald-500/15 data-[active=true]:text-emerald-700 dark:data-[active=true]:text-emerald-400 data-[active=true]:border-emerald-500/30",
  String:  "data-[active=true]:bg-amber-500/15 data-[active=true]:text-amber-700 dark:data-[active=true]:text-amber-400 data-[active=true]:border-amber-500/30",
  Boolean: "data-[active=true]:bg-purple-500/15 data-[active=true]:text-purple-700 dark:data-[active=true]:text-purple-400 data-[active=true]:border-purple-500/30",
};

const isColorValue = (v: string) => /^#|^rgb|^hsl|^oklch/.test(v);

interface AddTokenSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTokenAdded: (token: IToken & { updatedAt: Date | string }) => void;
}

export function AddTokenSheet({ open, onOpenChange, onTokenAdded }: AddTokenSheetProps) {
  const [name, setName] = useState("");
  const [tokenType, setTokenType] = useState<TokenType>("Color");
  const [collectionId, setCollectionId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [lightValue, setLightValue] = useState("");
  const [darkValue, setDarkValue] = useState("");
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [collections, setCollections] = useState<ICollection[]>([]);
  const [groups, setGroups] = useState<IGroup[]>([]);
  const [themes, setThemes] = useState<ITheme[]>([]);
  const [saving, setSaving] = useState(false);

  // Fetch collections and themes on open
  useEffect(() => {
    if (!open) return;
    Promise.all([
      fetch("/api/collections").then((r) => r.json()),
      fetch("/api/themes").then((r) => r.json()),
    ]).then(([cols, thms]) => {
      setCollections(cols.data ?? []);
      setThemes(thms.data ?? []);
      if (cols.data?.length) setCollectionId(cols.data[0]._id);
    }).catch(() => {});
  }, [open]);

  // Reload groups when collection changes
  useEffect(() => {
    if (!collectionId) { setGroups([]); return; }
    fetch(`/api/groups?collection=${collectionId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.data) { setGroups(d.data); setGroupId(""); } })
      .catch(() => {});
  }, [collectionId]);

  function reset() {
    setName(""); setTokenType("Color"); setLightValue(""); setDarkValue("");
    setGroupId(""); setSelectedThemes([]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !collectionId || !groupId || !lightValue) {
      toast.error("Name, collection, group, and light value are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          tokenType,
          collection: collectionId,
          group: groupId,
          lightValue,
          darkValue: darkValue || lightValue,
          themes: selectedThemes,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create token");
      }
      const { data } = await res.json();
      toast.success(`Token "${name}" created`);
      onTokenAdded(data);
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create token");
    } finally {
      setSaving(false);
    }
  }

  const showSwatch = tokenType === "Color";

  function groupLabel(g: IGroup) {
    return g.path.split("/").join(" › ");
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[440px] sm:w-[500px] flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-5 border-b">
          <SheetTitle className="text-base">Add token</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto">

            {/* ── Identity ─────────────────────────── */}
            <div className="px-6 py-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="add-name" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Name
                </Label>
                <Input
                  id="add-name"
                  placeholder="color/background/primary"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-sm"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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

            {/* ── Values ─────────────────────────── */}
            <div className="px-6 py-5 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Values</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="add-light" className="text-xs text-muted-foreground">Light</Label>
                  <div className="relative flex items-center">
                    {showSwatch && isColorValue(lightValue) && (
                      <span
                        className="absolute left-2.5 h-3.5 w-3.5 rounded-sm border border-border/50 shrink-0"
                        style={{ backgroundColor: lightValue }}
                      />
                    )}
                    <Input
                      id="add-light"
                      placeholder="#FFFFFF"
                      value={lightValue}
                      onChange={(e) => setLightValue(e.target.value)}
                      className={cn("text-sm", showSwatch && isColorValue(lightValue) && "pl-8")}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="add-dark" className="text-xs text-muted-foreground">Dark</Label>
                  <div className="relative flex items-center">
                    {showSwatch && darkValue && isColorValue(darkValue) && (
                      <span
                        className="absolute left-2.5 h-3.5 w-3.5 rounded-sm border border-border/50 shrink-0"
                        style={{ backgroundColor: darkValue }}
                      />
                    )}
                    <Input
                      id="add-dark"
                      placeholder="#0A0A0A"
                      value={darkValue}
                      onChange={(e) => setDarkValue(e.target.value)}
                      className={cn("text-sm", showSwatch && darkValue && isColorValue(darkValue) && "pl-8")}
                    />
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* ── Location ─────────────────────────── */}
            <div className="px-6 py-5 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Location</p>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Collection</Label>
                <Select value={collectionId} onValueChange={setCollectionId}>
                  <SelectTrigger className="w-full h-9 text-sm">
                    <SelectValue placeholder="Select collection…" />
                  </SelectTrigger>
                  <SelectContent>
                    {collections.map((c) => (
                      <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Group</Label>
                <Select
                  value={groupId}
                  onValueChange={setGroupId}
                  disabled={!collectionId || groups.length === 0}
                >
                  <SelectTrigger className="w-full h-9 text-sm">
                    <SelectValue placeholder={!collectionId ? "Select a collection first…" : "Select group…"} />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {groups.map((g) => (
                      <SelectItem key={g._id} value={g._id}>
                        <span className="flex items-center gap-1">
                          {g.depth > 0 && (
                            <span className="text-muted-foreground text-xs" style={{ paddingLeft: `${(g.depth - 1) * 10}px` }}>
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

            {themes.length > 0 && (
              <>
                <Separator />

                {/* ── Themes ─────────────────────────── */}
                <div className="px-6 py-5 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Themes</p>
                  <div className="flex flex-wrap gap-1.5">
                    {themes.map((t) => (
                      <button
                        key={t._id}
                        type="button"
                        onClick={() =>
                          setSelectedThemes((prev) =>
                            prev.includes(t._id)
                              ? prev.filter((id) => id !== t._id)
                              : [...prev, t._id]
                          )
                        }
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs transition-colors",
                          selectedThemes.includes(t._id)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border hover:bg-muted text-muted-foreground"
                        )}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ── Footer ───────────────────────────── */}
          <div className="flex gap-2 px-6 py-4 border-t">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? "Creating…" : "Create token"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
