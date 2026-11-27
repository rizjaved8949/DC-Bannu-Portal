import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SearchCheck } from "lucide-react";

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
    <div className="empty-state px-6 py-12 text-center">
      <div className="empty-state-art" aria-hidden>
        <SearchCheck className="size-7" />
      </div>
      <p className="font-semibold text-ink">{title}</p>
      {hint && (
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-muted">{hint}</p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function Code({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("code text-ink", className)}>{children}</span>;
}
