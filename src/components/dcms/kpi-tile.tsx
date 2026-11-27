import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Tone } from "./status";
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

/**
 * Rule and icon-chip colours per tone. "neutral" and "kurram" carry no good/bad judgement,
 * so they take the page's section accent (indigo on schools, teal on health, green elsewhere).
 */
const TONE_ACCENT: Record<Tone | "kurram", { rule: string; chip: string }> = {
  verified: { rule: "before:bg-verified", chip: "bg-verified-tint text-verified" },
  sent: { rule: "before:bg-sent", chip: "bg-sent-tint text-sent" },
  pending: { rule: "before:bg-pending", chip: "bg-pending-tint text-pending" },
  problem: { rule: "before:bg-problem", chip: "bg-problem-tint text-problem" },
  neutral: { rule: "before:bg-dept", chip: "bg-dept-tint text-dept" },
  kurram: { rule: "before:bg-dept", chip: "bg-dept-tint text-dept" },
};

/** Flat metric card with a status accent, icon badge, value and provenance. */
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
  const accent = TONE_ACCENT[tone];
  return (
    <div
      data-tone={tone}
      className={cn(
        "kpi-tile panel relative overflow-hidden p-5",
        "before:absolute before:bottom-5 before:left-0 before:top-5 before:w-[3px] before:rounded-r-full before:content-['']",
        accent.rule,
        className,
      )}
    >
      <div className="kpi-label flex items-center justify-between gap-2 text-xs font-semibold text-ink-muted">
        <span>{label}</span>
        <span
          className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", accent.chip)}
          aria-hidden
        >
          <Icon className="size-[15px]" strokeWidth={1.9} />
        </span>
      </div>
      <div className="kpi-value mb-1 mt-3 text-[36px] font-bold leading-tight tracking-tight tabular-nums text-ink">
        {value}
      </div>
      <div className="kpi-sub text-xs text-ink">{sub}</div>
      {freshness && (
        <div className="kpi-freshness mt-4 border-t border-line pt-3 text-2xs text-ink-muted">
          {freshness}
        </div>
      )}
    </div>
  );
}
