"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Circle, Eye, EyeOff, Save, Zap } from "lucide-react";

interface ProviderConfig {
  id: string;
  provider: string;
  isActive: boolean;
  modelName: string | null;
  baseUrl: string | null;
  hasKey: boolean;
  updatedAt: string;
}

const PROVIDERS = [
  {
    key: "ANTHROPIC",
    label: "Anthropic",
    desc: "Claude 系列模型",
    defaultModel: "claude-sonnet-4-6",
    modelPlaceholder: "claude-sonnet-4-6",
    showBaseUrl: false,
    defaultBaseUrl: "",
  },
  {
    key: "OPENAI",
    label: "OpenAI",
    desc: "GPT-4o 系列模型",
    defaultModel: "gpt-4o",
    modelPlaceholder: "gpt-4o",
    showBaseUrl: true,
    defaultBaseUrl: "",
  },
  {
    key: "GEMINI",
    label: "Google Gemini",
    desc: "Gemini 1.5 / 2.0 系列",
    defaultModel: "gemini-2.0-flash",
    modelPlaceholder: "gemini-2.0-flash",
    showBaseUrl: false,
    defaultBaseUrl: "",
  },
  {
    key: "DEEPSEEK",
    label: "DeepSeek",
    desc: "深度求索 · deepseek-chat / reasoner",
    defaultModel: "deepseek-chat",
    modelPlaceholder: "deepseek-chat",
    showBaseUrl: false,
    defaultBaseUrl: "https://api.deepseek.com/v1",
  },
  {
    key: "DOUBAO",
    label: "豆包（火山引擎）",
    desc: "字节跳动 · doubao-pro / lite 系列",
    defaultModel: "doubao-pro-32k",
    modelPlaceholder: "doubao-pro-32k",
    showBaseUrl: false,
    defaultBaseUrl: "https://ark.volces.com/api/v3",
  },
  {
    key: "QIANWEN",
    label: "通义千问",
    desc: "阿里云 · qwen-plus / max / turbo",
    defaultModel: "qwen-plus",
    modelPlaceholder: "qwen-plus",
    showBaseUrl: false,
    defaultBaseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  },
  {
    key: "MINIMAX",
    label: "MiniMax",
    desc: "MiniMax · MiniMax-Text-01 系列",
    defaultModel: "MiniMax-Text-01",
    modelPlaceholder: "MiniMax-Text-01",
    showBaseUrl: false,
    defaultBaseUrl: "https://api.minimax.chat/v1",
  },
  {
    key: "KIMI",
    label: "Kimi（月之暗面）",
    desc: "Moonshot · moonshot-v1-8k / 32k / 128k",
    defaultModel: "moonshot-v1-8k",
    modelPlaceholder: "moonshot-v1-8k",
    showBaseUrl: false,
    defaultBaseUrl: "https://api.moonshot.cn/v1",
  },
];

