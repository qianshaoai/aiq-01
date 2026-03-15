import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AdminAgentsShell } from "@/components/admin/admin-agents-shell";

export default async function AdminAgentsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "ENTERPRISE_ADMIN") redirect("/admin/login?error=unauthorized");

  return <AdminAgentsShell />;
}
