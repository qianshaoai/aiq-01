import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AIConfigShell } from "@/components/admin/ai-config-shell";

export default async function AIConfigPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "ENTERPRISE_ADMIN") redirect("/");

  return <AIConfigShell />;
}
