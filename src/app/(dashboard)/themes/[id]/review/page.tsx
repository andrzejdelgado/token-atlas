"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ChevronLeft, Flag, CheckCircle2, Loader2, RotateCcw, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FlagCell } from "@/components/tokens/flag-cell";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Theme {
  _id: string;
  name: string;
  status: "draft" | "approved";
  reviewerId?: string;
  approvedBy?: { _id: string; name?: string; email: string } | string;
  approvedAt?: string;
  modificationCount: number;
}

interface Override {
  _id: string;
  token: {
    _id: string;
    name: string;
    tokenType: string;
    lightValue: string;
    darkValue?: string;
    flagged: boolean;
  };
  lightValue?: string;
  darkValue?: string;
  disabled?: boolean;
}

const isColor = (v?: string) => !!v && /^#|^rgb|^hsl|^oklch/.test(v);

function Swatch({ value }: { value?: string }) {
  if (!value || !isColor(value)) return null;
  return (
    <span
      className="border-border/50 inline-block h-4 w-4 shrink-0 rounded border align-middle"
      style={{ backgroundColor: value }}
    />
  );
}

export default function ThemeReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: themeId } = use(params);
  const router = useRouter();
  const { data: session } = useSession();

  const [theme, setTheme] = useState<Theme | null>(null);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [loading, setLoading] = useState(true);
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [approving, setApproving] = useState(false);
  const [reverting, setReverting] = useState(false);

  const [users, setUsers] = useState<{ _id: string; name?: string; email: string }[]>([]);
  const [showAssign, setShowAssign] = useState(false);
  const [selectedReviewerId, setSelectedReviewerId] = useState("");
  const [assigning, setAssigning] = useState(false);

  const isAdmin = (session?.user as { role?: string } | undefined)?.role === "admin";
  const isDraft = theme?.status === "draft";

  useEffect(() => {
    async function load() {
      try {
        const [themesRes, overridesRes] = await Promise.all([
          fetch(`/api/themes?includeDrafts=true`),
          fetch(`/api/themes/${themeId}/overrides`),
        ]);
        const themesData = await themesRes.json();
        const t = themesData.data?.find((x: Theme) => x._id === themeId);
        if (t) setTheme(t);

        if (overridesRes.ok) {
          const d = await overridesRes.json();
          setOverrides(d.data ?? []);
        }
      } catch {
        toast.error("Failed to load review data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [themeId]);

  async function handleApprove() {
    setApproving(true);
    try {
      const res = await fetch(`/api/themes/${themeId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revert: false }),
      });
      if (!res.ok) throw new Error();
      const { data } = await res.json();
      setTheme((prev) =>
        prev
          ? {
              ...prev,
              status: "approved",
              approvedAt: data.approvedAt,
              approvedBy: data.approvedBy,
            }
          : prev
      );
      toast.success("Theme approved — it will now appear in All Semantics");
    } catch {
      toast.error("Failed to approve theme");
    } finally {
      setApproving(false);
    }
  }

  async function handleRevert() {
    setReverting(true);
    try {
      const res = await fetch(`/api/themes/${themeId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revert: true }),
      });
      if (!res.ok) throw new Error();
      setTheme((prev) =>
        prev ? { ...prev, status: "draft", approvedBy: undefined, approvedAt: undefined } : prev
      );
      toast.success("Theme reverted to Draft");
    } catch {
      toast.error("Failed to revert theme");
    } finally {
      setReverting(false);
    }
  }

  async function loadUsersAndShowAssign() {
    if (users.length === 0) {
      try {
        const res = await fetch("/api/users");
        const d = await res.json();
        setUsers(d.data ?? []);
      } catch {
        toast.error("Failed to load users");
        return;
      }
    }
    setShowAssign(true);
  }

  async function assignReviewer() {
    if (!selectedReviewerId) return;
    setAssigning(true);
    try {
      const res = await fetch(`/api/themes/${themeId}/assign-reviewer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewerId: selectedReviewerId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Failed to assign reviewer");
      toast.success("Peer reviewer assigned");
      setShowAssign(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to assign reviewer");
    } finally {
      setAssigning(false);
    }
  }

  const visible = flaggedOnly ? overrides.filter((o) => o.token.flagged) : overrides;
  const flaggedCount = overrides.filter((o) => o.token.flagged).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <button
            onClick={() => router.push("/themes")}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Themes
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">{theme?.name ?? "Theme"} — Review</h1>
            {theme && (
              <Badge
                variant={isDraft ? "outline" : "secondary"}
                className={cn(
                  "text-[11px]",
                  isDraft && !theme.reviewerId
                    ? "border-amber-400 text-amber-600 dark:text-amber-400"
                    : isDraft && theme.reviewerId
                      ? "border-blue-400 text-blue-600 dark:text-blue-400"
                      : "text-emerald-700 dark:text-emerald-400"
                )}
              >
                {isDraft ? (theme.reviewerId ? "In Review" : "Draft") : "Approved"}
              </Badge>
            )}
          </div>
          {!isDraft && theme?.approvedAt && (
            <p className="text-muted-foreground flex items-center gap-1 text-xs">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              Approved {new Date(theme.approvedAt).toLocaleDateString()}
              {typeof theme.approvedBy === "object" && theme.approvedBy?.name
                ? ` by ${theme.approvedBy.name}`
                : ""}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadUsersAndShowAssign}>
            <Users className="mr-1.5 h-3.5 w-3.5" />
            Assign reviewer
          </Button>
          {isAdmin && isDraft && (
            <Button size="sm" onClick={handleApprove} disabled={approving}>
              {approving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
              Approve theme
            </Button>
          )}
          {isAdmin && !isDraft && (
            <Button variant="outline" size="sm" onClick={handleRevert} disabled={reverting}>
              {reverting && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Revert to Draft
            </Button>
          )}
        </div>
      </div>

      {/* Assign reviewer panel */}
      {showAssign && (
        <div className="border-border space-y-3 rounded-xl border p-4">
          <p className="text-foreground text-sm font-medium">Assign peer reviewer</p>
          <div className="divide-border max-h-48 divide-y overflow-y-auto rounded-lg border">
            {users.map((u) => (
              <button
                key={u._id}
                onClick={() => setSelectedReviewerId(u._id)}
                className={cn(
                  "hover:bg-muted/50 flex w-full items-center gap-3 px-3 py-2 text-left transition-colors",
                  selectedReviewerId === u._id && "bg-muted"
                )}
              >
                <div className="bg-muted flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium">
                  {(u.name ?? u.email)[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-foreground text-sm">{u.name ?? u.email}</p>
                  {u.name && <p className="text-muted-foreground truncate text-xs">{u.email}</p>}
                </div>
                {selectedReviewerId === u._id && (
                  <CheckCircle2 className="ml-auto h-4 w-4 text-emerald-500" />
                )}
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowAssign(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={assignReviewer} disabled={!selectedReviewerId || assigning}>
              {assigning && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              Assign
            </Button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <span className="text-muted-foreground text-sm">{overrides.length} overrides</span>
        {flaggedCount > 0 && (
          <button
            onClick={() => setFlaggedOnly(!flaggedOnly)}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors",
              flaggedOnly
                ? "border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                : "border-border text-muted-foreground hover:border-amber-400"
            )}
          >
            <Flag className="h-3 w-3" fill={flaggedOnly ? "currentColor" : "none"} />
            {flaggedCount} flagged
          </button>
        )}
      </div>

      {/* Review table */}
      <div className="border-border rounded-xl border">
        {/* Header */}
        <div className="bg-muted/40 text-muted-foreground grid grid-cols-[1fr_1fr_1fr_auto] gap-4 rounded-t-xl border-b px-4 py-2.5 text-xs font-medium">
          <span>Token</span>
          <span>Base value</span>
          <span>Override value</span>
          <span>Flag</span>
        </div>

        {visible.length === 0 ? (
          <p className="text-muted-foreground py-12 text-center text-sm">
            {flaggedOnly ? "No flagged tokens" : "No overrides in this theme yet"}
          </p>
        ) : (
          <div className="divide-border divide-y">
            {visible.map((override) => {
              const t = override.token;
              return (
                <div
                  key={override._id}
                  className={cn(
                    "group/row grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-4 px-4 py-3",
                    t.flagged && "bg-amber-50/40 dark:bg-amber-950/10"
                  )}
                >
                  {/* Token name */}
                  <div className="min-w-0">
                    <p className="text-foreground truncate text-xs font-medium" title={t.name}>
                      {t.name}
                    </p>
                    <p className="text-muted-foreground text-[10px]">{t.tokenType}</p>
                  </div>

                  {/* Base values */}
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <Swatch value={t.lightValue} />
                      <span className="text-muted-foreground truncate text-xs">{t.lightValue}</span>
                    </div>
                    {t.darkValue && (
                      <div className="flex items-center gap-1.5">
                        <Swatch value={t.darkValue} />
                        <span className="text-muted-foreground truncate text-xs">
                          {t.darkValue}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Override values */}
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <Swatch value={override.lightValue} />
                      <span
                        className={cn(
                          "truncate text-xs",
                          override.lightValue !== t.lightValue
                            ? "font-medium text-blue-600 dark:text-blue-400"
                            : "text-muted-foreground"
                        )}
                      >
                        {override.lightValue ?? "—"}
                      </span>
                    </div>
                    {(override.darkValue ?? t.darkValue) && (
                      <div className="flex items-center gap-1.5">
                        <Swatch value={override.darkValue} />
                        <span
                          className={cn(
                            "truncate text-xs",
                            override.darkValue !== t.darkValue
                              ? "font-medium text-blue-600 dark:text-blue-400"
                              : "text-muted-foreground"
                          )}
                        >
                          {override.darkValue ?? "—"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Flag */}
                  <FlagCell
                    flagged={t.flagged}
                    tokenId={t._id}
                    onToggle={(id, flagged) => {
                      setOverrides((prev) =>
                        prev.map((o) =>
                          o.token._id === id ? { ...o, token: { ...o.token, flagged } } : o
                        )
                      );
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
