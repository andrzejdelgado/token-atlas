"use client";

import { useState } from "react";
import { Clock, Trash2, CheckCheck, SquarePen, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TimestampCell } from "@/components/common/timestamp-cell";
import { FlagCell } from "./flag-cell";
import { cn } from "@/lib/utils";

const isColorValue = (v: string) => /^#|^rgb|^hsl|^oklch/.test(v);
import { toast } from "sonner";
import type { IToken } from "@/types/token";

interface ColumnDef {
  id: string;
  visible: boolean;
}

interface TokenRowProps {
  token: IToken & { updatedAt: Date | string };
  selected: boolean;
  overridden?: boolean;
  overrideDisabled?: boolean;
  onSelect: (id: string, checked: boolean) => void;
  onDelete: (id: string) => void;
  onFlagToggle: (id: string, flagged: boolean) => void;
  onRename: (id: string, name: string) => void;
  onHistoryOpen: (id: string) => void;
  onEditOpen: (id: string) => void;
  columns: ColumnDef[];
}

const TYPE_BADGE_COLORS: Record<string, string> = {
  Color: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-transparent",
  Number: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-transparent",
  String: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-transparent",
  Boolean: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-transparent",
};

export function TokenRow({
  token,
  selected,
  overridden = false,
  overrideDisabled = false,
  onSelect,
  onDelete,
  onFlagToggle,
  onRename,
  onHistoryOpen,
  onEditOpen,
  columns,
}: TokenRowProps) {
  const [hovered, setHovered] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameVal, setRenameVal] = useState(token.name);
  const [ellipsisDeleteConfirm, setEllipsisDeleteConfirm] = useState(false);

  async function commitRename() {
    const trimmed = renameVal.trim();
    setRenaming(false);
    if (!trimmed || trimmed === token.name) return;

    try {
      const res = await fetch(`/api/tokens/${token._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) throw new Error();
      onRename(token._id, trimmed);
    } catch {
      toast.error("Failed to rename token");
      setRenameVal(token.name);
    }
  }

  function isVisible(colId: string): boolean {
    const col = columns.find((c) => c.id === colId);
    return col?.visible ?? true;
  }

  const collectionName =
    typeof token.collection === "object" && token.collection !== null
      ? (token.collection as { name: string }).name
      : String(token.collection);

  return (
    <tr
      className={cn(
        "group/row hover:bg-muted/40 border-b transition-colors",
        selected && "bg-muted/60"
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Checkbox */}
      <td className="py-2 pr-1 pl-3" style={{ width: 40, minWidth: 40, maxWidth: 40 }}>
        <Checkbox
          checked={selected}
          onCheckedChange={(v) => onSelect(token._id, !!v)}
          aria-label={`Select ${token.name}`}
        />
      </td>

      {/* Name — always visible, locked */}
      <td className="py-2 pr-4 pl-2" style={{ minWidth: 192 }}>
        {renaming ? (
          <Input
            value={renameVal}
            autoFocus
            onChange={(e) => setRenameVal(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") {
                setRenaming(false);
                setRenameVal(token.name);
              }
            }}
            className="ring-ring focus-visible:ring-ring/50 h-5 rounded-sm border-0 px-1 py-0 text-xs shadow-none ring-1 focus-visible:ring-2 md:text-xs"
          />
        ) : (
          <span
            className="text-foreground block max-w-[280px] truncate text-xs"
            title={token.name}
            onDoubleClick={() => setRenaming(true)}
          >
            {token.name}
          </span>
        )}
      </td>

      {/* Type */}
      {isVisible("type") && (
        <td className="px-4 py-2">
          <Badge
            variant="secondary"
            className={cn("text-[11px]", TYPE_BADGE_COLORS[token.tokenType])}
          >
            {token.tokenType}
          </Badge>
        </td>
      )}

      {/* Light value */}
      {isVisible("lightValue") && (
        <td className="overflow-hidden px-4 py-2">
          <div className="flex min-w-0 items-center gap-2">
            {token.tokenType === "Color" && isColorValue(token.lightValue) && (
              <span
                className="border-border/50 h-4 w-4 shrink-0 rounded border"
                style={{ backgroundColor: token.lightValue }}
                title={`Light: ${token.lightValue}`}
              />
            )}
            <span
              className={cn(
                "truncate text-xs",
                overridden ? "text-blue-600" : overrideDisabled ? "text-red-500" : "text-foreground"
              )}
              title={token.lightValue}
            >
              {token.lightValue}
            </span>
            {overridden && (
              <CheckCheck className="h-3 w-3 shrink-0 text-blue-600" aria-label="Override active" />
            )}
            {overrideDisabled && (
              <X className="h-3 w-3 shrink-0 text-red-500" aria-label="Override inactive" />
            )}
          </div>
        </td>
      )}

      {/* Dark value */}
      {isVisible("darkValue") && (
        <td className="overflow-hidden px-4 py-2">
          <div className="flex min-w-0 items-center gap-2">
            {token.tokenType === "Color" && token.darkValue && isColorValue(token.darkValue) && (
              <span
                className="border-border/50 h-4 w-4 shrink-0 rounded border"
                style={{ backgroundColor: token.darkValue }}
                title={`Dark: ${token.darkValue}`}
              />
            )}
            <span
              className={cn(
                "truncate text-xs",
                overridden ? "text-blue-600" : overrideDisabled ? "text-red-500" : "text-foreground"
              )}
              title={token.darkValue ?? "—"}
            >
              {token.darkValue ?? "—"}
            </span>
            {overridden && (
              <CheckCheck className="h-3 w-3 shrink-0 text-blue-600" aria-label="Override active" />
            )}
            {overrideDisabled && (
              <X className="h-3 w-3 shrink-0 text-red-500" aria-label="Override inactive" />
            )}
          </div>
        </td>
      )}

      {/* Flag */}
      {isVisible("flag") && (
        <td className="px-4 py-2">
          <FlagCell flagged={token.flagged} tokenId={token._id} onToggle={onFlagToggle} />
        </td>
      )}

      {/* Components */}
      {isVisible("components") && (
        <td className="overflow-hidden px-4 py-2">
          <div className="flex flex-nowrap gap-1 overflow-hidden">
            {token.associatedComponents?.slice(0, 4).map((c, i) => (
              <Badge key={i} variant="outline" className="h-4 px-1.5 text-[10px] font-normal">
                {c}
              </Badge>
            ))}
            {Array.isArray(token.associatedComponents) && token.associatedComponents.length > 4 && (
              <Badge variant="secondary" className="h-4 px-1.5 text-[10px] font-normal">
                +{token.associatedComponents.length - 4}
              </Badge>
            )}
          </div>
        </td>
      )}

      {/* Labels */}
      {isVisible("labels") && (
        <td className="overflow-hidden px-4 py-2">
          <div className="flex flex-nowrap gap-1 overflow-hidden">
            {token.labels?.slice(0, 3).map((l, i) => (
              <Badge key={i} variant="secondary" className="h-4 px-1.5 text-[10px] font-normal">
                {l}
              </Badge>
            ))}
          </div>
        </td>
      )}

      {/* Collection */}
      {isVisible("collection") && (
        <td className="overflow-hidden px-4 py-2">
          <span className="text-muted-foreground block truncate text-xs">{collectionName}</span>
        </td>
      )}

      {/* Last modified */}
      {isVisible("lastModified") && (
        <td className="px-4 py-2">
          <TimestampCell date={token.updatedAt} />
        </td>
      )}

      {/* Actions */}
      <td className="w-10 py-2 pr-3">
        <div className={cn("flex items-center justify-end", !hovered && "opacity-0")}>
          <DropdownMenu
            onOpenChange={(open) => {
              if (!open) setEllipsisDeleteConfirm(false);
            }}
          >
            <DropdownMenuTrigger asChild>
              <button className="hover:bg-muted rounded p-1 transition-colors">
                <span className="text-muted-foreground text-sm leading-none font-bold">···</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onSelect={() => onEditOpen(token._id)}>
                <SquarePen className="mr-2 h-3.5 w-3.5" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onHistoryOpen(token._id)}>
                <Clock className="mr-2 h-3.5 w-3.5" /> View history
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {ellipsisDeleteConfirm ? (
                <DropdownMenuItem
                  onSelect={() => {
                    onDelete(token._id);
                    setEllipsisDeleteConfirm(false);
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" /> Confirm delete
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    setEllipsisDeleteConfirm(true);
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </td>
    </tr>
  );
}
