import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminMembersShell } from "@/components/admin/admin-members-shell";

export default async function AdminMembersPage() {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "ENTERPRISE_ADMIN") redirect("/admin/login?error=unauthorized");

  const enterpriseId = user.enterpriseId;

  const [pendingActivation, pendingAssignment, members, teams] = await Promise.all([
    prisma.user.findMany({
      where: { enterpriseId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { id: true, name: true, loginAccount: true, positionTag: true, createdAt: true, team: { select: { id: true, name: true } } },
    }),
    prisma.user.findMany({
      where: { enterpriseId, status: "PENDING_ASSIGNMENT" },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { id: true, name: true, loginAccount: true, positionTag: true, createdAt: true },
    }),
    prisma.user.findMany({
      where: { enterpriseId },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: { id: true, name: true, loginAccount: true, positionTag: true, role: true, status: true, lastLoginAt: true, team: { select: { id: true, name: true } } },
    }),
    prisma.team.findMany({
      where: { enterpriseId, status: "ACTIVE" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <AdminMembersShell
      pendingActivation={pendingActivation}
      pendingAssignment={pendingAssignment}
      members={members}
      teams={teams}
    />
  );
}
