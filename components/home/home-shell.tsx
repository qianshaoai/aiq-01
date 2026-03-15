"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Swords,
  Dumbbell,
  FileText,
  BarChart2,
  GitBranch,
  ArrowRight,
  Clock,
  TrendingUp,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import type { TaskStatus, TaskType, UserRole, UserStatus } from "@/lib/generated/prisma";

interface RecentTask {
  id: string;
  title: string | null;
  summary: string | null;
  taskType: TaskType;
  status: TaskStatus;
  updatedAt: Date;
}

interface LatestReceipt {
  summaryOfCompletion: string | null;
  strengthSummary: string | null;
  nextActionSuggestion: string | null;
  createdAt: Date;
}

interface HomeShellProps {
  user: { id: string; name: string; role: UserRole; status: UserStatus };
  recentTasks: RecentTask[];
  latestReceipt: LatestReceipt | null;
}

const TASK_TYPE_LABELS: Record<TaskType, string> = {
  PLAN: "方案类",
  ANALYSIS: "分析类",
  PROCESS: "流程优化类",
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  CREATED: "已创建",
  DEFINING: "框定中",
  PENDING_DIRECTION: "待确认方向",
  EXECUTING: "执行中",
  PENDING_DRAFT: "待确认初稿",
  COMPLETED: "已完成",
  ARCHIVED: "已归档",
  IN_RECYCLE_BIN: "回收站",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING_DIRECTION: "destructive",
  PENDING_DRAFT: "destructive",
  EXECUTING: "default",
  DEFINING: "secondary",
  CREATED: "secondary",
};

export function HomeShell({ user, recentTasks, latestReceipt }: HomeShellProps) {
  const router = useRouter();
  const isPending = user.status === "PENDING" || user.status === "PENDING_ASSIGNMENT";

  return (
    <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
      {/* 待激活提示 */}
      {isPending && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {user.status === "PENDING"
              ? "你的账号正在等待激活，部分功能暂时受限。请等待团队负责人或企业管理员确认。"
              : "你的账号已进入企业，正在等待分配到团队，请联系企业管理员。"}
          </AlertDescription>
        </Alert>
      )}

      {/* 欢迎 + 主入口 */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">
          你好，{user.name}
        </h2>
        <p className="text-sm text-muted-foreground mb-4">今天要做什么？</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => router.push("/task/new?mode=war")}
            disabled={isPending}
            className="flex items-center gap-3 p-4 rounded-xl border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Swords className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground text-sm">我今天要解决一个真实问题</p>
              <p className="text-xs text-muted-foreground mt-0.5">战时模式 · 直接开始任务</p>
            </div>
            <ChevronRight className="w-4 h-4 text-primary/40 group-hover:text-primary transition-colors flex-shrink-0" />
          </button>

          <button
            onClick={() => router.push("/training")}
            disabled={isPending}
            className="flex items-center gap-3 p-4 rounded-xl border border-border bg-white hover:bg-accent hover:border-border transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <Dumbbell className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground text-sm">我先练一下 AI 协作</p>
              <p className="text-xs text-muted-foreground mt-0.5">练兵模式 · 轻量训练</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors flex-shrink-0" />
          </button>
        </div>
      </div>

      {/* 快捷任务入口 */}
      {!isPending && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">快速发起</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { type: "PLAN", label: "做一个方案", icon: FileText },
              { type: "ANALYSIS", label: "做一个分析", icon: BarChart2 },
              { type: "PROCESS", label: "优化一个流程", icon: GitBranch },
            ].map(({ type, label, icon: Icon }) => (
              <Link
                key={type}
                href={`/task/new?mode=war&type=${type}`}
                className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-border bg-white hover:bg-accent hover:border-border/80 transition-all text-center"
              >
                <Icon className="w-4 h-4 text-primary" />
                <span className="text-xs text-foreground font-medium">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 继续上次任务 */}
      {recentTasks.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">继续处理</p>
            <Link href="/tasks" className="text-xs text-primary hover:underline">
              全部任务
            </Link>
          </div>
          <div className="space-y-2">
            {recentTasks.map((task) => (
              <Link
                key={task.id}
                href={task.status === "COMPLETED" ? `/task/${task.id}/result` : `/task/${task.id}/workspace`}
                className="flex items-center gap-3 p-3 rounded-lg border border-border bg-white hover:bg-accent transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {task.title ?? task.summary ?? "（无标题任务）"}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">{TASK_TYPE_LABELS[task.taskType]}</span>
                    <Badge variant={STATUS_VARIANT[task.status] ?? "secondary"} className="h-4 text-[10px] px-1.5">
                      {STATUS_LABELS[task.status]}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                  <Clock className="w-3 h-3" />
                  {formatRelativeTime(task.updatedAt)}
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors flex-shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 空状态：没有任务时 */}
      {recentTasks.length === 0 && !isPending && (
        <div className="text-center py-8 border border-dashed border-border rounded-xl bg-white">
          <p className="text-sm text-muted-foreground">你还没有开始任何任务</p>
          <p className="text-xs text-muted-foreground mt-1">点击上方按钮发起第一个真实问题</p>
        </div>
      )}

      {/* 轻量成长区 */}
      {latestReceipt && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              最近成长
            </p>
          </div>
          <Card className="bg-white">
            <CardContent className="pt-4 pb-4">
              {latestReceipt.summaryOfCompletion && (
                <p className="text-sm text-foreground">{latestReceipt.summaryOfCompletion}</p>
              )}
              {latestReceipt.strengthSummary && (
                <p className="text-xs text-muted-foreground mt-1">✓ {latestReceipt.strengthSummary}</p>
              )}
              {latestReceipt.nextActionSuggestion && (
                <p className="text-xs text-primary mt-1.5">→ {latestReceipt.nextActionSuggestion}</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function formatRelativeTime(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  return `${days} 天前`;
}
