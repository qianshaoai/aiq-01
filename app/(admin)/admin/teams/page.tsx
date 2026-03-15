import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminTeamsShell } from "@/components/admin/admin-teams-shell";

export default async function AdminTeamsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "ENTERPRISE_ADMIN") redirect("/admin/login?error=unauthorized");

  const enterpriseId = user.enterpriseId;

  const [teams, leaders] = await Promise.all([
    prisma.team.findMany({
      where: { enterpriseId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        status: true,
        leaderUserId: true,
        createdAt: true,
        _count: { select: { members: true } },
      },
    }),
    prisma.user.findMany({
      where: { enterpriseId, role: "TEAM_LEADER", status: "ACTIVE" },
      select: { id: true, name: true, loginAccount: true },
    }),
  ]);

  return <AdminTeamsShell teams={teams} leaders={leaders} enterpriseId={enterpriseId} />;
}
