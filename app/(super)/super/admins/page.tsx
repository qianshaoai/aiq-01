import { redirect } from "next/navigation";
import { getSuperAdmin } from "@/lib/auth";
import { SuperAdminsShell } from "@/components/super/super-admins-shell";

export default async function SuperAdminsPage() {
  const admin = await getSuperAdmin();
  if (!admin) redirect("/super/login");

  return <SuperAdminsShell />;
}
