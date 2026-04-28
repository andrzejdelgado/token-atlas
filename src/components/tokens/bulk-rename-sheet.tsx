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

        <ScrollArea className="flex-1">
          {/* ── Transform options ─────────────────── */}
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

          {/* ── Preview ──────────────────────────── */}
          {hasChanges && (
            <>
              <Separator />
              <div className="space-y-3 px-6 py-5">
                <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                  Preview
                </p>
                {loading ? (
                  <p className="text-muted-foreground text-xs">Loading preview…</p>
                ) : previews.length === 0 ? (
                  <p className="text-muted-foreground text-xs">No tokens to preview</p>
                ) : (
                  <div className="space-y-2">
                    {previews.slice(0, 20).map((p) => (
                      <div key={p.tokenId} className="flex items-center gap-1 text-xs">
                        <span className="text-muted-foreground">→</span>
                        <RenamePreviewName preview={p} />
                      </div>
                    ))}
                    {previews.length > 20 && (
                      <p className="text-muted-foreground text-xs">
                        …and {previews.length - 20} more
                      </p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </ScrollArea>

        {/* ── Footer ───────────────────────────── */}
        <div className="flex gap-2 border-t px-6 py-4">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleApply} disabled={!hasChanges || applying}>
            {applying ? "Applying…" : "Apply"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function RenamePreviewName({ preview }: { preview: BulkRenamePreview }) {
  const changeColors: Record<string, string> = {
    prefix: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    suffix: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    swap: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    remove: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };

  if (preview.changes.length === 0) return <span>{preview.newName}</span>;

  return (
    <span>
      {preview.changes.map((c, i) => (
        <span key={i} className={cn("rounded-sm px-0.5", changeColors[c.type])}>
          {c.segment}
        </span>
      ))}
      {preview.newName}
    </span>
  );
}
