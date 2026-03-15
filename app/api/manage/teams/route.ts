import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, apiForbidden, apiUnauthorized } from "@/lib/errors";

// GET /api/manage/teams — 获取企业下所有团队
export async function GET() {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  if (session.role === "MEMBER") return apiForbidden();

  const teams = await prisma.team.findMany({
    where: { enterpriseId: session.enterpriseId },
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { members: { where: { status: "ACTIVE" } } } },
    },
  });

  return NextResponse.json({ teams });
}

// POST /api/manage/teams — 创建团队（仅企业管理员）
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  if (session.role !== "ENTERPRISE_ADMIN") return apiForbidden();

  const { name, leaderUserId } = await req.json();
  if (!name?.trim()) return apiError("请填写团队名称");

  const team = await prisma.team.create({
    data: {
      enterpriseId: session.enterpriseId,
      name: name.trim(),
      leaderUserId: leaderUserId ?? null,
    },
  });

  // 若指定了负责人，同步更新用户角色
  if (leaderUserId) {
    await prisma.user.update({
      where: { id: leaderUserId },
      data: { role: "TEAM_LEADER", teamId: team.id },
    });
  }

  return NextResponse.json({ team });
}

// PATCH /api/manage/teams — 编辑/停用团队（仅企业管理员）
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  if (session.role !== "ENTERPRISE_ADMIN") return apiForbidden();

  const { teamId, action, name, leaderUserId } = await req.json();
  if (!teamId) return apiError("缺少 teamId");

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team || team.enterpriseId !== session.enterpriseId) {
    return apiError("团队不存在");
  }

  switch (action) {
    case "rename":
      if (!name?.trim()) return apiError("请填写团队名称");
      await prisma.team.update({ where: { id: teamId }, data: { name: name.trim() } });
      break;

    case "set_leader": {
      if (!leaderUserId) return apiError("请指定负责人");
      const leader = await prisma.user.findUnique({ where: { id: leaderUserId } });
      if (!leader || leader.enterpriseId !== session.enterpriseId) {
        return apiError("用户不存在");
      }
      await prisma.$transaction([
        prisma.team.update({ where: { id: teamId }, data: { leaderUserId } }),
        prisma.user.update({ where: { id: leaderUserId }, data: { role: "TEAM_LEADER" } }),
      ]);
      break;
    }

    case "disable":
      await prisma.team.update({ where: { id: teamId }, data: { status: "DISABLED" } });
      break;

    case "enable":
      await prisma.team.update({ where: { id: teamId }, data: { status: "ACTIVE" } });
      break;

    default:
      return apiError("未知操作");
  }

  return NextResponse.json({ ok: true });
}
