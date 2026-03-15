"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, ExternalLink, RotateCcw } from "lucide-react";

interface Enterprise {
  id: string;
  name: string;
  enterpriseCode: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  _count: { users: number; teams: number };
}

interface Props {
  enterprises: Enterprise[];
}

export function SuperEnterprisesShell({ enterprises: initialEnterprises }: Props) {
  const router = useRouter();
  const [enterprises, setEnterprises] = useState(initialEnterprises);
  const [newEntName, setNewEntName] = useState("");
  const [creating, setCreating] = useState(false);
  const [acting, setActing] = useState<string | null>(null);

  async function createEnterprise() {
    if (!newEntName.trim()) { toast.error("请输入企业名称"); return; }
    setCreating(true);
    try {
      const res = await fetch("/api/super/enterprises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newEntName.trim() }),
      });
      if (!res.ok) { toast.error((await res.json()).error ?? "创建失败"); return; }
      const data = await res.json();
      toast.success(`企业已创建，企业码：${data.enterprise.enterpriseCode}`);
      setNewEntName("");
      setEnterprises((prev) => [{ ...data.enterprise, _count: { users: 0, teams: 0 } }, ...prev]);
    } finally { setCreating(false); }
  }

  async function enterpriseAction(id: string, action: string) {
    setActing(id + action);
    try {
      const res = await fetch(`/api/super/enterprises/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) { toast.error((await res.json()).error ?? "操作失败"); return; }
      const data = await res.json();
      if (action === "reset_code") {
        toast.success(`企业码已重置：${data.enterprise.enterpriseCode}`);
        setEnterprises((prev) => prev.map((e) => e.id === id ? { ...e, enterpriseCode: data.enterprise.enterpriseCode } : e));
      } else {
        toast.success(action === "disable" ? "企业已停用" : "企业已恢复");
        setEnterprises((prev) => prev.map((e) => e.id === id ? { ...e, status: action === "disable" ? "DISABLED" : "ACTIVE" } : e));
      }
    } finally { setActing(null); }
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
      <div>
        <h1 className="text-lg font-semibold">企业管理</h1>
        <p className="text-sm text-muted-foreground mt-0.5">管理平台上的所有企业</p>
      </div>

      {/* Create enterprise */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">新建企业</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="企业名称"
              className="h-8 text-sm max-w-xs"
              value={newEntName}
              onChange={(e) => setNewEntName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createEnterprise()}
            />
            <Button
              size="sm"
              className="h-8 bg-primary hover:bg-primary/90"
              disabled={creating}
              onClick={createEnterprise}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              {creating ? "创建中..." : "新建企业"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">企业码将自动生成</p>
        </CardContent>
      </Card>

      {/* Enterprise list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            企业列表 ({enterprises.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {enterprises.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无企业</p>
          ) : (
            <div className="space-y-2">
              {enterprises.map((e) => (
                <div key={e.id} className="flex items-center gap-3 p-3.5 rounded-lg border bg-white">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <button
                        className="text-sm font-medium hover:underline text-left"
                        onClick={() => router.push(`/super/enterprises/${e.id}`)}
                      >
                        {e.name}
                      </button>
                      {e.status === "DISABLED" ? (
                        <Badge variant="destructive" className="text-[10px] h-4 px-1.5">已停用</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5">正常</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      企业码：<span className="font-mono">{e.enterpriseCode}</span> · {e._count.users} 名成员 · {e._count.teams} 个团队
                    </p>
                    <p className="text-xs text-muted-foreground">
                      创建于 {new Date(e.createdAt).toLocaleDateString("zh-CN")}
                    </p>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => router.push(`/super/enterprises/${e.id}`)}>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      disabled={!!acting}
                      onClick={() => enterpriseAction(e.id, "reset_code")}
                      title="重置企业码"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      disabled={!!acting}
                      onClick={() => enterpriseAction(e.id, e.status === "ACTIVE" ? "disable" : "enable")}
                    >
                      {e.status === "ACTIVE" ? "停用" : "恢复"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
