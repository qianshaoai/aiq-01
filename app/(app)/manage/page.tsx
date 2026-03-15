import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ManageDashboard } from "@/components/manage/manage-dashboard";

export default async function ManagePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role === "MEMBER") redirect("/");

  const enterpriseId = user.enterpriseId;

  // 待激活和待分配成员
  const [pendingActivation, pendingAssignment, teams] = await Promise.all([
    prisma.user.findMany({
      where: { enterpriseId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        name: true,
        loginAccount: true,
        positionTag: true,
        createdAt: true,
        team: { select: { id: true, name: true } },
      },
    }),
    prisma.user.findMany({
      where: { enterpriseId, status: "PENDING_ASSIGNMENT" },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        name: true,
        loginAccount: true,
        positionTag: true,
        createdAt: true,
      },
    }),
    prisma.team.findMany({
      where: { enterpriseId, status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  // 30 天统计（仅企业管理员看全企业，团队负责人看本团队）
  const since30d = new Date();
  since30d.setDate(since30d.getDate() - 30);

  const teamFilter =
    user.role === "ENTERPRISE_ADMIN"
      ? { enterpriseId }
      : { teamId: user.teamId ?? "__none__", enterpriseId };

  const [activeUsersCount, tasksStartedCount, tasksCompletedCount] = await Promise.all([
    prisma.user.count({
      where: { ...teamFilter, lastLoginAt: { gte: since30d }, status: "ACTIVE" },
    }),
    prisma.task.count({
      where: { ...teamFilter, createdAt: { gte: since30d } },
    }),
    prisma.task.count({
      where: { ...teamFilter, status: "COMPLETED", updatedAt: { gte: since30d } },
    }),
  ]);

  return (
    <ManageDashboard
      role={user.role}
      pendingActivation={pendingActivation}
      pendingAssignment={pendingAssignment}
      teams={teams}
      stats={{ activeUsersCount, tasksStartedCount, tasksCompletedCount }}
    />
  );
}
