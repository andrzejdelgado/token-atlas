"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Plus,
  MoreHorizontal,
  Loader2,
  Layers,
  ArrowRight,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/layout/page-header";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Theme {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  isBase: boolean;
  modificationCount: number;
  position?: number;
}

// ── slug helper ───────────────────────────────────────────────────────────────
function toSlug(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ── Sortable theme card ───────────────────────────────────────────────────────

interface ThemeCardProps {
  theme: Theme;
  onEdit: (theme: Theme) => void;
  onDelete: (theme: Theme) => void;
  onRename: (id: string, name: string) => void;
}

function ThemeCard({ theme, onEdit, onDelete, onRename }: ThemeCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: theme._id,
  });

  const [renaming, setRenaming] = useState(false);
  const [renameVal, setRenameVal] = useState(theme.name);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  async function commitRename() {
    const trimmed = renameVal.trim();
    setRenaming(false);
    if (!trimmed || trimmed === theme.name) {
      setRenameVal(theme.name);
      return;
    }
    onRename(theme._id, trimmed);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-card border-border flex items-start gap-3 rounded-lg border p-4 transition-shadow",
        isDragging && "opacity-50 shadow-lg"
      )}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="text-muted-foreground/40 hover:text-muted-foreground mt-0.5 cursor-grab touch-none active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {renaming ? (
              <Input
                value={renameVal}
                autoFocus
                className="h-6 px-1 py-0 text-sm font-medium"
                onChange={(e) => setRenameVal(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename();
                  if (e.key === "Escape") {
                    setRenaming(false);
                    setRenameVal(theme.name);
                  }
                }}
              />
            ) : (
              <p
                className="text-foreground truncate text-sm font-medium"
                onDoubleClick={() => setRenaming(true)}
                title="Double-click to rename"
              >
                {theme.name}
              </p>
            )}
            <p className="text-muted-foreground mt-0.5 font-mono text-xs">{theme.slug}</p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Badge variant={theme.isBase ? "default" : "secondary"} className="text-[11px]">
              {theme.isBase ? "Base" : "Modifier"}
            </Badge>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="hover:bg-muted text-muted-foreground rounded p-1 transition-colors">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuItem onSelect={() => onEdit(theme)}>
                  <Pencil className="mr-2 h-3.5 w-3.5" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => onDelete(theme)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {theme.description && (
          <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">
            {theme.description}
          </p>
        )}

        <div className="mt-3 flex items-center justify-between">
          {!theme.isBase && theme.modificationCount > 0 ? (
            <span className="text-muted-foreground text-xs">
              {theme.modificationCount} override{theme.modificationCount !== 1 ? "s" : ""}
            </span>
          ) : (
            <span />
          )}
          <Link
            href={`/tokens?theme=${theme._id}`}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
          >
            Browse tokens
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Section with sortable list ────────────────────────────────────────────────

