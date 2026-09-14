"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { LogOut, Menu, X, Truck } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn, initials } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/loads", label: "Loads" },
  { href: "/carriers", label: "Carriers" },
  { href: "/drivers", label: "Drivers" },
  { href: "/customers", label: "Customers" },
  { href: "/rate-confirmations", label: "Rate Confirmations" },
  { href: "/invoices", label: "Invoices" },
  { href: "/reports", label: "Reports" },
];

export function Topbar({ userName, userRole }: { userName: string; userRole: string }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-surface-border bg-white/90 px-4 backdrop-blur sm:px-6">
      <button
        className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft hover:bg-surface-subtle lg:hidden"
        onClick={() => setMobileOpen((v) => !v)}
        aria-label="Toggle navigation"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      <div className="flex items-center gap-2 lg:hidden">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-600 text-white">
          <Truck className="h-4 w-4" />
        </div>
        <span className="font-semibold text-ink">Haulwise</span>
      </div>

      <div className="hidden lg:block" />

      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium leading-tight text-ink">{userName}</p>
          <p className="text-xs capitalize leading-tight text-ink-faint">{userRole.toLowerCase()}</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
          {initials(userName)}
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft hover:bg-surface-subtle hover:text-red-600"
          title="Sign out"
        >
          <LogOut className="h-4.5 w-4.5" />
        </button>
      </div>

      {mobileOpen && (
        <div className="absolute inset-x-0 top-16 z-10 border-b border-surface-border bg-white p-3 shadow-popover lg:hidden">
          {nav.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "block rounded-lg px-3 py-2 text-sm font-medium",
                  active ? "bg-brand-50 text-brand-700" : "text-ink-soft hover:bg-surface-subtle"
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
