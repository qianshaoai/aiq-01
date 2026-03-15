import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, apiForbidden, apiUnauthorized } from "@/lib/errors";

// POST /api/manage/invite — 创建邀请链接
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  if (session.role === "MEMBER") return apiForbidden();

  const { teamId, role } = await req.json();

  // 团队负责人只能邀请到自己的团队
  if (session.role === "TEAM_LEADER") {
    const currentUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { teamId: true },
    });
    if (teamId && teamId !== currentUser?.teamId) {
      return apiForbidden();
    }
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const invitation = await prisma.invitation.create({
    data: {
      enterpriseId: session.enterpriseId,
      teamId: teamId ?? null,
      role: role ?? "MEMBER",
      expiresAt,
      inviterUserId: session.userId,
    },
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const inviteUrl = `${baseUrl}/invite?token=${invitation.inviteToken}`;

  return NextResponse.json({ inviteUrl, expiresAt });
}
