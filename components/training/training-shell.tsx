"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Swords, Clock, ChevronRight, Target, TrendingUp, CheckCircle2 } from "lucide-react";

interface TrainingTask {
  id: string;
  title: string | null;
  summary: string | null;
  taskType: "PLAN" | "ANALYSIS" | "PROCESS";
  status: string;
  updatedAt: string;
}

interface TrainingStats {
  total: number;
  completed: number;
  inProgress: number;
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
};

const PENDING_STATUSES = new Set(["CREATED", "DEFINING", "PENDING_DIRECTION", "EXECUTING", "PENDING_DRAFT"]);

function formatRelative(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}小时前`;
  return `${Math.floor(h / 24)}天前`;
}

export function TrainingShell() {
  const router = useRouter();
  const [tasks, setTasks] = useState<TrainingTask[]>([]);
  const [stats, setStats] = useState<TrainingStats>({ total: 0, completed: 0, inProgress: 0 });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"active" | "completed">("active");

  useEffect(() => {
    fetchTasks();
  }, []);

  async function fetchTasks() {
    setLoading(true);
    try {
      // Fetch all training tasks (no status filter so we get them all)
      const res = await fetch("/api/tasks?sourceType=TRAINING&page=1");
      if (!res.ok) return;
      const data = await res.json();
      const allTasks: TrainingTask[] = data.tasks;
      setTasks(allTasks);
      setStats({
        total: data.total,
        completed: allTasks.filter((t) => t.status === "COMPLETED").length,
        inProgress: allTasks.filter((t) => PENDING_STATUSES.has(t.status)).length,
      });
    } finally {
      setLoading(false);
    }
  }

  const activeTasks = tasks.filter((t) => PENDING_STATUSES.has(t.status));
  const completedTasks = tasks.filter((t) => t.status === "COMPLETED");
  const displayed = tab === "active" ? activeTasks : completedTasks;

  return (
    <div className="max-w-3xl mx-auto px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Swords className="w-5 h-5 text-primary" /> 练兵场
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">在安全环境中练习 AI 协作，不计入战时绩效</p>
        </div>
        <Button
          size="sm"
          className="bg-primary hover:bg-primary/90"
          onClick={() => router.push("/task/new?mode=training")}
        >
          <Swords className="w-3.5 h-3.5 mr-1.5" /> 发起练兵
        </Button>
      </div>

      {/* Stats */}
      {!loading && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <StatCard icon={<Target className="w-4 h-4 text-primary" />} label="累计练兵" value={stats.total} />
          <StatCard icon={<TrendingUp className="w-4 h-4 text-amber-500" />} label="进行中" value={stats.inProgress} />
          <StatCard icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />} label="已完成" value={stats.completed} />
        </div>
      )}

      {/* What is training mode */}
      <div className="rounded-lg bg-primary/5 border border-primary/10 p-4 mb-5">
        <p className="text-sm font-medium text-primary mb-1">什么是练兵？</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          练兵任务与战时任务完全相同的 AI 协作流程，但标记为练习场景，不计入正式绩效统计。
          适合新人熟悉 AI 协作节奏，或对新业务场景进行方案预演。
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-border">
        {(["active", "completed"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm border-b-2 transition-colors -mb-px ${
              tab === t
                ? "border-primary text-primary font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "active" ? `进行中（${activeTasks.length}）` : `已完成（${completedTasks.length}）`}
          </button>
        ))}
      </div>

      {/* Task list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-xl">
          <p className="text-sm text-muted-foreground">
            {tab === "active" ? "暂无进行中的练兵任务" : "暂无已完成的练兵记录"}
          </p>
          {tab === "active" && (
            <button
              className="text-xs text-primary hover:underline mt-1"
              onClick={() => router.push("/task/new?mode=training")}
            >
              去发起第一个练兵任务
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map((task) => {
            const sm = STATUS_META[task.status];
            const href = task.status === "COMPLETED"
              ? `/task/${task.id}/result`
              : `/task/${task.id}/workspace`;
            return (
              <Link
                key={task.id}
                href={href}
                className="flex items-center gap-3 p-3.5 rounded-lg border border-border bg-white hover:bg-accent transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {task.title ?? task.summary ?? "（无标题）"}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-muted-foreground">
                      {TASK_TYPE_LABELS[task.taskType]}
                    </span>
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5">练兵</Badge>
                    {sm && (
                      <Badge variant={sm.variant} className="text-[10px] h-4 px-1.5">
                        {sm.label}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                  <Clock className="w-3 h-3" />
                  {formatRelative(task.updatedAt)}
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground flex-shrink-0" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-white p-3">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}
