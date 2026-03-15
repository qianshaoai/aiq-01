import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AdminSidebarNav } from "@/components/admin/admin-sidebar-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/admin/login");
  }

  if (user.role !== "ENTERPRISE_ADMIN") {
    redirect("/admin/login?error=unauthorized");
  }

  if (user.status === "DISABLED" || user.status === "LOCKED") {
    redirect("/admin/login?error=account_inactive");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebarNav userName={user.name} enterpriseName={user.enterprise.name} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
