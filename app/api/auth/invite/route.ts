import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/errors";

const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

// GET /api/auth/invite?token=xxx — 验证邀请链接
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return apiError("邀请链接无效");

  const invitation = await prisma.invitation.findUnique({
    where: { inviteToken: token },
    include: { enterprise: { select: { name: true } } },
  });

  if (!invitation || invitation.status !== "PENDING") {
    return apiError("邀请链接已失效或已使用");
  }

  if (invitation.expiresAt < new Date()) {
    await prisma.invitation.update({ where: { id: invitation.id }, data: { status: "EXPIRED" } });
    return apiError("邀请链接已过期，请联系管理员重新发送");
  }

  return NextResponse.json({
    enterpriseName: invitation.enterprise.name,
    role: invitation.role,
    teamId: invitation.teamId,
  });
}

// POST /api/auth/invite — 接受邀请并设置密码
export async function POST(req: NextRequest) {
  const { token, name, loginAccount, password } = await req.json();

  if (!token || !name || !loginAccount || !password) {
    return apiError("请填写所有必填项");
  }

  if (!PASSWORD_REGEX.test(password)) {
    return apiError("密码至少 8 位，且必须包含字母和数字");
  }

  const invitation = await prisma.invitation.findUnique({
    where: { inviteToken: token },
  });

  if (!invitation || invitation.status !== "PENDING") {
    return apiError("邀请链接已失效或已使用");
  }

  if (invitation.expiresAt < new Date()) {
    await prisma.invitation.update({ where: { id: invitation.id }, data: { status: "EXPIRED" } });
    return apiError("邀请链接已过期，请联系管理员重新发送");
  }

  const existing = await prisma.user.findFirst({
    where: { loginAccount, enterpriseId: invitation.enterpriseId },
  });

  if (existing) {
    return apiError("该账号已存在");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  // 若邀请已明确指定团队和角色，直接激活；否则进入待分配
  const hasTeam = !!invitation.teamId;
  const status = hasTeam ? "ACTIVE" : "PENDING_ASSIGNMENT";

  await prisma.$transaction([
    prisma.user.create({
      data: {
        enterpriseId: invitation.enterpriseId,
        teamId: invitation.teamId ?? null,
        name,
        loginAccount,
        passwordHash,
        role: invitation.role,
        status,
      },
    }),
    prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: "ACCEPTED" },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
