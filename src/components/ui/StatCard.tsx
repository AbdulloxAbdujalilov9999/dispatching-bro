import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/Card";

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  accent = "brand",
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: { value: string; positive?: boolean };
  accent?: "brand" | "green" | "amber" | "purple";
}) {
  const accentClasses: Record<string, string> = {
    brand: "bg-brand-50 text-brand-600",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    purple: "bg-purple-50 text-purple-600",
  };

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-ink-faint">{label}</p>
          <p className="mt-1.5 text-2xl font-semibold text-ink">{value}</p>
        </div>
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", accentClasses[accent])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {trend && (
        <p className={cn("mt-3 text-xs font-medium", trend.positive ? "text-emerald-600" : "text-ink-faint")}>
          {trend.value}
        </p>
      )}
    </Card>
  );
}
