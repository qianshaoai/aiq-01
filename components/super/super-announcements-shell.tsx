"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, Megaphone } from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  content: string;
  validFrom: string;
  validUntil: string | null;
  createdAt: string;
}

function isExpired(a: Announcement) {
  if (!a.validUntil) return false;
  return new Date(a.validUntil) < new Date();
}

function isActive(a: Announcement) {
  const now = new Date();
  const from = new Date(a.validFrom);
  if (from > now) return false;
  if (a.validUntil && new Date(a.validUntil) < now) return false;
  return true;
}

export function SuperAnnouncementsShell() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", validUntil: "" });

  useEffect(() => { fetchAnnouncements(); }, []);

  async function fetchAnnouncements() {
    setLoading(true);
    try {
      const res = await fetch("/api/super/announcements");
      if (!res.ok) return;
      const data = await res.json();
      setAnnouncements(data.announcements);
    } finally { setLoading(false); }
  }

  async function handleCreate() {
    if (!form.title.trim()) { toast.error("标题不能为空"); return; }
    if (!form.content.trim()) { toast.error("内容不能为空"); return; }
    setCreating(true);
    try {
      const res = await fetch("/api/super/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) { toast.error("创建失败"); return; }
      toast.success("公告已发布");
      setForm({ title: "", content: "", validUntil: "" });
      setShowForm(false);
      await fetchAnnouncements();
    } finally { setCreating(false); }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/super/announcements/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("删除失败"); return; }
    toast.success("公告已删除");
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">系统公告</h1>
          <p className="text-sm text-muted-foreground mt-0.5">向所有用户发布平台公告。</p>
        </div>
        <Button size="sm" className="h-8 text-xs bg-primary hover:bg-primary/90" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-3.5 h-3.5 mr-1" />新建公告
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-4 pb-4 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">标题</Label>
              <Input className="h-8 text-sm" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="公告标题" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">内容</Label>
              <Textarea className="text-sm min-h-20" value={form.content} onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))} placeholder="公告正文" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">到期时间（留空则长期有效）</Label>
              <Input className="h-8 text-sm w-56" type="datetime-local" value={form.validUntil} onChange={(e) => setForm((p) => ({ ...p, validUntil: e.target.value }))} />
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" className="h-7 text-xs bg-primary hover:bg-primary/90" disabled={creating} onClick={handleCreate}>
                {creating ? "发布中..." : "发布"}
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowForm(false)}>取消</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-lg" />)}</div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">暂无公告</div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <Card key={a.id} className={isExpired(a) ? "opacity-50" : ""}>
              <CardContent className="pt-3 pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    <Megaphone className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{a.title}</span>
                        {isActive(a) && <Badge className="text-[10px] h-4 px-1.5 bg-green-100 text-green-700 border-green-200">生效中</Badge>}
                        {isExpired(a) && <Badge variant="secondary" className="text-[10px] h-4 px-1.5">已过期</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{a.content}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        发布：{new Date(a.createdAt).toLocaleDateString("zh-CN")}
                        {a.validUntil && ` · 到期：${new Date(a.validUntil).toLocaleDateString("zh-CN")}`}
                      </p>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(a.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
