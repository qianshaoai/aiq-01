"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Search } from "lucide-react";

interface PendingUser {
  id: string;
  name: string;
  loginAccount: string;
  positionTag: string | null;
  createdAt: Date;
  team?: { id: string; name: string } | null;
}

interface Member {
  id: string;
  name: string;
  loginAccount: string;
  positionTag: string | null;
  role: string;
  status: string;
  lastLoginAt: Date | null;
  team?: { id: string; name: string } | null;
}

interface Team {
  id: string;
  name: string;
}

interface Props {
  pendingActivation: PendingUser[];
  pendingAssignment: PendingUser[];
  members: Member[];
  teams: Team[];
}

const ROLE_LABELS: Record<string, string> = {
  MEMBER: "成员",
  TEAM_LEADER: "负责人",
  ENTERPRISE_ADMIN: "管理员",
};

const STATUS_META: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  ACTIVE: { label: "正常", variant: "secondary" },
  LOCKED: { label: "已锁定", variant: "destructive" },
  DISABLED: { label: "已停用", variant: "outline" },
  PENDING: { label: "待激活", variant: "secondary" },
  PENDING_ASSIGNMENT: { label: "待分配", variant: "secondary" },
};

export function AdminMembersShell({ pendingActivation, pendingAssignment, members, teams }: Props) {
  const [tab, setTab] = useState<"pending" | "all">("pending");
  const [activation, setActivation] = useState(pendingActivation);
  const [assignment, setAssignment] = useState(pendingAssignment);
  const [selectedTeams, setSelectedTeams] = useState<Record<string, string | undefined>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const totalPending = activation.length + assignment.length;

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

  async function handleMemberAction(userId: string, action: string) {
    setLoading(userId + action);
    try {
      const res = await fetch("/api/manage/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action }),
      });
      if (!res.ok) { toast.error((await res.json()).error ?? "操作失败"); return; }
      toast.success("操作成功");
    } finally { setLoading(null); }
  }

  const filteredMembers = members.filter(
    (m) =>
      !search ||
      m.name.includes(search) ||
      m.loginAccount.includes(search)
  );

  return (
    <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
      <div>
        <h1 className="text-lg font-semibold">成员管理</h1>
        <p className="text-sm text-muted-foreground mt-0.5">管理企业所有成员</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {([
          ["pending", `待处理 ${totalPending > 0 ? `(${totalPending})` : ""}`],
          ["all", `全部成员 (${members.length})`],
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

      {tab === "pending" && (
        <div className="space-y-4">
          {/* 待激活 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                待激活成员
                {activation.length > 0 && (
                  <Badge variant="destructive" className="text-[10px] h-4 px-1.5">{activation.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activation.length === 0 ? (
                <p className="text-sm text-muted-foreground">暂无待激活成员</p>
              ) : (
                <div className="space-y-2">
                  {activation.map((user) => (
                    <div key={user.id} className="flex items-center gap-3 p-3 rounded-lg border bg-background">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {user.loginAccount}{user.positionTag && ` · ${user.positionTag}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          注册于 {new Date(user.createdAt).toLocaleDateString("zh-CN")}
                        </p>
                      </div>
                      {teams.length > 0 && !user.team && (
                        <Select
                          value={selectedTeams[user.id] ?? ""}
                          onValueChange={(v) => setSelectedTeams((p) => ({ ...p, [user.id]: v || undefined }))}
                        >
                          <SelectTrigger className="w-32 h-8 text-xs">
                            <SelectValue placeholder="选择团队" />
                          </SelectTrigger>
                          <SelectContent>
                            {teams.map((t) => (
                              <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>
                            ))}
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
                {assignment.length > 0 && (
                  <Badge variant="destructive" className="text-[10px] h-4 px-1.5">{assignment.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {assignment.length === 0 ? (
                <p className="text-sm text-muted-foreground">暂无待分配成员</p>
              ) : (
                <div className="space-y-2">
                  {assignment.map((user) => (
                    <div key={user.id} className="flex items-center gap-3 p-3 rounded-lg border bg-background">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.loginAccount}</p>
                      </div>
                      <Select
                        value={selectedTeams[`assign_${user.id}`] ?? ""}
                        onValueChange={(v) => setSelectedTeams((p) => ({ ...p, [`assign_${user.id}`]: v || undefined }))}
                      >
                        <SelectTrigger className="w-32 h-8 text-xs">
                          <SelectValue placeholder="选择团队" />
                        </SelectTrigger>
                        <SelectContent>
                          {teams.map((t) => (
                            <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>
                          ))}
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
      )}

      {tab === "all" && (
        <div className="space-y-4">
          <div className="relative max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="搜索姓名或账号"
              className="pl-8 h-8 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            {filteredMembers.map((m) => {
              const sm = STATUS_META[m.status];
              return (
                <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg border bg-white">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary text-xs font-medium">{m.name.slice(0, 1)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium">{m.name}</p>
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                        {ROLE_LABELS[m.role] ?? m.role}
                      </Badge>
                      {sm && (
                        <Badge variant={sm.variant} className="text-[10px] h-4 px-1.5">{sm.label}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {m.loginAccount}{m.team && ` · ${m.team.name}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {m.status === "ACTIVE" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        disabled={!!loading}
                        onClick={() => handleMemberAction(m.id, "lock")}
                      >
                        锁定
                      </Button>
                    )}
                    {m.status === "LOCKED" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        disabled={!!loading}
                        onClick={() => handleMemberAction(m.id, "unlock")}
                      >
                        解锁
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
            {filteredMembers.length === 0 && (
              <p className="text-sm text-muted-foreground py-4">暂无匹配成员</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
