import { redirect } from "next/navigation";
import { getSuperAdmin } from "@/lib/auth";
import { SuperAgentTemplatesShell } from "@/components/super/super-agent-templates-shell";

export default async function SuperAgentTemplatesPage() {
  const admin = await getSuperAdmin();
  if (!admin) redirect("/super/login");

  return <SuperAgentTemplatesShell />;
}