export function AIConfigShell() {
  const [configs, setConfigs] = useState<ProviderConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  // Per-provider form state
  const [formState, setFormState] = useState<
    Record<string, { apiKey: string; modelName: string; baseUrl: string; showKey: boolean }>
  >({});

  useEffect(() => {
    fetchConfigs();
  }, []);

  async function fetchConfigs() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/ai-config");
      if (!res.ok) return;
      const data = await res.json();
      setConfigs(data.configs);

      // Init form state for each provider
      const initial: typeof formState = {};
      for (const p of PROVIDERS) {
        const existing = data.configs.find((c: ProviderConfig) => c.provider === p.key);
        initial[p.key] = {
          apiKey: "",
          modelName: existing?.modelName ?? p.defaultModel,
          baseUrl: existing?.baseUrl ?? "",
          showKey: false,
        };
      }
      setFormState(initial);
    } finally {
      setLoading(false);
    }
  }

  function updateField(provider: string, field: string, value: string | boolean) {
    setFormState((prev) => ({
      ...prev,
      [provider]: { ...prev[provider], [field]: value },
    }));
  }

  async function handleSave(providerKey: string, activate: boolean) {
    const fs = formState[providerKey];
    if (!fs) return;

    // If no existing config and no API key entered, reject
    const existingConfig = configs.find((c) => c.provider === providerKey);
    if (!existingConfig && !fs.apiKey) {
      toast.error("首次配置请填写 API Key");
      return;
    }

    setSaving(providerKey + (activate ? "_activate" : ""));
    try {
      const res = await fetch("/api/admin/ai-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: providerKey,
          apiKey: fs.apiKey || undefined,
          modelName: fs.modelName || undefined,
          baseUrl: fs.baseUrl || undefined,
          activate,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        toast.error(d.error ?? "保存失败");
        return;
      }
      toast.success(activate ? "已保存并设为激活供应商" : "配置已保存");
      // Clear key field after save
      updateField(providerKey, "apiKey", "");
      await fetchConfigs();
    } finally {
      setSaving(null);
    }
  }

  const activeProvider = configs.find((c) => c.isActive);

  return (
    <div className="max-w-2xl mx-auto px-6 py-6 space-y-6">
      <div>
        <h1 className="text-lg font-semibold">AI 供应商配置</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          配置企业 AI 接入凭证，同一时间只有一个供应商处于激活状态
        </p>
      </div>

      {/* Active indicator */}
      {!loading && (
        <div className={`rounded-lg p-3 flex items-center gap-2 text-sm ${
          activeProvider
            ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
            : "bg-amber-50 border border-amber-200 text-amber-700"
        }`}>
          {activeProvider ? (
            <>
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              当前激活：{PROVIDERS.find((p) => p.key === activeProvider.provider)?.label ?? activeProvider.provider}
              {activeProvider.modelName && (
                <span className="text-xs opacity-75 ml-1">— {activeProvider.modelName}</span>
              )}
            </>
          ) : (
            <>
              <Circle className="w-4 h-4 flex-shrink-0" />
              尚未配置激活供应商，AI 功能不可用
            </>
          )}
        </div>
      )}

      {/* Provider cards */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-lg" />)}
        </div>
      ) : (
        <div className="space-y-4">
          {PROVIDERS.map((p) => {
            const cfg = configs.find((c) => c.provider === p.key);
            const fs = formState[p.key] ?? { apiKey: "", modelName: p.defaultModel, baseUrl: "", showKey: false };
            const isActive = cfg?.isActive ?? false;
            const isSaving = saving === p.key;
            const isActivating = saving === p.key + "_activate";

            return (
              <Card key={p.key} className={isActive ? "border-primary/40 shadow-sm" : ""}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      {p.label}
                      <span className="text-xs font-normal text-muted-foreground">{p.desc}</span>
                    </span>
                    <div className="flex items-center gap-2">
                      {cfg?.hasKey && (
                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5">已配置</Badge>
                      )}
                      {isActive && (
                        <Badge className="text-[10px] h-4 px-1.5 bg-primary">
                          <Zap className="w-2.5 h-2.5 mr-0.5" /> 激活中
                        </Badge>
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* API Key */}
                  <div className="space-y-1">
                    <Label className="text-xs">
                      API Key {cfg?.hasKey && <span className="text-muted-foreground font-normal">（已配置，留空则不更新）</span>}
                    </Label>
                    <div className="relative">
                      <Input
                        type={fs.showKey ? "text" : "password"}
                        placeholder={cfg?.hasKey ? "••••••••••••（留空不修改）" : "输入 API Key"}
                        className="h-8 text-sm pr-9"
                        value={fs.apiKey}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          updateField(p.key, "apiKey", e.target.value)
                        }
                      />
                      <button
                        type="button"
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => updateField(p.key, "showKey", !fs.showKey)}
                      >
                        {fs.showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Model */}
                  <div className="space-y-1">
                    <Label className="text-xs">模型名称</Label>
                    <Input
                      placeholder={p.modelPlaceholder}
                      className="h-8 text-sm"
                      value={fs.modelName}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        updateField(p.key, "modelName", e.target.value)
                      }
                    />
                  </div>

                  {/* Base URL */}
                  {(p.showBaseUrl || p.defaultBaseUrl) && (
                    <div className="space-y-1">
                      <Label className="text-xs">
                        Base URL{" "}
                        {p.defaultBaseUrl
                          ? <span className="text-muted-foreground font-normal">（默认已配置，可覆盖）</span>
                          : <span className="text-muted-foreground font-normal">（可选，用于兼容 API）</span>}
                      </Label>
                      <Input
                        placeholder={p.defaultBaseUrl || "https://api.openai.com/v1"}
                        className="h-8 text-sm"
                        value={fs.baseUrl}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          updateField(p.key, "baseUrl", e.target.value)
                        }
                      />
                      {p.defaultBaseUrl && !fs.baseUrl && (
                        <p className="text-[11px] text-muted-foreground">默认：{p.defaultBaseUrl}</p>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      disabled={!!saving}
                      onClick={() => handleSave(p.key, false)}
                    >
                      <Save className="w-3 h-3 mr-1" />
                      {isSaving ? "保存中..." : "保存"}
                    </Button>
                    {!isActive && (
                      <Button
                        size="sm"
                        className="h-7 text-xs bg-primary hover:bg-primary/90"
                        disabled={!!saving}
                        onClick={() => handleSave(p.key, true)}
                      >
                        <Zap className="w-3 h-3 mr-1" />
                        {isActivating ? "激活中..." : "保存并激活"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
