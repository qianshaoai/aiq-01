import { NextResponse } from "next/server";
import { getSuperSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiUnauthorized } from "@/lib/errors";

export async function GET() {
  const session = await getSuperSession();
  if (!session) return apiUnauthorized();

  const now = new Date();
  const day30Ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const day7Ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    enterpriseTotal,
    enterpriseActive,
    userTotal,
    userActiveApprox,
    taskTotal,
    taskCompleted,
    task7d,
    growthReceiptTotal,
    superAdminCount,
  ] = await Promise.all([
    prisma.enterprise.count(),
    prisma.enterprise.count({ where: { status: "ACTIVE" } }),
    prisma.user.count(),
    prisma.task.count({ where: { createdAt: { gte: day30Ago } } }),
    prisma.task.count(),
    prisma.task.count({ where: { status: "COMPLETED" } }),
    prisma.task.count({ where: { createdAt: { gte: day7Ago } } }),
    prisma.growthReceipt.count(),
    prisma.superAdmin.count({ where: { status: "ACTIVE" } }),
  ]);

  return NextResponse.json({
    enterprises: { total: enterpriseTotal, active: enterpriseActive },
    users: { total: userTotal, tasks30d: userActiveApprox },
    tasks: { total: taskTotal, completed: taskCompleted, last7d: task7d },
    growthReceipts: { total: growthReceiptTotal },
    superAdmins: { active: superAdminCount },
    generatedAt: now.toISOString(),
  });
}
