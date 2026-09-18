"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { LogOut, Menu, X, Truck } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn, initials } from "@/lib/utils";
import { canAccess, type Section } from "@/lib/permissions";
import type { Role } from "@/lib/db/types";

const nav: { href: string; label: string; section: Section }[] = [
  { href: "/dashboard", label: "Dashboard", section: "dashboard" },
  { href: "/loads", label: "Loads", section: "loads" },
  { href: "/carriers", label: "Carriers", section: "carriers" },
  { href: "/drivers", label: "Drivers", section: "drivers" },
  { href: "/customers", label: "Customers", section: "customers" },
  { href: "/rate-confirmations", label: "Rate Confirmations", section: "rateConfirmations" },
  { href: "/invoices", label: "Invoices", section: "invoices" },
  { href: "/reports", label: "Reports", section: "reports" },
  { href: "/users", label: "Team Accounts", section: "users" },
  { href: "/settings", label: "Settings", section: "settings" },
];

export function Topbar({ userName, userRole }: { userName: string; userRole: Role }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const items = nav.filter((item) => canAccess(userRole, item.section));

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-surface-border bg-white/90 px-4 backdrop-blur dark:border-white/10 dark:bg-slate-900/90 sm:px-6">
      <button
        className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft hover:bg-surface-subtle dark:text-ink-faint dark:hover:bg-white/5 lg:hidden"
        onClick={() => setMobileOpen((v) => !v)}
        aria-label="Toggle navigation"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      <div className="flex items-center gap-2 lg:hidden">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-600 text-white">
          <Truck className="h-4 w-4" />
        </div>
        <span className="font-semibold text-ink dark:text-white">Haulwise</span>
      </div>

      <div className="hidden lg:block" />

      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium leading-tight text-ink dark:text-white">{userName}</p>
          <p className="text-xs capitalize leading-tight text-ink-faint">{userRole.toLowerCase()}</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
          {initials(userName)}
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft hover:bg-surface-subtle hover:text-red-600 dark:text-ink-faint dark:hover:bg-white/5"
          title="Sign out"
        >
          <LogOut className="h-4.5 w-4.5" />
        </button>
      </div>

      {mobileOpen && (
        <div className="absolute inset-x-0 top-16 z-10 border-b border-surface-border bg-white p-3 shadow-popover dark:border-white/10 dark:bg-slate-900 lg:hidden">
          {items.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "block rounded-lg px-3 py-2 text-sm font-medium",
                  active
                    ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400"
                    : "text-ink-soft hover:bg-surface-subtle dark:text-ink-faint dark:hover:bg-white/5"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
