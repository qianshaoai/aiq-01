import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ManagerDashboard } from "@/components/manager/manager-dashboard";

export default async function ManagerDashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/manager/login");
  if (user.role !== "TEAM_LEADER") redirect("/manager/login?error=unauthorized");

  const since30d = new Date();
  since30d.setDate(since30d.getDate() - 30);

  const teamFilter = user.teamId
    ? { teamId: user.teamId, enterpriseId: user.enterpriseId }
    : { enterpriseId: user.enterpriseId };

  const [activeUsersCount, tasksStartedCount, tasksCompletedCount, pendingCount] = await Promise.all([
    prisma.user.count({
      where: { ...teamFilter, lastLoginAt: { gte: since30d }, status: "ACTIVE" },
    }),
    prisma.task.count({
      where: { ...teamFilter, createdAt: { gte: since30d } },
    }),
    prisma.task.count({
      where: { ...teamFilter, status: "COMPLETED", updatedAt: { gte: since30d } },
    }),
    prisma.user.count({
      where: { enterpriseId: user.enterpriseId, status: { in: ["PENDING", "PENDING_ASSIGNMENT"] } },
    }),
  ]);

  return (
    <ManagerDashboard
      stats={{ activeUsersCount, tasksStartedCount, tasksCompletedCount }}
      pendingCount={pendingCount}
    />
  );
}
