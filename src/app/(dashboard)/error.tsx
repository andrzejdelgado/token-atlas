"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Dashboard Error]", error.message, error.stack);
  }, [error]);

  return (
    <div className="flex h-full flex-col items-center justify-center space-y-4 px-4 py-20 text-center">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="text-muted-foreground max-w-md text-sm break-all">
        {error.message || "An unexpected error occurred"}
      </p>
      {error.digest && <p className="text-muted-foreground text-xs">Digest: {error.digest}</p>}
      <button
        onClick={reset}
        className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium"
      >
        Try again
      </button>
    </div>
  );
}
