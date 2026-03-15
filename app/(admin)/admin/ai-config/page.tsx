import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AIConfigShell } from "@/components/admin/ai-config-shell";

export default async function AdminAIConfigPage() {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "ENTERPRISE_ADMIN") redirect("/admin/login?error=unauthorized");

  return <AIConfigShell />;
}
