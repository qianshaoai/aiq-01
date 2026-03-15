"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import ReactMarkdown from "react-markdown";
import {
  Send, Loader2, CheckCircle, RotateCcw, Edit3,
  FileText, ChevronDown, ChevronUp, Save, Star,
  TrendingUp,
} from "lucide-react";
import type { TaskStatus, TaskType, StageType } from "@/lib/generated/prisma/client";
import type { TaskPhase, AgentKeyType } from "@/lib/ai/types";

interface Material {
  id: string;
  materialType: string;
  fileName: string | null;
  contentExtracted: string | null;
  parseStatus: string;
}

interface StageRecord {
  id: string;
  stageType: StageType;
  summary: string | null;
  content: string | null;
  status: string;
  createdAt: Date;
}

interface TaskResult {
  id: string;
  title: string | null;
  summary: string | null;
  content: string | null;
  versionNo: number;
}

interface TaskData {
  id: string;
  title: string | null;
  goal: string | null;
  outputType: string | null;
  completionCriteria: string | null;
  taskType: TaskType;
  status: TaskStatus;
  currentStage: string | null;
  draftContent: string | null;
  materials: Material[];
  stageRecords: StageRecord[];
  latestResult: TaskResult | null;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  phase?: TaskPhase;
}

interface ExpressionFeedback {
  stars: number;
  strength: string;
  suggestion: string;
  tags: string[];
}

interface StageReview {
  infoCompleteness: string;
  collaborationEfficiency: string;
  techniqueTip: string;
}

function getPhase(status: TaskStatus): TaskPhase {
  if (status === "DEFINING" || status === "CREATED") return "DEFINING";
  if (status === "PENDING_DIRECTION" || status === "PENDING_DRAFT") return "REVIEWING";
  return "EXECUTING";
}

/** 根据当前执行状态推断应使用的 AgentKey */
function resolveAgentKey(
  phase: TaskPhase,
  confirmedStages: Set<string>,
  breakpoint: BreakpointType
): AgentKeyType {
  if (phase === "DEFINING") return "TASK_UNDERSTANDING";
  if (phase === "REVIEWING") {
    if (breakpoint === "DRAFT" || confirmedStages.has("DIRECTION")) return "REVIEW";
    return "DIRECTION_PLANNING";
  }
  // EXECUTING
  if (!confirmedStages.has("DIRECTION")) return "DIRECTION_PLANNING";
  return "EXECUTION";
}

const PHASE_LABELS: Record<TaskPhase, string> = {
  DEFINING: "教练视角",
  EXECUTING: "执行视角",
  REVIEWING: "评审视角",
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

type BreakpointType = "DIRECTION" | "DRAFT" | null;

// ─── 星级评分组件 ─────────────────────────────────────────────────────────────
function StarRating({ stars }: { stars: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`w-3 h-3 ${i <= stars ? "fill-amber-400 text-amber-400" : "text-border"}`}
        />
      ))}
    </div>
  );
}

