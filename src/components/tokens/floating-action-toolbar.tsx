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
  selectedTokens: Array<{ _id: string; flagged: boolean }>;
  onDeselect: () => void;
  onBulkDelete: (ids: string[]) => Promise<void>;
  onBulkApplied: () => void;
}

export function FloatingActionToolbar({
  selectedIds,
  selectedTokens,
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

  const allFlagged = selectedTokens.length > 0 && selectedTokens.every((t) => t.flagged);
  const flagLabel = allFlagged ? "Unflag" : "Flag";

  async function handleFlag() {
    setFlagging(true);
    try {
      if (allFlagged) {
        // Unflag all selected
        const res = await fetch("/api/tokens/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "flag",
            tokenIds: selectedIds,
            payload: { flagged: false },
          }),
        });
        if (!res.ok) throw new Error();
        toast.success(`Unflagged ${count} token(s)`);
      } else {
        // Flag only the unflagged ones
        const toFlag = selectedTokens.filter((t) => !t.flagged).map((t) => t._id);
        const res = await fetch("/api/tokens/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "flag",
            tokenIds: toFlag,
            payload: { flagged: true },
          }),
        });
        if (!res.ok) throw new Error();
        toast.success(`Flagged ${toFlag.length} token(s)`);
      }
      onBulkApplied();
    } catch {
      toast.error("Failed to update flags");
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
          "fixed bottom-6 left-1/2 z-50 -translate-x-1/2",
          "bg-popover flex items-center gap-2 rounded-xl border px-4 py-2.5 shadow-xl",
          "animate-in slide-in-from-bottom-4 duration-200"
        )}
      >
        <span className="text-muted-foreground mr-1 text-sm font-medium whitespace-nowrap">
          {count} selected
        </span>

        <div className="bg-border h-4 w-px" />

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
          {flagLabel}
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
        <Popover
          open={deletePopoverOpen}
          onOpenChange={(o) => {
            setDeletePopoverOpen(o);
            if (!o) setDeleteConfirm(false);
          }}
        >
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive h-8 gap-1.5 text-xs"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-4" side="top">
            <p className="mb-4 text-center text-sm">
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
                  onClick={() => {
                    setDeleteConfirm(false);
                    setDeletePopoverOpen(false);
                  }}
                >
                  No
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        <div className="bg-border h-4 w-px" />

        <button
          onClick={onDeselect}
          className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-md p-1 transition-colors"
          title="Deselect all"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <BulkGroupSheet
        open={groupOpen}
        onOpenChange={setGroupOpen}
        selectedIds={selectedIds}
        onApplied={() => {
          onBulkApplied();
          setGroupOpen(false);
        }}
      />
      <BulkRenameSheet
        open={renameOpen}
        onOpenChange={setRenameOpen}
        selectedIds={selectedIds}
        onApplied={() => {
          onBulkApplied();
          setRenameOpen(false);
        }}
      />
      <BulkMoveSheet
        open={moveOpen}
        onOpenChange={setMoveOpen}
        selectedIds={selectedIds}
        onApplied={() => {
          onBulkApplied();
          setMoveOpen(false);
        }}
      />
      <BulkLabelSheet
        open={labelOpen}
        onOpenChange={setLabelOpen}
        selectedIds={selectedIds}
        onApplied={() => {
          onBulkApplied();
          setLabelOpen(false);
        }}
      />
    </>
  );
}
