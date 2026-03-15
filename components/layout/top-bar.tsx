"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface TopBarProps {
  title?: string;
  initialUnreadCount?: number;
}

export function TopBar({ title, initialUnreadCount = 0 }: TopBarProps) {
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);

  // Poll unread count every 60s
  useEffect(() => {
    async function refresh() {
      try {
        const res = await fetch("/api/notifications?page=1");
        if (!res.ok) return;
        const data = await res.json();
        setUnreadCount(data.unreadCount ?? 0);
      } catch {
        // ignore
      }
    }

    const interval = setInterval(refresh, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-12 border-b border-border bg-white flex items-center justify-between px-5 flex-shrink-0">
      <div className="text-sm font-medium text-foreground">
        {title ?? ""}
      </div>
      <div className="flex items-center gap-2">
        <Link href="/notifications">
          <Button variant="ghost" size="icon" className="relative h-8 w-8">
            <Bell className="w-4 h-4 text-muted-foreground" />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-0.5 -right-0.5 h-3.5 min-w-3.5 px-0.5 text-[9px] rounded-full flex items-center justify-center"
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </Badge>
            )}
          </Button>
        </Link>
      </div>
    </header>
  );
}
