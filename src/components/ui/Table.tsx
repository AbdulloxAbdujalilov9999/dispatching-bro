import { cn } from "@/lib/utils";

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className={cn("block w-full text-left text-sm sm:table", className)}>{children}</table>
    </div>
  );
}

export function Thead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="hidden sm:table-header-group">
      <tr className="border-b border-surface-border text-xs font-medium uppercase tracking-wide text-ink-faint dark:border-white/10">
        {children}
      </tr>
    </thead>
  );
}

export function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={cn("px-5 py-3 font-medium", className)}>{children}</th>;
}

// On narrow screens each row becomes a card and every cell becomes a
// label/value line (label from the `label` prop, matching that column's
// <Th>), instead of forcing the whole table into horizontal scroll.
export function Td({
  children,
  className,
  colSpan,
  label,
}: {
  children: React.ReactNode;
  className?: string;
  colSpan?: number;
  label?: string;
}) {
  return (
    <td
      colSpan={colSpan}
      className={cn(
        "flex items-center justify-between gap-3 py-1.5 text-right align-middle text-ink last:pb-0 sm:table-cell sm:px-5 sm:py-3.5 sm:text-left dark:text-slate-100",
        className
      )}
    >
      {label && (
        <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-ink-faint sm:hidden">{label}</span>
      )}
      <span className="min-w-0 sm:contents">{children}</span>
    </td>
  );
}

export function Tr({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <tr
      className={cn(
        "mb-3 block rounded-xl border border-surface-border bg-white p-3 shadow-card last:mb-0 dark:border-white/10 dark:bg-slate-900 sm:mb-0 sm:table-row sm:rounded-none sm:border-0 sm:border-b sm:bg-transparent sm:p-0 sm:shadow-none sm:last:border-0 sm:hover:bg-surface-subtle/60 dark:sm:hover:bg-white/5",
        className
      )}
    >
      {children}
    </tr>
  );
}
