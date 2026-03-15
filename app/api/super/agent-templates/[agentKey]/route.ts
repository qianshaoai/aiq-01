import { NextRequest, NextResponse } from "next/server";
import { getSuperSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, apiUnauthorized } from "@/lib/errors";
import type { AgentKeyType } from "@/lib/ai/types";

type Params = { params: Promise<{ agentKey: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSuperSession();
  if (!session) return apiUnauthorized();

  const { agentKey } = await params;
  const body = await req.json() as {
    name?: string;
    systemPrompt?: string;
    knowledgeBase?: string;
    outputStyle?: string;
    isEnabled?: boolean;
  };

  const agent = await prisma.agent.upsert({
    where: {
      enterpriseId_agentKey: {
        enterpriseId: null as unknown as string,
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
      enterpriseId: null,
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

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSuperSession();
  if (!session) return apiUnauthorized();

  const { agentKey } = await params;

  await prisma.agent.deleteMany({
    where: { enterpriseId: null, agentKey: agentKey as AgentKeyType },
  });

  return NextResponse.json({ ok: true });
}
