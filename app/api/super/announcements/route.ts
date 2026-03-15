import { NextRequest, NextResponse } from "next/server";
import { getSuperSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, apiUnauthorized } from "@/lib/errors";

export async function GET() {
  const session = await getSuperSession();
  if (!session) return apiUnauthorized();

  const announcements = await prisma.announcement.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ announcements });
}

export async function POST(req: NextRequest) {
  const session = await getSuperSession();
  if (!session) return apiUnauthorized();

  let body: { title?: string; content?: string; validUntil?: string };
  try {
    body = await req.json();
  } catch {
    return apiError("请求格式错误");
  }

  const { title, content, validUntil } = body;
  if (!title?.trim()) return apiError("标题不能为空");
  if (!content?.trim()) return apiError("内容不能为空");

  const announcement = await prisma.announcement.create({
    data: {
      title: title.trim(),
      content: content.trim(),
      validUntil: validUntil ? new Date(validUntil) : null,
      createdBy: session.superAdminId,
    },
  });

  return NextResponse.json({ announcement });
}
