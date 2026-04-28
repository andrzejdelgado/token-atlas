import type React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center px-4 py-16 text-center", className)}
    >
      {icon && <div className="bg-muted text-muted-foreground mb-4 rounded-full p-4">{icon}</div>}
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="text-muted-foreground mt-1 max-w-xs text-sm">{description}</p>}
      {action && (
        <Button variant="outline" size="sm" className="mt-4" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
