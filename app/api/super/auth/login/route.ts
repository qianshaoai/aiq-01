import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signSuperToken, SUPER_COOKIE_NAME } from "@/lib/auth";
import { apiError } from "@/lib/errors";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return apiError("请填写邮箱和密码");
  }

  const admin = await prisma.superAdmin.findUnique({ where: { email } });

  if (!admin) return apiError("邮箱或密码错误");
  if (admin.status === "DISABLED") return apiError("账号已停用");

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) return apiError("邮箱或密码错误");

  await prisma.superAdmin.update({
    where: { id: admin.id },
    data: { lastLoginAt: new Date() },
  });

  const token = signSuperToken({
    superAdminId: admin.id,
    email: admin.email,
  });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SUPER_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
