import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, apiForbidden, apiUnauthorized } from "@/lib/errors";

// GET /api/manage/members?status=PENDING — 查询待激活/待分配成员
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  if (session.role === "MEMBER") return apiForbidden();

  const status = req.nextUrl.searchParams.get("status");
  const page = parseInt(req.nextUrl.searchParams.get("page") ?? "1");
  const pageSize = 20;

  const where: Record<string, unknown> = {
    enterpriseId: session.enterpriseId,
    id: { not: session.userId },
  };

  if (status) {
    where.status = status;
  } else {
    where.status = { in: ["PENDING", "PENDING_ASSIGNMENT"] };
  }

  // 团队负责人只看本团队（待分配成员没有团队，也应显示）
  // 实际上待激活/待分配的成员 teamId 可能为 null，负责人和管理员都应能处理

  const [members, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        loginAccount: true,
        role: true,
        status: true,
        teamId: true,
        positionTag: true,
        createdAt: true,
        team: { select: { id: true, name: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({ members, total, page, pageSize });
}

// PATCH /api/manage/members — 激活、分配、锁定等操作
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  if (session.role === "MEMBER") return apiForbidden();

  const { userId, action, teamId, role } = await req.json();

  if (!userId || !action) return apiError("缺少必要参数");

  const target = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!target || target.enterpriseId !== session.enterpriseId) {
    return apiError("用户不存在");
  }

  // 仅企业管理员可以跨团队修改主团队归属
  if (action === "assign_team" && session.role !== "ENTERPRISE_ADMIN") {
    return apiForbidden();
  }

  switch (action) {
    case "activate": {
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: { status: "ACTIVE", teamId: teamId ?? target.teamId },
        });
        // 清除相关待激活通知
        await tx.notification.updateMany({
          where: {
            relatedEntityId: userId,
            type: "PENDING_ACTIVATION",
            isResolved: false,
          },
          data: { isResolved: true },
        });
      });
      break;
    }

    case "assign_team": {
      if (!teamId) return apiError("请选择要分配的团队");
      // 校验团队属于同一企业
      const team = await prisma.team.findUnique({ where: { id: teamId } });
      if (!team || team.enterpriseId !== session.enterpriseId) {
        return apiError("团队不存在");
      }
      await prisma.user.update({
        where: { id: userId },
        data: {
          teamId,
          status: target.status === "PENDING_ASSIGNMENT" ? "ACTIVE" : target.status,
        },
      });
      break;
    }

    case "lock": {
      if (session.role !== "ENTERPRISE_ADMIN") return apiForbidden();
      await prisma.user.update({
        where: { id: userId },
        data: { status: "LOCKED" },
      });
      break;
    }

    case "unlock": {
      if (session.role !== "ENTERPRISE_ADMIN") return apiForbidden();
      await prisma.user.update({
        where: { id: userId },
        data: { status: "ACTIVE" },
      });
      break;
    }

    case "disable": {
      if (session.role !== "ENTERPRISE_ADMIN") return apiForbidden();
      await prisma.user.update({
        where: { id: userId },
        data: { status: "DISABLED" },
      });
      break;
    }

    case "change_role": {
      if (session.role !== "ENTERPRISE_ADMIN") return apiForbidden();
      if (!role) return apiError("请指定角色");
      await prisma.user.update({
        where: { id: userId },
        data: { role },
      });
      break;
    }

    default:
      return apiError("未知操作");
  }

  return NextResponse.json({ ok: true });
}
