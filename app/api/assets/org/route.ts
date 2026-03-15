import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, apiUnauthorized } from "@/lib/errors";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return apiUnauthorized();

  const assetType = req.nextUrl.searchParams.get("type");
  const teamId = req.nextUrl.searchParams.get("team");
  const page = parseInt(req.nextUrl.searchParams.get("page") ?? "1");
  const pageSize = 20;

  const where: Record<string, unknown> = {
    enterpriseId: session.enterpriseId,
    status: "ACTIVE",
  };
  if (assetType) where.assetType = assetType;
  if (teamId) where.sourceTeamId = teamId;

  const [assets, total] = await Promise.all([
    prisma.orgAsset.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        sourceTeam: { select: { id: true, name: true } },
        submitter: { select: { id: true, name: true } },
      },
    }),
    prisma.orgAsset.count({ where }),
  ]);

  return NextResponse.json({ assets, total });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  if (session.status !== "ACTIVE") return apiError("账号未激活", 403);

  const { sourceTaskId, assetType, title, summary, content, sceneTags } = await req.json();
  if (!assetType || !title) return apiError("缺少必要字段");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { teamId: true },
  });

  const asset = await prisma.orgAsset.create({
    data: {
      enterpriseId: session.enterpriseId,
      sourceTaskId: sourceTaskId ?? null,
      sourceTeamId: user?.teamId ?? null,
      submitterUserId: session.userId,
      assetType,
      title,
      summary: summary ?? null,
      content: content ?? null,
      sceneTags: sceneTags ?? [],
      status: "ACTIVE",
    },
  });

  return NextResponse.json({ asset });
}
