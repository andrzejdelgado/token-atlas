"use client";

import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { previewBulkRename } from "@/lib/utils/token-names";
import { toast } from "sonner";
import type { BulkRenameOptions, BulkRenamePreview } from "@/types/token";

interface BulkRenameSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
  onApplied: () => void;
}

type AnnotationSegment = {
  text: string;
  style: "unchanged" | "removed" | "added" | "prefix" | "suffix";
};

function applyPattern(
  segments: AnnotationSegment[],
  pattern: string,
  replacement: string | null
): AnnotationSegment[] {
  const result: AnnotationSegment[] = [];
  for (const seg of segments) {
    if (seg.style !== "unchanged" || !seg.text.includes(pattern)) {
      result.push(seg);
      continue;
    }
    const parts = seg.text.split(pattern);
    parts.forEach((part, i) => {
      if (part) result.push({ text: part, style: "unchanged" });
      if (i < parts.length - 1) {
        result.push({ text: pattern, style: "removed" });
        if (replacement) result.push({ text: replacement, style: "added" });
      }
    });
  }
  return result;
}

function buildAnnotatedSegments(
  originalName: string,
  options: BulkRenameOptions
): AnnotationSegment[] {
  const segments: AnnotationSegment[] = [];

  if (options.prefix) segments.push({ text: options.prefix, style: "prefix" });

  let inner: AnnotationSegment[] = [{ text: originalName, style: "unchanged" }];
  if (options.remove) inner = applyPattern(inner, options.remove, null);
  if (options.swap?.find)
    inner = applyPattern(inner, options.swap.find, options.swap.replace || "");
  segments.push(...inner);

  if (options.suffix) segments.push({ text: options.suffix, style: "suffix" });

  return segments;
}

const segmentStyles: Record<AnnotationSegment["style"], string> = {
  prefix: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  suffix: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  added: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  removed: "bg-red-100 text-red-800 line-through dark:bg-red-900/30 dark:text-red-400",
  unchanged: "",
};

function AnnotatedTokenName({
  originalName,
  options,
}: {
  originalName: string;
  options: BulkRenameOptions;
}) {
  const segments = buildAnnotatedSegments(originalName, options);
  return (
    <span className="break-all">
      {segments.map((seg, i) =>
        seg.style === "unchanged" ? (
          <span key={i}>{seg.text}</span>
        ) : (
          <span key={i} className={cn("rounded-sm px-0.5", segmentStyles[seg.style])}>
            {seg.text}
          </span>
        )
      )}
    </span>
  );
}

export function BulkRenameSheet({
  open,
  onOpenChange,
  selectedIds,
  onApplied,
}: BulkRenameSheetProps) {
  const [prefix, setPrefix] = useState("");
  const [suffix, setSuffix] = useState("");
  const [swapFind, setSwapFind] = useState("");
  const [swapReplace, setSwapReplace] = useState("");
  const [remove, setRemove] = useState("");
  const [previews, setPreviews] = useState<BulkRenamePreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);

  const options: BulkRenameOptions = {
    prefix: prefix || undefined,
    suffix: suffix || undefined,
    swap: swapFind ? { find: swapFind, replace: swapReplace } : undefined,
    remove: remove || undefined,
  };

  const hasChanges = !!(prefix || suffix || swapFind || remove);

  useEffect(() => {
    if (!hasChanges || selectedIds.length === 0) {
      setPreviews([]);
      return;
    }
    setLoading(true);
    fetch(`/api/tokens?${selectedIds.map((id) => `id=${id}`).join("&")}`)
      .then((r) => r.json())
      .then((data) => {
        const tokens = (data.data ?? []).map((t: { _id: string; name: string }) => ({
          _id: t._id,
          name: t.name,
        }));
        setPreviews(previewBulkRename(tokens, options));
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefix, suffix, swapFind, swapReplace, remove]);

  async function handleApply() {
    setApplying(true);
    try {
      const res = await fetch("/api/tokens/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rename", tokenIds: selectedIds, payload: options }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Renamed ${selectedIds.length} token(s)`);
      onApplied();
    } catch {
      toast.error("Failed to rename tokens");
    } finally {
      setApplying(false);
    }
  }

  function reset() {
    setPrefix("");
    setSuffix("");
    setSwapFind("");
    setSwapReplace("");
    setRemove("");
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-[440px] flex-col gap-0 p-0 sm:w-[500px]">
        <SheetHeader className="border-b px-6 py-5">
          <SheetTitle className="text-base">Bulk rename</SheetTitle>
          <p className="text-muted-foreground text-xs">
            Applies to {selectedIds.length} selected token{selectedIds.length !== 1 ? "s" : ""}
          </p>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col">
          {/* ── Transform options (not scrollable) ── */}
          <div className="space-y-4 px-6 py-5">
            <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              Transform
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="rename-prefix" className="text-muted-foreground text-xs">
                Add prefix
              </Label>
              <Input
                id="rename-prefix"
                placeholder="e.g. legacy-"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                className="text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rename-suffix" className="text-muted-foreground text-xs">
                Add suffix
              </Label>
              <Input
                id="rename-suffix"
                placeholder="e.g. -v2"
                value={suffix}
                onChange={(e) => setSuffix(e.target.value)}
                className="text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="rename-find" className="text-muted-foreground text-xs">
                  Find
                </Label>
                <Input
                  id="rename-find"
                  placeholder="e.g. color-"
                  value={swapFind}
                  onChange={(e) => setSwapFind(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rename-replace" className="text-muted-foreground text-xs">
                  Replace with
                </Label>
                <Input
                  id="rename-replace"
                  placeholder="e.g. shade-"
                  value={swapReplace}
                  onChange={(e) => setSwapReplace(e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rename-remove" className="text-muted-foreground text-xs">
                Remove text
              </Label>
              <Input
                id="rename-remove"
                placeholder="text to remove"
                value={remove}
                onChange={(e) => setRemove(e.target.value)}
                className="text-sm"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={reset}
                disabled={!hasChanges}
                className={cn(
                  "text-xs transition-colors",
                  hasChanges
                    ? "text-muted-foreground hover:text-foreground cursor-pointer"
                    : "text-muted-foreground/30 cursor-not-allowed"
                )}
              >
                Reset
              </button>
            </div>
          </div>

          {/* ── Preview (scrollable, fills remaining height) ── */}
          {hasChanges && (
            <>
              <Separator />
              <div className="flex min-h-0 flex-1 flex-col gap-3 px-6 py-5">
                <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                  Preview
                </p>
                {loading ? (
                  <p className="text-muted-foreground text-xs">Loading preview…</p>
                ) : previews.length === 0 ? (
                  <p className="text-muted-foreground text-xs">No tokens to preview</p>
                ) : (
                  <ScrollArea className="min-h-0 flex-1 [&_[data-slot=scroll-area-scrollbar]]:w-1">
                    <div className="space-y-2">
                      {previews.slice(0, 20).map((p) => (
                        <div key={p.tokenId} className="text-xs">
                          <AnnotatedTokenName originalName={p.originalName} options={options} />
                        </div>
                      ))}
                      {previews.length > 20 && (
                        <p className="text-muted-foreground text-xs">
                          …and {previews.length - 20} more
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Footer ───────────────────────────── */}
        <div className="flex gap-2 border-t px-6 py-4">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="flex-1"
            onClick={handleApply}
            disabled={!hasChanges || applying}
          >
            {applying ? "Applying…" : "Apply"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
