"use client";

import { useState, useEffect } from "react";
import { X, Check, ChevronsUpDown } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useDistinctTokenValues } from "@/hooks/use-distinct-token-values";

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
  const [comboOpen, setComboOpen] = useState(false);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [applying, setApplying] = useState(false);
  const { labels: allLabels } = useDistinctTokenValues();

  const popular = allLabels.slice(0, POPULAR_COUNT);
  const rest = allLabels.filter((l) => !popular.includes(l));

  useEffect(() => {
    if (!open) setSelectedLabels([]);
  }, [open]);

  function toggleLabel(label: string) {
    const trimmed = label.trim().toLowerCase();
    if (!trimmed) return;
    setSelectedLabels((prev) =>
      prev.includes(trimmed) ? prev.filter((l) => l !== trimmed) : [...prev, trimmed]
    );
    setComboOpen(false);
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

        <div className="flex-1 overflow-y-auto">
          {/* ── Label picker ─────────────────────── */}
          <div className="space-y-3 px-6 py-5">
            <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              Labels
            </p>
            <Popover open={comboOpen} onOpenChange={setComboOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={comboOpen}
                  className="h-9 w-full justify-between text-sm font-normal"
                >
                  <span className="text-muted-foreground">Search or pick a label…</span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search labels…" />
                  <CommandList>
                    <CommandEmpty>No labels found.</CommandEmpty>
                    {popular.length > 0 && (
                      <CommandGroup heading="Popular">
                        {popular.map((l) => (
                          <CommandItem key={l} value={l} onSelect={() => toggleLabel(l)}>
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4 shrink-0",
                                selectedLabels.includes(l) ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {l}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                    {rest.length > 0 && (
                      <CommandGroup heading={popular.length > 0 ? "All" : undefined}>
                        {rest.map((l) => (
                          <CommandItem key={l} value={l} onSelect={() => toggleLabel(l)}>
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4 shrink-0",
                                selectedLabels.includes(l) ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {l}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* ── Selected labels ───────────────────── */}
          {selectedLabels.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3 px-6 py-5">
                <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                  Selected
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedLabels.map((l) => (
                    <Badge key={l} variant="secondary" className="gap-1 text-xs">
                      {l}
                      <button onClick={() => toggleLabel(l)}>
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Footer ───────────────────────────── */}
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
