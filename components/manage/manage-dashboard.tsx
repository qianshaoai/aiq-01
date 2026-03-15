"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Users, CheckCircle2, Activity, ClipboardList, Link as LinkIcon, Plus, Search } from "lucide-react";
import type { UserRole } from "@/lib/generated/prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PendingUser {
  id: string;
  name: string;
  loginAccount: string;
  positionTag: string | null;
  createdAt: Date;
  team?: { id: string; name: string } | null;
}

interface Team {
  id: string;
  name: string;
}

interface Stats {
  activeUsersCount: number;
  tasksStartedCount: number;
  tasksCompletedCount: number;
}

interface ManageDashboardProps {
  role: UserRole;
  pendingActivation: PendingUser[];
  pendingAssignment: PendingUser[];
  teams: Team[];
  stats: Stats;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ManageDashboard({
  role,
  pendingActivation,
  pendingAssignment,
  teams: initialTeams,
  stats,
}: ManageDashboardProps) {
  const [tab, setTab] = useState<"overview" | "members" | "teams">("overview");

  return (
    <div className="max-w-5xl mx-auto px-6 py-6">
      <div className="mb-5">
        <h1 className="text-lg font-semibold">管理端</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {role === "ENTERPRISE_ADMIN" ? "企业整体概览" : "本团队概览"}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {([
          ["overview", "概览"],
          ["members", "成员管理"],
          ["teams", "团队管理"],
        ] as const).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm border-b-2 transition-colors -mb-px ${
              tab === t
                ? "border-primary text-primary font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <OverviewTab
          stats={stats}
          pendingActivation={pendingActivation}
          pendingAssignment={pendingAssignment}
          teams={initialTeams}
          role={role}
        />
      )}
      {tab === "members" && <MembersTab />}
      {tab === "teams" && <TeamsTab initialTeams={initialTeams} role={role} />}
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({
  stats, pendingActivation, pendingAssignment, teams, role,
}: {
  stats: Stats;
  pendingActivation: PendingUser[];
  pendingAssignment: PendingUser[];
  teams: Team[];
  role: UserRole;
}) {
  const [activation, setActivation] = useState(pendingActivation);
  const [assignment, setAssignment] = useState(pendingAssignment);
  const [selectedTeams, setSelectedTeams] = useState<Record<string, string | undefined>>({});
  const [loading, setLoading] = useState<string | null>(null);

  async function handleActivate(userId: string, teamId?: string) {
    setLoading(userId);
    try {
      const res = await fetch("/api/manage/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "activate", teamId }),
      });
      if (!res.ok) { toast.error((await res.json()).error ?? "操作失败"); return; }
      toast.success("已激活");
      setActivation((prev) => prev.filter((u) => u.id !== userId));
    } finally { setLoading(null); }
  }

  async function handleAssign(userId: string, teamId: string) {
    if (!teamId) { toast.error("请选择团队"); return; }
    setLoading(userId);
    try {
      const res = await fetch("/api/manage/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "assign_team", teamId }),
      });
      if (!res.ok) { toast.error((await res.json()).error ?? "操作失败"); return; }
      toast.success("已分配到团队");
      setAssignment((prev) => prev.filter((u) => u.id !== userId));
    } finally { setLoading(null); }
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={<Activity className="w-4 h-4 text-primary" />} label="30 天活跃人数" value={stats.activeUsersCount} />
        <StatCard icon={<ClipboardList className="w-4 h-4 text-primary" />} label="30 天发起任务" value={stats.tasksStartedCount} />
        <StatCard icon={<CheckCircle2 className="w-4 h-4 text-primary" />} label="30 天完成任务" value={stats.tasksCompletedCount} />
      </div>

      {/* 待激活 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            待激活成员
            {activation.length > 0 && <Badge variant="destructive" className="text-[10px] h-4 px-1.5">{activation.length}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activation.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无待激活成员</p>
          ) : (
            <div className="space-y-2">
              {activation.map((user) => (
                <div key={user.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {user.loginAccount}{user.positionTag && ` · ${user.positionTag}`}
                    </p>
                    <p className="text-xs text-muted-foreground">注册于 {formatDate(user.createdAt)}</p>
                  </div>
                  {teams.length > 0 && !user.team && (
                    <Select
                      value={selectedTeams[user.id] ?? ""}
                      onValueChange={(v: string | null) => setSelectedTeams((p) => ({ ...p, [user.id]: v ?? undefined }))}
                    >
                      <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="选择团队" /></SelectTrigger>
                      <SelectContent>
                        {teams.map((t) => <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                  <Button
                    size="sm"
                    className="h-8 text-xs bg-primary hover:bg-primary/90"
                    disabled={loading === user.id}
                    onClick={() => handleActivate(user.id, selectedTeams[user.id] || user.team?.id)}
                  >
                    {loading === user.id ? "处理中..." : "激活"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 待分配 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            待分配成员
            {assignment.length > 0 && <Badge variant="destructive" className="text-[10px] h-4 px-1.5">{assignment.length}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {assignment.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无待分配成员</p>
          ) : (
            <div className="space-y-2">
              {assignment.map((user) => (
                <div key={user.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.loginAccount}</p>
                  </div>
                  <Select
                    value={selectedTeams[`assign_${user.id}`] ?? ""}
                    onValueChange={(v: string | null) => setSelectedTeams((p) => ({ ...p, [`assign_${user.id}`]: v ?? undefined }))}
                  >
                    <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="选择团队" /></SelectTrigger>
                    <SelectContent>
                      {teams.map((t) => <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    disabled={loading === user.id || !selectedTeams[`assign_${user.id}`]}
                    onClick={() => handleAssign(user.id, selectedTeams[`assign_${user.id}`] ?? "")}
                  >
                    {loading === user.id ? "处理中..." : "分配"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Members Tab ──────────────────────────────────────────────────────────────

interface Member {
  id: string;
  name: string;
  loginAccount: string;
  role: string;
  status: string;
  positionTag: string | null;
  team: { id: string; name: string } | null;
  createdAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  MEMBER: "成员",
  TEAM_LEADER: "负责人",
  ENTERPRISE_ADMIN: "管理员",
};

const STATUS_META_MEMBER: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  ACTIVE: { label: "正常", variant: "secondary" },
  LOCKED: { label: "已锁定", variant: "destructive" },
  DISABLED: { label: "已禁用", variant: "outline" },
  PENDING: { label: "待激活", variant: "secondary" },
  PENDING_ASSIGNMENT: { label: "待分配", variant: "secondary" },
};

function MembersTab() {
  const [members, setMembers] = useState<Member[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => { fetchMembers(); }, [search, page]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchMembers() {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (search) qs.set("q", search);
      qs.set("page", String(page));
      const res = await fetch(`/api/manage/members?${qs}`);
      if (!res.ok) return;
      const data = await res.json();
      setMembers(data.members ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }

  async function action(userId: string, act: string) {
    setActing(userId + act);
    try {
      const res = await fetch("/api/manage/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: act }),
      });
      if (!res.ok) { toast.error((await res.json()).error ?? "操作失败"); return; }
      toast.success("操作成功");
      fetchMembers();
    } finally {
      setActing(null); }
  }

  const pageSize = 20;
  const pageCount = Math.ceil(total / pageSize);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="搜索成员姓名"
            className="pl-8 h-8 text-sm"
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-4">加载中...</p>
      ) : members.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">暂无成员</p>
      ) : (
        <div className="space-y-2">
          {members.map((m) => {
            const sm = STATUS_META_MEMBER[m.status];
            return (
              <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-white">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary text-xs font-medium">{m.name.slice(0, 1)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium">{m.name}</p>
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5">{ROLE_LABELS[m.role] ?? m.role}</Badge>
                    {sm && <Badge variant={sm.variant} className="text-[10px] h-4 px-1.5">{sm.label}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {m.loginAccount}{m.team && ` · ${m.team.name}`}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {m.status === "ACTIVE" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      disabled={!!acting}
                      onClick={() => action(m.id, "lock")}
                    >
                      锁定
                    </Button>
                  )}
                  {m.status === "LOCKED" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      disabled={!!acting}
                      onClick={() => action(m.id, "unlock")}
                    >
                      解锁
                    </Button>
                  )}
                  {m.role === "MEMBER" && m.status === "ACTIVE" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      disabled={!!acting}
                      onClick={() => action(m.id, "change_role")}
                    >
                      设为负责人
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pageCount > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</Button>
          <span className="flex items-center text-sm text-muted-foreground px-2">{page} / {pageCount}</span>
          <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => setPage(page + 1)}>下一页</Button>
        </div>
      )}
    </div>
  );
}

// ─── Teams Tab ────────────────────────────────────────────────────────────────

interface TeamDetail {
  id: string;
  name: string;
  status?: string;
  memberCount?: number;
  leader?: { id: string; name: string } | null;
}

function TeamsTab({ initialTeams, role }: { initialTeams: Team[]; role: UserRole }) {
  const [teams, setTeams] = useState<TeamDetail[]>(initialTeams);
  const [loading, setLoading] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [creating, setCreating] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviting, setInviting] = useState<string | null>(null);

  async function fetchTeams() {
    setLoading(true);
    try {
      const res = await fetch("/api/manage/teams");
      if (!res.ok) return;
      const data = await res.json();
      setTeams(data.teams);
    } finally {
      setLoading(false);
    }
  }

  async function createTeam() {
    if (!newTeamName.trim()) { toast.error("请输入团队名称"); return; }
    setCreating(true);
    try {
      const res = await fetch("/api/manage/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTeamName.trim() }),
      });
      if (!res.ok) { toast.error((await res.json()).error ?? "创建失败"); return; }
      toast.success("团队已创建");
      setNewTeamName("");
      fetchTeams();
    } finally {
      setCreating(false);
    }
  }

  async function generateInvite(teamId: string) {
    setInviting(teamId);
    try {
      const res = await fetch("/api/manage/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId }),
      });
      if (!res.ok) { toast.error((await res.json()).error ?? "生成失败"); return; }
      const data = await res.json();
      const link = `${window.location.origin}/invite?token=${data.token}`;
      setInviteLink(link);
      await navigator.clipboard.writeText(link).catch(() => {});
      toast.success("邀请链接已复制到剪贴板");
    } finally {
      setInviting(null);
    }
  }

  return (
    <div className="space-y-4">
      {role === "ENTERPRISE_ADMIN" && (
        <div className="flex gap-2">
          <Input
            placeholder="新团队名称"
            className="h-8 text-sm max-w-xs"
            value={newTeamName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTeamName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createTeam()}
          />
          <Button
            size="sm"
            className="h-8 bg-primary hover:bg-primary/90"
            disabled={creating}
            onClick={createTeam}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            {creating ? "创建中..." : "创建团队"}
          </Button>
        </div>
      )}

      {inviteLink && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border">
          <LinkIcon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <p className="text-xs text-muted-foreground truncate flex-1">{inviteLink}</p>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs flex-shrink-0"
            onClick={() => { navigator.clipboard.writeText(inviteLink); toast.success("已复制"); }}
          >
            复制
          </Button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground py-4">加载中...</p>
      ) : teams.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">暂无团队，请先创建</p>
      ) : (
        <div className="space-y-2">
          {teams.map((t) => (
            <div key={t.id} className="flex items-center gap-3 p-3.5 rounded-lg border border-border bg-white">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{t.name}</p>
                {t.leader && (
                  <p className="text-xs text-muted-foreground">负责人：{t.leader.name}</p>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                disabled={inviting === t.id}
                onClick={() => generateInvite(t.id)}
              >
                <LinkIcon className="w-3 h-3 mr-1" />
                {inviting === t.id ? "生成中..." : "邀请链接"}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-2 mb-1">
          {icon}
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
