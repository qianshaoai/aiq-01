import { NextRequest, NextResponse } from "next/server";
import { getSuperSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, apiUnauthorized } from "@/lib/errors";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await getSuperSession();
  if (!session) return apiUnauthorized();

  const admins = await prisma.superAdmin.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      email: true,
      name: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ admins, currentId: session.superAdminId });
}

export async function POST(req: NextRequest) {
  const session = await getSuperSession();
  if (!session) return apiUnauthorized();

  let body: { email?: string; name?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return apiError("请求格式错误");
  }

  const { email, name, password } = body;
  if (!email?.trim()) return apiError("邮箱不能为空");
  if (!name?.trim()) return apiError("姓名不能为空");
  if (!password || password.length < 6) return apiError("密码至少6位");

  const existing = await prisma.superAdmin.findUnique({ where: { email: email.trim() } });
  if (existing) return apiError("该邮箱已存在");

  const passwordHash = await bcrypt.hash(password, 10);
  const admin = await prisma.superAdmin.create({
    data: { email: email.trim(), name: name.trim(), passwordHash },
    select: { id: true, email: true, name: true, status: true, createdAt: true },
  });

  return NextResponse.json({ admin });
}
