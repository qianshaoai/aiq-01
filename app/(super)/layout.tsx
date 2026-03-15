import { redirect } from "next/navigation";
import { getSuperAdmin } from "@/lib/auth";
import { SuperSidebarNav } from "@/components/super/super-sidebar-nav";

export default async function SuperLayout({ children }: { children: React.ReactNode }) {
  const admin = await getSuperAdmin();

  if (!admin) {
    redirect("/super/login");
  }

  if (admin.status === "DISABLED") {
    redirect("/super/login?error=unauthorized");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <SuperSidebarNav adminName={admin.name} adminEmail={admin.email} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
