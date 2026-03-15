import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendMessage, toSSEStream, buildAgentSystemPrompt, type PromptVars } from "@/lib/ai/gateway";
import { DEFAULT_AGENT_PROMPTS, SYSTEM_PROMPTS } from "@/lib/ai/types";
import { apiError, apiUnauthorized } from "@/lib/errors";
import type { TaskPhase, AgentKeyType, Message } from "@/lib/ai/types";

export const runtime = "nodejs";
export const maxDuration = 65;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  if (session.status !== "ACTIVE") return apiError("账号未激活", 403);

  const { taskId, messages, phase, agentKey } = await req.json() as {
    taskId: string;
    messages: Message[];
    phase: TaskPhase;
    agentKey?: AgentKeyType;
  };

  if (!taskId || !messages?.length || !phase) {
    return apiError("缺少必要参数");
  }

  // 校验任务归属
  const task = await prisma.task.findFirst({
    where: { id: taskId, creatorUserId: session.userId },
  });
  if (!task) return apiError("任务不存在", 404);

  // 确定系统提示词：优先使用智能体配置，否则用 phase 对应的默认提示
  const enterprise = await prisma.enterprise.findUnique({
    where: { id: session.enterpriseId },
    select: { name: true },
  });
  const vars: PromptVars = {
    task_type: task.taskType,
    company_name: enterprise?.name ?? "",
    task_goal: task.goal ?? "",
    output_type: task.outputType ?? "",
  };

  let systemPrompt: string;
  if (agentKey) {
    const fallback = DEFAULT_AGENT_PROMPTS[agentKey] ?? SYSTEM_PROMPTS[phase] ?? SYSTEM_PROMPTS.EXECUTING;
    systemPrompt = await buildAgentSystemPrompt(session.enterpriseId, agentKey, fallback, vars);
  } else {
    systemPrompt = SYSTEM_PROMPTS[phase] ?? SYSTEM_PROMPTS.EXECUTING;
  }

  const stream = toSSEStream(
    sendMessage(messages, systemPrompt, session.enterpriseId)
  );

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
