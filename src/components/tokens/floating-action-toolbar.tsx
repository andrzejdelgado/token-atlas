"use client";

import { useState } from "react";
import { Users, Pencil, ArrowRight, Flag, Tag, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BulkRenameSheet } from "./bulk-rename-sheet";
import { BulkLabelSheet } from "./bulk-label-sheet";
import { BulkMoveSheet } from "./bulk-move-sheet";
import { BulkGroupSheet } from "./bulk-group-sheet";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface FloatingActionToolbarProps {
  selectedIds: string[];
  onDeselect: () => void;
  onBulkDelete: (ids: string[]) => Promise<void>;
  onBulkApplied: () => void;
}

export function FloatingActionToolbar({
  selectedIds,
  onDeselect,
  onBulkDelete,
  onBulkApplied,
}: FloatingActionToolbarProps) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [labelOpen, setLabelOpen] = useState(false);
  const [deletePopoverOpen, setDeletePopoverOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [flagging, setFlagging] = useState(false);
  const count = selectedIds.length;

  if (count === 0) return null;

  async function handleFlag() {
    setFlagging(true);
    try {
      const res = await fetch("/api/tokens/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "flag", tokenIds: selectedIds, payload: { flagged: true } }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Flagged ${count} token(s)`);
      onBulkApplied();
    } catch {
      toast.error("Failed to flag tokens");
    } finally {
      setFlagging(false);
    }
  }

  async function confirmDelete() {
    await onBulkDelete(selectedIds);
    setDeletePopoverOpen(false);
    setDeleteConfirm(false);
  }

  return (
    <>
      <div
        className={cn(
          "fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
          "flex items-center gap-2 rounded-xl border bg-popover px-4 py-2.5 shadow-xl",
          "animate-in slide-in-from-bottom-4 duration-200"
        )}
      >
        <span className="text-sm font-medium text-muted-foreground mr-1 whitespace-nowrap">
          {count} selected
        </span>

        <div className="h-4 w-px bg-border" />

        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={() => setGroupOpen(true)}
        >
          <Users className="h-3.5 w-3.5" />
          Group
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={() => setRenameOpen(true)}
        >
          <Pencil className="h-3.5 w-3.5" />
          Rename
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={() => setMoveOpen(true)}
        >
          <ArrowRight className="h-3.5 w-3.5" />
          Move
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={handleFlag}
          disabled={flagging}
        >
          <Flag className="h-3.5 w-3.5" />
          Flag
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={() => setLabelOpen(true)}
        >
          <Tag className="h-3.5 w-3.5" />
          Label
        </Button>

        {/* Delete with popover confirmation */}
        <Popover open={deletePopoverOpen} onOpenChange={(o) => { setDeletePopoverOpen(o); if (!o) setDeleteConfirm(false); }}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-destructive hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-4" side="top">
            <p className="text-sm text-center mb-4">
              You&apos;re about to delete <strong>{count}</strong> token(s). This cannot be undone.
            </p>
            {!deleteConfirm ? (
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setDeleteConfirm(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete {count} token(s)
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="destructive" className="flex-1" onClick={confirmDelete}>
                  Yes
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setDeleteConfirm(false); setDeletePopoverOpen(false); }}
                >
                  No
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        <div className="h-4 w-px bg-border" />

        <button
          onClick={onDeselect}
          className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Deselect all"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <BulkGroupSheet
        open={groupOpen}
        onOpenChange={setGroupOpen}
        selectedIds={selectedIds}
        onApplied={() => { onBulkApplied(); setGroupOpen(false); }}
      />
      <BulkRenameSheet
        open={renameOpen}
        onOpenChange={setRenameOpen}
        selectedIds={selectedIds}
        onApplied={() => { onBulkApplied(); setRenameOpen(false); }}
      />
      <BulkMoveSheet
        open={moveOpen}
        onOpenChange={setMoveOpen}
        selectedIds={selectedIds}
        onApplied={() => { onBulkApplied(); setMoveOpen(false); }}
      />
      <BulkLabelSheet
        open={labelOpen}
        onOpenChange={setLabelOpen}
        selectedIds={selectedIds}
        onApplied={() => { onBulkApplied(); setLabelOpen(false); }}
      />
    </>
  );
}
