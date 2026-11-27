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

/** White panel, 3px top rule, label with a tinted icon chip, 32px value, sub-line, optional freshness. */
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
      className={cn(
        "kpi-tile panel relative overflow-hidden px-4 pb-4 pt-[18px]",
        "before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:content-['']",
        accent.rule,
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 text-xs text-ink-muted">
        <span>{label}</span>
        <span
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-full",
            accent.chip,
          )}
          aria-hidden
        >
          <Icon className="size-[15px]" strokeWidth={1.9} />
        </span>
      </div>
      <div className="mb-1 mt-1.5 text-[32px] font-bold leading-tight tabular-nums text-ink">
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
