"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, ArrowRight, BookOpen } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GrowthReceipt {
  id: string;
  summaryOfCompletion: string | null;
  strengthSummary: string | null;
  weaknessSummary: string | null;
  nextActionSuggestion: string | null;
  createdAt: string;
  task: { id: string; title: string | null; taskType: string };
}

interface AIQRecord {
  id: string;
  dimensionKey: string;
  levelTag: string;
  explanation: string | null;
  createdAt: string;
  task: { id: string; title: string | null };
}

interface DimensionSummary {
  [key: string]: { improve: number; stable: number; weak: number };
}

interface GrowthData {
  receipts: GrowthReceipt[];
  total: number;
  aiqRecords: AIQRecord[];
  dimensionSummary: DimensionSummary;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DIMENSION_LABELS: Record<string, string> = {
  expression: "表达力",
  judgment: "判断力",
  structure: "结构力",
  execution: "执行力",
  integration: "整合力",
  reflection: "复盘力",
};

const LEVEL_META: Record<string, { icon: React.ReactNode; variant: "default" | "secondary" | "destructive" | "outline"; color: string }> = {
  "有提升": { icon: <TrendingUp className="w-3 h-3" />, variant: "default", color: "text-emerald-600" },
  "表现稳定": { icon: <Minus className="w-3 h-3" />, variant: "secondary", color: "text-muted-foreground" },
  "仍可加强": { icon: <TrendingDown className="w-3 h-3" />, variant: "destructive", color: "text-destructive" },
};

const TASK_TYPE_LABELS: Record<string, string> = {
  PLAN: "方案类", ANALYSIS: "分析类", PROCESS: "流程优化类",
};

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

// ─── Main Shell ───────────────────────────────────────────────────────────────

export function GrowthShell() {
  const [data, setData] = useState<GrowthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchGrowth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  async function fetchGrowth() {
    setLoading(true);
    try {
      const res = await fetch(`/api/growth?page=${page}`);
      if (!res.ok) return;
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  }

  const pageSize = 10;
  const pageCount = data ? Math.ceil(data.total / pageSize) : 1;

  return (
    <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
      <div>
        <h1 className="text-lg font-semibold">成长反馈</h1>
        <p className="text-sm text-muted-foreground mt-0.5">记录每次任务后的成长轨迹</p>
      </div>

      {/* AIQ Dimension Summary */}
      {loading ? (
        <Skeleton className="h-36 rounded-xl" />
      ) : data && Object.keys(data.dimensionSummary).length > 0 ? (
        <AIQSummaryCard dimensionSummary={data.dimensionSummary} />
      ) : null}

      {/* Growth Receipts */}
      <div>
        <h2 className="text-sm font-medium mb-3">成长小结</h2>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
          </div>
        ) : !data || data.receipts.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-border rounded-xl">
            <p className="text-sm text-muted-foreground">暂无成长记录</p>
            <p className="text-xs text-muted-foreground mt-1">完成任务后 AI 将为你生成成长小结</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.receipts.map((r) => (
              <ReceiptCard key={r.id} receipt={r} />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</Button>
          <span className="flex items-center text-sm text-muted-foreground px-2">{page} / {pageCount}</span>
          <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => setPage(page + 1)}>下一页</Button>
        </div>
      )}

      {/* Recent AIQ Records */}
      {data && data.aiqRecords.length > 0 && (
        <AIQRecordList records={data.aiqRecords} />
      )}
    </div>
  );
}

// ─── AIQ Summary Card ─────────────────────────────────────────────────────────

