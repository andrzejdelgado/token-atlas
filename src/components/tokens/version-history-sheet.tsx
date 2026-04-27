"use client";

import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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

const ACTION_LABELS: Record<string, string> = {
  created:       "Created",
  renamed:       "Renamed",
  moved:         "Moved",
  value_changed: "Value changed",
  flagged:       "Flagged",
  unflagged:     "Unflagged",
  labeled:       "Labeled",
  unlabeled:     "Unlabeled",
  theme_added:   "Theme added",
  theme_removed: "Theme removed",
  deleted:       "Deleted",
};

const ACTION_COLORS: Record<string, string> = {
  created:  "text-green-600 dark:text-green-400",
  deleted:  "text-destructive",
  flagged:  "text-amber-600 dark:text-amber-400",
  renamed:  "text-blue-600 dark:text-blue-400",
  default:  "text-muted-foreground",
};

export function VersionHistorySheet({ open, onOpenChange, tokenId, tokenName }: VersionHistorySheetProps) {
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
      <SheetContent className="w-[440px] sm:w-[500px] flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-5 border-b">
          <SheetTitle className="text-base">Version history</SheetTitle>
          <p className="text-xs text-muted-foreground truncate">{tokenName}</p>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-2.5 w-2.5 rounded-full shrink-0 mt-1" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
              ))}
            </div>
          ) : entries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No changes recorded yet</p>
          ) : (
            <div className="relative pl-6 border-l border-border ml-1.5">
              {entries.map((entry, i) => (
                <div key={entry._id} className={cn("relative pb-5", i === entries.length - 1 && "pb-0")}>
                  {/* Timeline dot */}
                  <span className="absolute -left-[25px] top-1 h-2.5 w-2.5 rounded-full border-2 border-background bg-border" />

                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={cn("text-sm font-medium", ACTION_COLORS[entry.action] ?? ACTION_COLORS.default)}>
                        {ACTION_LABELS[entry.action] ?? entry.action}
                      </p>
                      {entry.userId && (
                        <p className="text-xs text-muted-foreground">
                          by {entry.userId.name ?? entry.userId.email}
                        </p>
                      )}
                      {entry.before && entry.after && (
                        <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
                          {Object.keys(entry.after).map((key) =>
                            entry.before?.[key] !== entry.after?.[key] ? (
                              <div key={key}>
                                <span className="text-muted-foreground">{key}: </span>
                                <span className="line-through opacity-50">{String(entry.before?.[key] ?? "—")}</span>
                                {" → "}
                                <span>{String(entry.after?.[key] ?? "—")}</span>
                              </div>
                            ) : null
                          )}
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
