import { NextRequest, NextResponse } from "next/server";
import { getSuperSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, apiUnauthorized } from "@/lib/errors";

const CONFIG_KEYS = ["platform_name", "platform_logo_url", "default_ai_provider", "default_model", "maintenance_notice"] as const;

export async function GET() {
  const session = await getSuperSession();
  if (!session) return apiUnauthorized();

  const rows = await prisma.platformConfig.findMany({
    where: { key: { in: [...CONFIG_KEYS] } },
  });

  const config: Record<string, string> = {};
  for (const key of CONFIG_KEYS) {
    config[key] = rows.find((r) => r.key === key)?.value ?? "";
  }

  return NextResponse.json({ config });
}

export async function PATCH(req: NextRequest) {
  const session = await getSuperSession();
  if (!session) return apiUnauthorized();

  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return apiError("请求格式错误");
  }

  const updates = Object.entries(body).filter(([k]) => (CONFIG_KEYS as readonly string[]).includes(k));
  if (updates.length === 0) return apiError("无有效字段");

  await Promise.all(
    updates.map(([key, value]) =>
      prisma.platformConfig.upsert({
        where: { key },
        create: { key, value, updatedBy: session.superAdminId },
        update: { value, updatedBy: session.superAdminId },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
