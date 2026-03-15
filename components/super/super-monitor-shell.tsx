"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Users, Briefcase, TrendingUp, Shield, RefreshCw } from "lucide-react";

interface MonitorData {
  enterprises: { total: number; active: number };
  users: { total: number; tasks30d: number };
  tasks: { total: number; completed: number; last7d: number };
  growthReceipts: { total: number };
  superAdmins: { active: number };
  generatedAt: string;
}

export function SuperMonitorShell() {
  const [data, setData] = useState<MonitorData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch("/api/super/monitor");
      if (!res.ok) return;
      setData(await res.json());
    } finally { setLoading(false); }
  }

  const stats = data ? [
    {
      icon: Building2, label: "企业总数", value: data.enterprises.total,
      sub: `${data.enterprises.active} 家正常运营`, color: "text-primary",
    },
    {
      icon: Users, label: "用户总数", value: data.users.total,
      sub: `近30日任务 ${data.users.tasks30d} 个`, color: "text-blue-500",
    },
    {
      icon: Briefcase, label: "任务总数", value: data.tasks.total,
      sub: `${data.tasks.completed} 个已完成`, color: "text-violet-500",
    },
    {
      icon: TrendingUp, label: "近7日新增任务", value: data.tasks.last7d,
      sub: `成长回执 ${data.growthReceipts.total} 份`, color: "text-emerald-500",
    },
    {
      icon: Shield, label: "超管账号（活跃）", value: data.superAdmins.active,
      sub: "超级管理员", color: "text-orange-500",
    },
  ] : [];

  return (
    <div className="max-w-3xl mx-auto px-6 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">系统运行状态</h1>
          <p className="text-sm text-muted-foreground mt-0.5">平台核心指标概览</p>
        </div>
        <Button size="sm" variant="outline" className="h-8 text-xs" disabled={loading} onClick={fetchData}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />
          刷新
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {stats.map(({ icon: Icon, label, value, sub, color }) => (
              <Card key={label}>
                <CardContent className="pt-4 pb-4">
                  <Icon className={`w-5 h-5 ${color} mb-2`} />
                  <p className="text-2xl font-semibold">{value.toLocaleString()}</p>
                  <p className="text-xs font-medium text-foreground mt-0.5">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {data && (
            <p className="text-xs text-muted-foreground text-right">
              数据更新于 {new Date(data.generatedAt).toLocaleTimeString("zh-CN")}
            </p>
          )}
        </>
      )}
    </div>
  );
}
