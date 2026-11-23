import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TONE_RULE, type Tone } from "./status";
import {
  Activity,
  Building2,
  CircleCheck,
  ClipboardCheck,
  Clock3,
  HeartPulse,
  TriangleAlert,
  UsersRound,
} from "lucide-react";

const iconFor = (label: string) =>
  /staff|present|marked/i.test(label)
    ? UsersRound
    : /shift|coverage/i.test(label)
      ? HeartPulse
      : /critical|absent/i.test(label)
        ? TriangleAlert
        : /pending|verification/i.test(label)
          ? ClipboardCheck
          : /stale|leave/i.test(label)
            ? Clock3
            : /reported|attendance/i.test(label)
              ? CircleCheck
              : /posts|facilities/i.test(label)
                ? Building2
                : Activity;

/** White panel, 3px left rule, muted label, 30px value, one plain sub-line, optional freshness. */
export function KpiTile({
  label,
  value,
  sub,
  freshness,
  tone = "kurram",
  className,
}: {
  label: string;
  value: ReactNode;
  sub: ReactNode;
  freshness?: ReactNode;
  tone?: Tone | "kurram";
  className?: string;
}) {
  const Icon = iconFor(label);
  return (
    <div className={cn("kpi-tile panel border-l-[3px] px-4 py-4", TONE_RULE[tone], className)}>
      <div className="flex items-center justify-between gap-2 text-xs text-ink-muted">
        <span>{label}</span>
        <Icon className="size-4 shrink-0" strokeWidth={1.6} />
      </div>
      <div className="mb-1 mt-2 text-[32px] font-bold leading-tight tabular-nums text-ink">
        {value}
      </div>
      <div className="text-xs text-ink">{sub}</div>
      {freshness && (
        <div className="mt-1.5 border-t border-line pt-1.5 text-2xs text-ink-muted">
          {freshness}
        </div>
      )}
    </div>
  );
}
