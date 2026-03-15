import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";
import { apiError, apiForbidden, apiUnauthorized } from "@/lib/errors";
import type { AIProvider } from "@/lib/generated/prisma/client";

// GET — 查询当前企业 AI 配置（Key 脱敏）
export async function GET() {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  if (session.role !== "ENTERPRISE_ADMIN") return apiForbidden();

  try {
    const configs = await prisma.aIProviderConfig.findMany({
      where: { enterpriseId: session.enterpriseId },
      select: {
        id: true,
        provider: true,
        isActive: true,
        modelName: true,
        baseUrl: true,
        apiKeyEnc: true, // 仅用于判断是否已配置
        updatedAt: true,
      },
    });

    // 脱敏：只告知是否已配置，不返回原文
    const result = configs.map(({ apiKeyEnc, ...rest }) => ({
      ...rest,
      hasKey: !!apiKeyEnc,
    }));
    return NextResponse.json({ configs: result });
  } catch (err) {
    console.error("[ai-config GET]", err);
    return apiError("查询失败", 500);
  }
}

// POST — 保存或更新某个供应商配置
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  if (session.role !== "ENTERPRISE_ADMIN") return apiForbidden();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return apiError("请求格式错误");
  }

  const { provider: providerRaw, apiKey, modelName, baseUrl, activate } = body as {
    provider?: string;
    apiKey?: string;
    modelName?: string;
    baseUrl?: string;
    activate?: boolean;
  };

  if (!providerRaw) return apiError("请指定供应商");
  const provider = providerRaw as AIProvider;

  try {
    const existing = await prisma.aIProviderConfig.findFirst({
      where: { enterpriseId: session.enterpriseId, provider },
    });

    // 在事务中完成"取消其他激活 + 保存当前"，保证原子性
    await prisma.$transaction(async (tx) => {
      if (activate) {
        await tx.aIProviderConfig.updateMany({
          where: { enterpriseId: session.enterpriseId, isActive: true },
          data: { isActive: false },
        });
      }

      if (existing) {
        const data: Record<string, unknown> = {
          modelName: modelName || null,
          baseUrl: baseUrl || null,
        };
        if (apiKey) data.apiKeyEnc = encrypt(apiKey);
        if (activate) data.isActive = true;
        await tx.aIProviderConfig.update({ where: { id: existing.id }, data });
      } else {
        await tx.aIProviderConfig.create({
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
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[ai-config POST]", err);
    return apiError("保存失败，请稍后重试", 500);
  }
}
