"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, Save, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";

interface AgentConfig {
  agentKey: string;
  name: string;
  stageLabel: string;
  systemPrompt: string;
  knowledgeBase: string;
  outputStyle: string;
  isEnabled: boolean;
  isCustomized: boolean;
}

type EditState = { name: string; systemPrompt: string; knowledgeBase: string; outputStyle: string; isEnabled: boolean };

export function SuperAgentTemplatesShell() {
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, EditState>>({});

  useEffect(() => { fetchAgents(); }, []);

  async function fetchAgents() {
    setLoading(true);
    try {
      const res = await fetch("/api/super/agent-templates");
      if (!res.ok) return;
      const data = await res.json();
      setAgents(data.agents);
      const initEdits: Record<string, EditState> = {};
      for (const a of data.agents as AgentConfig[]) {
        initEdits[a.agentKey] = {
          name: a.name, systemPrompt: a.systemPrompt,
          knowledgeBase: a.knowledgeBase, outputStyle: a.outputStyle, isEnabled: a.isEnabled,
        };
      }
      setEdits(initEdits);
    } finally { setLoading(false); }
  }

  function updateEdit(agentKey: string, field: keyof EditState, value: string | boolean) {
    setEdits((prev) => ({ ...prev, [agentKey]: { ...prev[agentKey], [field]: value } }));
  }

  async function handleSave(agentKey: string) {
    const edit = edits[agentKey];
    if (!edit) return;
    setSaving(agentKey);
    try {
      const res = await fetch(`/api/super/agent-templates/${agentKey}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(edit),
      });
      if (!res.ok) { toast.error("保存失败"); return; }
      toast.success("全局模板已保存");
      await fetchAgents();
    } finally { setSaving(null); }
  }

  async function handleReset(agentKey: string) {
    setSaving(agentKey + "_reset");
    try {
      const res = await fetch(`/api/super/agent-templates/${agentKey}`, { method: "DELETE" });
      if (!res.ok) { toast.error("重置失败"); return; }
      toast.success("已重置为内置默认");
      await fetchAgents();
    } finally { setSaving(null); }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-6 space-y-4">
      <div>
        <h1 className="text-lg font-semibold">全局智能体模板</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          新建企业时自动继承此模板。企业管理员可在此基础上自定义覆盖。
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
      ) : (
        <div className="space-y-3">
          {agents.map((agent) => {
            const edit = edits[agent.agentKey];
            const isOpen = expanded === agent.agentKey;
            if (!edit) return null;

            return (
              <Card key={agent.agentKey}>
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
                  onClick={() => setExpanded(isOpen ? null : agent.agentKey)}
                >
                  <Bot className="w-4 h-4 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{edit.name}</span>
                      {agent.isCustomized && <Badge variant="secondary" className="text-[10px] h-4 px-1.5">已自定义</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{agent.stageLabel}</p>
                  </div>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>

                {isOpen && (
                  <CardContent className="pt-0 pb-4 space-y-4 border-t border-border">
                    <div className="space-y-1.5 pt-4">
                      <Label className="text-xs">显示名称</Label>
                      <Input className="h-8 text-sm" value={edit.name} onChange={(e) => updateEdit(agent.agentKey, "name", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">系统提示词</Label>
                      <Textarea className="text-sm min-h-32 font-mono" value={edit.systemPrompt} onChange={(e) => updateEdit(agent.agentKey, "systemPrompt", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">知识库内容（全局通用知识）</Label>
                      <Textarea className="text-sm min-h-20" value={edit.knowledgeBase} onChange={(e) => updateEdit(agent.agentKey, "knowledgeBase", e.target.value)} placeholder="可留空" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">输出风格</Label>
                      <Select value={edit.outputStyle} onValueChange={(v) => updateEdit(agent.agentKey, "outputStyle", v ?? "FORMAL")}>
                        <SelectTrigger className="h-8 text-sm w-40"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FORMAL">正式</SelectItem>
                          <SelectItem value="FRIENDLY">友好</SelectItem>
                          <SelectItem value="CONCISE">简洁</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <Button size="sm" className="h-7 text-xs bg-primary hover:bg-primary/90" disabled={!!saving} onClick={() => handleSave(agent.agentKey)}>
                        <Save className="w-3 h-3 mr-1" />{saving === agent.agentKey ? "保存中..." : "保存模板"}
                      </Button>
                      {agent.isCustomized && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" disabled={!!saving} onClick={() => handleReset(agent.agentKey)}>
                          <RotateCcw className="w-3 h-3 mr-1" />重置为内置默认
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