function AIQSummaryCard({ dimensionSummary }: { dimensionSummary: DimensionSummary }) {
  const dims = Object.keys(DIMENSION_LABELS);

  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <p className="text-sm font-medium mb-4">AIQ 六维概览</p>
      <div className="grid grid-cols-3 gap-3">
        {dims.map((key) => {
          const d = dimensionSummary[key] ?? { improve: 0, stable: 0, weak: 0 };
          const total = d.improve + d.stable + d.weak;
          const score = total === 0 ? 0 : Math.round((d.improve * 100 + d.stable * 60 + d.weak * 20) / total);
          const trend = d.improve > d.weak ? "up" : d.weak > d.improve ? "down" : "stable";

          return (
            <div key={key} className="flex flex-col items-center p-2 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground">{DIMENSION_LABELS[key]}</p>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-lg font-semibold">{total > 0 ? score : "--"}</span>
                {total > 0 && (
                  trend === "up"
                    ? <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                    : trend === "down"
                      ? <TrendingDown className="w-3.5 h-3.5 text-destructive" />
                      : <Minus className="w-3.5 h-3.5 text-muted-foreground" />
                )}
              </div>
              {total > 0 && (
                <p className="text-[10px] text-muted-foreground mt-0.5">{total} 次评估</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Receipt Card ─────────────────────────────────────────────────────────────

function ReceiptCard({ receipt }: { receipt: GrowthReceipt }) {
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);

  async function saveAsPersonalAsset() {
    setSaving(true);
    try {
      const content = [
        receipt.summaryOfCompletion ? `【完成情况】\n${receipt.summaryOfCompletion}` : "",
        receipt.strengthSummary ? `【优势表现】\n${receipt.strengthSummary}` : "",
        receipt.weaknessSummary ? `【待提升方向】\n${receipt.weaknessSummary}` : "",
        receipt.nextActionSuggestion ? `【下一步建议】\n${receipt.nextActionSuggestion}` : "",
      ].filter(Boolean).join("\n\n");

      const res = await fetch("/api/assets/personal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceTaskId: receipt.task.id,
          assetType: "FULL_RESULT",
          title: `成长回执 · ${receipt.task.title ?? "无标题任务"}`,
          summary: receipt.summaryOfCompletion ?? "成长小结",
          content,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("已保存到个人资产");
    } catch {
      toast.error("保存失败，请重试");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/task/${receipt.task.id}/result`}
              className="text-sm font-medium hover:underline text-foreground truncate"
            >
              {receipt.task.title ?? "（无标题任务）"}
            </Link>
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5 flex-shrink-0">
              {TASK_TYPE_LABELS[receipt.task.taskType] ?? receipt.task.taskType}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{formatDate(receipt.createdAt)}</p>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 mt-0.5"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {receipt.summaryOfCompletion && (
        <p className="text-sm mt-2 leading-relaxed text-muted-foreground">{receipt.summaryOfCompletion}</p>
      )}

      {expanded && (
        <div className="mt-3 space-y-3 pt-3 border-t border-border">
          {receipt.strengthSummary && (
            <div>
              <p className="text-xs font-medium text-emerald-600 mb-1">优势表现</p>
              <p className="text-sm leading-relaxed">{receipt.strengthSummary}</p>
            </div>
          )}
          {receipt.weaknessSummary && (
            <div>
              <p className="text-xs font-medium text-destructive mb-1">待提升方向</p>
              <p className="text-sm leading-relaxed">{receipt.weaknessSummary}</p>
            </div>
          )}
          {receipt.nextActionSuggestion && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">下一步建议</p>
              <p className="text-sm leading-relaxed">{receipt.nextActionSuggestion}</p>
            </div>
          )}
          <div className="flex items-center gap-3 pt-1">
            <Link
              href={`/task/new?baseTaskId=${receipt.task.id}`}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              基于此成果开新任务 <ArrowRight className="w-3 h-3" />
            </Link>
            <button
              onClick={saveAsPersonalAsset}
              disabled={saving}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              <BookOpen className="w-3 h-3" />
              {saving ? "保存中..." : "保存为个人资产"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── AIQ Record List ─────────────────────────────────────────────────────────

function AIQRecordList({ records }: { records: AIQRecord[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? records : records.slice(0, 5);

  return (
    <div>
      <h2 className="text-sm font-medium mb-3">AIQ 评估记录</h2>
      <div className="space-y-2">
        {visible.map((r) => {
          const lm = LEVEL_META[r.levelTag];
          return (
            <div key={r.id} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-white">
              <div className={`flex items-center gap-1 flex-shrink-0 mt-0.5 ${lm?.color ?? ""}`}>
                {lm?.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">
                    {DIMENSION_LABELS[r.dimensionKey] ?? r.dimensionKey}
                  </span>
                  {lm && (
                    <Badge variant={lm.variant} className="text-[10px] h-4 px-1.5">{r.levelTag}</Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {r.task.title ?? "无标题任务"}
                  </span>
                </div>
                {r.explanation && (
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{r.explanation}</p>
                )}
              </div>
              <span className="text-xs text-muted-foreground flex-shrink-0">{formatDate(r.createdAt)}</span>
            </div>
          );
        })}
      </div>
      {records.length > 5 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 w-full text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 py-2"
        >
          {expanded ? (
            <><ChevronUp className="w-3.5 h-3.5" /> 收起</>
          ) : (
            <><ChevronDown className="w-3.5 h-3.5" /> 查看全部 {records.length} 条记录</>
          )}
        </button>
      )}
    </div>
  );
}
