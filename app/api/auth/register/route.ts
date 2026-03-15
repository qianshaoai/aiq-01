import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/errors";

const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export async function POST(req: NextRequest) {
  const { loginAccount, password, name, enterpriseCode } = await req.json();

  if (!loginAccount || !password || !name || !enterpriseCode) {
    return apiError("请填写所有必填项");
  }

  if (!PASSWORD_REGEX.test(password)) {
    return apiError("密码至少 8 位，且必须包含字母和数字");
  }

  const enterprise = await prisma.enterprise.findFirst({
    where: { enterpriseCode, status: "ACTIVE", enterpriseCodeStatus: "ACTIVE" },
  });

  if (!enterprise) {
    return apiError("企业码不可用，请确认后重试或联系企业管理员");
  }

  const existing = await prisma.user.findFirst({
    where: { loginAccount, enterpriseId: enterprise.id },
  });

  if (existing) {
    return apiError("该账号已存在，请直接登录");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      enterpriseId: enterprise.id,
      name,
      loginAccount,
      passwordHash,
      status: "PENDING",
      role: "MEMBER",
    },
  });

  // 7 天未激活自动锁定的调度可由 cron 完成，此处记录创建时间即可

  // 通知企业管理员
  const admins = await prisma.user.findMany({
    where: { enterpriseId: enterprise.id, role: "ENTERPRISE_ADMIN", status: "ACTIVE" },
    select: { id: true },
  });

  if (admins.length > 0) {
    await prisma.notification.createMany({
      data: admins.map((admin) => ({
        userId: admin.id,
        enterpriseId: enterprise.id,
        type: "PENDING_ACTIVATION" as const,
        title: "有新成员待激活",
        content: `${name}（${loginAccount}）已注册，等待激活`,
        category: "ACTION_REQUIRED" as const,
        relatedEntityType: "User",
        relatedEntityId: user.id,
      })),
    });
  }

  return NextResponse.json({ ok: true });
}
