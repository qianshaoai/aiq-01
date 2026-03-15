import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, apiUnauthorized } from "@/lib/errors";
import type { AgentKeyType } from "@/lib/ai/types";

type Params = { params: Promise<{ agentKey: string }> };

// PATCH /api/admin/agents/[agentKey] — 创建或更新企业智能体配置
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  if (session.role !== "ENTERPRISE_ADMIN") return apiError("无权限", 403);

  const { agentKey } = await params;
  const body = await req.json() as {
    name?: string;
    systemPrompt?: string;
    knowledgeBase?: string;
    outputStyle?: string;
    isEnabled?: boolean;
  };

  // 验证知识库长度
  if (body.knowledgeBase && body.knowledgeBase.length > 20000) {
    return apiError("知识库内容过长，请精简后重试（最多 20000 字）");
  }

  const agent = await prisma.agent.upsert({
    where: {
      enterpriseId_agentKey: {
        enterpriseId: session.enterpriseId,
        agentKey: agentKey as AgentKeyType,
      },
    },
    update: {
      name: body.name,
      systemPrompt: body.systemPrompt,
      knowledgeBase: body.knowledgeBase,
      outputStyle: body.outputStyle as "FORMAL" | "FRIENDLY" | "CONCISE" | undefined,
      isEnabled: body.isEnabled,
    },
    create: {
      enterpriseId: session.enterpriseId,
      agentKey: agentKey as AgentKeyType,
      name: body.name ?? agentKey,
      systemPrompt: body.systemPrompt,
      knowledgeBase: body.knowledgeBase,
      outputStyle: (body.outputStyle as "FORMAL" | "FRIENDLY" | "CONCISE") ?? "FRIENDLY",
      isEnabled: body.isEnabled ?? true,
    },
  });

  return NextResponse.json({ agent });
}

// DELETE /api/admin/agents/[agentKey] — 重置为全局默认
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  if (session.role !== "ENTERPRISE_ADMIN") return apiError("无权限", 403);

  const { agentKey } = await params;

  await prisma.agent.deleteMany({
    where: { enterpriseId: session.enterpriseId, agentKey: agentKey as AgentKeyType },
  });

  return NextResponse.json({ ok: true });
}
