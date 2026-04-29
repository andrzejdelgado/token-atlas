"use client";

import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
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
  collection: string;
  parent: string | null;
  directChildCount?: number;
  directTokenCount?: number;
  totalTokenCount?: number;
}

interface EditGroupSheetProps {
  groupId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  onDeleted?: () => void;
}

const NONE_VALUE = "__none__";

export function EditGroupSheet({
  groupId,
  open,
  onOpenChange,
  onSaved,
  onDeleted,
}: EditGroupSheetProps) {
  const [group, setGroup] = useState<Group | null>(null);
  const [name, setName] = useState("");
  const [collectionId, setCollectionId] = useState("");
  const [parentId, setParentId] = useState<string | null>(null);

  const [collections, setCollections] = useState<Collection[]>([]);
  const [availableGroups, setAvailableGroups] = useState<Group[]>([]);

  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [moveTokens, setMoveTokens] = useState(true);

  // Delete dialog state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [tokenTarget, setTokenTarget] = useState<string>(NONE_VALUE);

  // Fetch the group to edit (includes stats)
  useEffect(() => {
    if (!groupId || !open) return;
    fetch(`/api/groups/${groupId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.data) return;
        const g = d.data as Group;
        setGroup(g);
        setName(g.name);
        setCollectionId(
          typeof g.collection === "object"
            ? (g.collection as unknown as Collection)._id
            : g.collection
        );
        setParentId(g.parent ?? null);
      })
      .catch(() => {});
  }, [groupId, open]);

  // Fetch collections once
  useEffect(() => {
    if (!open) return;
    fetch("/api/collections")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setCollections(d.data ?? []))
      .catch(() => {});
  }, [open]);

  // Fetch sibling groups when collection changes
  useEffect(() => {
    if (!collectionId) {
      setAvailableGroups([]);
      return;
    }
    fetch(`/api/groups?collection=${collectionId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.data) return;
        // Exclude this group and all its descendants
        const currentPath = group?.path ?? "";
        const filtered = (d.data as Group[]).filter(
          (g) => g._id !== groupId && !g.path.startsWith(currentPath + "/")
        );
        setAvailableGroups(filtered);
      })
      .catch(() => {});
  }, [collectionId, groupId, group?.path]);

  function handleCollectionChange(id: string) {
    if (id !== collectionId) setParentId(null);
    setCollectionId(id);
  }

  function groupLabel(g: Group) {
    return g.path.split("/").join(" › ");
  }

  const collectionChanged = group
    ? collectionId !==
      (typeof group.collection === "object"
        ? (group.collection as unknown as Collection)._id
        : group.collection)
    : false;

  function handleSaveClick() {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (collectionChanged) {
      setConfirmOpen(true);
    } else {
      performSave(false);
    }
  }

  async function performSave(withTokens: boolean) {
    if (!groupId) return;
    setSaving(true);
    setConfirmOpen(false);
    try {
      const payload: Record<string, unknown> = { name: name.trim() };

      const originalParent = group?.parent ?? null;
      const originalCollection = group
        ? typeof group.collection === "object"
          ? (group.collection as unknown as Collection)._id
          : group.collection
        : "";

      if (collectionId !== originalCollection) payload.collectionId = collectionId;
      if (parentId !== originalParent) payload.parentId = parentId;
      if (withTokens) payload.moveTokens = true;

      const res = await fetch(`/api/groups/${groupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      toast.success("Group saved");
      onSaved();
      onOpenChange(false);
    } catch {
      toast.error("Failed to save group");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!groupId) return;
    // If there are direct tokens and no target chosen, warn
    if ((group?.directTokenCount ?? 0) > 0 && tokenTarget === NONE_VALUE) {
      toast.error("Select a group to move the tokens into, or they will be deleted");
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokenTargetGroupId: tokenTarget !== NONE_VALUE ? tokenTarget : undefined,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Group deleted");
      setDeleteOpen(false);
      onOpenChange(false);
      onDeleted?.();
      onSaved();
    } catch {
      toast.error("Failed to delete group");
    } finally {
      setDeleting(false);
    }
  }

  const targetCollectionName = collections.find((c) => c._id === collectionId)?.name ?? "";
  const originalCollectionName =
    collections.find((c) =>
      c._id !== collectionId && collections.length > 0
        ? c._id ===
          (group
            ? typeof group.collection === "object"
              ? (group.collection as unknown as Collection)._id
              : group.collection
            : "")
        : false
    )?.name ?? "";

  const directTokenCount = group?.directTokenCount ?? 0;
  const totalTokenCount = group?.totalTokenCount ?? 0;
  const directChildCount = group?.directChildCount ?? 0;

  // Groups available to receive orphaned tokens (same collection, not this group or descendants)
  const tokenTargetGroups = availableGroups;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="flex w-[440px] flex-col gap-0 p-0 sm:w-[500px]">
          <SheetHeader className="border-b px-6 py-5">
            <SheetTitle className="text-base">Edit group</SheetTitle>
            {group && (
              <p className="text-muted-foreground truncate text-xs">
                {group.path.split("/").join(" › ")}
              </p>
            )}
          </SheetHeader>

          <div className="flex-1 overflow-y-auto">
            {/* ── Identity ─────────────────────────── */}
            <div className="space-y-1.5 px-6 py-5">
              <Label
                htmlFor="group-name"
                className="text-muted-foreground text-xs font-semibold tracking-wide uppercase"
              >
                Name
              </Label>
              <Input
                id="group-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-sm"
                placeholder="e.g. background"
              />
            </div>

            <Separator />

            {/* ── Location ─────────────────────────── */}
            <div className="space-y-4 px-6 py-5">
              <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                Location
              </p>

              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">Collection</Label>
                <Select value={collectionId} onValueChange={handleCollectionChange}>
                  <SelectTrigger className="h-8 w-full text-sm">
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
                  <SelectTrigger className="h-8 w-full text-sm">
                    <SelectValue placeholder="Top-level (no parent)" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    <SelectItem value={NONE_VALUE}>
                      <span className="text-muted-foreground">Top-level (no parent)</span>
                    </SelectItem>
                    {availableGroups.map((g) => (
                      <SelectItem key={g._id} value={g._id}>
                        <span className="flex items-center">
                          {g.depth > 0 && (
                            <span
                              className="text-muted-foreground mr-1 shrink-0 text-xs"
                              style={{ paddingLeft: `${(g.depth - 1) * 10}px` }}
                            >
                              └
                            </span>
                          )}
                          {groupLabel(g)}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground text-[11px]">
                  Subgroups of this group will move with it.
                </p>
              </div>
            </div>

            <Separator />

            {/* ── Danger zone ──────────────────────── */}
            <div className="space-y-3 px-6 py-5">
              <p className="text-destructive/70 text-xs font-semibold tracking-wide uppercase">
                Danger zone
              </p>
              <p className="text-muted-foreground text-xs">
                Deleting this group promotes its sub-groups to the top level.
                {totalTokenCount > 0 &&
                  ` ${totalTokenCount} token${totalTokenCount !== 1 ? "s" : ""} will be affected.`}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive border-destructive/30 hover:bg-destructive/5 hover:text-destructive gap-2"
                onClick={() => {
                  setTokenTarget(NONE_VALUE);
                  setDeleteOpen(true);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete group
              </Button>
            </div>
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
            <Button size="sm" className="flex-1" onClick={handleSaveClick} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Move collection confirmation ─────────── */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Move to "{targetCollectionName}"</DialogTitle>
          </DialogHeader>

          <p className="text-muted-foreground text-sm">
            This group is moving from{" "}
            <strong>{originalCollectionName || "its current collection"}</strong> to{" "}
            <strong>{targetCollectionName}</strong>. What should happen to the tokens inside?
          </p>

          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={() => setMoveTokens(false)}
              className={cn(
                "w-full rounded-lg border px-4 py-3 text-left transition-colors",
                !moveTokens ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
              )}
            >
              <p className="text-sm font-medium">Move group structure only</p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                Tokens stay in <strong>{originalCollectionName || "original collection"}</strong>.
                Only the group hierarchy moves.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setMoveTokens(true)}
              className={cn(
                "w-full rounded-lg border px-4 py-3 text-left transition-colors",
                moveTokens ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
              )}
            >
              <p className="text-sm font-medium">Move group with all tokens</p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                All tokens inside this group and its subgroups also move to{" "}
                <strong>{targetCollectionName}</strong>.
              </p>
            </button>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => performSave(moveTokens)} disabled={saving}>
              {saving ? "Moving…" : "Confirm move"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation dialog ────────────── */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="text-destructive h-4 w-4" />
              Delete "{group?.name}"?
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            <div className="bg-muted text-muted-foreground space-y-1 rounded-lg px-4 py-3 text-xs">
              {directChildCount > 0 && (
                <p>
                  • {directChildCount} sub-group{directChildCount !== 1 ? "s" : ""} will be promoted
                  to the top level
                </p>
              )}
              {totalTokenCount > 0 && (
                <p>
                  • {totalTokenCount} token{totalTokenCount !== 1 ? "s" : ""} total will be affected
                </p>
              )}
              {directTokenCount > 0 && (
                <p className="text-destructive/80">
                  • {directTokenCount} token{directTokenCount !== 1 ? "s" : ""} are directly in this
                  group and must be moved or will be deleted
                </p>
              )}
              {directChildCount === 0 && totalTokenCount === 0 && (
                <p>This group is empty and will be permanently removed.</p>
              )}
            </div>

            {directTokenCount > 0 && (
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">
                  Move {directTokenCount} token{directTokenCount !== 1 ? "s" : ""} to:
                </Label>
                <Select value={tokenTarget} onValueChange={setTokenTarget}>
                  <SelectTrigger className="h-8 w-full text-sm">
                    <SelectValue placeholder="Select a group…" />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    <SelectItem value={NONE_VALUE}>
                      <span className="text-destructive">Delete these tokens</span>
                    </SelectItem>
                    {tokenTargetGroups.map((g) => (
                      <SelectItem key={g._id} value={g._id}>
                        <span className="flex items-center">
                          {g.depth > 0 && (
                            <span
                              className="text-muted-foreground mr-1 shrink-0 text-xs"
                              style={{ paddingLeft: `${(g.depth - 1) * 10}px` }}
                            >
                              └
                            </span>
                          )}
                          {groupLabel(g)}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <p className="text-muted-foreground text-xs">This action cannot be undone.</p>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
