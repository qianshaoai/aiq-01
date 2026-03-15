import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, apiUnauthorized } from "@/lib/errors";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return apiUnauthorized();

  const assetType = req.nextUrl.searchParams.get("type");
  const page = parseInt(req.nextUrl.searchParams.get("page") ?? "1");
  const pageSize = 20;

  const where: Record<string, unknown> = { ownerUserId: session.userId };
  if (assetType) where.assetType = assetType;

  const [assets, total] = await Promise.all([
    prisma.personalAsset.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { sourceTask: { select: { id: true, title: true, taskType: true } } },
    }),
    prisma.personalAsset.count({ where }),
  ]);

  return NextResponse.json({ assets, total });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  if (session.status !== "ACTIVE") return apiError("账号未激活", 403);

  const { sourceTaskId, assetType, title, summary, content } = await req.json();
  if (!assetType || !title) return apiError("缺少必要字段");

  const asset = await prisma.personalAsset.create({
    data: {
      enterpriseId: session.enterpriseId,
      ownerUserId: session.userId,
      sourceTaskId: sourceTaskId ?? null,
      assetType,
      title,
      summary: summary ?? null,
      content: content ?? null,
    },
  });

  return NextResponse.json({ asset });
}
