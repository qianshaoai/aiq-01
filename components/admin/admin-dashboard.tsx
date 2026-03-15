"use client";

import Link from "next/link";
import { Users, Building2, CheckSquare, Activity, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AdminDashboardProps {
  stats: {
    totalMembers: number;
    activeMembers: number;
    totalTeams: number;
    tasksStarted: number;
    tasksCompleted: number;
  };
  pendingCount: number;
}

export function AdminDashboard({ stats, pendingCount }: AdminDashboardProps) {
  return (
    <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
      <div>
        <h1 className="text-lg font-semibold">企业数据看板</h1>
        <p className="text-sm text-muted-foreground mt-0.5">企业整体使用概览</p>
      </div>

      {/* Stats row 1 */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              总成员数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.totalMembers}</p>
            <p className="text-xs text-muted-foreground mt-0.5">已激活账号</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              团队数量
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.totalTeams}</p>
            <p className="text-xs text-muted-foreground mt-0.5">活跃团队</p>
          </CardContent>
        </Card>
      </div>

      {/* Stats row 2 */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" />
              活跃成员
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.activeMembers}</p>
            <p className="text-xs text-muted-foreground mt-0.5">近 30 天</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              发起任务
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.tasksStarted}</p>
            <p className="text-xs text-muted-foreground mt-0.5">近 30 天</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <CheckSquare className="w-3.5 h-3.5" />
              完成任务
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.tasksCompleted}</p>
            <p className="text-xs text-muted-foreground mt-0.5">近 30 天</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending alert */}
      {pendingCount > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-600" />
              <span className="text-sm text-amber-800">
                有 <strong>{pendingCount}</strong> 名成员待处理（待激活或待分配）
              </span>
            </div>
            <Link
              href="/admin/members"
              className="inline-flex items-center h-7 px-2 text-xs rounded border border-amber-300 text-amber-700 hover:bg-amber-100 transition-colors"
            >
              去处理
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
