"use client";

import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useDistinctTokenValues } from "@/hooks/use-distinct-token-values";
import { TagCombobox } from "./tag-combobox";

const POPULAR_COUNT = 5;

interface BulkLabelSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
  onApplied: () => void;
}

export function BulkLabelSheet({
  open,
  onOpenChange,
  selectedIds,
  onApplied,
}: BulkLabelSheetProps) {
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [applying, setApplying] = useState(false);
  const { labels: allLabels } = useDistinctTokenValues();

  const popular = allLabels.slice(0, POPULAR_COUNT);

  useEffect(() => {
    if (!open) setSelectedLabels([]);
  }, [open]);

  function toggleLabel(label: string) {
    const trimmed = label.trim().toLowerCase();
    if (!trimmed) return;
    setSelectedLabels((prev) =>
      prev.includes(trimmed) ? prev.filter((l) => l !== trimmed) : [...prev, trimmed]
    );
  }

  async function handleApply() {
    if (selectedLabels.length === 0) {
      toast.error("Select at least one label");
      return;
    }
    setApplying(true);
    try {
      const res = await fetch("/api/tokens/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "label",
          tokenIds: selectedIds,
          payload: { labels: selectedLabels },
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Applied ${selectedLabels.length} label(s) to ${selectedIds.length} token(s)`);
      onApplied();
    } catch {
      toast.error("Failed to apply labels");
    } finally {
      setApplying(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-[440px] flex-col gap-0 p-0 sm:w-[500px]">
        <SheetHeader className="border-b px-6 py-5">
          <SheetTitle className="text-base">Apply labels</SheetTitle>
          <p className="text-muted-foreground text-xs">
            Adding to {selectedIds.length} selected token{selectedIds.length !== 1 ? "s" : ""}
          </p>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <TagCombobox
            label="Labels"
            options={allLabels}
            popular={popular}
            selected={selectedLabels}
            onToggle={toggleLabel}
          />
        </div>

        <div className="flex gap-2 border-t px-6 py-4">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleApply}
            disabled={applying || selectedLabels.length === 0}
          >
            {applying ? "Applying…" : "Apply labels"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
