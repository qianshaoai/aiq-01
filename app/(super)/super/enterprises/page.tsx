import { redirect } from "next/navigation";
import { getSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SuperEnterprisesShell } from "@/components/super/super-enterprises-shell";

export default async function SuperEnterprisesPage() {
  const admin = await getSuperAdmin();
  if (!admin) redirect("/super/login");

  const enterprises = await prisma.enterprise.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      enterpriseCode: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { users: true, teams: true } },
    },
  });

  return <SuperEnterprisesShell enterprises={enterprises} />;
}
