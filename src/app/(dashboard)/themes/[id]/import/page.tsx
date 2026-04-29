"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  ChevronLeft,
  ChevronRight,
  Flag,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Loader2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface FlatToken {
  name: string;
  value: string;
  type: string;
}
interface PreviewResult {
  newOverrides: FlatToken[];
  updatedOverrides: FlatToken[];
  unmatched: FlatToken[];
}

// ── Step indicator ────────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: number }) {
  const steps = ["Upload", "Review", "Summary"];
  return (
    <div className="flex items-center gap-2">
      {steps.map((label, i) => {
        const idx = i + 1;
        const active = idx === step;
        const done = idx < step;
        return (
          <div key={label} className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                done
                  ? "bg-primary text-primary-foreground"
                  : active
                    ? "border-primary text-primary border-2"
                    : "border-border text-muted-foreground border-2"
              )}
            >
              {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : idx}
            </div>
            <span
              className={cn(
                "text-sm",
                active ? "text-foreground font-medium" : "text-muted-foreground"
              )}
            >
              {label}
            </span>
            {i < steps.length - 1 && <div className="bg-border mx-1 h-px w-8" />}
          </div>
        );
      })}
    </div>
  );
}

// ── Token row in review ───────────────────────────────────────────────────────

function TokenReviewRow({
  token,
  kind,
  flagged,
  onToggleFlag,
}: {
  token: FlatToken;
  kind: "new" | "updated" | "unmatched";
  flagged: boolean;
  onToggleFlag: () => void;
}) {
  const kindStyle = {
    new: "text-emerald-700 dark:text-emerald-400 bg-emerald-500/10",
    updated: "text-amber-700 dark:text-amber-400 bg-amber-500/10",
    unmatched: "text-red-700 dark:text-red-400 bg-red-500/10",
  }[kind];

  const kindLabel = { new: "New", updated: "Updated", unmatched: "Unmatched" }[kind];

  const isColor = /^#|^rgb|^hsl|^oklch/.test(token.value);

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2",
        flagged && "bg-amber-50/50 dark:bg-amber-950/20"
      )}
    >
      <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", kindStyle)}>
        {kindLabel}
      </span>
      <span className="text-foreground min-w-0 flex-1 truncate font-mono text-xs">
        {token.name}
      </span>
      <div className="flex shrink-0 items-center gap-1.5">
        {isColor && (
          <span
            className="border-border/50 h-4 w-4 shrink-0 rounded border"
            style={{ backgroundColor: token.value }}
          />
        )}
        <span className="text-muted-foreground text-xs">{token.value}</span>
      </div>
      <button
        onClick={onToggleFlag}
        title={flagged ? "Remove flag" : "Flag this token"}
        className={cn(
          "shrink-0 rounded p-1 transition-colors",
          flagged ? "text-amber-500" : "text-muted-foreground/40 hover:text-amber-400"
        )}
      >
        <Flag className="h-3.5 w-3.5" fill={flagged ? "currentColor" : "none"} />
      </button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ImportOverridesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: themeId } = use(params);
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [themeName, setThemeName] = useState<string>("");
  const [dragging, setDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const [rawTokens, setRawTokens] = useState<object | null>(null);
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [flaggedNames, setFlaggedNames] = useState<Set<string>>(new Set());
  const [importCounts, setImportCounts] = useState<{
    newOverrides: number;
    updatedOverrides: number;
    unmatched: number;
  } | null>(null);

  useEffect(() => {
    fetch(`/api/themes?includeDrafts=true`)
      .then((r) => r.json())
      .then((d) => {
        const theme = d.data?.find((t: { _id: string; name: string }) => t._id === themeId);
        if (theme) setThemeName(theme.name);
      })
      .catch(() => {});
  }, [themeId]);

  async function parseFile(file: File) {
    if (!file.name.endsWith(".json")) {
      toast.error("Only JSON files are supported");
      return;
    }
    setParsing(true);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      setRawTokens(json);
      setFileName(file.name);
    } catch {
      toast.error("Failed to parse JSON file");
    } finally {
      setParsing(false);
    }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  }, []);

  async function goToReview() {
    if (!rawTokens) return;
    setPreviewing(true);
    try {
      const res = await fetch(`/api/themes/${themeId}/import-overrides`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokens: rawTokens, confirm: false }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPreview(data);
      setStep(2);
    } catch {
      toast.error("Failed to preview overrides");
    } finally {
      setPreviewing(false);
    }
  }

  function toggleFlag(name: string) {
    setFlaggedNames((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  async function confirmImport() {
    if (!rawTokens || !preview) return;
    setConfirming(true);
    try {
      const res = await fetch(`/api/themes/${themeId}/import-overrides`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokens: rawTokens,
          confirm: true,
          flaggedNames: Array.from(flaggedNames),
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setImportCounts(data.counts);
      setStep(3);
    } catch {
      toast.error("Failed to import overrides");
    } finally {
      setConfirming(false);
    }
  }

  const [assigningReviewer, setAssigningReviewer] = useState(false);
  const [users, setUsers] = useState<{ _id: string; name?: string; email: string }[]>([]);
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [selectedReviewerId, setSelectedReviewerId] = useState<string>("");
  const [sendingAssignment, setSendingAssignment] = useState(false);

  async function loadUsers() {
    if (users.length > 0) {
      setShowUserPicker(true);
      return;
    }
    setAssigningReviewer(true);
    try {
      const res = await fetch("/api/users");
      const d = await res.json();
      setUsers(d.data ?? []);
      setShowUserPicker(true);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setAssigningReviewer(false);
    }
  }

  async function assignReviewer() {
    if (!selectedReviewerId) return;
    setSendingAssignment(true);
    try {
      const res = await fetch(`/api/themes/${themeId}/assign-reviewer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewerId: selectedReviewerId }),
      });
      if (!res.ok) throw new Error();
      toast.success("Peer reviewer assigned");
      router.push("/themes");
    } catch {
      toast.error("Failed to assign reviewer");
    } finally {
      setSendingAssignment(false);
    }
  }

  const totalTokens = preview
    ? preview.newOverrides.length + preview.updatedOverrides.length + preview.unmatched.length
    : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      {/* Header */}
      <div className="space-y-1">
        <button
          onClick={() => (step === 1 ? router.push("/themes") : setStep(step - 1))}
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          {step === 1 ? "Back to Themes" : "Back"}
        </button>
        <h1 className="text-xl font-semibold">
          Import overrides{themeName ? ` — ${themeName}` : ""}
        </h1>
      </div>

      <StepIndicator step={step} />

      {/* ── Step 1: Upload ── */}
      {step === 1 && (
        <div className="space-y-6">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={cn(
              "border-border rounded-xl border-2 border-dashed p-12 text-center transition-colors",
              dragging ? "border-primary bg-primary/5" : "hover:border-muted-foreground/50"
            )}
          >
            {parsing ? (
              <Loader2 className="text-muted-foreground mx-auto h-8 w-8 animate-spin" />
            ) : rawTokens ? (
              <div className="space-y-2">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
                <p className="text-foreground font-medium">{fileName}</p>
                <button
                  onClick={() => {
                    setRawTokens(null);
                    setFileName("");
                  }}
                  className="text-muted-foreground hover:text-foreground text-xs underline"
                >
                  Remove file
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <Upload className="text-muted-foreground mx-auto h-8 w-8" />
                <div>
                  <p className="text-foreground text-sm font-medium">Drop your JSON file here</p>
                  <p className="text-muted-foreground mt-1 text-xs">W3C Design Token format</p>
                </div>
                <label className="cursor-pointer">
                  <span className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-3 py-1.5 text-sm font-medium transition-colors">
                    Browse file
                  </span>
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) parseFile(f);
                    }}
                  />
                </label>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button size="sm" onClick={goToReview} disabled={!rawTokens || previewing}>
              {previewing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Preview overrides
              <ChevronRight className="ml-1.5 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 2: Review ── */}
      {step === 2 && preview && (
        <div className="space-y-6">
          {/* Summary chips */}
          <div className="flex flex-wrap gap-2">
            <Badge
              variant="outline"
              className="border-emerald-400 text-emerald-700 dark:text-emerald-400"
            >
              {preview.newOverrides.length} new overrides
            </Badge>
            <Badge
              variant="outline"
              className="border-amber-400 text-amber-700 dark:text-amber-400"
            >
              {preview.updatedOverrides.length} updated
            </Badge>
            {preview.unmatched.length > 0 && (
              <Badge variant="outline" className="border-red-400 text-red-700 dark:text-red-400">
                <AlertTriangle className="mr-1 h-3 w-3" />
                {preview.unmatched.length} unmatched
              </Badge>
            )}
            {flaggedNames.size > 0 && (
              <Badge variant="outline" className="border-amber-400 text-amber-600">
                <Flag className="mr-1 h-3 w-3" fill="currentColor" />
                {flaggedNames.size} flagged
              </Badge>
            )}
          </div>

          {/* Unmatched warning */}
          {preview.unmatched.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/30">
              <p className="text-xs font-medium text-red-700 dark:text-red-400">
                {preview.unmatched.length} token{preview.unmatched.length !== 1 ? "s" : ""} not
                found in the base theme. They will be created as new base tokens and flagged across
                all modifier themes. Flag individual tokens below to mark them for extra attention
                during review.
              </p>
            </div>
          )}

          {/* Token list */}
          <div className="border-border divide-border divide-y rounded-lg border">
            {totalTokens === 0 ? (
              <p className="text-muted-foreground py-8 text-center text-sm">
                No overrides detected — all values match the base theme.
              </p>
            ) : (
              <div className="divide-border divide-y">
                {[
                  ...preview.newOverrides.map((t) => ({ token: t, kind: "new" as const })),
                  ...preview.updatedOverrides.map((t) => ({ token: t, kind: "updated" as const })),
                  ...preview.unmatched.map((t) => ({ token: t, kind: "unmatched" as const })),
                ].map(({ token, kind }) => (
                  <TokenReviewRow
                    key={token.name}
                    token={token}
                    kind={kind}
                    flagged={flaggedNames.has(token.name)}
                    onToggleFlag={() => toggleFlag(token.name)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <Button variant="outline" size="sm" onClick={() => setStep(1)}>
              <ChevronLeft className="mr-1.5 h-4 w-4" />
              Back
            </Button>
            <Button size="sm" onClick={confirmImport} disabled={confirming}>
              {confirming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm import
              <ChevronRight className="ml-1.5 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 3: Summary ── */}
      {step === 3 && importCounts && (
        <div className="space-y-6">
          <div className="border-border space-y-2 rounded-xl border p-6 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
            <h2 className="text-foreground text-lg font-semibold">Import complete</h2>
            <p className="text-muted-foreground text-sm">
              {importCounts.newOverrides} new · {importCounts.updatedOverrides} updated ·{" "}
              {importCounts.unmatched} new base token{importCounts.unmatched !== 1 ? "s" : ""}
            </p>
            {flaggedNames.size > 0 && (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                <Flag className="mr-1 inline-block h-3.5 w-3.5" fill="currentColor" />
                {flaggedNames.size} token{flaggedNames.size !== 1 ? "s" : ""} flagged for review
              </p>
            )}
          </div>

          {/* Assign reviewer or accept */}
          {showUserPicker ? (
            <div className="border-border space-y-3 rounded-xl border p-4">
              <p className="text-foreground text-sm font-medium">Assign peer reviewer</p>
              <div className="divide-border max-h-48 divide-y overflow-y-auto rounded-lg border">
                {users.map((u) => (
                  <button
                    key={u._id}
                    onClick={() => setSelectedReviewerId(u._id)}
                    className={cn(
                      "hover:bg-muted/50 flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors",
                      selectedReviewerId === u._id && "bg-muted"
                    )}
                  >
                    <div className="bg-muted flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium">
                      {(u.name ?? u.email)[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-foreground text-sm">{u.name ?? u.email}</p>
                      {u.name && <p className="text-muted-foreground text-xs">{u.email}</p>}
                    </div>
                    {selectedReviewerId === u._id && (
                      <CheckCircle2 className="ml-auto h-4 w-4 text-emerald-500" />
                    )}
                  </button>
                ))}
              </div>
              <div className="flex justify-between">
                <Button variant="outline" size="sm" onClick={() => setShowUserPicker(false)}>
                  <X className="mr-1.5 h-3.5 w-3.5" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={assignReviewer}
                  disabled={!selectedReviewerId || sendingAssignment}
                >
                  {sendingAssignment && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                  Assign reviewer
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex justify-center gap-3">
              <Button variant="outline" size="sm" onClick={() => router.push("/themes")}>
                Accept
              </Button>
              <Button size="sm" onClick={loadUsers} disabled={assigningReviewer}>
                {assigningReviewer && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Assign Peer Review
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
