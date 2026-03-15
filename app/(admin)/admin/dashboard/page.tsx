import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminDashboard } from "@/components/admin/admin-dashboard";

export default async function AdminDashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "ENTERPRISE_ADMIN") redirect("/admin/login?error=unauthorized");

  const enterpriseId = user.enterpriseId;
  const since30d = new Date();
  since30d.setDate(since30d.getDate() - 30);

  const [totalMembers, activeMembers, totalTeams, tasksStarted, tasksCompleted, pendingCount] = await Promise.all([
    prisma.user.count({ where: { enterpriseId, status: "ACTIVE" } }),
    prisma.user.count({ where: { enterpriseId, lastLoginAt: { gte: since30d }, status: "ACTIVE" } }),
    prisma.team.count({ where: { enterpriseId, status: "ACTIVE" } }),
    prisma.task.count({ where: { enterpriseId, createdAt: { gte: since30d } } }),
    prisma.task.count({ where: { enterpriseId, status: "COMPLETED", updatedAt: { gte: since30d } } }),
    prisma.user.count({ where: { enterpriseId, status: { in: ["PENDING", "PENDING_ASSIGNMENT"] } } }),
  ]);

  return (
    <AdminDashboard
      stats={{ totalMembers, activeMembers, totalTeams, tasksStarted, tasksCompleted }}
      pendingCount={pendingCount}
    />
  );
}
