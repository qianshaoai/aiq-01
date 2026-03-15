"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, BookOpen, Building2, Clock, ExternalLink, Trash2, ArrowUpRight } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PersonalAsset {
  id: string;
  assetType: string;
  title: string;
  summary: string | null;
  content: string | null;
  updatedAt: string;
  sourceTask: { id: string; title: string | null; taskType: string } | null;
}

interface OrgAsset {
  id: string;
  assetType: string;
  title: string;
  summary: string | null;
  content: string | null;
  sceneTags: string[];
  updatedAt: string;
  sourceTeam: { id: string; name: string } | null;
  submitter: { id: string; name: string };
}

// ─── Labels ───────────────────────────────────────────────────────────────────

const PERSONAL_TYPE_LABELS: Record<string, string> = {
  FULL_RESULT: "完整成果",
  METHOD_CARD: "方法卡",
  TEMPLATE_CARD: "模板卡",
};

const ORG_TYPE_LABELS: Record<string, string> = {
  PLAN_TEMPLATE: "方案模板",
  ANALYSIS_FRAMEWORK: "分析框架",
  PROCESS_SUGGESTION: "流程优化建议",
  SOP_CARD: "SOP 卡片",
};

function formatRelative(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}小时前`;
  return `${Math.floor(h / 24)}天前`;
}

// ─── Main Shell ───────────────────────────────────────────────────────────────

export function AssetsShell() {
  const router = useRouter();
  const params = useSearchParams();
  const [tab, setTab] = useState<"personal" | "org">(
    params.get("tab") === "org" ? "org" : "personal"
  );

  return (
    <div className="max-w-3xl mx-auto px-6 py-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-semibold">资产库</h1>
          <p className="text-sm text-muted-foreground mt-0.5">沉淀任务成果，构建个人与团队知识库</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-border">
        {(["personal", "org"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm border-b-2 transition-colors -mb-px ${
              tab === t
                ? "border-primary text-primary font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "personal" ? <BookOpen className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}
            {t === "personal" ? "个人资产" : "组织资产"}
          </button>
        ))}
      </div>

      {tab === "personal" ? (
        <PersonalAssetsTab router={router} />
      ) : (
        <OrgAssetsTab router={router} />
      )}
    </div>
  );
}

// ─── Personal Tab ─────────────────────────────────────────────────────────────

function PersonalAssetsTab({ router }: { router: ReturnType<typeof useRouter> }) {
  const [assets, setAssets] = useState<PersonalAsset[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<PersonalAsset | null>(null);

  useEffect(() => {
    const t = setTimeout(() => fetchAssets(), 300);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, typeFilter, page]);

  async function fetchAssets() {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (search) qs.set("q", search);
      if (typeFilter) qs.set("type", typeFilter);
      qs.set("page", String(page));
      const res = await fetch(`/api/assets/personal?${qs}`);
      if (!res.ok) return;
      const data = await res.json();
      setAssets(data.assets);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }

  async function deleteAsset(id: string) {
    await fetch(`/api/assets/personal/${id}`, { method: "DELETE" });
    setSelected(null);
    fetchAssets();
  }

  const pageSize = 20;
  const pageCount = Math.ceil(total / pageSize);

  return (
    <>
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="搜索资产标题"
            className="pl-8 h-8 text-sm"
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={typeFilter} onValueChange={(v: string | null) => { setTypeFilter(v ?? ""); setPage(1); }}>
          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="全部类型" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">全部类型</SelectItem>
            {Object.entries(PERSONAL_TYPE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
      ) : assets.length === 0 ? (
        <EmptyState message="暂无个人资产" sub="完成任务后可将成果保存至个人资产库" />
      ) : (
        <div className="space-y-2">
          {assets.map((a) => (
            <button
              key={a.id}
              onClick={() => setSelected(a)}
              className="w-full flex items-center gap-3 p-3.5 rounded-lg border border-border bg-white hover:bg-accent transition-colors text-left group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{a.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                    {PERSONAL_TYPE_LABELS[a.assetType] ?? a.assetType}
                  </Badge>
                  {a.summary && <p className="text-xs text-muted-foreground truncate">{a.summary}</p>}
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                <Clock className="w-3 h-3" />
                {formatRelative(a.updatedAt)}
              </div>
            </button>
          ))}
        </div>
      )}

      <Pagination page={page} pageCount={pageCount} setPage={setPage} />

      {/* Detail Dialog */}
      {selected && (
        <AssetDetailDialog
          title={selected.title}
          typeLabel={PERSONAL_TYPE_LABELS[selected.assetType] ?? selected.assetType}
          summary={selected.summary}
          content={selected.content}
          sourceLabel={selected.sourceTask ? (selected.sourceTask.title ?? "来源任务") : null}
          sourceHref={selected.sourceTask ? `/task/${selected.sourceTask.id}/result` : null}
          onClose={() => setSelected(null)}
          onDelete={() => deleteAsset(selected.id)}
          onNewTask={() => router.push(`/task/new?assetId=${selected.id}`)}
        />
      )}
    </>
  );
}

// ─── Org Tab ──────────────────────────────────────────────────────────────────

function OrgAssetsTab({ router }: { router: ReturnType<typeof useRouter> }) {
  const [assets, setAssets] = useState<OrgAsset[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<OrgAsset | null>(null);

  useEffect(() => {
    const t = setTimeout(() => fetchAssets(), 300);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, typeFilter, page]);

  async function fetchAssets() {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (typeFilter) qs.set("type", typeFilter);
      qs.set("page", String(page));
      const res = await fetch(`/api/assets/org?${qs}`);
      if (!res.ok) return;
      const data = await res.json();
      // Client-side search filter on title
      const filtered = search
        ? data.assets.filter((a: OrgAsset) => a.title.includes(search))
        : data.assets;
      setAssets(filtered);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }

  const pageSize = 20;
  const pageCount = Math.ceil(total / pageSize);

  return (
    <>
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="搜索组织资产"
            className="pl-8 h-8 text-sm"
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={typeFilter} onValueChange={(v: string | null) => { setTypeFilter(v ?? ""); setPage(1); }}>
          <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="全部类型" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">全部类型</SelectItem>
            {Object.entries(ORG_TYPE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
      ) : assets.length === 0 ? (
        <EmptyState message="暂无组织资产" sub="团队成员提交的成果将在此汇聚" />
      ) : (
        <div className="space-y-2">
          {assets.map((a) => (
            <button
              key={a.id}
              onClick={() => setSelected(a)}
              className="w-full flex items-center gap-3 p-3.5 rounded-lg border border-border bg-white hover:bg-accent transition-colors text-left group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{a.title}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                    {ORG_TYPE_LABELS[a.assetType] ?? a.assetType}
                  </Badge>
                  {a.sourceTeam && (
                    <span className="text-xs text-muted-foreground">{a.sourceTeam.name}</span>
                  )}
                  {a.sceneTags.slice(0, 2).map((tag) => (
                    <Badge key={tag} variant="outline" className="text-[10px] h-4 px-1.5">{tag}</Badge>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                <Clock className="w-3 h-3" />
                {formatRelative(a.updatedAt)}
              </div>
            </button>
          ))}
        </div>
      )}

      <Pagination page={page} pageCount={pageCount} setPage={setPage} />

      {selected && (
        <AssetDetailDialog
          title={selected.title}
          typeLabel={ORG_TYPE_LABELS[selected.assetType] ?? selected.assetType}
          summary={selected.summary}
          content={selected.content}
          sourceLabel={selected.sourceTeam?.name ?? null}
          sourceHref={null}
          onClose={() => setSelected(null)}
          onDelete={null}
          onNewTask={() => router.push(`/task/new?orgAssetId=${selected.id}`)}
        />
      )}
    </>
  );
}

// ─── Shared Components ────────────────────────────────────────────────────────

function EmptyState({ message, sub }: { message: string; sub: string }) {
  return (
    <div className="text-center py-12 border border-dashed border-border rounded-xl">
      <p className="text-sm text-muted-foreground">{message}</p>
      <p className="text-xs text-muted-foreground mt-1">{sub}</p>
    </div>
  );
}

function Pagination({
  page, pageCount, setPage,
}: {
  page: number; pageCount: number; setPage: (p: number) => void;
}) {
  if (pageCount <= 1) return null;
  return (
    <div className="flex justify-center gap-2 mt-4">
      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</Button>
      <span className="flex items-center text-sm text-muted-foreground px-2">{page} / {pageCount}</span>
      <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => setPage(page + 1)}>下一页</Button>
    </div>
  );
}

function AssetDetailDialog({
  title, typeLabel, summary, content, sourceLabel, sourceHref,
  onClose, onDelete, onNewTask,
}: {
  title: string;
  typeLabel: string;
  summary: string | null;
  content: string | null;
  sourceLabel: string | null;
  sourceHref: string | null;
  onClose: () => void;
  onDelete: (() => void) | null;
  onNewTask: () => void;
}) {
  return (
    <Dialog open onOpenChange={(o: boolean) => !o && onClose()}>
      <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <Badge variant="secondary" className="text-[10px] mb-2">{typeLabel}</Badge>
              <DialogTitle className="text-base leading-snug">{title}</DialogTitle>
            </div>
          </div>
        </DialogHeader>

        {summary && (
          <div className="mt-3">
            <p className="text-xs text-muted-foreground mb-1">摘要</p>
            <p className="text-sm leading-relaxed">{summary}</p>
          </div>
        )}

        {content && (
          <div className="mt-3">
            <p className="text-xs text-muted-foreground mb-1">内容</p>
            <div className="text-sm leading-relaxed whitespace-pre-wrap bg-muted/30 rounded-md p-3 max-h-60 overflow-y-auto">
              {content}
            </div>
          </div>
        )}

        {sourceLabel && (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>来源：{sourceLabel}</span>
            {sourceHref && (
              <Link href={sourceHref} className="text-primary hover:underline flex items-center gap-0.5">
                查看 <ExternalLink className="w-3 h-3" />
              </Link>
            )}
          </div>
        )}

        <div className="flex gap-2 mt-4 pt-3 border-t border-border">
          <button
            onClick={onNewTask}
            className="flex-1 inline-flex justify-center items-center gap-1.5 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <ArrowUpRight className="w-3.5 h-3.5" /> 基于此资产开任务
          </button>
          {onDelete && (
            <button
              onClick={onDelete}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-destructive text-destructive text-sm hover:bg-destructive/5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
