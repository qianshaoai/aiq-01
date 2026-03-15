import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, apiUnauthorized } from "@/lib/errors";

// GET /api/notifications — paginated list for current user
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return apiUnauthorized();

  const page = parseInt(req.nextUrl.searchParams.get("page") ?? "1");
  const unreadOnly = req.nextUrl.searchParams.get("unread") === "1";
  const pageSize = 20;

  const where = {
    userId: session.userId,
    ...(unreadOnly ? { isRead: false } : {}),
  };

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        type: true,
        title: true,
        content: true,
        category: true,
        isRead: true,
        isResolved: true,
        relatedEntityType: true,
        relatedEntityId: true,
        createdAt: true,
      },
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId: session.userId, isRead: false } }),
  ]);

  return NextResponse.json({ notifications, total, unreadCount });
}

// PATCH /api/notifications — mark read
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return apiUnauthorized();

  const { id, markAll } = await req.json();

  if (markAll) {
    await prisma.notification.updateMany({
      where: { userId: session.userId, isRead: false },
      data: { isRead: true },
    });
    return NextResponse.json({ ok: true });
  }

  if (!id) return apiError("缺少通知 ID");

  await prisma.notification.updateMany({
    where: { id, userId: session.userId },
    data: { isRead: true },
  });

  return NextResponse.json({ ok: true });
}
