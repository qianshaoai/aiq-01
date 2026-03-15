"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Building2, Settings, LogOut, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/admin/dashboard", label: "企业看板", icon: LayoutDashboard },
  { href: "/admin/members", label: "成员管理", icon: Users },
  { href: "/admin/teams", label: "团队管理", icon: Building2 },
  { href: "/admin/agents", label: "智能体配置", icon: Bot },
  { href: "/admin/ai-config", label: "AI 供应商配置", icon: Settings },
];

interface AdminSidebarNavProps {
  userName: string;
  enterpriseName: string;
}

export function AdminSidebarNav({ userName, enterpriseName }: AdminSidebarNavProps) {
  const pathname = usePathname();

  return (
    <aside className="flex flex-col h-full w-56 bg-white border-r border-border">
      {/* Brand */}
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
        <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
          <span className="text-white text-xs font-bold">前</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">前哨 AI 进化场</p>
          <p className="text-xs text-muted-foreground truncate">{enterpriseName}</p>
        </div>
      </div>

      {/* Role badge */}
      <div className="px-5 py-2 border-b border-border">
        <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
          企业管理员
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                active
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-foreground/70 hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className={cn("w-4 h-4 flex-shrink-0", active ? "text-primary" : "text-foreground/50")} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User area */}
      <div className="px-3 py-3 border-t border-border">
        <div className="flex items-center gap-2 px-2 py-2 rounded-lg">
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-primary text-xs font-medium">{userName.slice(0, 1)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{userName}</p>
            <p className="text-xs text-muted-foreground">企业管理员</p>
          </div>
        </div>
        <form action="/api/admin/auth/logout" method="POST">
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground mt-1 h-8"
          >
            <LogOut className="w-3.5 h-3.5 mr-2" />
            退出登录
          </Button>
        </form>
      </div>
    </aside>
  );
}
