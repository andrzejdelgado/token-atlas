"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Home", href: "/" },
  { label: "All Semantics", href: "/tokens" },
  { label: "Advanced Search", href: "/search" },
  { label: "Themes", href: "/themes" },
  { label: "Connectors", href: "/connectors" },
  { label: "Import", href: "/import" },
  { label: "Export", href: "/export" },
];

export function TopNav() {
  const pathname = usePathname();

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
                "rounded-md px-3 py-1.5 transition-colors",
                isActive
                  ? "bg-muted text-foreground font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
