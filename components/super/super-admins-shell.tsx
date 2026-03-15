"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, UserCheck, UserX, Shield } from "lucide-react";

interface AdminRecord {
  id: string;
  email: string;
  name: string;
  status: "ACTIVE" | "DISABLED";
  lastLoginAt: string | null;
  createdAt: string;
}

export function SuperAdminsShell() {
  const [admins, setAdmins] = useState<AdminRecord[]>([]);
  const [currentId, setCurrentId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [form, setForm] = useState({ email: "", name: "", password: "" });

  useEffect(() => { fetchAdmins(); }, []);

  async function fetchAdmins() {
    setLoading(true);
    try {
      const res = await fetch("/api/super/admins");
      if (!res.ok) return;
      const data = await res.json();
      setAdmins(data.admins);
      setCurrentId(data.currentId);
    } finally { setLoading(false); }
  }

  async function handleCreate() {
    if (!form.email.trim()) { toast.error("邮箱不能为空"); return; }
    if (!form.name.trim()) { toast.error("姓名不能为空"); return; }
    if (form.password.length < 6) { toast.error("密码至少6位"); return; }
    setCreating(true);
    try {
      const res = await fetch("/api/super/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.message ?? "创建失败");
        return;
      }
      toast.success("账号已创建");
      setForm({ email: "", name: "", password: "" });
      setShowForm(false);
      await fetchAdmins();
    } finally { setCreating(false); }
  }

  async function handleToggle(admin: AdminRecord) {
    const newStatus = admin.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
    setToggling(admin.id);
    try {
      const res = await fetch(`/api/super/admins/${admin.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) { toast.error("操作失败"); return; }
      toast.success(newStatus === "ACTIVE" ? "账号已启用" : "账号已禁用");
      setAdmins((prev) => prev.map((a) => a.id === admin.id ? { ...a, status: newStatus } : a));
    } finally { setToggling(null); }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">账号管理</h1>
          <p className="text-sm text-muted-foreground mt-0.5">管理超级管理员账号。</p>
        </div>
        <Button size="sm" className="h-8 text-xs bg-primary hover:bg-primary/90" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-3.5 h-3.5 mr-1" />添加账号
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-4 pb-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">邮箱</Label>
                <Input className="h-8 text-sm" type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="admin@example.com" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">姓名</Label>
                <Input className="h-8 text-sm" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="管理员姓名" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">初始密码</Label>
              <Input className="h-8 text-sm w-56" type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} placeholder="至少6位" />
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" className="h-7 text-xs bg-primary hover:bg-primary/90" disabled={creating} onClick={handleCreate}>
                {creating ? "创建中..." : "创建账号"}
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowForm(false)}>取消</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
      ) : (
        <div className="space-y-2">
          {admins.map((admin) => (
            <Card key={admin.id}>
              <CardContent className="py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{admin.name}</span>
                      {admin.id === currentId && <Badge variant="secondary" className="text-[10px] h-4 px-1.5">当前账号</Badge>}
                      <Badge
                        className={`text-[10px] h-4 px-1.5 ${admin.status === "ACTIVE" ? "bg-green-100 text-green-700 border-green-200" : "bg-red-100 text-red-700 border-red-200"}`}
                      >
                        {admin.status === "ACTIVE" ? "正常" : "已禁用"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {admin.email} · 创建于 {new Date(admin.createdAt).toLocaleDateString("zh-CN")}
                      {admin.lastLoginAt && ` · 最近登录 ${new Date(admin.lastLoginAt).toLocaleDateString("zh-CN")}`}
                    </p>
                  </div>
                  {admin.id !== currentId && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      disabled={toggling === admin.id}
                      onClick={() => handleToggle(admin)}
                    >
                      {admin.status === "ACTIVE" ? (
                        <><UserX className="w-3 h-3 mr-1" />禁用</>
                      ) : (
                        <><UserCheck className="w-3 h-3 mr-1" />启用</>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