// ─── 单条已完成消息 ────────────────────────────────────────────────────────────
const MessageItem = React.memo(function MessageItem({ msg }: { msg: Message }) {
  return (
    <div className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
          msg.role === "user"
            ? "bg-primary text-primary-foreground"
            : "bg-white border border-border text-foreground"
        }`}
      >
        {msg.role === "assistant" && msg.phase && (
          <p className="text-[10px] text-muted-foreground mb-1.5 font-medium uppercase tracking-wider">
            {PHASE_LABELS[msg.phase]}
          </p>
        )}
        {msg.role === "assistant" ? (
          <div className="md-content"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
        ) : (
          <div className="whitespace-pre-wrap">{msg.content}</div>
        )}
      </div>
    </div>
  );
});

// ─── 流式输出气泡 ──────────────────────────────────────────────────────────────
const StreamingBubble = React.memo(function StreamingBubble({
  content, phase,
}: {
  content: string;
  phase: TaskPhase;
}) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed bg-white border border-border text-foreground">
        <p className="text-[10px] text-muted-foreground mb-1.5 font-medium uppercase tracking-wider">
          {PHASE_LABELS[phase]}
        </p>
        <div className="whitespace-pre-wrap">{content}</div>
        <span className="inline-block w-1 h-4 bg-primary/60 animate-pulse ml-0.5 align-text-bottom" />
      </div>
    </div>
  );
});

// ────────────────────────────────────────────────────────────────────────────
export function WorkspaceShell({ task }: {
  task: TaskData;
  userId: string;
  enterpriseId: string;
}) {
  const router = useRouter();
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const autosaveTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const [messages, setMessages] = useState<Message[]>(() => {
    if (task.draftContent) {
      try { return JSON.parse(task.draftContent); } catch { return []; }
    }
    return [];
  });

  const [streamingContent, setStreamingContent] = useState<string | null>(null);
  const [streamingPhase, setStreamingPhase] = useState<TaskPhase>("DEFINING");

  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<TaskPhase>(getPhase(task.status));
  const [taskStatus, setTaskStatus] = useState<TaskStatus>(task.status);
  const [breakpoint, setBreakpoint] = useState<BreakpointType>(null);
  const [confirmedStages, setConfirmedStages] = useState<Set<string>>(
    () => new Set(task.stageRecords.map((s) => s.stageType as string))
  );
  const confirmedStagesRef = useRef<Set<string>>(new Set(task.stageRecords.map((s) => s.stageType as string)));
  const taskStatusRef = useRef<TaskStatus>(task.status);
  const initialMessageSentRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [rightPanelExpanded, setRightPanelExpanded] = useState(true);
  const [saving, setSaving] = useState(false);

  // Layer 1: 实时表达反馈
  const [expressionFeedback, setExpressionFeedback] = useState<ExpressionFeedback | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  // Layer 2: 阶段协作回顾
  const [stageReview, setStageReview] = useState<StageReview | null>(null);
  const [stageReviewLoading, setStageReviewLoading] = useState(false);
  // 记录每个断点开始时的消息数（用于统计本阶段对话轮数）
  const stageStartMsgCountRef = useRef(0);

  useEffect(() => {
    if (messages.length === 0 && !initialMessageSentRef.current) {
      initialMessageSentRef.current = true;
      sendInitialMessage();
    }
    return () => { abortControllerRef.current?.abort(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (streamingContent !== null) {
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [streamingContent]);

  useEffect(() => {
    autosaveTimer.current = setInterval(() => {
      if (messages.length > 0) saveDraft(false);
    }, 30_000);
    return () => { if (autosaveTimer.current) clearInterval(autosaveTimer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  async function saveDraft(showToast = true) {
    setSaving(true);
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftContent: JSON.stringify(messages) }),
      });
      if (showToast) toast.success("草稿已保存");
    } finally { setSaving(false); }
  }

  async function sendInitialMessage() {
    const assetMaterials = task.materials.filter((m) => m.fileName?.startsWith("【资产】"));
    const regularMaterials = task.materials.filter((m) => !m.fileName?.startsWith("【资产】"));

    const contextParts = [
      `任务目标：${task.goal ?? "（未填写）"}`,
      `期望输出：${task.outputType ?? "（未填写）"}`,
      task.completionCriteria ? `完成标准：${task.completionCriteria}` : "",
      assetMaterials.length > 0
        ? `来源资产（请在整个对话中充分引用以下资产内容）：\n${assetMaterials.map((m) => `【${m.fileName!.slice(4)}】\n${m.contentExtracted ?? "（内容为空）"}`).join("\n---\n")}`
        : "",
      regularMaterials.length > 0
        ? `其他背景资料：\n${regularMaterials.map((m) => m.contentExtracted ?? m.fileName ?? "（文件）").join("\n---\n")}`
        : regularMaterials.length === 0 && assetMaterials.length === 0
          ? "背景资料：（未提供）"
          : "",
    ].filter(Boolean).join("\n\n");

    const initMsg: Message = {
      role: "user",
      content: `我的任务信息如下，请根据当前阶段帮我推进：\n\n${contextParts}`,
      phase: currentPhase,
    };
    setMessages([initMsg]);
    const agentKey = resolveAgentKey(currentPhase, confirmedStagesRef.current, null);
    await streamAI([initMsg], currentPhase, agentKey);
  }

  const streamAI = useCallback(async (msgs: Message[], phase: TaskPhase, agentKey: AgentKeyType) => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setStreaming(true);
    setStreamingPhase(phase);
    setStreamingContent("");

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: task.id,
          messages: msgs.map(({ role, content }) => ({ role, content })),
          phase,
          agentKey,
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const d = await res.json().catch(() => ({}));
        toast.error((d as { error?: string }).error ?? "AI 请求失败");
        setStreamingContent(null);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;
          try {
            const parsed = JSON.parse(data) as { error?: string; text?: string };
            if (parsed.error) { toast.error(parsed.error); return; }
            if (parsed.text) {
              fullContent += parsed.text;
              setStreamingContent(fullContent);
            }
          } catch { /* ignore */ }
        }
      }

      const completedMsg: Message = { role: "assistant", content: fullContent, phase };
      setMessages((prev) => [...prev, completedMsg]);
      setStreamingContent(null);

      checkBreakpoint(fullContent, phase);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setStreamingContent(null);
        return;
      }
      toast.error("网络异常，请稍后重试");
      setStreamingContent(null);
    } finally {
      setStreaming(false);
    }
  }, [task.id]);

  function checkBreakpoint(content: string, phase: TaskPhase) {
    if (phase === "EXECUTING" && taskStatusRef.current === "EXECUTING") {
      if (!confirmedStagesRef.current.has("DIRECTION")) {
        setBreakpoint("DIRECTION");
        setTaskStatus("PENDING_DIRECTION");
        taskStatusRef.current = "PENDING_DIRECTION";
        // 触发阶段协作回顾
        fetchStageReview("DIRECTION");
      } else if (!confirmedStagesRef.current.has("DRAFT")) {
        setBreakpoint("DRAFT");
        setTaskStatus("PENDING_DRAFT");
        taskStatusRef.current = "PENDING_DRAFT";
        // 触发阶段协作回顾
        fetchStageReview("DRAFT");
      }
    }
  }

  async function fetchStageReview(stageType: "DIRECTION" | "DRAFT") {
    setStageReviewLoading(true);
    setStageReview(null);
    try {
      const messageCount = messages.length - stageStartMsgCountRef.current;
      const res = await fetch("/api/ai/stage-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stageType,
          messageCount,
          taskGoal: task.goal ?? "",
        }),
      });
      if (!res.ok) return;
      const data = await res.json() as StageReview;
      setStageReview(data);
    } catch {
      // 静默处理
    } finally {
      setStageReviewLoading(false);
    }
  }

  async function fetchExpressionFeedback(message: string) {
    setFeedbackLoading(true);
    setExpressionFeedback(null);
    try {
      const res = await fetch("/api/ai/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (!res.ok) return;
      const data = await res.json() as ExpressionFeedback;
      setExpressionFeedback(data);
    } catch {
      // 反馈失败静默处理
    } finally {
      setFeedbackLoading(false);
    }
  }

  async function handleSend() {
    if (!input.trim() || streaming) return;
    const userMsg: Message = { role: "user", content: input, phase: currentPhase };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    const userInput = input;
    setInput("");
    fetchExpressionFeedback(userInput);
    const agentKey = resolveAgentKey(currentPhase, confirmedStagesRef.current, breakpoint);
    await streamAI(newMessages, currentPhase, agentKey);
  }

  async function handleBreakpointAction(action: "confirm" | "adjust" | "reset") {
    if (!breakpoint) return;
    const stageType = breakpoint === "DIRECTION" ? "DIRECTION" : "DRAFT";

    if (action === "confirm") {
      await fetch(`/api/tasks/${task.id}/stages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stageType,
          summary: `用户确认了${breakpoint === "DIRECTION" ? "方向与结构" : "阶段初稿"}`,
          status: "CONFIRMED",
          taskStatus: breakpoint === "DIRECTION" ? "EXECUTING" : "COMPLETED",
        }),
      });

      if (breakpoint === "DRAFT") {
        const lastAI = [...messages].reverse().find((m) => m.role === "assistant");
        await fetch(`/api/tasks/${task.id}/results`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: task.title ?? task.goal?.slice(0, 50),
            summary: task.goal,
            content: lastAI?.content ?? "",
            resultType: task.taskType,
            status: "FINAL",
          }),
        });
        fetch(`/api/tasks/${task.id}/growth`, { method: "POST" });
        router.push(`/task/${task.id}/result`);
        return;
      }

      const newConfirmed = new Set([...confirmedStagesRef.current, stageType]);
      confirmedStagesRef.current = newConfirmed;
      setConfirmedStages(newConfirmed);
      setBreakpoint(null);
      setStageReview(null);
      setTaskStatus("EXECUTING");
      taskStatusRef.current = "EXECUTING";
      setCurrentPhase("EXECUTING");
      stageStartMsgCountRef.current = messages.length;

      const confirmMsg: Message = {
        role: "user",
        content: "方向确认，请继续推进，产出完整初稿。",
        phase: "EXECUTING",
      };
      const newMsgs = [...messages, confirmMsg];
      setMessages(newMsgs);
      await streamAI(newMsgs, "EXECUTING", "EXECUTION");

    } else if (action === "adjust") {
      setBreakpoint(null);
      setCurrentPhase("REVIEWING");
      const adjustMsg: Message = {
        role: "user",
        content: "我想调整几点，请听我说…",
        phase: "REVIEWING",
      };
      setMessages((prev) => [...prev, adjustMsg]);

    } else {
      await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DEFINING" }),
      });
      router.push(`/task/${task.id}`);
    }
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* 主协作区 */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* 阶段标识栏 */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-white flex-shrink-0">
          <Badge variant="outline" className="text-primary border-primary/30 text-xs">
            当前阶段：{PHASE_LABELS[currentPhase]}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {STATUS_LABELS[taskStatus]}
          </Badge>
          <div className="flex-1" />
          <button
            onClick={() => saveDraft(true)}
            disabled={saving}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Save className="w-3 h-3" />
            {saving ? "保存中…" : "保存草稿"}
          </button>
        </div>

        {/* 对话区 */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
          <div className="max-w-2xl mx-auto space-y-4">
            {messages.length === 0 && streamingContent === null && (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {messages.map((msg, i) => <MessageItem key={i} msg={msg} />)}

            {streamingContent !== null && (
              <StreamingBubble content={streamingContent} phase={streamingPhase} />
            )}

            {/* 断点验收 + 阶段协作回顾 */}
            {breakpoint && !streaming && (
              <div className="mx-auto max-w-2xl space-y-3">
                {/* 阶段协作回顾卡片 (Layer 2) */}
                {(stageReviewLoading || stageReview) && (
                  <Card className="border-blue-200 bg-blue-50/50">
                    <CardContent className="pt-4 pb-4 space-y-2">
                      <div className="flex items-center gap-1.5 mb-2">
                        <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                        <p className="text-xs font-medium text-blue-700">本阶段协作回顾</p>
                      </div>
                      {stageReviewLoading ? (
                        <div className="flex items-center gap-1.5 text-xs text-blue-600/70">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>AI 正在生成协作回顾…</span>
                        </div>
                      ) : stageReview ? (
                        <div className="space-y-1.5 text-xs text-blue-800">
                          <p><span className="font-medium">信息完整度：</span>{stageReview.infoCompleteness}</p>
                          <p><span className="font-medium">协作效率：</span>{stageReview.collaborationEfficiency}</p>
                          <p className="text-blue-700/80 italic border-t border-blue-200 pt-1.5">
                            💡 {stageReview.techniqueTip}
                          </p>
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                )}

                {/* 断点操作卡片 */}
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="pt-4 pb-4">
                    <p className="text-sm font-medium text-foreground mb-3">
                      {breakpoint === "DIRECTION"
                        ? "📋 方向与结构已生成，请确认是否继续"
                        : "📄 阶段初稿已完成，请确认结果"}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-primary hover:bg-primary/90 text-xs"
                        onClick={() => handleBreakpointAction("confirm")}
                      >
                        <CheckCircle className="w-3.5 h-3.5 mr-1" />
                        {breakpoint === "DRAFT" ? "确认完成" : "确认继续"}
                      </Button>
                      <Button size="sm" variant="outline" className="text-xs"
                        onClick={() => handleBreakpointAction("adjust")}>
                        <Edit3 className="w-3.5 h-3.5 mr-1" />
                        我想调整几点
                      </Button>
                      <Button size="sm" variant="outline" className="text-xs text-destructive hover:text-destructive"
                        onClick={() => handleBreakpointAction("reset")}>
                        <RotateCcw className="w-3.5 h-3.5 mr-1" />
                        方向需要重定
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        {/* 输入区 */}
        <div className="border-t border-border bg-white px-4 py-3 flex-shrink-0">
          <div className="max-w-2xl mx-auto flex gap-2 items-end">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={streaming ? "AI 正在生成中，稍候…" : "输入内容，Enter 发送，Shift+Enter 换行"}
              className="resize-none min-h-10 max-h-32 text-sm"
              disabled={streaming}
            />
            <Button
              size="icon"
              className="bg-primary hover:bg-primary/90 h-10 w-10 flex-shrink-0"
              onClick={handleSend}
              disabled={streaming || !input.trim()}
            >
              {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
          {streaming && (
            <p className="text-center text-xs text-muted-foreground mt-1.5">
              正在生成 · 你也可以先离开，稍后继续
            </p>
          )}
        </div>
      </div>

      {/* 右侧结构化面板 */}
      <div className="w-64 border-l border-border bg-white flex flex-col flex-shrink-0 overflow-hidden">
        <button
          className="flex items-center justify-between px-4 py-3 border-b border-border hover:bg-accent transition-colors"
          onClick={() => setRightPanelExpanded(!rightPanelExpanded)}
        >
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">任务详情</span>
          {rightPanelExpanded
            ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
            : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
        </button>

        {rightPanelExpanded && (
          <ScrollArea className="flex-1">
            <div className="px-4 py-3 space-y-4 text-xs">
              {/* 来源资产 */}
              {task.materials.filter((m) => m.fileName?.startsWith("【资产】")).map((m) => (
                <PanelSection key={m.id} label="来源资产">
                  <p className="text-foreground/80 leading-relaxed">{m.fileName!.slice(4)}</p>
                </PanelSection>
              ))}

              <PanelSection label="任务目标">
                <p className="text-foreground/80 leading-relaxed">{task.goal ?? "—"}</p>
              </PanelSection>

              <PanelSection label="输出形式">
                <Badge variant="secondary" className="text-[11px]">{task.outputType ?? "—"}</Badge>
              </PanelSection>

              {task.completionCriteria && (
                <PanelSection label="完成标准">
                  <p className="text-foreground/80">{task.completionCriteria}</p>
                </PanelSection>
              )}

              <PanelSection label="执行进度">
                <div className="space-y-1.5">
                  {[
                    { key: "DEFINING", label: "任务框定" },
                    { key: "DIRECTION", label: "方向确认" },
                    { key: "DRAFT", label: "初稿确认" },
                    { key: "DELIVERY", label: "结果交付" },
                  ].map(({ key, label }) => {
                    const done = confirmedStages.has(key);
                    const active = (currentPhase === "EXECUTING" && !done && key === "DIRECTION")
                      || breakpoint === key;
                    return (
                      <div key={key} className={`flex items-center gap-2 ${done ? "text-primary" : active ? "text-foreground" : "text-muted-foreground"}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${done ? "bg-primary" : active ? "bg-foreground" : "bg-border"}`} />
                        {label}
                        {done && <CheckCircle className="w-3 h-3 ml-auto" />}
                      </div>
                    );
                  })}
                </div>
              </PanelSection>

              {/* Layer 1: 本次表达反馈 */}
              {(feedbackLoading || expressionFeedback) && (
                <PanelSection label="本次表达反馈">
                  {feedbackLoading ? (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" />
                      <span>分析中…</span>
                    </div>
                  ) : expressionFeedback ? (
                    <div className="space-y-2">
                      {/* 星级 */}
                      <StarRating stars={expressionFeedback.stars} />
                      {/* 优点 */}
                      <div className="flex items-start gap-1.5">
                        <span className="text-emerald-500 font-bold flex-shrink-0">✓</span>
                        <p className="text-foreground/80 leading-relaxed">{expressionFeedback.strength}</p>
                      </div>
                      {/* 改进建议 */}
                      <div className="flex items-start gap-1.5">
                        <span className="text-primary font-bold flex-shrink-0">→</span>
                        <p className="text-foreground/70 leading-relaxed">{expressionFeedback.suggestion}</p>
                      </div>
                      {/* 标签 */}
                      {expressionFeedback.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {expressionFeedback.tags.map((tag) => (
                            <span key={tag} className="text-[10px] bg-primary/8 text-primary/80 px-1.5 py-0.5 rounded-full border border-primary/20">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}
                </PanelSection>
              )}

              {task.materials.filter((m) => !m.fileName?.startsWith("【资产】")).length > 0 && (
                <PanelSection label={`背景资料 (${task.materials.filter((m) => !m.fileName?.startsWith("【资产】")).length})`}>
                  {task.materials.filter((m) => !m.fileName?.startsWith("【资产】")).map((m) => (
                    <div key={m.id} className="flex items-center gap-1.5 text-foreground/70">
                      <FileText className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{m.fileName ?? "文字资料"}</span>
                    </div>
                  ))}
                </PanelSection>
              )}

              {task.latestResult && (
                <PanelSection label="最新结果">
                  <p className="text-foreground/80 line-clamp-3">{task.latestResult.summary ?? task.latestResult.content?.slice(0, 100)}</p>
                </PanelSection>
              )}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}

function PanelSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      {children}
      <Separator />
    </div>
  );
}
