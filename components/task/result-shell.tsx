"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Copy, Download, ChevronDown, ChevronUp, ArrowRight,
  Plus, BookOpen, Building2, CheckCircle2, Clock,
} from "lucide-react";
import type { TaskType, StageType } from "@/lib/generated/prisma";

interface StageRecord {
  stageType: StageType;
  summary: string | null;
  createdAt: Date;
}

interface ResultShellProps {
  task: {
    id: string;
    title: string | null;
    goal: string | null;
    outputType: string | null;
    taskType: TaskType;
    status: string;
    stageRecords: StageRecord[];
  };
  result: {
    id: string;
    title: string | null;
    summary: string | null;
    content: string | null;
    versionNo: number;
  } | null;
}

const TASK_TYPE_LABELS: Record<TaskType, string> = {
  PLAN: "方案类",
  ANALYSIS: "分析类",
  PROCESS: "流程优化类",
};

const STAGE_LABELS: Record<StageType, string> = {
  DEFINING: "已完成任务框定",
  DIRECTION: "已确认方向与结构",
  DRAFT: "已完成阶段初稿",
  DELIVERY: "已完成结果交付",
};

export function ResultShell({ task, result }: ResultShellProps) {
  const router = useRouter();
  const [showProcess, setShowProcess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function copyResult() {
    if (!result?.content) return;
    await navigator.clipboard.writeText(result.content);
    toast.success("已复制到剪贴板");
  }

  function downloadResult() {
    if (!result?.content) return;
    const blob = new Blob([result.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${task.title ?? task.goal?.slice(0, 30) ?? "结果"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function saveToPersonalAsset() {
    if (!result?.content) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/assets/personal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceTaskId: task.id,
          assetType: "FULL_RESULT",
          title: result.title ?? task.goal?.slice(0, 60) ?? "任务结果",
          summary: result.summary ?? task.goal,
          content: result.content,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("已保存到个人资产");
    } catch {
      toast.error("保存失败，请重试");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitToOrgAsset() {
    if (!result?.content) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/assets/org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceTaskId: task.id,
          assetType: task.taskType === "PLAN" ? "PLAN_TEMPLATE"
            : task.taskType === "ANALYSIS" ? "ANALYSIS_FRAMEWORK"
            : "PROCESS_SUGGESTION",
          title: result.title ?? task.goal?.slice(0, 60) ?? "组织资产",
          summary: result.summary ?? task.goal,
          content: result.content,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("已提交到组织资产库");
    } catch {
      toast.error("提交失败，请重试");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-6 space-y-5">
      {/* 结果头部 */}
      <div>
        <div className="flex items-start gap-3 mb-2">
          <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-foreground">
              {result?.title ?? task.goal?.slice(0, 60) ?? "任务结果"}
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="secondary">{TASK_TYPE_LABELS[task.taskType]}</Badge>
              {task.outputType && <Badge variant="outline">{task.outputType}</Badge>}
              <Badge className="bg-green-100 text-green-700 border-green-200">已完成</Badge>
            </div>
          </div>
        </div>
        {result?.summary && (
          <p className="text-sm text-muted-foreground ml-8">{result.summary}</p>
        )}
      </div>

      {/* 结果正文 */}
      <Card>
        <CardContent className="pt-5 pb-5">
          {result?.content ? (
            <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap font-mono">
              {result.content}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">暂无结果内容</p>
          )}
        </CardContent>
      </Card>

      {/* 动作栏 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Button variant="outline" size="sm" onClick={copyResult} disabled={!result?.content}>
          <Copy className="w-3.5 h-3.5 mr-1.5" /> 复制结果
        </Button>
        <Button variant="outline" size="sm" onClick={downloadResult} disabled={!result?.content}>
          <Download className="w-3.5 h-3.5 mr-1.5" /> 导出文档
        </Button>
        <Button variant="outline" size="sm" onClick={saveToPersonalAsset} disabled={submitting || !result?.content}>
          <BookOpen className="w-3.5 h-3.5 mr-1.5" /> 存入个人资产
        </Button>
        <Button variant="outline" size="sm" onClick={submitToOrgAsset} disabled={submitting || !result?.content}>
          <Building2 className="w-3.5 h-3.5 mr-1.5" /> 提交组织资产
        </Button>
      </div>

      <Separator />

      {/* 后续动作 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={() => router.push(`/task/${task.id}/workspace`)}
          className="flex items-center gap-3 p-4 rounded-xl border border-border bg-white hover:bg-accent transition-all text-left group"
        >
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">继续深化</p>
            <p className="text-xs text-muted-foreground mt-0.5">在当前结果基础上继续优化</p>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        </button>

        <button
          onClick={() => router.push(`/task/new?type=${task.taskType}`)}
          className="flex items-center gap-3 p-4 rounded-xl border border-border bg-white hover:bg-accent transition-all text-left group"
        >
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">新建关联任务</p>
            <p className="text-xs text-muted-foreground mt-0.5">基于当前结果再开一个任务</p>
          </div>
          <Plus className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        </button>
      </div>

      {/* 产出过程说明 */}
      <div>
        <button
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setShowProcess(!showProcess)}
        >
          <Clock className="w-3.5 h-3.5" />
          本次产出是如何形成的
          {showProcess ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showProcess && (
          <Card className="mt-2">
            <CardContent className="pt-4 pb-4 text-xs space-y-2 text-muted-foreground">
              <p><span className="font-medium text-foreground">任务目标：</span>{task.goal}</p>
              {task.outputType && <p><span className="font-medium text-foreground">输出形式：</span>{task.outputType}</p>}
              <div className="space-y-1 pt-1">
                <p className="font-medium text-foreground">关键确认节点：</p>
                {task.stageRecords.map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-primary flex-shrink-0" />
                    <span>{STAGE_LABELS[s.stageType]}</span>
                    <span className="ml-auto">{new Date(s.createdAt).toLocaleDateString("zh-CN")}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
