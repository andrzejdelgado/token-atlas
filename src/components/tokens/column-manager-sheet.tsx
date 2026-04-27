"use client";

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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { GripVertical, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface ColumnDef {
  id: string;
  label: string;
  visible: boolean;
  locked?: boolean;
}

interface ColumnManagerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columns: ColumnDef[];
  onColumnsChange: (columns: ColumnDef[]) => void;
}

const DEFAULT_VISIBLE = ["name", "type", "lightValue", "darkValue", "swatch", "flag", "themes", "labels", "lastModified"];

function SortableRow({ col, onToggle }: { col: ColumnDef; onToggle: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: col.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center justify-between rounded-md px-2 py-2 hover:bg-muted select-none",
        isDragging && "opacity-50 bg-muted z-50"
      )}
    >
      <div className="flex items-center gap-2">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-0.5 rounded text-muted-foreground/40 hover:text-muted-foreground transition-colors touch-none"
          tabIndex={-1}
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        {col.locked && <Lock className="h-3 w-3 text-muted-foreground/60 shrink-0" />}
        <span className="text-sm">{col.label}</span>
      </div>
      <Switch
        checked={col.visible}
        onCheckedChange={() => onToggle(col.id)}
        disabled={col.locked}
      />
    </div>
  );
}

export function ColumnManagerSheet({ open, onOpenChange, columns, onColumnsChange }: ColumnManagerSheetProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function toggle(id: string) {
    onColumnsChange(columns.map((c) => (c.id === id && !c.locked ? { ...c, visible: !c.visible } : c)));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = columns.findIndex((c) => c.id === active.id);
    const newIndex = columns.findIndex((c) => c.id === over.id);
    onColumnsChange(arrayMove(columns, oldIndex, newIndex));
  }

  function resetDefaults() {
    onColumnsChange(columns.map((c) => ({ ...c, visible: DEFAULT_VISIBLE.includes(c.id) })));
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[360px] flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-5 border-b">
          <SheetTitle className="text-base">Manage columns</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={columns.map((c) => c.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-0.5">
                {columns.map((col) => (
                  <SortableRow key={col.id} col={col} onToggle={toggle} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* ── Footer ───────────────────────────── */}
        <div className="flex gap-2 px-6 py-4 border-t">
          <Button variant="outline" className="flex-1" onClick={resetDefaults}>
            Reset defaults
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
