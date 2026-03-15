import { NextRequest, NextResponse } from "next/server";
import { getSuperSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, apiUnauthorized } from "@/lib/errors";
import { DEFAULT_AGENT_PROMPTS } from "@/lib/ai/types";
import type { AgentKeyType } from "@/lib/ai/types";

const AGENT_KEYS: AgentKeyType[] = [
  "TASK_UNDERSTANDING", "DIRECTION_PLANNING", "EXECUTION",
  "REVIEW", "DELIVERY", "TRAINING",
];

const AGENT_NAMES: Record<AgentKeyType, string> = {
  TASK_UNDERSTANDING: "任务理解师",
  DIRECTION_PLANNING: "方向规划师",
  EXECUTION: "方案执行师",
  REVIEW: "质量评审师",
  DELIVERY: "成果交付师",
  TRAINING: "练兵教练",
};

const AGENT_STAGE_LABELS: Record<AgentKeyType, string> = {
  TASK_UNDERSTANDING: "任务框定阶段",
  DIRECTION_PLANNING: "方向确认断点",
  EXECUTION: "主执行阶段",
  REVIEW: "初稿确认断点",
  DELIVERY: "结果交付阶段",
  TRAINING: "练兵模式全程",
};

export async function GET(_req: NextRequest) {
  const session = await getSuperSession();
  if (!session) return apiUnauthorized();

  const configs = await prisma.agent.findMany({
    where: { enterpriseId: null },
  });

  const agents = AGENT_KEYS.map((key) => {
    const config = configs.find((c) => c.agentKey === key);
    return {
      agentKey: key,
      name: config?.name ?? AGENT_NAMES[key],
      stageLabel: AGENT_STAGE_LABELS[key],
      systemPrompt: config?.systemPrompt ?? DEFAULT_AGENT_PROMPTS[key],
      knowledgeBase: config?.knowledgeBase ?? "",
      outputStyle: config?.outputStyle ?? "FRIENDLY",
      isEnabled: config?.isEnabled ?? true,
      isCustomized: !!config,
      id: config?.id ?? null,
    };
  });

  return NextResponse.json({ agents });
}
