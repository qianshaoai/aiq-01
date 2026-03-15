import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, apiUnauthorized, apiForbidden } from "@/lib/errors";

type Ctx = { params: Promise<{ assetId: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await getSession();
  if (!session) return apiUnauthorized();

  const { assetId } = await params;
  const asset = await prisma.orgAsset.findFirst({
    where: { id: assetId, enterpriseId: session.enterpriseId },
    include: {
      sourceTeam: { select: { id: true, name: true } },
      submitter: { select: { id: true, name: true } },
    },
  });

  if (!asset) return apiError("资产不存在", 404);
  return NextResponse.json({ asset });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await getSession();
  if (!session) return apiUnauthorized();

  const { assetId } = await params;
  const asset = await prisma.orgAsset.findFirst({
    where: { id: assetId, enterpriseId: session.enterpriseId },
  });
  if (!asset) return apiError("资产不存在", 404);

  // Only submitter or admin can edit
  const isAdmin = session.role === "ENTERPRISE_ADMIN" || session.role === "TEAM_LEADER";
  if (asset.submitterUserId !== session.userId && !isAdmin) return apiForbidden();

  const { title, summary, content, sceneTags, status } = await req.json();
  const updated = await prisma.orgAsset.update({
    where: { id: assetId },
    data: {
      ...(title !== undefined && { title }),
      ...(summary !== undefined && { summary }),
      ...(content !== undefined && { content }),
      ...(sceneTags !== undefined && { sceneTags }),
      ...(status !== undefined && { status }),
    },
  });

  return NextResponse.json({ asset: updated });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await getSession();
  if (!session) return apiUnauthorized();

  const { assetId } = await params;
  const asset = await prisma.orgAsset.findFirst({
    where: { id: assetId, enterpriseId: session.enterpriseId },
  });
  if (!asset) return apiError("资产不存在", 404);

  const isAdmin = session.role === "ENTERPRISE_ADMIN" || session.role === "TEAM_LEADER";
  if (asset.submitterUserId !== session.userId && !isAdmin) return apiForbidden();

  await prisma.orgAsset.update({ where: { id: assetId }, data: { status: "ARCHIVED" } });
  return NextResponse.json({ ok: true });
}
