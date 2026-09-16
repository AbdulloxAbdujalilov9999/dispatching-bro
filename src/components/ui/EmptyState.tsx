import { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted dark:bg-white/5">
        <Icon className="h-6 w-6 text-ink-faint" />
      </div>
      <div>
        <p className="text-sm font-medium text-ink dark:text-white">{title}</p>
        {description && <p className="mt-1 text-sm text-ink-faint">{description}</p>}
      </div>
      {action}
    </div>
  );
}
