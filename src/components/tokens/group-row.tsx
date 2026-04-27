"use client";

import { useState } from "react";
import { ChevronRight, SquarePen } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface GroupRowProps {
  groupId: string;
  groupName: string;
  groupPath: string;
  tokenCount: number;
  depth: number;
  selectedCount: number;
  onSelectAll: (checked: boolean) => void;
  onEditOpen?: (id: string) => void;
  children: React.ReactNode;
}

export function GroupRow({
  groupId,
  groupName,
  tokenCount,
  depth,
  selectedCount,
  onSelectAll,
  onEditOpen,
  children,
}: GroupRowProps) {
  const [expanded, setExpanded] = useState(true);
  const [hovered, setHovered] = useState(false);
  const indeterminate = selectedCount > 0 && selectedCount < tokenCount;
  const allSelected = tokenCount > 0 && selectedCount === tokenCount;

  return (
    <>
      <tr
        data-group-header="true"
        data-group-name={groupName}
        data-group-depth={String(depth)}
        data-group-count={String(tokenCount)}
        className="border-b group/row cursor-pointer select-none bg-muted/20 transition-colors hover:bg-muted/40"
        onClick={() => setExpanded(!expanded)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <td
          className="py-2 pl-3 pr-1"
          style={{ width: 40, minWidth: 40, maxWidth: 40 }}
        >
          <Checkbox
            checked={allSelected}
            ref={(el) => {
              if (el) {
                const input = el.querySelector("button") as HTMLButtonElement | null;
                if (input) {
                  (input as unknown as { indeterminate: boolean }).indeterminate = indeterminate;
                }
              }
            }}
            data-state={indeterminate ? "indeterminate" : allSelected ? "checked" : "unchecked"}
            onCheckedChange={(v) => { onSelectAll(!!v); }}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Select all in ${groupName}`}
          />
        </td>
        <td
          colSpan={20}
          className="py-2 pr-3"
          style={{ paddingLeft: `${8 + depth * 12}px` }}
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground">{groupName}</span>
            <Badge variant="secondary" className="h-4 px-1.5 text-[10px] font-normal">
              {tokenCount}
            </Badge>
            <ChevronRight
              className={cn(
                "h-3.5 w-3.5 text-muted-foreground transition-transform shrink-0",
                expanded && "rotate-90"
              )}
            />
            {onEditOpen && (
              <div
                className={cn("ml-auto", !hovered && "opacity-0")}
                onClick={(e) => e.stopPropagation()}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="rounded p-1 hover:bg-muted transition-colors">
                      <span className="text-muted-foreground font-bold text-sm leading-none">···</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-36">
                    <DropdownMenuItem onSelect={() => onEditOpen(groupId)}>
                      <SquarePen className="mr-2 h-3.5 w-3.5" /> Edit
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </td>
      </tr>
      {expanded && children}
    </>
  );
}
