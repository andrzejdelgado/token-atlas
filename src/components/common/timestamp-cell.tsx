"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { formatTimestamp, isLessThanOneHourOld } from "@/lib/utils/time";

interface TimestampCellProps {
  date: Date | string | null | undefined;
  className?: string;
}

export function TimestampCell({ date, className }: TimestampCellProps) {
  const dateObj = date
    ? (typeof date === "string" ? new Date(date) : date)
    : undefined;

  const [display, setDisplay] = useState(() =>
    dateObj ? formatTimestamp(dateObj) : "—"
  );

  useEffect(() => {
    if (!dateObj || !isLessThanOneHourOld(dateObj)) return;
    const interval = setInterval(() => {
      setDisplay(formatTimestamp(dateObj));
    }, 30_000);
    return () => clearInterval(interval);
  }, [dateObj]);

  if (!dateObj) {
    return (
      <span className={cn("text-xs tabular-nums text-muted-foreground", className)}>
        —
      </span>
    );
  }

  return (
    <time
      dateTime={dateObj.toISOString()}
      title={dateObj.toISOString()}
      className={cn("text-xs tabular-nums text-muted-foreground", className)}
    >
      {display}
    </time>
  );
}
