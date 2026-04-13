"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  BookOpen,
  MessageSquare,
  Receipt,
  Settings,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS: Array<{ label: string; href: string; icon: React.ElementType }> = [
  { label: "Command Center", href: "/super-admin/command-center", icon: LayoutDashboard },
  { label: "Schools", href: "/super-admin/schools", icon: Building2 },
  { label: "Content Pipeline", href: "/super-admin/content", icon: BookOpen },
  { label: "Communicate", href: "/super-admin/communicate", icon: MessageSquare },
  { label: "Financials", href: "/super-admin/financials", icon: Receipt },
  { label: "Operations", href: "/super-admin/operations", icon: Settings },
];

export function SuperAdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r bg-background shrink-0">
      <div className="p-6 border-b">
        <Link href="/super-admin" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">L</span>
          </div>
          <div>
            <div className="font-semibold text-sm">Lernen</div>
            <div className="text-xs text-muted-foreground">Super Admin</div>
          </div>
        </Link>
      </div>

      <nav className="p-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href as any}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                isActive
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
              {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t">
        <div className="text-xs text-muted-foreground">
          Lernen v1.0 — Super Admin
        </div>
      </div>
    </aside>
  );
}
