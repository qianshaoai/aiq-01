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
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/", label: "首页", icon: Home },
  { href: "/task/new", label: "发起任务", icon: Plus },
  { href: "/training", label: "练兵", icon: Swords },
  { href: "/tasks", label: "任务历史", icon: History },
  { href: "/assets", label: "资产库", icon: FolderOpen },
  { href: "/growth", label: "成长反馈", icon: TrendingUp },
];

interface SidebarNavProps {
  userName: string;
  enterpriseName: string;
}

export function SidebarNav({ userName, enterpriseName }: SidebarNavProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

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
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
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
            </Link>
          );
        })}
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
            <p className="text-xs text-muted-foreground">普通成员</p>
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
