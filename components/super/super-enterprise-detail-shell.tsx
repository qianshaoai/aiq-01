"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, RotateCcw, Users, Briefcase, CheckCircle2 } from "lucide-react";

interface Team {
  id: string;
  name: string;
  status: string;
  _count: { members: number };
}

interface EnterpriseDetail {
  id: string;
  name: string;
  enterpriseCode: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  teams: Team[];
  _count: { users: number; teams: number };
}

interface Props {
  enterpriseId: string;
}

export function SuperEnterpriseDetailShell({ enterpriseId }: Props) {
  const router = useRouter();
  const [enterprise, setEnterprise] = useState<EnterpriseDetail | null>(null);
  const [taskTotal, setTaskTotal] = useState(0);
  const [taskCompleted, setTaskCompleted] = useState(0);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => { fetchDetail(); }, []);

  async function fetchDetail() {
    setLoading(true);
    try {
      const res = await fetch(`/api/super/enterprises/${enterpriseId}`);
      if (!res.ok) { toast.error("加载失败"); return; }
      const data = await res.json();
      setEnterprise(data.enterprise);
      setTaskTotal(data.taskTotal);
      setTaskCompleted(data.taskCompleted);
    } finally { setLoading(false); }
  }

  async function handleAction(action: string) {
    setActing(action);
    try {
      const res = await fetch(`/api/super/enterprises/${enterpriseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) { toast.error("操作失败"); return; }
      const data = await res.json();
      if (action === "reset_code") {
        toast.success(`企业码已重置：${data.enterprise.enterpriseCode}`);
      } else {
        toast.success(action === "disable" ? "企业已停用" : "企业已恢复");
      }
      setEnterprise((prev) => prev ? { ...prev, ...data.enterprise } : null);
    } finally { setActing(null); }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-6 space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (!enterprise) return <div className="px-6 py-6 text-sm text-muted-foreground">企业不存在</div>;

  return (
    <div className="max-w-3xl mx-auto px-6 py-6 space-y-5">
      <button
        onClick={() => router.push("/super/enterprises")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> 返回企业列表
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">{enterprise.name}</h1>
            <Badge className={enterprise.status === "ACTIVE" ? "bg-green-100 text-green-700 border-green-200 text-[10px] h-4 px-1.5" : "text-[10px] h-4 px-1.5"} variant={enterprise.status === "ACTIVE" ? "outline" : "destructive"}>
              {enterprise.status === "ACTIVE" ? "正常" : "已停用"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            企业码：<span className="font-mono font-medium">{enterprise.enterpriseCode}</span>
            &nbsp;· 创建于 {new Date(enterprise.createdAt).toLocaleDateString("zh-CN")}
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            disabled={!!acting}
            onClick={() => handleAction("reset_code")}
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            {acting === "reset_code" ? "重置中..." : "重置企业码"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            disabled={!!acting}
            onClick={() => handleAction(enterprise.status === "ACTIVE" ? "disable" : "enable")}
          >
            {enterprise.status === "ACTIVE" ? "停用企业" : "恢复企业"}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <Users className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-semibold">{enterprise._count.users}</p>
            <p className="text-xs text-muted-foreground">成员总数</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <Briefcase className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-semibold">{taskTotal}</p>
            <p className="text-xs text-muted-foreground">任务总数</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
            <p className="text-2xl font-semibold">{taskCompleted}</p>
            <p className="text-xs text-muted-foreground">已完成任务</p>
          </CardContent>
        </Card>
      </div>

      {/* Teams */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">团队结构（{enterprise._count.teams} 个团队）</CardTitle>
        </CardHeader>
        <CardContent>
          {enterprise.teams.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无团队</p>
          ) : (
            <div className="space-y-2">
              {enterprise.teams.map((team) => (
                <div key={team.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{team.name}</span>
                    {team.status === "DISABLED" && (
                      <Badge variant="secondary" className="text-[10px] h-4 px-1.5">已停用</Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{team._count.members} 名成员</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
