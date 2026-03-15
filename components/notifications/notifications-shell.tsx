"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, CheckCheck, ChevronRight, Clock } from "lucide-react";

interface Notification {
  id: string;
  type: string;
  title: string;
  content: string;
  category: string;
  isRead: boolean;
  isResolved: boolean;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  createdAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  PENDING_ACTIVATION: "待激活",
  PENDING_ASSIGNMENT: "待分配",
  TASK_PENDING_CONFIRM: "待确认",
  RESULT_GENERATED: "成果已生成",
  TASK_CONTINUABLE: "可继续处理",
  IMPORT_RESULT: "导入结果",
};

function getEntityHref(type: string | null, id: string | null): string | null {
  if (!type || !id) return null;
  if (type === "Task") return `/task/${id}/workspace`;
  if (type === "TaskResult") return `/task/${id}/result`;
  return null;
}

function formatRelative(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}小时前`;
  return `${Math.floor(h / 24)}天前`;
}

export function NotificationsShell() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    fetchNotifications();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  async function fetchNotifications() {
    setLoading(true);
    try {
      const res = await fetch(`/api/notifications?page=${page}`);
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications);
      setTotal(data.total);
      setUnreadCount(data.unreadCount);
    } finally {
      setLoading(false);
    }
  }

  async function markRead(id: string) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  async function markAllRead() {
    setMarkingAll(true);
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } finally {
      setMarkingAll(false);
    }
  }

  const pageSize = 20;
  const pageCount = Math.ceil(total / pageSize);

  return (
    <div className="max-w-2xl mx-auto px-6 py-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Bell className="w-5 h-5" /> 通知中心
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {unreadCount > 0 ? `${unreadCount} 条未读` : "全部已读"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            disabled={markingAll}
            onClick={markAllRead}
          >
            <CheckCheck className="w-3.5 h-3.5 mr-1.5" />
            {markingAll ? "处理中..." : "全部标为已读"}
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">暂无通知</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {notifications.map((n) => {
            const href = getEntityHref(n.relatedEntityType, n.relatedEntityId);
            const isAction = n.category === "ACTION_REQUIRED";

            return (
              <div
                key={n.id}
                className={`relative flex items-start gap-3 p-3.5 rounded-lg border transition-colors ${
                  n.isRead
                    ? "border-border bg-white"
                    : "border-primary/20 bg-primary/5"
                }`}
                onClick={() => !n.isRead && markRead(n.id)}
              >
                {/* Unread dot */}
                {!n.isRead && (
                  <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-2" />
                )}

                <div className="flex-1 min-w-0" style={n.isRead ? { paddingLeft: "0.375rem" } : {}}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium">{n.title}</p>
                    <Badge
                      variant={isAction ? "destructive" : "secondary"}
                      className="text-[10px] h-4 px-1.5"
                    >
                      {TYPE_LABELS[n.type] ?? n.type}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.content}</p>
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {formatRelative(n.createdAt)}
                  </div>
                </div>

                {href && (
                  <Link
                    href={href}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 text-xs text-primary hover:underline flex-shrink-0 mt-0.5"
                  >
                    查看 <ChevronRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}

      {pageCount > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</Button>
          <span className="flex items-center text-sm text-muted-foreground px-2">{page} / {pageCount}</span>
          <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => setPage(page + 1)}>下一页</Button>
        </div>
      )}
    </div>
  );
}
