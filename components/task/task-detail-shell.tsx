"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, ChevronDown, ChevronUp, ArrowRight, FileText } from "lucide-react";

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

const STAGE_LABELS: Record<string, string> = {
  DEFINING: "任务框定",
  EXECUTING: "任务执行",
  REVIEWING: "成果评审",
  COMPLETED: "任务完成",
};

interface StageRecord {
  stageType: string;
  summary: string | null;
  status: string;
  createdAt: Date;
}

interface Material {
  id: string;
  materialType: string;
  fileName: string | null;
  parseStatus: string;
}

interface TaskDetail {
  id: string;
  title: string | null;
  goal: string | null;
  outputType: string | null;
  completionCriteria: string | null;
  taskType: string;
  status: string;
  currentStage: string | null;
  updatedAt: Date;
  createdAt: Date;
  materials: Material[];
  stageRecords: StageRecord[];
  latestResult: { id: string; summary: string | null; content: string | null } | null;
}

function formatRelative(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}小时前`;
  return `${Math.floor(h / 24)}天前`;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function getMainAction(status: string, taskId: string) {
  switch (status) {
    case "PENDING_DIRECTION":
      return { label: "确认执行方向", href: `/task/${taskId}/workspace` };
    case "PENDING_DRAFT":
      return { label: "确认初稿内容", href: `/task/${taskId}/workspace` };
    case "EXECUTING":
    case "DEFINING":
      return { label: "进入工作区", href: `/task/${taskId}/workspace` };
    case "COMPLETED":
      return { label: "查看成果", href: `/task/${taskId}/result` };
    default:
      return null;
  }
}

export function TaskDetailShell({ task }: { task: TaskDetail }) {
  const sm = STATUS_META[task.status];
  const action = getMainAction(task.status, task.id);

  return (
    <div className="max-w-2xl mx-auto px-6 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs text-muted-foreground">{TASK_TYPE_LABELS[task.taskType] ?? task.taskType}</span>
            {sm && <Badge variant={sm.variant} className="text-[10px] h-4 px-1.5">{sm.label}</Badge>}
          </div>
          <h1 className="text-lg font-semibold leading-snug">
            {task.title ?? task.goal ?? "（无标题任务）"}
          </h1>
          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>更新于 {formatRelative(task.updatedAt)}</span>
          </div>
        </div>
        {action && (
          <Link
            href={action.href}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex-shrink-0"
          >
            {action.label} <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* Task Card */}
      {(task.goal || task.outputType || task.completionCriteria) && (
        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
          {task.goal && (
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">目标</p>
              <p className="text-sm">{task.goal}</p>
            </div>
          )}
          {task.outputType && (
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">产出形式</p>
              <p className="text-sm">{task.outputType}</p>
            </div>
          )}
          {task.completionCriteria && (
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">完成标准</p>
              <p className="text-sm">{task.completionCriteria}</p>
            </div>
          )}
        </div>
      )}

      {/* Latest Result */}
      {task.latestResult && (
        <div className="rounded-lg border border-border bg-white p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">最新成果摘要</p>
          <p className="text-sm leading-relaxed line-clamp-4">
            {task.latestResult.summary ?? task.latestResult.content ?? "暂无摘要"}
          </p>
          {task.status === "COMPLETED" && (
            <Link
              href={`/task/${task.id}/result`}
              className="inline-flex items-center gap-1 mt-3 text-xs text-primary hover:underline"
            >
              查看完整成果 <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>
      )}

      {/* Materials */}
      {task.materials.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">参考材料（{task.materials.length}）</p>
          <div className="space-y-1">
            {task.materials.map((m) => (
              <div key={m.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{m.fileName ?? (m.materialType === "TEXT" ? "文本材料" : "文件")}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stage Timeline */}
      {task.stageRecords.length > 0 && (
        <StageTimeline stages={task.stageRecords} />
      )}

      {/* Post-completion actions */}
      {task.status === "COMPLETED" && (
        <div className="rounded-lg border border-dashed border-border p-4 space-y-2">
          <p className="text-xs text-muted-foreground text-center mb-3">任务已完成，继续探索</p>
          <div className="flex gap-2">
            <Link
              href={`/task/${task.id}/workspace`}
              className="flex-1 inline-flex justify-center items-center gap-1.5 px-3 py-2 rounded-md border border-border text-sm hover:bg-accent transition-colors"
            >
              继续深化
            </Link>
            <Link
              href={`/task/new?baseTaskId=${task.id}`}
              className="flex-1 inline-flex justify-center items-center gap-1.5 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              基于此成果开新任务
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function StageTimeline({ stages }: { stages: StageRecord[] }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-3">阶段进展</p>
      <div className="space-y-3">
        {stages.map((stage, i) => (
          <StageItem key={i} stage={stage} isLast={i === stages.length - 1} />
        ))}
      </div>
    </div>
  );
}

function StageItem({ stage, isLast }: { stage: StageRecord; isLast: boolean }) {
  const isDone = stage.status === "COMPLETED" || stage.status === "DONE";

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${isDone ? "bg-primary" : "bg-muted-foreground/30"}`} />
        {!isLast && <div className="w-px flex-1 bg-border mt-1" />}
      </div>
      <div className="flex-1 pb-3 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">{STAGE_LABELS[stage.stageType] ?? stage.stageType}</p>
          <span className="text-xs text-muted-foreground flex-shrink-0">{formatDate(stage.createdAt)}</span>
        </div>
        {stage.summary && (
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{stage.summary}</p>
        )}
      </div>
    </div>
  );
}
