import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { ManagerSidebarNav } from "@/components/manager/manager-sidebar-nav";

export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/manager/login");
  }

  if (user.role !== "TEAM_LEADER") {
    redirect("/manager/login?error=unauthorized");
  }

  if (user.status === "DISABLED" || user.status === "LOCKED") {
    redirect("/manager/login?error=account_inactive");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <ManagerSidebarNav userName={user.name} enterpriseName={user.enterprise.name} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
