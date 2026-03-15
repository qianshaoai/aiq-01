import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";
import { apiError, apiForbidden, apiUnauthorized } from "@/lib/errors";

// GET — 查询当前企业 AI 配置（Key 脱敏）
export async function GET() {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  if (session.role !== "ENTERPRISE_ADMIN") return apiForbidden();

  const configs = await prisma.aIProviderConfig.findMany({
    where: { enterpriseId: session.enterpriseId },
    select: {
      id: true,
      provider: true,
      isActive: true,
      modelName: true,
      baseUrl: true,
      // 不返回 apiKeyEnc 原文
      updatedAt: true,
    },
  });

  // 标注是否已配置 Key
  const result = configs.map((c) => ({ ...c, hasKey: true }));
  return NextResponse.json({ configs: result });
}

// POST — 保存或更新某个供应商配置
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  if (session.role !== "ENTERPRISE_ADMIN") return apiForbidden();

  const { provider, apiKey, modelName, baseUrl, activate } = await req.json();

  if (!provider) return apiError("请指定供应商");

  const existing = await prisma.aIProviderConfig.findFirst({
    where: { enterpriseId: session.enterpriseId, provider },
  });

  const data: Record<string, unknown> = {
    modelName: modelName || null,
    baseUrl: baseUrl || null,
  };

  if (apiKey) {
    data.apiKeyEnc = encrypt(apiKey);
  }

  if (activate) {
    // 先把其他供应商设为非激活
    await prisma.aIProviderConfig.updateMany({
      where: { enterpriseId: session.enterpriseId, isActive: true },
      data: { isActive: false },
    });
    data.isActive = true;
  }

  if (existing) {
    await prisma.aIProviderConfig.update({
      where: { id: existing.id },
      data,
    });
  } else {
    await prisma.aIProviderConfig.create({
      data: {
        enterpriseId: session.enterpriseId,
        provider,
        isActive: activate ?? false,
        ...(apiKey ? { apiKeyEnc: encrypt(apiKey) } : {}),
        modelName: modelName || null,
        baseUrl: baseUrl || null,
      },
    });
  }

  return NextResponse.json({ ok: true });
}
