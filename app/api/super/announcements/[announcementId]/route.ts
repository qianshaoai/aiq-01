import { NextRequest, NextResponse } from "next/server";
import { getSuperSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, apiUnauthorized } from "@/lib/errors";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ announcementId: string }> }) {
  const session = await getSuperSession();
  if (!session) return apiUnauthorized();

  const { announcementId } = await params;

  let body: { title?: string; content?: string; validUntil?: string | null };
  try {
    body = await req.json();
  } catch {
    return apiError("请求格式错误");
  }

  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = body.title.trim();
  if (body.content !== undefined) data.content = body.content.trim();
  if (body.validUntil !== undefined) data.validUntil = body.validUntil ? new Date(body.validUntil) : null;

  try {
    const updated = await prisma.announcement.update({
      where: { id: announcementId },
      data,
    });
    return NextResponse.json({ announcement: updated });
  } catch {
    return apiError("公告不存在", 404);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ announcementId: string }> }) {
  const session = await getSuperSession();
  if (!session) return apiUnauthorized();

  const { announcementId } = await params;

  try {
    await prisma.announcement.delete({ where: { id: announcementId } });
    return NextResponse.json({ ok: true });
  } catch {
    return apiError("公告不存在", 404);
  }
}
