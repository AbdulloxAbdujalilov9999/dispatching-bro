"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Truck,
  Users,
  Building2,
  FileSignature,
  Receipt,
  BarChart3,
  UserCircle2,
  Compass,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/loads", label: "Loads", icon: Compass },
  { href: "/carriers", label: "Carriers", icon: Truck },
  { href: "/drivers", label: "Drivers", icon: UserCircle2 },
  { href: "/customers", label: "Customers", icon: Building2 },
  { href: "/rate-confirmations", label: "Rate Confirmations", icon: FileSignature },
  { href: "/invoices", label: "Invoices & Settlements", icon: Receipt },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-surface-border bg-white lg:flex">
      <div className="flex h-16 items-center gap-2 border-b border-surface-border px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
          <Truck className="h-4.5 w-4.5" />
        </div>
        <span className="text-base font-semibold text-ink">Haulwise</span>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {nav.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-brand-50 text-brand-700"
                  : "text-ink-soft hover:bg-surface-subtle hover:text-ink"
              )}
            >
              <Icon className={cn("h-4.5 w-4.5", active ? "text-brand-600" : "text-ink-faint")} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-surface-border p-4 text-xs text-ink-faint">
        Haulwise Dispatch &copy; {new Date().getFullYear()}
      </div>
    </aside>
  );
}
