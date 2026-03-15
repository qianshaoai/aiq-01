"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Search, ChevronRight, Plus } from "lucide-react";

interface Task {
  id: string;
  title: string | null;
  summary: string | null;
  taskType: "PLAN" | "ANALYSIS" | "PROCESS";
  status: string;
  sourceType: string;
  updatedAt: string;
}

const TASK_TYPE_LABELS: Record<string, string> = {
  PLAN: "方案类", ANALYSIS: "分析类", PROCESS: "流程优化类",
};

const STATUS_META: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  CREATED: { label: "已创建", variant: "secondary" },
  DEFINING: { label: "框定中", variant: "secondary" },
  PENDING_DIRECTION: { label: "待确认方向", variant: "destructive" },
  EXECUTING: { label: "执行中", variant: "default" },
  PENDING_DRAFT: { label: "待确认初稿", variant: "destructive" },
  COMPLETED: { label: "已完成", variant: "outline" },
  ARCHIVED: { label: "已归档", variant: "outline" },
};

export function TaskHistoryShell() {
  const router = useRouter();
  const params = useSearchParams();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(params.get("q") ?? "");
  const [statusFilter, setStatusFilter] = useState(params.get("status") ?? "");
  const [typeFilter, setTypeFilter] = useState(params.get("type") ?? "");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => fetchTasks(), 300);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, typeFilter, page]);

  async function fetchTasks() {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (search) qs.set("q", search);
      if (statusFilter) qs.set("status", statusFilter);
      if (typeFilter) qs.set("type", typeFilter);
      qs.set("page", String(page));

      const res = await fetch(`/api/tasks?${qs}`);
      if (!res.ok) return;
      const data = await res.json();
      setTasks(data.tasks);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }

  const pageSize = 20;
  const pageCount = Math.ceil(total / pageSize);

  return (
    <div className="max-w-3xl mx-auto px-6 py-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-semibold">任务历史</h1>
          <p className="text-sm text-muted-foreground mt-0.5">共 {total} 条任务</p>
        </div>
        <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={() => router.push("/task/new")}>
          <Plus className="w-3.5 h-3.5 mr-1.5" /> 发起任务
        </Button>
      </div>

      {/* 筛选栏 */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="搜索任务标题或关键词"
            className="pl-8 h-8 text-sm"
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v: string | null) => { setStatusFilter(v ?? ""); setPage(1); }}>
          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="全部状态" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">全部状态</SelectItem>
            {Object.entries(STATUS_META).map(([k, v]) => (
              <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={(v: string | null) => { setTypeFilter(v ?? ""); setPage(1); }}>
          <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="全部类型" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">全部类型</SelectItem>
            {Object.entries(TASK_TYPE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 任务列表 */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-xl">
          <p className="text-sm text-muted-foreground">暂无任务记录</p>
          <p className="text-xs text-muted-foreground mt-1">
            <button className="text-primary hover:underline" onClick={() => router.push("/task/new")}>
              去发起第一个任务
            </button>
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => {
            const sm = STATUS_META[task.status];
            return (
              <Link
                key={task.id}
                href={task.status === "COMPLETED" ? `/task/${task.id}/result` : `/task/${task.id}/workspace`}
                className="flex items-center gap-3 p-3.5 rounded-lg border border-border bg-white hover:bg-accent transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {task.title ?? task.summary ?? "（无标题）"}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-muted-foreground">{TASK_TYPE_LABELS[task.taskType]}</span>
                    {task.sourceType === "TRAINING" && (
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5">练兵</Badge>
                    )}
                    {sm && <Badge variant={sm.variant} className="text-[10px] h-4 px-1.5">{sm.label}</Badge>}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                  <Clock className="w-3 h-3" />
                  {formatRelative(new Date(task.updatedAt))}
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground flex-shrink-0" />
              </Link>
            );
          })}
        </div>
      )}

      {/* 分页 */}
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

function formatRelative(date: Date): string {
  const diff = Date.now() - date.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}小时前`;
  return `${Math.floor(h / 24)}天前`;
}
