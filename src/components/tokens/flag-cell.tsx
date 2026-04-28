"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface FlagCellProps {
  flagged: boolean;
  tokenId: string;
  onToggle?: (id: string, flagged: boolean) => void;
  showOnHoverIfUnflagged?: boolean;
}

export function FlagCell({
  flagged,
  tokenId,
  onToggle,
  showOnHoverIfUnflagged = true,
}: FlagCellProps) {
  const [optimistic, setOptimistic] = useState(flagged);
  const [loading, setLoading] = useState(false);

  async function handleToggle(e: React.MouseEvent) {
    e.stopPropagation();
    const next = !optimistic;
    setOptimistic(next);
    setLoading(true);

    try {
      const res = await fetch(`/api/tokens/${tokenId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flagged: next }),
      });
      if (!res.ok) throw new Error();
      onToggle?.(tokenId, next);
    } catch {
      setOptimistic(!next);
      toast.error("Failed to update flag");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={cn(
        "group flex h-4 w-4 items-center justify-center rounded-full transition-all",
        !optimistic && showOnHoverIfUnflagged && "opacity-0 group-hover/row:opacity-100"
      )}
      title={optimistic ? "Unflag" : "Flag"}
    >
      <span
        className={cn(
          "h-2.5 w-2.5 rounded-full transition-colors",
          optimistic ? "bg-destructive" : "bg-muted-foreground/30 hover:bg-muted-foreground/60"
        )}
      />
    </button>
  );
}
