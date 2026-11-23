import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A ledger panel with a plain title row. */
export function Panel({
  title,
  aside,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("panel overflow-hidden", className)}>
      {(title || aside) && (
        <div className="panel-heading flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-4">
          {title && <h2 className="text-md font-semibold text-ink">{title}</h2>}
          {aside && <div className="text-xs text-ink-muted">{aside}</div>}
        </div>
      )}
      <div className={cn(bodyClassName)}>{children}</div>
    </section>
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="px-6 py-10 text-center">
      <p className="font-semibold text-ink">{title}</p>
      {hint && <p className="mt-1 text-sm text-ink-muted">{hint}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function Code({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("code text-ink", className)}>{children}</span>;
}
