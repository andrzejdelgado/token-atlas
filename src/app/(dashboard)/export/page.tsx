"use client";

import { useState, useEffect } from "react";
import { Download, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Scope = "all" | "theme" | "collection" | "group";

interface Theme {
  _id: string;
  name: string;
  tokenCount: number;
}
interface Collection {
  _id: string;
  name: string;
  tokenCount: number;
}
interface Group {
  _id: string;
  name: string;
  path: string;
  depth: number;
}

const SCOPE_OPTIONS: { value: Scope; label: string; description: string }[] = [
  { value: "all", label: "All tokens", description: "Export the complete token library" },
  { value: "theme", label: "By theme", description: "Only tokens belonging to a specific theme" },
  {
    value: "collection",
    label: "By collection",
    description: "Only tokens in a specific collection",
  },
  {
    value: "group",
    label: "By group",
    description: "Only tokens in a specific group or sub-group",
  },
];

function ScopeCard({
  option,
  selected,
  tokenCount,
  children,
  onClick,
}: {
  option: (typeof SCOPE_OPTIONS)[number];
  selected: boolean;
  tokenCount?: number;
  children?: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "relative flex cursor-pointer flex-col gap-3 rounded-xl border p-4 transition-colors",
        selected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border hover:border-primary/40 hover:bg-muted/30"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <RadioGroupItem value={option.value} id={option.value} className="mt-0.5 shrink-0" />
          <div>
            <Label htmlFor={option.value} className="cursor-pointer text-sm font-medium">
              {option.label}
            </Label>
            <p className="text-muted-foreground mt-0.5 text-xs">{option.description}</p>
          </div>
        </div>
        {tokenCount !== undefined && (
          <Badge variant="secondary" className="h-5 shrink-0 px-2 text-[10px] font-normal">
            {tokenCount.toLocaleString()} tokens
          </Badge>
        )}
      </div>

      {selected && children && (
        <div className="pl-7" onClick={(e) => e.stopPropagation()}>
          {children}
        </div>
      )}
    </div>
  );
}

export default function ExportPage() {
  const [scope, setScope] = useState<Scope>("all");
  const [scopeId, setScopeId] = useState<string>("");
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const [themes, setThemes] = useState<Theme[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/themes").then((r) => r.json()),
      fetch("/api/collections").then((r) => r.json()),
      fetch("/api/groups").then((r) => r.json()),
    ]).then(([t, c, g]) => {
      setThemes(t.data ?? []);
      setCollections(c.data ?? []);
      setGroups(g.data ?? []);
      setLoading(false);
    });
  }, []);

  function handleScopeChange(v: Scope) {
    setScope(v);
    setScopeId("");
    setDownloaded(false);
  }

  function isReady() {
    if (scope === "all") return true;
    return !!scopeId;
  }

  function getSelectedTokenCount(): number | undefined {
    if (scope === "all") return themes.reduce((s, t) => s + t.tokenCount, 0) || undefined;
    if (scope === "theme") return themes.find((t) => t._id === scopeId)?.tokenCount;
    if (scope === "collection") return collections.find((c) => c._id === scopeId)?.tokenCount;
    return undefined;
  }

  async function handleDownload() {
    if (!isReady()) return;
    setDownloading(true);
    setDownloaded(false);

    const params = new URLSearchParams({ scope });
    if (scope !== "all" && scopeId) params.set("scopeId", scopeId);

    try {
      const res = await fetch(`/api/export?${params}`);
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const date = new Date().toISOString().slice(0, 10);
      a.download =
        scope === "all"
          ? `tokens-${date}.json`
          : `tokens-${scope}-${scopeId || "all"}-${date}.json`;
      a.click();
      URL.revokeObjectURL(url);

      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 3000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setDownloading(false);
    }
  }

  const totalCount = getSelectedTokenCount();

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Export Tokens</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Download your design tokens as a W3C Design Token Format JSON file. Choose a scope to
          narrow the export to a specific theme, collection, or group.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Export scope</p>
          {totalCount !== undefined && (
            <span className="text-muted-foreground text-xs">
              {totalCount.toLocaleString()} tokens selected
            </span>
          )}
        </div>

        <RadioGroup
          value={scope}
          onValueChange={(v: string) => handleScopeChange(v as Scope)}
          className="space-y-2"
        >
          {SCOPE_OPTIONS.map((option) => (
            <ScopeCard
              key={option.value}
              option={option}
              selected={scope === option.value}
              tokenCount={
                option.value === "all"
                  ? collections.reduce((s, c) => s + c.tokenCount, 0) || undefined
                  : undefined
              }
              onClick={() => handleScopeChange(option.value)}
            >
              {option.value === "theme" && (
                <Select value={scopeId} onValueChange={setScopeId} disabled={loading}>
                  <SelectTrigger className="h-8 w-full text-xs">
                    <SelectValue placeholder={loading ? "Loading themes…" : "Select a theme"} />
                  </SelectTrigger>
                  <SelectContent>
                    {themes.map((t) => (
                      <SelectItem key={t._id} value={t._id}>
                        <span className="flex w-full items-center justify-between gap-6">
                          <span>{t.name}</span>
                          <span className="text-muted-foreground text-[10px]">
                            {t.tokenCount} tokens
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {option.value === "collection" && (
                <Select value={scopeId} onValueChange={setScopeId} disabled={loading}>
                  <SelectTrigger className="h-8 w-full text-xs">
                    <SelectValue
                      placeholder={loading ? "Loading collections…" : "Select a collection"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {collections.map((c) => (
                      <SelectItem key={c._id} value={c._id}>
                        <span className="flex w-full items-center justify-between gap-6">
                          <span>{c.name}</span>
                          <span className="text-muted-foreground text-[10px]">
                            {c.tokenCount} tokens
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {option.value === "group" && (
                <Select value={scopeId} onValueChange={setScopeId} disabled={loading}>
                  <SelectTrigger className="h-8 w-full text-xs">
                    <SelectValue placeholder={loading ? "Loading groups…" : "Select a group"} />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {groups.map((g) => (
                      <SelectItem key={g._id} value={g._id}>
                        <span className="text-xs" style={{ paddingLeft: `${g.depth * 12}px` }}>
                          {g.depth > 0 && <span className="text-muted-foreground mr-1">{"└"}</span>}
                          {g.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </ScopeCard>
          ))}
        </RadioGroup>
      </div>

      <Separator />

      <div className="flex items-center justify-between">
        <div className="text-muted-foreground space-y-0.5 text-xs">
          <p>
            Output format:{" "}
            <span className="text-foreground font-medium">W3C Design Token Format</span>
          </p>
          <p>
            File:{" "}
            <span className="text-foreground font-medium">
              {scope === "all"
                ? `tokens-${new Date().toISOString().slice(0, 10)}.json`
                : `tokens-${scope}-${scopeId || "all"}-${new Date().toISOString().slice(0, 10)}.json`}
            </span>
          </p>
        </div>

        <Button
          onClick={handleDownload}
          disabled={!isReady() || downloading}
          size="sm"
          className={cn(
            "min-w-40 transition-all",
            downloaded && "bg-emerald-600 hover:bg-emerald-600"
          )}
        >
          {downloading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Exporting…
            </>
          ) : downloaded ? (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Downloaded
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Download JSON
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
