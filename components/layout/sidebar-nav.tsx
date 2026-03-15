"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Plus,
  Swords,
  History,
  FolderOpen,
  TrendingUp,
  Settings,
  Shield,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
  adminOnly?: boolean;
  leaderOnly?: boolean;
}

const navItems: NavItem[] = [
  { href: "/", label: "首页", icon: Home },
  { href: "/task/new", label: "发起任务", icon: Plus },
  { href: "/training", label: "练兵", icon: Swords },
  { href: "/tasks", label: "任务历史", icon: History },
  { href: "/assets", label: "资产库", icon: FolderOpen },
  { href: "/growth", label: "成长反馈", icon: TrendingUp },
];

const manageItems: NavItem[] = [
  { href: "/manage", label: "管理端", icon: Shield, leaderOnly: true },
  { href: "/admin/ai-config", label: "AI 供应商配置", icon: Settings, adminOnly: true },
];

interface SidebarNavProps {
  role: "MEMBER" | "TEAM_LEADER" | "ENTERPRISE_ADMIN";
  userName: string;
  enterpriseName: string;
  pendingCount?: number;
}

export function SidebarNav({ role, userName, enterpriseName, pendingCount }: SidebarNavProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const visibleManageItems = manageItems.filter((item) => {
    if (item.adminOnly) return role === "ENTERPRISE_ADMIN";
    if (item.leaderOnly) return role === "TEAM_LEADER" || role === "ENTERPRISE_ADMIN";
    return true;
  });

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

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {navItems.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item.href)} />
        ))}

        {visibleManageItems.length > 0 && (
          <>
            <div className="pt-3 pb-1 px-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                管理
              </p>
            </div>
            {visibleManageItems.map((item) => (
              <NavLink
                key={item.href}
                item={{ ...item, badge: item.href === "/manage" ? pendingCount : undefined }}
                active={isActive(item.href)}
              />
            ))}
          </>
        )}
      </nav>

      {/* User area */}
      <div className="px-3 py-3 border-t border-border">
        <div className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-accent transition-colors">
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-primary text-xs font-medium">
              {userName.slice(0, 1)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{userName}</p>
            <p className="text-xs text-muted-foreground">
              {role === "ENTERPRISE_ADMIN" ? "企业管理员" : role === "TEAM_LEADER" ? "团队负责人" : "普通成员"}
            </p>
          </div>
        </div>
        <form action="/api/auth/logout" method="POST">
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

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors group",
        active
          ? "bg-primary/10 text-primary font-medium"
          : "text-foreground/70 hover:bg-accent hover:text-foreground"
      )}
    >
      <Icon className={cn("w-4 h-4 flex-shrink-0", active ? "text-primary" : "text-foreground/50 group-hover:text-foreground/70")} />
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge != null && item.badge > 0 && (
        <Badge variant="destructive" className="h-4 min-w-4 px-1 text-[10px] rounded-full">
          {item.badge > 99 ? "99+" : item.badge}
        </Badge>
      )}
    </Link>
  );
}
