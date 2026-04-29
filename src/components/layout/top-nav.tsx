"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Home", href: "/" },
  { label: "Semantics", href: "/tokens" },
  { label: "Themes", href: "/themes" },
  { label: "Sync", href: "/connectors" },
];

const DATA_TRANSFER_ITEMS = [
  { label: "Import", href: "/import" },
  { label: "Export", href: "/export" },
];

export function TopNav() {
  const pathname = usePathname();
  const isDataTransferActive = DATA_TRANSFER_ITEMS.some((i) => pathname.startsWith(i.href));

  return (
    <div className="flex h-14 shrink-0 items-center border-b px-6">
      <nav className="flex items-center gap-1 text-sm">
        {NAV_ITEMS.map(({ label, href }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "rounded-md px-3 py-1.5 whitespace-nowrap transition-colors",
                isActive
                  ? "bg-muted text-foreground font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {label}
            </Link>
          );
        })}

        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              "flex items-center gap-1 rounded-md px-3 py-1.5 whitespace-nowrap transition-colors outline-none",
              isDataTransferActive
                ? "bg-muted text-foreground font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            Data Transfer
            <ChevronDown className="h-3.5 w-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {DATA_TRANSFER_ITEMS.map(({ label, href }) => (
              <DropdownMenuItem key={href} asChild>
                <Link href={href}>{label}</Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>
    </div>
  );
}
