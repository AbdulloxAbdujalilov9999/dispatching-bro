import type { Role } from "@/lib/db/types";

export const ROLES: Role[] = ["ADMIN", "MANAGER", "DISPATCHER", "ACCOUNTING", "HR"];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  DISPATCHER: "Dispatcher",
  ACCOUNTING: "Accounting",
  HR: "HR",
};

/**
 * Which roles can see/use each section of the app. ADMIN and MANAGER get
 * broad operational + financial visibility; ACCOUNTING and HR are scoped to
 * their job; DISPATCHER is scoped to day-to-day dispatch work. User account
 * management is ADMIN-only regardless.
 */
export const SECTION_ROLES = {
  dashboard: ["ADMIN", "MANAGER", "DISPATCHER", "ACCOUNTING", "HR"],
  loads: ["ADMIN", "MANAGER", "DISPATCHER"],
  carriers: ["ADMIN", "MANAGER", "DISPATCHER", "HR"],
  drivers: ["ADMIN", "MANAGER", "DISPATCHER", "HR"],
  customers: ["ADMIN", "MANAGER", "DISPATCHER", "ACCOUNTING"],
  rateConfirmations: ["ADMIN", "MANAGER", "DISPATCHER"],
  invoices: ["ADMIN", "MANAGER", "ACCOUNTING"],
  reports: ["ADMIN", "MANAGER", "ACCOUNTING"],
  users: ["ADMIN"],
  settings: ["ADMIN", "MANAGER", "DISPATCHER", "ACCOUNTING", "HR"],
} as const satisfies Record<string, Role[]>;

export type Section = keyof typeof SECTION_ROLES;

export function canAccess(role: Role, section: Section): boolean {
  return (SECTION_ROLES[section] as readonly Role[]).includes(role);
}
