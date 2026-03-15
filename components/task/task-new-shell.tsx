"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  FileText, BarChart2, GitBranch, Upload, X, AlertCircle,
  ChevronRight, CheckCircle2, Loader2, BookOpen,
} from "lucide-react";

type Step = "input" | "define" | "confirm";
type TaskType = "PLAN" | "ANALYSIS" | "PROCESS";

const TASK_TYPE_META: Record<TaskType, { label: string; icon: React.ElementType; outputOptions: string[] }> = {
  PLAN: {
    label: "方案类",
    icon: FileText,
    outputOptions: ["完整方案", "方案提纲", "行动清单", "框架结构"],
  },
  ANALYSIS: {
    label: "分析类",
    icon: BarChart2,
    outputOptions: ["分析结论", "问题诊断报告", "判断与建议", "数据摘要"],
  },
  PROCESS: {
    label: "流程优化类",
    icon: GitBranch,
    outputOptions: ["流程优化建议", "SOP 草稿", "堵点分析", "优化后流程图"],
  },
};

interface AssetInfo {
  title: string;
  content: string | null;
  assetType: string;
}

interface TaskNewShellProps {
  userId: string;
  enterpriseId: string;
}

export function TaskNewShell({ userId, enterpriseId }: TaskNewShellProps) {
  const router = useRouter();
  const params = useSearchParams();

  const modeParam = params.get("mode") as "war" | "training" | null;
  const typeParam = params.get("type") as TaskType | null;
  const assetIdParam = params.get("assetId");
  const orgAssetIdParam = params.get("orgAssetId");

  const [step, setStep] = useState<Step>("input");
  const [taskType, setTaskType] = useState<TaskType | null>(typeParam);
  const [freeInput, setFreeInput] = useState("");
  const [form, setForm] = useState({
    title: "",
    goal: "",
    outputType: "",
    completionCriteria: "",
    backgroundText: "",
  });
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [assetInfo, setAssetInfo] = useState<AssetInfo | null>(null);
  const [assetLoading, setAssetLoading] = useState(false);

  // 如果通过快捷入口进入且已知类型，直接跳到框定步骤
  useEffect(() => {
    if (typeParam) setStep("define");
  }, [typeParam]);

  // 如果从资产入口进来，加载资产并直接进入框定步骤
  useEffect(() => {
    if (assetIdParam) {
      loadAsset(`/api/assets/personal/${assetIdParam}`);
    } else if (orgAssetIdParam) {
      loadAsset(`/api/assets/org/${orgAssetIdParam}`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetIdParam, orgAssetIdParam]);

  async function loadAsset(url: string) {
    setAssetLoading(true);
    try {
      const res = await fetch(url);
      if (!res.ok) { toast.error("资产加载失败"); return; }
      const data = await res.json();
      const asset = data.asset;
      setAssetInfo({ title: asset.title, content: asset.content ?? null, assetType: asset.assetType });
      setStep("define");
    } catch {
      toast.error("资产加载失败");
    } finally {
      setAssetLoading(false);
    }
  }

  async function handleFreeInputNext() {
    if (!freeInput.trim()) {
      toast.error("请描述你要解决的问题");
      return;
    }
    setForm((f) => ({ ...f, goal: freeInput }));
    if (!taskType) setTaskType("PLAN");
    setStep("define");
  }

  async function handleConfirmTask() {
    if (!form.goal.trim()) { toast.error("请填写任务目标"); return; }
    if (!form.outputType) { toast.error("请选择输出形式"); return; }
    if (!taskType) { toast.error("请选择任务类型"); return; }

    setLoading(true);
    try {
      // 1. 创建任务
      const sourceType = assetInfo
        ? "ASSET_DERIVED"
        : modeParam === "training" ? "TRAINING" : "WAR";

      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskType,
          sourceType,
          title: form.title || form.goal.slice(0, 50),
          goal: form.goal,
          outputType: form.outputType,
          completionCriteria: form.completionCriteria,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        toast.error(d.error ?? "创建任务失败");
        return;
      }
      const { task } = await res.json();
      setTaskId(task.id);

      // 2. 上传来源资产（存为带标记 fileName 的 TEXT material）
      if (assetInfo?.content) {
        await fetch(`/api/tasks/${task.id}/materials`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            materialType: "TEXT",
            content: assetInfo.content,
            fileName: `【资产】${assetInfo.title}`,
          }),
        });
      }

      // 3. 上传背景资料（文字）
      if (form.backgroundText.trim()) {
        await fetch(`/api/tasks/${task.id}/materials`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ materialType: "TEXT", content: form.backgroundText }),
        });
      }

      // 4. 上传文件（如有）
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        await fetch(`/api/tasks/${task.id}/materials/upload`, {
          method: "POST",
          body: fd,
        });
      }

      // 5. 更新任务状态为框定完成
      await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DEFINING" }),
      });

      setStep("confirm");
    } catch {
      toast.error("操作失败，请重试");
    } finally {
      setLoading(false);
    }
  }

  async function handleStartExecution() {
    if (!taskId) return;
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "EXECUTING" }),
    });
    router.push(`/task/${taskId}/workspace`);
  }

  function handleFileAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const newFiles = Array.from(e.target.files ?? []);
    if (files.length + newFiles.length > 5) {
      toast.error("单次任务最多上传 5 个文件");
      return;
    }
    const oversized = newFiles.filter((f) => f.size > 20 * 1024 * 1024);
    if (oversized.length) {
      toast.error("文件不能超过 20MB");
      return;
    }
    setFiles((prev) => [...prev, ...newFiles]);
    e.target.value = "";
  }

  // ── 资产加载中 ────────────────────────────────────────────────────────────
  if (assetLoading) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 flex flex-col items-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">正在加载资产…</p>
      </div>
    );
  }

  // ── Step 1: 自由输入 ──────────────────────────────────────────────────────
  if (step === "input") {
    return (
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-lg font-semibold">我今天要解决一个真实问题</h1>
          <p className="text-sm text-muted-foreground mt-1">用自己的话描述问题，或直接选择任务类型</p>
        </div>

        <div className="space-y-4">
          <Textarea
            placeholder="例如：我们下个月要做一次全员 AI 培训，不知道从哪里开始，需要一个完整的培训方案…"
            className="min-h-32 resize-none text-sm"
            value={freeInput}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFreeInput(e.target.value)}
          />

          <Button
            className="w-full bg-primary hover:bg-primary/90"
            onClick={handleFreeInputNext}
            disabled={!freeInput.trim()}
          >
            继续 <ChevronRight className="w-4 h-4 ml-1" />
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs text-muted-foreground">
              <span className="bg-background px-2">或直接选择类型</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {(Object.entries(TASK_TYPE_META) as [TaskType, typeof TASK_TYPE_META[TaskType]][]).map(
              ([type, meta]) => {
                const Icon = meta.icon;
                return (
                  <button
                    key={type}
                    onClick={() => { setTaskType(type); setStep("define"); }}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border bg-white hover:bg-accent hover:border-primary/30 transition-all text-center"
                  >
                    <Icon className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium text-foreground">{meta.label}</span>
                  </button>
                );
              }
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Step 2: 框定表单 ──────────────────────────────────────────────────────
  if (step === "define") {
    const meta = taskType ? TASK_TYPE_META[taskType] : null;
    return (
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-lg font-semibold">补充任务信息</h1>
            {taskType && <Badge variant="secondary">{meta?.label}</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">把任务说清楚，AI 才能帮你做得准</p>
        </div>

        {/* 来源资产 banner */}
        {assetInfo && (
          <Alert className="mb-5 border-primary/20 bg-primary/5">
            <BookOpen className="h-4 w-4 text-primary" />
            <AlertDescription className="text-sm">
              已加载资产：<span className="font-medium">{assetInfo.title}</span>
              <span className="text-muted-foreground ml-1.5">— AI 将基于此资产内容为你推进任务</span>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-5">
          {/* 任务类型（可修改） */}
          <div className="space-y-1.5">
            <Label>任务类型</Label>
            <Select value={taskType ?? ""} onValueChange={(v: string | null) => setTaskType((v as TaskType) || null)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="选择任务类型" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TASK_TYPE_META).map(([type, meta]) => (
                  <SelectItem key={type} value={type}>{meta.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 任务目标 */}
          <div className="space-y-1.5">
            <Label>任务目标 <span className="text-destructive">*</span></Label>
            <Textarea
              placeholder="这次到底要解决什么问题？"
              className="min-h-20 resize-none text-sm"
              value={form.goal}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm({ ...form, goal: e.target.value })}
            />
          </div>

          {/* 输出形式 */}
          <div className="space-y-1.5">
            <Label>输出形式 <span className="text-destructive">*</span></Label>
            <Select value={form.outputType} onValueChange={(v: string | null) => setForm({ ...form, outputType: v ?? "" })}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="期望拿到什么？" />
              </SelectTrigger>
              <SelectContent>
                {meta?.outputOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 完成标准 */}
          <div className="space-y-1.5">
            <Label>完成标准</Label>
            <Input
              placeholder="什么样算完成？（可选）"
              value={form.completionCriteria}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, completionCriteria: e.target.value })}
              className="h-9"
            />
          </div>

          {/* 背景资料（来源资产已自动加载，此处为追加说明） */}
          <div className="space-y-1.5">
            <Label>{assetInfo ? "追加背景资料（可选）" : "背景资料"}</Label>
            <Textarea
              placeholder={assetInfo ? "可在资产内容基础上补充额外背景（可选）" : "粘贴相关文字资料（可选）"}
              className="min-h-24 resize-none text-sm"
              value={form.backgroundText}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm({ ...form, backgroundText: e.target.value })}
            />
          </div>

          {/* 文件上传 */}
          <div className="space-y-1.5">
            <Label>上传文件（Word / PDF / PPT / TXT，最多 5 个，单文件 ≤20MB）</Label>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-border bg-muted/40 hover:bg-muted cursor-pointer text-sm text-muted-foreground transition-colors">
                <Upload className="w-4 h-4" />
                选择文件
                <input
                  type="file"
                  multiple
                  accept=".doc,.docx,.pdf,.ppt,.pptx,.txt"
                  className="hidden"
                  onChange={handleFileAdd}
                />
              </label>
              <span className="text-xs text-muted-foreground">{files.length}/5 个文件</span>
            </div>
            {files.length > 0 && (
              <div className="space-y-1 mt-1">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-foreground/70 bg-muted/40 rounded px-2 py-1">
                    <span className="flex-1 truncate">{f.name}</span>
                    <span className="text-muted-foreground">{(f.size / 1024).toFixed(0)}KB</span>
                    <button onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}>
                      <X className="w-3 h-3 hover:text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 无背景资料提示（来源资产本身算有资料） */}
          {!assetInfo && !form.backgroundText.trim() && files.length === 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                未添加背景资料。你可以先按当前信息生成初版，或补充资料后继续。
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setStep("input")}>
              返回
            </Button>
            <Button
              className="flex-2 bg-primary hover:bg-primary/90"
              onClick={handleConfirmTask}
              disabled={loading || !form.goal.trim() || !form.outputType || !taskType}
            >
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />处理中...</> : "生成任务卡"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 3: 任务卡确认 ─────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle2 className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-semibold">确认任务卡</h1>
        </div>
        <p className="text-sm text-muted-foreground">确认无误后进入 AI 协作执行台</p>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">{form.goal.slice(0, 60)}</CardTitle>
            <Badge variant="secondary">{taskType ? TASK_TYPE_META[taskType].label : ""}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {assetInfo && <Row label="来源资产" value={assetInfo.title} />}
          <Row label="任务目标" value={form.goal} />
          <Row label="输出形式" value={form.outputType} />
          {form.completionCriteria && <Row label="完成标准" value={form.completionCriteria} />}
          <Row
            label="背景资料"
            value={
              assetInfo
                ? `${assetInfo.title}${form.backgroundText ? " + 追加资料" : ""}${files.length > 0 ? ` + ${files.length} 个文件` : ""}`
                : form.backgroundText
                  ? `${form.backgroundText.slice(0, 80)}${form.backgroundText.length > 80 ? "…" : ""}`
                  : files.length > 0
                    ? `${files.length} 个文件`
                    : "（未提供）"
            }
          />
          <Row label="当前状态" value="框定完成，等待确认" />
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={() => setStep("define")}>
          修改信息
        </Button>
        <Button
          className="flex-1 bg-primary hover:bg-primary/90"
          onClick={handleStartExecution}
          disabled={loading}
        >
          {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
          确认，进入执行台
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="text-muted-foreground w-20 flex-shrink-0">{label}</span>
      <span className="text-foreground flex-1">{value}</span>
    </div>
  );
}
