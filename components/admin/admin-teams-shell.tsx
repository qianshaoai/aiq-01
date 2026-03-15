"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Plus, Link as LinkIcon } from "lucide-react";

interface Team {
  id: string;
  name: string;
  status: string;
  leaderUserId: string | null;
  createdAt: Date;
  _count: { members: number };
}

interface Leader {
  id: string;
  name: string;
  loginAccount: string;
}

interface Props {
  teams: Team[];
  leaders: Leader[];
  enterpriseId: string;
}

export function AdminTeamsShell({ teams: initialTeams, leaders, enterpriseId }: Props) {
  const [teams, setTeams] = useState(initialTeams);
  const [newTeamName, setNewTeamName] = useState("");
  const [creating, setCreating] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviting, setInviting] = useState<string | null>(null);

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
      const data = await res.json();
      toast.success("团队已创建");
      setNewTeamName("");
      setTeams((prev) => [...prev, { ...data.team, _count: { members: 0 } }]);
    } finally { setCreating(false); }
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
      const link = data.inviteUrl as string;
      setInviteLink(link);
      await navigator.clipboard.writeText(link).catch(() => {});
      toast.success("邀请链接已复制到剪贴板");
    } finally { setInviting(null); }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
      <div>
        <h1 className="text-lg font-semibold">团队管理</h1>
        <p className="text-sm text-muted-foreground mt-0.5">创建和管理企业团队</p>
      </div>

      {/* Create team */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">创建新团队</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="团队名称"
              className="h-8 text-sm max-w-xs"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
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
        </CardContent>
      </Card>

      {/* Invite link display */}
      {inviteLink && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
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

      {/* Teams list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            团队列表 ({teams.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {teams.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无团队，请先创建</p>
          ) : (
            <div className="space-y-2">
              {teams.map((t) => {
                const leader = leaders.find((l) => l.id === t.leaderUserId);
                return (
                  <div key={t.id} className="flex items-center gap-3 p-3.5 rounded-lg border bg-white">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{t.name}</p>
                        {t.status === "DISABLED" && (
                          <Badge variant="outline" className="text-[10px] h-4 px-1.5">已停用</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t._count.members} 名成员
                        {leader && ` · 负责人：${leader.name}`}
                      </p>
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
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
