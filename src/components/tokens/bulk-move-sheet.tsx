"use client";

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface Collection { _id: string; name: string; }
interface Group { _id: string; name: string; path: string; depth: number; }

interface BulkMoveSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
  onApplied: () => void;
}

export function BulkMoveSheet({ open, onOpenChange, selectedIds, onApplied }: BulkMoveSheetProps) {
  const [collectionId, setCollectionId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [collections, setCollections] = useState<Collection[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [applying, setApplying] = useState(false);

  const count = selectedIds.length;

  // Fetch collections each time the sheet opens
  useEffect(() => {
    if (!open) return;
    fetch("/api/collections")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.data) setCollections(d.data); })
      .catch(() => {});
  }, [open]);

  // Fetch groups whenever the selected collection changes
  useEffect(() => {
    if (!collectionId) { setGroups([]); setGroupId(""); return; }
    fetch(`/api/groups?collection=${collectionId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.data) { setGroups(d.data); setGroupId(""); } })
      .catch(() => {});
  }, [collectionId]);

  function reset() {
    setCollectionId("");
    setGroupId("");
  }

  async function handleApply() {
    if (!groupId) { toast.error("Select a destination group"); return; }
    setApplying(true);
    try {
      const res = await fetch("/api/tokens/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "move", tokenIds: selectedIds, payload: { groupId } }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Moved ${count} token${count !== 1 ? "s" : ""}`);
      onApplied();
      reset();
      onOpenChange(false);
    } catch {
      toast.error("Failed to move tokens");
    } finally {
      setApplying(false);
    }
  }

  function groupLabel(g: Group) {
    return g.path.split("/").join(" › ");
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <SheetContent className="w-[440px] sm:w-[500px] flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-5 border-b">
          <SheetTitle className="text-base">Move tokens</SheetTitle>
          <p className="text-xs text-muted-foreground">
            Move {count} selected token{count !== 1 ? "s" : ""} to a different group
          </p>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Destination
            </p>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Collection</Label>
              <Select value={collectionId} onValueChange={setCollectionId}>
                <SelectTrigger className="w-full h-9 text-sm">
                  <SelectValue placeholder="Select collection…" />
                </SelectTrigger>
                <SelectContent>
                  {collections.map((c) => (
                    <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Group</Label>
              <Select
                value={groupId}
                onValueChange={setGroupId}
                disabled={!collectionId || groups.length === 0}
              >
                <SelectTrigger className="w-full h-9 text-sm">
                  <SelectValue
                    placeholder={
                      !collectionId
                        ? "Select a collection first…"
                        : groups.length === 0
                        ? "No groups in this collection"
                        : "Select group…"
                    }
                  />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {groups.map((g) => (
                    <SelectItem key={g._id} value={g._id}>
                      <span className="flex items-center gap-1">
                        {g.depth > 0 && (
                          <span
                            className="text-muted-foreground text-xs shrink-0"
                            style={{ paddingLeft: `${(g.depth - 1) * 10}px` }}
                          >
                            └
                          </span>
                        )}
                        <span className="truncate">{groupLabel(g)}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex gap-2 px-6 py-4 border-t">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleApply}
            disabled={!groupId || applying}
          >
            {applying ? "Moving…" : `Move ${count} token${count !== 1 ? "s" : ""}`}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
