import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendMessage, toSSEStream } from "@/lib/ai/gateway";
import { SYSTEM_PROMPTS } from "@/lib/ai/types";
import { apiError, apiUnauthorized } from "@/lib/errors";
import type { TaskPhase, Message } from "@/lib/ai/types";

export const runtime = "nodejs";
export const maxDuration = 65;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  if (session.status !== "ACTIVE") return apiError("账号未激活", 403);

  const { taskId, messages, phase } = await req.json() as {
    taskId: string;
    messages: Message[];
    phase: TaskPhase;
  };

  if (!taskId || !messages?.length || !phase) {
    return apiError("缺少必要参数");
  }

  // 校验任务归属
  const task = await prisma.task.findFirst({
    where: { id: taskId, creatorUserId: session.userId },
  });
  if (!task) return apiError("任务不存在", 404);

  const systemPrompt = SYSTEM_PROMPTS[phase] ?? SYSTEM_PROMPTS.EXECUTING;

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
