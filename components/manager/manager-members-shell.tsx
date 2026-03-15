"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users } from "lucide-react";

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

function formatDate(date: Date | null): string {
  if (!date) return "从未登录";
  return new Date(date).toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

export function ManagerMembersShell({ pendingActivation, pendingAssignment, members, teams }: Props) {
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

  const totalPending = activation.length + assignment.length;

  return (
    <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
      <div>
        <h1 className="text-lg font-semibold">成员管理</h1>
        <p className="text-sm text-muted-foreground mt-0.5">查看成员状态，处理待激活与待分配成员</p>
      </div>

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

      {/* Active members list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">团队成员 ({members.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无成员</p>
          ) : (
            <div className="space-y-2">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg border bg-background">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary text-xs font-medium">{m.name.slice(0, 1)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{m.name}</p>
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                        {ROLE_LABELS[m.role] ?? m.role}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {m.loginAccount}{m.team && ` · ${m.team.name}`}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground flex-shrink-0">
                    最近登录：{formatDate(m.lastLoginAt)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {totalPending === 0 && members.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">暂无成员数据</p>
      )}
    </div>
  );
}
