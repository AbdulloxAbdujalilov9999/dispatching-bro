"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Truck,
  Building2,
  FileSignature,
  Receipt,
  BarChart3,
  UserCircle2,
  Compass,
  Users,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { canAccess, type Section } from "@/lib/permissions";
import type { Role } from "@/lib/db/types";

const nav: { href: string; label: string; icon: typeof LayoutDashboard; section: Section }[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, section: "dashboard" },
  { href: "/loads", label: "Loads", icon: Compass, section: "loads" },
  { href: "/carriers", label: "Carriers", icon: Truck, section: "carriers" },
  { href: "/drivers", label: "Drivers", icon: UserCircle2, section: "drivers" },
  { href: "/customers", label: "Customers", icon: Building2, section: "customers" },
  { href: "/rate-confirmations", label: "Rate Confirmations", icon: FileSignature, section: "rateConfirmations" },
  { href: "/invoices", label: "Invoices & Settlements", icon: Receipt, section: "invoices" },
  { href: "/reports", label: "Reports", icon: BarChart3, section: "reports" },
  { href: "/users", label: "Team Accounts", icon: Users, section: "users" },
  { href: "/settings", label: "Settings", icon: Settings, section: "settings" },
];

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = nav.filter((item) => canAccess(role, item.section));

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-surface-border bg-white dark:border-white/10 dark:bg-slate-900 lg:flex">
      <div className="flex h-16 items-center gap-2 border-b border-surface-border px-6 dark:border-white/10">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
          <Truck className="h-4.5 w-4.5" />
        </div>
        <span className="text-base font-semibold text-ink dark:text-white">Haulwise</span>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {items.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400"
                  : "text-ink-soft hover:bg-surface-subtle hover:text-ink dark:text-ink-faint dark:hover:bg-white/5 dark:hover:text-white"
              )}
            >
              <Icon className={cn("h-4.5 w-4.5", active ? "text-brand-600 dark:text-brand-400" : "text-ink-faint")} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-surface-border p-4 text-xs text-ink-faint dark:border-white/10">
        Haulwise Dispatch &copy; {new Date().getFullYear()}
      </div>
    </aside>
  );
}
