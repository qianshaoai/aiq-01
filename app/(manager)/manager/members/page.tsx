import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ManagerMembersShell } from "@/components/manager/manager-members-shell";

export default async function ManagerMembersPage() {
  const user = await getSessionUser();
  if (!user) redirect("/manager/login");
  if (user.role !== "TEAM_LEADER") redirect("/manager/login?error=unauthorized");

  const enterpriseId = user.enterpriseId;

  const [pendingActivation, pendingAssignment, members, teams] = await Promise.all([
    prisma.user.findMany({
      where: { enterpriseId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, name: true, loginAccount: true, positionTag: true, createdAt: true, team: { select: { id: true, name: true } } },
    }),
    prisma.user.findMany({
      where: { enterpriseId, status: "PENDING_ASSIGNMENT" },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, name: true, loginAccount: true, positionTag: true, createdAt: true },
    }),
    prisma.user.findMany({
      where: { enterpriseId, status: "ACTIVE", teamId: user.teamId ?? undefined },
      orderBy: { name: "asc" },
      take: 100,
      select: { id: true, name: true, loginAccount: true, positionTag: true, role: true, lastLoginAt: true, team: { select: { id: true, name: true } } },
    }),
    prisma.team.findMany({
      where: { enterpriseId, status: "ACTIVE" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <ManagerMembersShell
      pendingActivation={pendingActivation}
      pendingAssignment={pendingAssignment}
      members={members}
      teams={teams}
    />
  );
}
