import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken, COOKIE_NAME } from "@/lib/auth";
import { apiError } from "@/lib/errors";

export async function POST(req: NextRequest) {
  const { loginAccount, password, enterpriseCode } = await req.json();

  if (!loginAccount || !password || !enterpriseCode) {
    return apiError("请填写账号、密码和企业码");
  }

  const enterprise = await prisma.enterprise.findFirst({
    where: { enterpriseCode, status: "ACTIVE" },
  });

  if (!enterprise) {
    return apiError("企业码不可用，请确认后重试或联系企业管理员");
  }

  const user = await prisma.user.findFirst({
    where: { loginAccount, enterpriseId: enterprise.id },
  });

  if (!user) {
    return apiError("账号或密码错误");
  }

  if (user.status === "DISABLED") {
    return apiError("账号已停用，请联系企业管理员");
  }

  if (user.status === "LOCKED") {
    return apiError("账号已锁定，请联系企业管理员");
  }

  if (user.role === "TEAM_LEADER") {
    return apiError("团队管理者请使用专属入口登录：/manager/login");
  }

  if (user.role === "ENTERPRISE_ADMIN") {
    return apiError("企业管理员请使用专属入口登录：/admin/login");
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return apiError("账号或密码错误");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const token = signToken({
    userId: user.id,
    enterpriseId: user.enterpriseId,
    role: user.role,
    status: user.status,
  });

  const response = NextResponse.json({ ok: true, mustChangePassword: user.mustChangePassword });
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
