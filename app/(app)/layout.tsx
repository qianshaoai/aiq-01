import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { TopBar } from "@/components/layout/top-bar";
import { prisma } from "@/lib/prisma";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  if (user.status === "DISABLED" || user.status === "LOCKED") {
    redirect("/login?error=account_inactive");
  }

  // 角色验证：非普通员工重定向到对应后台
  if (user.role === "TEAM_LEADER") {
    redirect("/manager/dashboard");
  }
  if (user.role === "ENTERPRISE_ADMIN") {
    redirect("/admin/dashboard");
  }

  // 未激活/待分配用户只能访问受限页面
  // 前端会根据 status 展示受限提示，这里允许进入，由各页面自行判断

  // 未读通知数
  const unreadCount = await prisma.notification.count({
    where: { userId: user.id, isRead: false },
  });

  const pendingCount = 0;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <SidebarNav
        userName={user.name}
        enterpriseName={user.enterprise.name}
      />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar initialUnreadCount={unreadCount} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
