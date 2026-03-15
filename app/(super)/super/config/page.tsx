import { redirect } from "next/navigation";
import { getSuperAdmin } from "@/lib/auth";
import { SuperConfigShell } from "@/components/super/super-config-shell";

export default async function SuperConfigPage() {
  const admin = await getSuperAdmin();
  if (!admin) redirect("/super/login");

  return <SuperConfigShell />;
}
