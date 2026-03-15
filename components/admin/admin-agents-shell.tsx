"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, Save, RotateCcw, ChevronDown, ChevronUp, ToggleLeft, ToggleRight, Upload } from "lucide-react";

interface AgentConfig {
  agentKey: string;
  name: string;
  stageLabel: string;
  systemPrompt: string;
  knowledgeBase: string;
  outputStyle: string;
  isEnabled: boolean;
  isCustomized: boolean;
  id: string | null;
}

type EditState = {
  name: string;
  systemPrompt: string;
  knowledgeBase: string;
  outputStyle: string;
  isEnabled: boolean;
};

export function AdminAgentsShell() {
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, EditState>>({});
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => { fetchAgents(); }, []);

  async function fetchAgents() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/agents");
      if (!res.ok) return;
      const data = await res.json();
      setAgents(data.agents);
      // Init edit state
      const initEdits: Record<string, EditState> = {};
      for (const a of data.agents as AgentConfig[]) {
        initEdits[a.agentKey] = {
          name: a.name,
          systemPrompt: a.systemPrompt,
          knowledgeBase: a.knowledgeBase,
          outputStyle: a.outputStyle,
          isEnabled: a.isEnabled,
        };
      }
      setEdits(initEdits);
    } finally {
      setLoading(false);
    }
  }

  function updateEdit(agentKey: string, field: keyof EditState, value: string | boolean) {
    setEdits((prev) => ({
      ...prev,
      [agentKey]: { ...prev[agentKey], [field]: value },
    }));
  }

  async function handleSave(agentKey: string) {
    const edit = edits[agentKey];
    if (!edit) return;
    setSaving(agentKey);
    try {
      const res = await fetch(`/api/admin/agents/${agentKey}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(edit),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error((d as { error?: string }).error ?? "保存失败");
        return;
      }
      toast.success("智能体配置已保存");
      await fetchAgents();
    } finally {
      setSaving(null);
    }
  }

  async function handleKbUpload(agentKey: string, file: File) {
    setUploading(agentKey);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/admin/agents/${agentKey}/upload-kb`, { method: "POST", body: formData });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.message ?? "解析失败");
        return;
      }
      const data = await res.json();
      updateEdit(agentKey, "knowledgeBase", data.text);
      toast.success(`文件已解析，共 ${data.charCount} 字`);
    } finally {
      setUploading(null);
      const ref = fileInputRefs.current[agentKey];
      if (ref) ref.value = "";
    }
  }

  async function handleReset(agentKey: string) {
    setSaving(agentKey + "_reset");
    try {
      const res = await fetch(`/api/admin/agents/${agentKey}`, { method: "DELETE" });
      if (!res.ok) { toast.error("重置失败"); return; }
      toast.success("已重置为全局默认配置");
      await fetchAgents();
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-6 space-y-4">
      <div>
        <h1 className="text-lg font-semibold">智能体配置</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          为每个执行阶段配置专属的 AI 角色、提示词和知识库
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {agents.map((agent) => {
            const edit = edits[agent.agentKey];
            const isOpen = expanded === agent.agentKey;
            const isSaving = saving === agent.agentKey;

            if (!edit) return null;

            return (
              <Card key={agent.agentKey} className={!edit.isEnabled ? "opacity-60" : ""}>
                {/* Header */}
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
                  onClick={() => setExpanded(isOpen ? null : agent.agentKey)}
                >
                  <Bot className="w-4 h-4 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{edit.name}</span>
                      {agent.isCustomized && (
                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5">已自定义</Badge>
                      )}
                      {!edit.isEnabled && (
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5">已关闭</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{agent.stageLabel}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      title={edit.isEnabled ? "点击关闭" : "点击开启"}
                      onClick={() => updateEdit(agent.agentKey, "isEnabled", !edit.isEnabled)}
                    >
                      {edit.isEnabled
                        ? <ToggleRight className="w-5 h-5 text-primary" />
                        : <ToggleLeft className="w-5 h-5" />
                      }
                    </button>
                  </div>
                  {isOpen
                    ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  }
                </div>

                {/* Expanded editor */}
                {isOpen && (
                  <CardContent className="pt-0 pb-4 space-y-4 border-t border-border">
                    <div className="space-y-1.5 pt-4">
                      <Label className="text-xs">显示名称</Label>
                      <Input
                        className="h-8 text-sm"
                        value={edit.name}
                        onChange={(e) => updateEdit(agent.agentKey, "name", e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">
                        系统提示词
                        <span className="text-muted-foreground font-normal ml-1">
                          （支持变量：{"{{task_type}}"}、{"{{company_name}}"}）
                        </span>
                      </Label>
                      <Textarea
                        className="text-sm min-h-32 font-mono"
                        value={edit.systemPrompt}
                        onChange={(e) => updateEdit(agent.agentKey, "systemPrompt", e.target.value)}
                        placeholder="输入系统提示词..."
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">
                          知识库内容
                          <span className="text-muted-foreground font-normal ml-1">
                            （最多 8000 字注入提示词）
                          </span>
                        </Label>
                        <div>
                          <input
                            type="file"
                            accept=".txt,.pdf,.doc,.docx"
                            className="hidden"
                            ref={(el) => { fileInputRefs.current[agent.agentKey] = el; }}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleKbUpload(agent.agentKey, file);
                            }}
                          />
                          <button
                            type="button"
                            className="flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
                            disabled={uploading === agent.agentKey}
                            onClick={() => fileInputRefs.current[agent.agentKey]?.click()}
                          >
                            <Upload className="w-3 h-3" />
                            {uploading === agent.agentKey ? "解析中..." : "上传文件"}
                          </button>
                        </div>
                      </div>
                      <Textarea
                        className="text-sm min-h-24"
                        value={edit.knowledgeBase}
                        onChange={(e) => updateEdit(agent.agentKey, "knowledgeBase", e.target.value)}
                        placeholder="粘贴企业相关知识、背景信息、规范文档等，或点击「上传文件」解析 TXT/PDF/Word..."
                      />
                      {edit.knowledgeBase.length > 6000 && (
                        <p className="text-xs text-amber-600">
                          当前 {edit.knowledgeBase.length} 字
                          {edit.knowledgeBase.length > 8000 ? "（超出 8000 字限制，将被截断）" : "（接近限制）"}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">输出风格</Label>
                      <Select
                        value={edit.outputStyle}
                        onValueChange={(v) => updateEdit(agent.agentKey, "outputStyle", v ?? "FORMAL")}
                      >
                        <SelectTrigger className="h-8 text-sm w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FORMAL">正式</SelectItem>
                          <SelectItem value="FRIENDLY">友好</SelectItem>
                          <SelectItem value="CONCISE">简洁</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        size="sm"
                        className="h-7 text-xs bg-primary hover:bg-primary/90"
                        disabled={!!saving}
                        onClick={() => handleSave(agent.agentKey)}
                      >
                        <Save className="w-3 h-3 mr-1" />
                        {isSaving ? "保存中..." : "保存配置"}
                      </Button>
                      {agent.isCustomized && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          disabled={!!saving}
                          onClick={() => handleReset(agent.agentKey)}
                        >
                          <RotateCcw className="w-3 h-3 mr-1" />
                          重置为默认
                        </Button>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
