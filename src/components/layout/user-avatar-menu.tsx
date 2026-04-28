"use client";

import { useState, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "next-themes";
import Link from "next/link";
import { LogOut, Moon, Sun, Globe, Settings, Bell } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TimestampCell } from "@/components/common/timestamp-cell";
import { cn } from "@/lib/utils";
import type { INotification } from "@/types/notification";

const TYPE_ICONS: Record<INotification["type"], string> = {
  token_created: "✦",
  token_deleted: "✕",
  import: "↓",
  export: "↑",
  figma_sync: "◈",
  storybook_sync: "◉",
  sync_error: "⚠",
  peer_review_assigned: "◎",
};

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return email?.[0]?.toUpperCase() ?? "U";
}

export function UserAvatarMenu() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const [langOpen, setLangOpen] = useState(false);
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const unread = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    function fetchNotifications() {
      fetch("/api/notifications")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => data && setNotifications(data.data ?? []))
        .catch(() => {});
    }
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(interval);
  }, []);

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  async function handleLogout() {
    await signOut({ callbackUrl: "/login" });
  }

  async function setLanguage(lang: string) {
    await fetch("/api/settings/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: lang }),
    });
    window.location.reload();
  }

  const user = session?.user;
  const initials = getInitials(user?.name, user?.email);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="hover:bg-sidebar-accent flex w-full items-center gap-2 rounded-md px-2 py-1.5 transition-colors outline-none">
          <Avatar className="h-6 w-6 shrink-0">
            <AvatarImage src={user?.image ?? undefined} />
            <AvatarFallback
              suppressHydrationWarning
              className="bg-foreground text-background text-[10px]"
            >
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="truncate text-sm font-medium">{user?.name ?? user?.email}</span>
          {unread > 0 && (
            <Badge
              variant="destructive"
              className="pointer-events-none ml-auto h-4 w-4 shrink-0 justify-center p-0 text-[10px] font-medium"
            >
              {unread > 9 ? "9+" : unread}
            </Badge>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" side="top" className="mb-1 w-52">
        <DropdownMenuLabel className="text-muted-foreground truncate text-xs font-normal">
          {user?.email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Settings */}
        <DropdownMenuItem asChild>
          <Link href="/settings" className="flex cursor-pointer items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </DropdownMenuItem>

        {/* Notifications sub-menu */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span>Notifications</span>
            {unread > 0 && (
              <Badge
                variant="destructive"
                className="pointer-events-none ml-auto h-4 w-4 justify-center p-0 text-[10px] font-medium"
              >
                {unread > 9 ? "9+" : unread}
              </Badge>
            )}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-80 p-0" sideOffset={4}>
            <div className="flex items-center justify-between border-b px-4 py-3">
              <span className="text-sm font-semibold">Notifications</span>
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-muted-foreground hover:text-foreground text-xs transition-colors"
                >
                  Mark all as read
                </button>
              )}
            </div>
            <ScrollArea className="h-72">
              {notifications.length === 0 ? (
                <div className="text-muted-foreground flex flex-col items-center justify-center py-10 text-sm">
                  No notifications
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.map((n) => (
                    <div
                      key={n._id}
                      className={cn("flex gap-3 px-4 py-3 text-sm", !n.read && "bg-muted/40")}
                    >
                      <span className="text-muted-foreground mt-0.5 w-4 shrink-0 text-xs">
                        {TYPE_ICONS[n.type]}
                      </span>
                      <div className="flex min-w-0 flex-col gap-1">
                        <span className="text-sm leading-tight">{n.message}</span>
                        {n.type === "peer_review_assigned" &&
                          typeof n.metadata?.themeId === "string" && (
                            <Link
                              href={`/themes/${n.metadata.themeId}/review`}
                              className="text-primary text-xs hover:underline"
                            >
                              Review theme →
                            </Link>
                          )}
                        <TimestampCell date={n.createdAt} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        {/* Dark mode */}
        <DropdownMenuItem
          onSelect={(e) => e.preventDefault()}
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="flex cursor-pointer items-center gap-2"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </DropdownMenuItem>

        {/* Language */}
        <DropdownMenuItem
          onSelect={(e) => e.preventDefault()}
          onClick={() => setLangOpen(!langOpen)}
          className="flex cursor-pointer items-center gap-2"
        >
          <Globe className="h-4 w-4" />
          Language
        </DropdownMenuItem>
        {langOpen && (
          <>
            <DropdownMenuItem
              onClick={() => setLanguage("en")}
              className="cursor-pointer pl-8 text-sm"
            >
              🇺🇸 English
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setLanguage("es")}
              className="cursor-pointer pl-8 text-sm"
            >
              🇪🇸 Español
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          className="text-destructive focus:text-destructive flex cursor-pointer items-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
