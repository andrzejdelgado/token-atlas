"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { TimestampCell } from "@/components/common/timestamp-cell";
import type { INotificationDoc } from "@/lib/db/models/notification.model";

export function NotificationsCard({
  initialNotifications,
}: {
  initialNotifications: INotificationDoc[];
}) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const unread = notifications.filter((n) => !n.read).length;

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  if (notifications.length === 0) return null;

  return (
    <Card className="py-2">
      <div className="flex items-center justify-between border-b px-6 py-3">
        <span className="text-sm font-medium">Notifications</span>
        {unread > 0 && (
          <button
            onClick={markAllRead}
            className="text-muted-foreground hover:text-foreground text-xs transition-colors"
          >
            Mark all as read
          </button>
        )}
      </div>
      <CardContent className="divide-border divide-y p-0">
        {notifications.map((n) => (
          <div key={n._id.toString()} className="flex items-start gap-3 px-6 py-4">
            <Bell className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-foreground text-sm">{n.message}</p>
              {typeof n.metadata?.themeId === "string" && (
                <Link
                  href={`/themes/${n.metadata.themeId}/review`}
                  className="text-primary mt-0.5 inline-block text-xs hover:underline"
                >
                  Review theme →
                </Link>
              )}
            </div>
            <span className="text-muted-foreground shrink-0 text-xs">
              <TimestampCell date={n.createdAt} className="inline" />
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
