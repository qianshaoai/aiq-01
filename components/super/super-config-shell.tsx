"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Save, Upload, Image as ImageIcon } from "lucide-react";

const TEXT_FIELDS = [
  { key: "platform_name", label: "平台名称", type: "input", placeholder: "前哨 AI 进化场" },
  { key: "default_ai_provider", label: "默认 AI 供应商（兜底）", type: "input", placeholder: "anthropic / openai" },
  { key: "default_model", label: "默认模型 ID", type: "input", placeholder: "claude-sonnet-4-6" },
  { key: "maintenance_notice", label: "维护公告（显示在登录页）", type: "textarea", placeholder: "留空则不显示" },
] as const;

export function SuperConfigShell() {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchConfig(); }, []);

  async function fetchConfig() {
    setLoading(true);
    try {
      const res = await fetch("/api/super/config");
      if (!res.ok) return;
      const data = await res.json();
      setConfig(data.config);
    } finally { setLoading(false); }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload: Record<string, string> = {};
      for (const f of TEXT_FIELDS) payload[f.key] = config[f.key] ?? "";
      const res = await fetch("/api/super/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { toast.error("保存失败"); return; }
      toast.success("全局配置已保存");
    } finally { setSaving(false); }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/super/config/upload-logo", { method: "POST", body: formData });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.message ?? "上传失败");
        return;
      }
      const data = await res.json();
      setConfig((prev) => ({ ...prev, platform_logo_url: data.logoUrl }));
      toast.success("Logo 已上传");
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-6 space-y-6">
      <div>
        <h1 className="text-lg font-semibold">全局配置</h1>
        <p className="text-sm text-muted-foreground mt-0.5">平台基础设置，立即生效。</p>
      </div>

      {loading ? (
        <div className="space-y-4">{[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
      ) : (
        <div className="space-y-5">
          {/* Logo upload */}
          <div className="space-y-2">
            <Label className="text-sm">平台 Logo</Label>
            <div className="flex items-center gap-3">
              <div className="w-32 h-10 rounded border border-border bg-muted/20 flex items-center justify-center overflow-hidden">
                {config.platform_logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={config.platform_logo_url} alt="logo" className="max-h-full max-w-full object-contain" />
                ) : (
                  <ImageIcon className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".svg,.png"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  disabled={uploadingLogo}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-3 h-3 mr-1" />
                  {uploadingLogo ? "上传中..." : "上传 SVG / PNG"}
                </Button>
                <p className="text-xs text-muted-foreground mt-1">建议尺寸 200×60，不超过 500KB</p>
              </div>
            </div>
          </div>

          {/* Theme color (reserved) */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Label className="text-sm">主题色</Label>
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5">首版固定</Badge>
            </div>
            <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-muted/30 w-40">
              <div className="w-4 h-4 rounded-full bg-[#003FA5] flex-shrink-0" />
              <span className="text-sm text-muted-foreground">Klein 蓝 #003FA5</span>
            </div>
            <p className="text-xs text-muted-foreground">后续版本将开放自定义主题色配置。</p>
          </div>

          {/* Text fields */}
          {TEXT_FIELDS.map(({ key, label, type, placeholder }) => (
            <div key={key} className="space-y-1.5">
              <Label className="text-sm">{label}</Label>
              {type === "textarea" ? (
                <Textarea
                  className="text-sm min-h-20"
                  placeholder={placeholder}
                  value={config[key] ?? ""}
                  onChange={(e) => setConfig((prev) => ({ ...prev, [key]: e.target.value }))}
                />
              ) : (
                <Input
                  className="h-9 text-sm"
                  placeholder={placeholder}
                  value={config[key] ?? ""}
                  onChange={(e) => setConfig((prev) => ({ ...prev, [key]: e.target.value }))}
                />
              )}
            </div>
          ))}

          <div className="pt-2">
            <Button size="sm" disabled={saving} onClick={handleSave} className="bg-primary hover:bg-primary/90">
              <Save className="w-3.5 h-3.5 mr-1.5" />
              {saving ? "保存中..." : "保存配置"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
