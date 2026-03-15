import { redirect } from "next/navigation";
import { getSuperAdmin } from "@/lib/auth";
import { SuperAnnouncementsShell } from "@/components/super/super-announcements-shell";

export default async function SuperAnnouncementsPage() {
  const admin = await getSuperAdmin();
  if (!admin) redirect("/super/login");

  return <SuperAnnouncementsShell />;
}
