import type { ReactNode } from "react";
import { CalendarDays, Clock3 } from "lucide-react";
import { formatDate, hhmm, TODAY } from "@/data/mock";
import { useApp } from "@/lib/app-state";

/** Signature bilingual header: English title left, Nastaliq Urdu right on the same baseline. */
export function PageHeader({
  title,
  urdu,
  description,
  children,
}: {
  title: string;
  urdu: string;
  description: string;
  children?: ReactNode;
}) {
  const { clockMin } = useApp();
  return (
    <header className="page-header pb-1">
      <div className="flex items-baseline justify-between gap-6">
        <h1 className="text-[30px] font-bold leading-tight text-ink sm:text-[34px]">{title}</h1>
        <p dir="rtl" lang="ur" className="font-urdu shrink-0 text-xl text-kurram">
          {urdu}
        </p>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-8 gap-y-3">
        <p className="max-w-[850px] text-sm text-ink-muted">{description}</p>
        <div className="flex shrink-0 items-center gap-3 text-xs text-ink-muted">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-3.5" />
            {formatDate(TODAY, true)}
          </span>
          <span className="inline-flex items-center gap-1.5 border-l border-line pl-3">
            <Clock3 className="size-3.5" />
            {hhmm(clockMin)} PKT
          </span>
        </div>
      </div>
      {children && <div className="mt-3">{children}</div>}
    </header>
  );
}
