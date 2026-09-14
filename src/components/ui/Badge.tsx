import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  slate: "bg-slate-100 text-slate-700",
  blue: "bg-blue-50 text-blue-700",
  indigo: "bg-indigo-50 text-indigo-700",
  amber: "bg-amber-50 text-amber-700",
  green: "bg-emerald-50 text-emerald-700",
  red: "bg-red-50 text-red-700",
  purple: "bg-purple-50 text-purple-700",
};

const statusColor: Record<string, keyof typeof styles> = {
  BOOKED: "slate",
  DISPATCHED: "blue",
  IN_TRANSIT: "indigo",
  DELIVERED: "green",
  INVOICED: "purple",
  CANCELLED: "red",
  ACTIVE: "green",
  INACTIVE: "slate",
  ON_LEAVE: "amber",
  PENDING_APPROVAL: "amber",
  DRAFT: "slate",
  SENT: "blue",
  SIGNED: "green",
  VOID: "red",
  PAID: "green",
  OVERDUE: "red",
  PENDING: "amber",
  APPROVED: "blue",
};

export function StatusBadge({ status }: { status: string }) {
  const color = statusColor[status] ?? "slate";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize",
        styles[color]
      )}
    >
      {status.replaceAll("_", " ").toLowerCase()}
    </span>
  );
}

export function Badge({
  children,
  color = "slate",
  className,
}: {
  children: React.ReactNode;
  color?: keyof typeof styles;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        styles[color],
        className
      )}
    >
      {children}
    </span>
  );
}
