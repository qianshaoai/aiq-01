import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, apiUnauthorized } from "@/lib/errors";

type Ctx = { params: Promise<{ assetId: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await getSession();
  if (!session) return apiUnauthorized();

  const { assetId } = await params;
  const asset = await prisma.personalAsset.findFirst({
    where: { id: assetId, ownerUserId: session.userId },
    include: { sourceTask: { select: { id: true, title: true, taskType: true } } },
  });

  if (!asset) return apiError("资产不存在", 404);
  return NextResponse.json({ asset });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await getSession();
  if (!session) return apiUnauthorized();

  const { assetId } = await params;
  const existing = await prisma.personalAsset.findFirst({
    where: { id: assetId, ownerUserId: session.userId },
  });
  if (!existing) return apiError("资产不存在", 404);

  const { title, summary, content } = await req.json();
  const asset = await prisma.personalAsset.update({
    where: { id: assetId },
    data: {
      ...(title !== undefined && { title }),
      ...(summary !== undefined && { summary }),
      ...(content !== undefined && { content }),
    },
  });

  return NextResponse.json({ asset });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await getSession();
  if (!session) return apiUnauthorized();

  const { assetId } = await params;
  const existing = await prisma.personalAsset.findFirst({
    where: { id: assetId, ownerUserId: session.userId },
  });
  if (!existing) return apiError("资产不存在", 404);

  await prisma.personalAsset.delete({ where: { id: assetId } });
  return NextResponse.json({ ok: true });
}
