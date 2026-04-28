"use client";

import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

interface Collection {
  _id: string;
  name: string;
}
interface Group {
  _id: string;
  name: string;
  path: string;
  depth: number;
}

interface BulkGroupSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
  onApplied: () => void;
}

const NONE_VALUE = "__none__";

export function BulkGroupSheet({
  open,
  onOpenChange,
  selectedIds,
  onApplied,
}: BulkGroupSheetProps) {
  const [groupName, setGroupName] = useState("");
  const [collectionId, setCollectionId] = useState("");
  const [parentId, setParentId] = useState<string | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [applying, setApplying] = useState(false);

  const count = selectedIds.length;

  useEffect(() => {
    if (!open) return;
    fetch("/api/collections")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.data) setCollections(d.data);
      })
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!collectionId) {
      setGroups([]);
      setParentId(null);
      return;
    }
    fetch(`/api/groups?collection=${collectionId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.data) {
          setGroups(d.data);
          setParentId(null);
        }
      })
      .catch(() => {});
  }, [collectionId]);

  function reset() {
    setGroupName("");
    setCollectionId("");
    setParentId(null);
  }

  function groupLabel(g: Group) {
    return g.path.split("/").join(" › ");
  }

  async function handleApply() {
    if (!groupName.trim()) {
      toast.error("Enter a group name");
      return;
    }
    if (!collectionId) {
      toast.error("Select a collection");
      return;
    }
    setApplying(true);
    try {
      // 1. Create the group
      const createRes = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: groupName.trim(),
          collectionId,
          parentId: parentId ?? null,
        }),
      });
      if (!createRes.ok) throw new Error("Failed to create group");
      const created = await createRes.json();
      const newGroupId = created.data?._id;
      if (!newGroupId) throw new Error("No group ID returned");

      // 2. Move tokens into the new group
      const moveRes = await fetch("/api/tokens/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "move",
          tokenIds: selectedIds,
          payload: { groupId: newGroupId },
        }),
      });
      if (!moveRes.ok) throw new Error("Failed to move tokens");

      toast.success(
        `Created "${groupName.trim()}" and moved ${count} token${count !== 1 ? "s" : ""} into it`
      );
      onApplied();
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setApplying(false);
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <SheetContent className="flex w-[440px] flex-col gap-0 p-0 sm:w-[500px]">
        <SheetHeader className="border-b px-6 py-5">
          <SheetTitle className="text-base">Group tokens</SheetTitle>
          <p className="text-muted-foreground text-xs">
            Create a new group and move {count} selected token{count !== 1 ? "s" : ""} into it
          </p>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-1.5 px-6 py-5">
            <Label className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              New group name
            </Label>
            <Input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g. background"
              className="text-sm"
              autoFocus
            />
          </div>

          <Separator />

          <div className="space-y-4 px-6 py-5">
            <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              Location
            </p>

            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Collection</Label>
              <Select value={collectionId} onValueChange={setCollectionId}>
                <SelectTrigger className="h-9 w-full text-sm">
                  <SelectValue placeholder="Select collection…" />
                </SelectTrigger>
                <SelectContent>
                  {collections.map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">
                Parent group <span className="text-muted-foreground/60">(optional)</span>
              </Label>
              <Select
                value={parentId ?? NONE_VALUE}
                onValueChange={(v) => setParentId(v === NONE_VALUE ? null : v)}
                disabled={!collectionId}
              >
                <SelectTrigger className="h-9 w-full text-sm">
                  <SelectValue
                    placeholder={
                      !collectionId ? "Select a collection first…" : "Top-level (no parent)"
                    }
                  />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value={NONE_VALUE}>
                    <span className="text-muted-foreground">Top-level (no parent)</span>
                  </SelectItem>
                  {groups.map((g) => (
                    <SelectItem key={g._id} value={g._id}>
                      <span className="flex items-center gap-1">
                        {g.depth > 0 && (
                          <span
                            className="text-muted-foreground shrink-0 text-xs"
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

        <div className="flex gap-2 border-t px-6 py-4">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleApply}
            disabled={!groupName.trim() || !collectionId || applying}
          >
            {applying ? "Creating…" : `Create & move ${count} token${count !== 1 ? "s" : ""}`}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
