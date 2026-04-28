"use client";

import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { TimestampCell } from "@/components/common/timestamp-cell";
import { cn } from "@/lib/utils";

interface AuditEntry {
  _id: string;
  action: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  timestamp: string;
  userId?: {
    name?: string;
    email?: string;
  };
}

interface VersionHistorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tokenId: string;
  tokenName: string;
}

const MEANINGFUL_FIELDS = new Set([
  "name",
  "lightValue",
  "darkValue",
  "tokenType",
  "labels",
  "associatedComponents",
  "flagged",
  "group",
  "collection",
]);

const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  lightValue: "Light value",
  darkValue: "Dark value",
  tokenType: "Type",
  labels: "Labels",
  associatedComponents: "Components",
  flagged: "Flagged",
  group: "Group",
  collection: "Collection",
};

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (Array.isArray(val)) return val.length ? val.join(", ") : "—";
  if (typeof val === "object") {
    const obj = val as Record<string, unknown>;
    return String(obj.name ?? obj._id ?? "—");
  }
  if (typeof val === "boolean") return val ? "Yes" : "No";
  return String(val);
}

const ACTION_LABELS: Record<string, string> = {
  created: "Created",
  renamed: "Renamed",
  moved: "Moved",
  value_changed: "Value changed",
  flagged: "Flagged",
  unflagged: "Unflagged",
  labeled: "Labeled",
  unlabeled: "Unlabeled",
  theme_added: "Theme added",
  theme_removed: "Theme removed",
  deleted: "Deleted",
};

const ACTION_COLORS: Record<string, string> = {
  created: "text-green-600 dark:text-green-400",
  deleted: "text-destructive",
  flagged: "text-amber-600 dark:text-amber-400",
  renamed: "text-blue-600 dark:text-blue-400",
  default: "text-muted-foreground",
};

export function VersionHistorySheet({
  open,
  onOpenChange,
  tokenId,
  tokenName,
}: VersionHistorySheetProps) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/tokens/${tokenId}/history`)
      .then((res) => res.json())
      .then((data) => setEntries(data.data ?? []))
      .finally(() => setLoading(false));
  }, [open, tokenId]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-[440px] flex-col gap-0 p-0 sm:w-[500px]">
        <SheetHeader className="border-b px-6 py-5">
          <SheetTitle className="text-base">Version history</SheetTitle>
          <p className="text-muted-foreground truncate text-xs">{tokenName}</p>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
              ))}
            </div>
          ) : entries.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              No changes recorded yet
            </p>
          ) : (
            <div className="border-border relative ml-1.5 border-l pl-6">
              {entries.map((entry, i) => (
                <div
                  key={entry._id}
                  className={cn("relative pb-5", i === entries.length - 1 && "pb-0")}
                >
                  {/* Timeline dot */}
                  <span className="border-background bg-border absolute top-1 -left-[25px] h-2.5 w-2.5 rounded-full border-2" />

                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p
                        className={cn(
                          "text-sm font-medium",
                          ACTION_COLORS[entry.action] ?? ACTION_COLORS.default
                        )}
                      >
                        {ACTION_LABELS[entry.action] ?? entry.action}
                      </p>
                      {entry.userId && (
                        <p className="text-muted-foreground text-xs">
                          by {entry.userId.name ?? entry.userId.email}
                        </p>
                      )}
                      {entry.before && entry.after && (
                        <div className="text-muted-foreground mt-1 space-y-0.5 text-xs">
                          {Object.keys(entry.after)
                            .filter((key) => MEANINGFUL_FIELDS.has(key))
                            .filter(
                              (key) =>
                                formatValue(entry.before?.[key]) !== formatValue(entry.after?.[key])
                            )
                            .map((key) => (
                              <div key={key}>
                                <span className="text-muted-foreground">
                                  {FIELD_LABELS[key] ?? key}:{" "}
                                </span>
                                <span className="line-through opacity-50">
                                  {formatValue(entry.before?.[key])}
                                </span>
                                {" → "}
                                <span>{formatValue(entry.after?.[key])}</span>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                    <TimestampCell date={entry.timestamp} className="shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
