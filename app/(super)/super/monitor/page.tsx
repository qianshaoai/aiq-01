import { redirect } from "next/navigation";
import { getSuperAdmin } from "@/lib/auth";
import { SuperMonitorShell } from "@/components/super/super-monitor-shell";

export default async function SuperMonitorPage() {
  const admin = await getSuperAdmin();
  if (!admin) redirect("/super/login");

  return <SuperMonitorShell />;
}