function ThemeSection({
  title,
  description,
  themes,
  onEdit,
  onDelete,
  onRename,
  onDragEnd,
}: {
  title: string;
  description: string;
  themes: Theme[];
  onEdit: (theme: Theme) => void;
  onDelete: (theme: Theme) => void;
  onRename: (id: string, name: string) => void;
  onDragEnd: (event: DragEndEvent, section: "base" | "modifier") => void;
}) {
  const section = title === "Base Themes" ? "base" : "modifier";
  const sensors = useSensors(useSensor(PointerSensor));

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-foreground text-sm font-semibold">{title}</h2>
        <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>
      </div>

      {themes.length === 0 ? (
        <div className="border-border text-muted-foreground rounded-lg border border-dashed py-8 text-center text-sm">
          No {title.toLowerCase()} yet
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={(e) => onDragEnd(e, section)}
        >
          <SortableContext items={themes.map((t) => t._id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {themes.map((theme) => (
                <ThemeCard
                  key={theme._id}
                  theme={theme}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onRename={onRename}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

// ── Create / Edit dialog ──────────────────────────────────────────────────────

interface ThemeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  theme?: Theme | null;
  onSaved: (theme: Theme) => void;
}

function ThemeDialog({ open, onOpenChange, theme, onSaved }: ThemeDialogProps) {
  const isEdit = !!theme;
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [isBase, setIsBase] = useState(false);
  const [slugManual, setSlugManual] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(theme?.name ?? "");
      setSlug(theme?.slug ?? "");
      setDescription(theme?.description ?? "");
      setIsBase(theme?.isBase ?? false);
      setSlugManual(isEdit);
    }
  }, [open, theme, isEdit]);

  function handleNameChange(v: string) {
    setName(v);
    if (!slugManual) setSlug(toSlug(v));
  }

  async function handleSave() {
    if (!name.trim() || !slug.trim()) return;
    setSaving(true);
    try {
      let res: Response;
      if (isEdit && theme) {
        res = await fetch(`/api/themes/${theme._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), description: description.trim(), isBase }),
        });
      } else {
        res = await fetch("/api/themes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            slug: slug.trim(),
            description: description.trim(),
            isBase,
          }),
        });
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to save theme");
      }
      const { data } = await res.json();
      toast.success(isEdit ? "Theme updated" : "Theme created");
      onSaved(data);
      onOpenChange(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save theme");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit theme" : "New theme"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="theme-name">Name</Label>
            <Input
              id="theme-name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. DLL Brand"
              autoFocus
            />
          </div>

          {/* Slug — only for create */}
          {!isEdit && (
            <div className="space-y-1.5">
              <Label htmlFor="theme-slug">Slug</Label>
              <Input
                id="theme-slug"
                value={slug}
                onChange={(e) => {
                  setSlugManual(true);
                  setSlug(e.target.value);
                }}
                placeholder="dll-brand"
                className="font-mono text-sm"
              />
              <p className="text-muted-foreground text-xs">
                Unique identifier, cannot be changed after creation.
              </p>
            </div>
          )}

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="theme-description">
              Description <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <textarea
              id="theme-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this theme for?"
              rows={2}
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring w-full resize-none rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            />
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label>Type</Label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  {
                    value: false,
                    label: "Modifier",
                    sub: "Overrides specific tokens on top of a base theme",
                  },
                  {
                    value: true,
                    label: "Base",
                    sub: "Has its own full set of token values",
                  },
                ] as const
              ).map(({ value, label, sub }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setIsBase(value)}
                  className={cn(
                    "rounded-lg border p-3 text-left transition-colors",
                    isBase === value
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border text-muted-foreground hover:border-muted-foreground"
                  )}
                >
                  <p className="text-sm font-medium">{label}</p>
                  <p className="mt-0.5 text-xs leading-relaxed">{sub}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !name.trim() || !slug.trim()}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? "Save changes" : "Create theme"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ThemesPage() {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTheme, setEditingTheme] = useState<Theme | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Theme | null>(null);
  const [deleting, setDeleting] = useState(false);

  const baseThemes = themes.filter((t) => t.isBase);
  const modifierThemes = themes.filter((t) => !t.isBase);

  const fetchThemes = useCallback(async () => {
    try {
      const res = await fetch("/api/themes");
      const { data } = await res.json();
      setThemes(data ?? []);
    } catch {
      toast.error("Failed to load themes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchThemes();
  }, [fetchThemes]);

  function handleSaved(saved: Theme) {
    setThemes((prev) => {
      const idx = prev.findIndex((t) => t._id === saved._id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...saved };
        return next;
      }
      return [...prev, { ...saved, modificationCount: 0 }];
    });
  }

  async function handleRename(id: string, name: string) {
    const prev = themes.find((t) => t._id === id);
    setThemes((ts) => ts.map((t) => (t._id === id ? { ...t, name } : t)));
    try {
      const res = await fetch(`/api/themes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error();
      toast.success("Theme renamed");
    } catch {
      toast.error("Failed to rename theme");
      if (prev) setThemes((ts) => ts.map((t) => (t._id === id ? prev : t)));
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/themes/${deleteTarget._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setThemes((ts) => ts.filter((t) => t._id !== deleteTarget._id));
      toast.success("Theme deleted");
    } catch {
      toast.error("Failed to delete theme");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  function handleDragEnd(event: DragEndEvent, section: "base" | "modifier") {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const sectionThemes = section === "base" ? baseThemes : modifierThemes;
    const oldIndex = sectionThemes.findIndex((t) => t._id === active.id);
    const newIndex = sectionThemes.findIndex((t) => t._id === over.id);
    const reordered = arrayMove(sectionThemes, oldIndex, newIndex);

    const otherThemes = section === "base" ? modifierThemes : baseThemes;
    const allReordered =
      section === "base" ? [...reordered, ...otherThemes] : [...otherThemes, ...reordered];

    setThemes(allReordered);

    const items = reordered.map((t, i) => ({ id: t._id, position: i }));
    fetch("/api/themes/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    }).catch(() => toast.error("Failed to save order"));
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Themes"
        actions={
          <Button
            size="sm"
            onClick={() => {
              setEditingTheme(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            New Theme
          </Button>
        }
      />

      {loading ? (
        <div className="text-muted-foreground flex items-center justify-center gap-2 py-12 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading themes…
        </div>
      ) : (
        <div className="max-w-2xl space-y-10">
          <ThemeSection
            title="Base Themes"
            description="Provide a full set of token values. Use these as the foundation for modifier themes."
            themes={baseThemes}
            onEdit={(t) => {
              setEditingTheme(t);
              setDialogOpen(true);
            }}
            onDelete={setDeleteTarget}
            onRename={handleRename}
            onDragEnd={handleDragEnd}
          />

          <ThemeSection
            title="Modifier Themes"
            description="Override specific tokens on top of a base theme to create brand or platform variants."
            themes={modifierThemes}
            onEdit={(t) => {
              setEditingTheme(t);
              setDialogOpen(true);
            }}
            onDelete={setDeleteTarget}
            onRename={handleRename}
            onDragEnd={handleDragEnd}
          />

          {themes.length === 0 && !loading && (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <Layers className="text-muted-foreground h-8 w-8" />
              <p className="text-muted-foreground text-sm">No themes yet. Create your first one.</p>
              <Button
                size="sm"
                onClick={() => {
                  setEditingTheme(null);
                  setDialogOpen(true);
                }}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                New Theme
              </Button>
            </div>
          )}
        </div>
      )}

      <ThemeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        theme={editingTheme}
        onSaved={handleSaved}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{deleteTarget?.name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && deleteTarget.modificationCount > 0
                ? `This will also delete ${deleteTarget.modificationCount} override value${deleteTarget.modificationCount !== 1 ? "s" : ""} associated with this theme.`
                : "This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
