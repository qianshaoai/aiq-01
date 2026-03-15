import { NextRequest, NextResponse } from "next/server";
import { getSuperSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, apiUnauthorized } from "@/lib/errors";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ adminId: string }> }) {
  const session = await getSuperSession();
  if (!session) return apiUnauthorized();

  const { adminId } = await params;

  if (adminId === session.superAdminId) return apiError("不能修改自己的状态");

  let body: { status?: "ACTIVE" | "DISABLED" };
  try {
    body = await req.json();
  } catch {
    return apiError("请求格式错误");
  }

  if (!body.status || !["ACTIVE", "DISABLED"].includes(body.status)) {
    return apiError("状态值无效");
  }

  try {
    const updated = await prisma.superAdmin.update({
      where: { id: adminId },
      data: { status: body.status },
      select: { id: true, email: true, name: true, status: true },
    });
    return NextResponse.json({ admin: updated });
  } catch {
    return apiError("账号不存在", 404);
  }
}
