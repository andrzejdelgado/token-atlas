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
    <div className="flex flex-col items-center justify-center h-full py-20 space-y-4 text-center px-4">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="text-sm text-muted-foreground max-w-md break-all">
        {error.message || "An unexpected error occurred"}
      </p>
      {error.digest && (
        <p className="text-xs text-muted-foreground">Digest: {error.digest}</p>
      )}
      <button
        onClick={reset}
        className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium"
      >
        Try again
      </button>
    </div>
  );
}
