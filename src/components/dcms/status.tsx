import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { STATUS_LABEL, type ReportStatus } from "@/data/mock";

export type Tone = "verified" | "sent" | "pending" | "problem" | "neutral";

export const STATUS_TONE: Record<ReportStatus, Tone> = {
  verified: "verified",
  pending: "pending",
  received: "sent",
  sent: "sent",
  draft: "neutral",
  rejected: "problem",
  none: "problem",
};

export const TONE_TEXT: Record<Tone, string> = {
  verified: "text-verified",
  sent: "text-sent",
  pending: "text-pending",
  problem: "text-problem",
  neutral: "text-neutral",
};
export const TONE_PILL: Record<Tone, string> = {
  verified: "bg-verified-tint text-verified",
  sent: "bg-sent-tint text-sent",
  pending: "bg-pending-tint text-pending",
  problem: "bg-problem-tint text-problem",
  neutral: "bg-neutral-tint text-neutral",
};
export const TONE_RULE: Record<Tone | "kurram", string> = {
  verified: "border-l-verified",
  sent: "border-l-sent",
  pending: "border-l-pending",
  problem: "border-l-problem",
  neutral: "border-l-neutral",
  kurram: "border-l-dept",
};
/** CSS colour values for charts and map markers. */
export const TONE_VAR: Record<Tone, string> = {
  verified: "var(--status-verified-fg)",
  sent: "var(--status-sent-fg)",
  pending: "var(--status-pending-fg)",
  problem: "var(--status-problem-fg)",
  neutral: "var(--status-neutral-fg)",
};
export const TONE_TINT_VAR: Record<Tone, string> = {
  verified: "var(--status-verified-bg)",
  sent: "var(--status-sent-bg)",
  pending: "var(--status-pending-bg)",
  problem: "var(--status-problem-bg)",
  neutral: "var(--status-neutral-bg)",
};

/**
 * Report status glyph: a circle that fills as the report advances.
 * Draft empty ring, Sent quarter, Received half, Pending three-quarters,
 * Verified full with check, Rejected ring with cross, No report dashed ring.
 */
export function StatusGlyph({
  status,
  size = 14,
  className,
}: {
  status: ReportStatus;
  size?: number;
  className?: string;
}) {
  const tone = STATUS_TONE[status];
  const c = TONE_VAR[tone];
  const label = STATUS_LABEL[status];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      role="img"
      aria-label={label}
      className={cn("shrink-0", className)}
    >
      <title>{label}</title>
      {status === "none" ? (
        <circle
          cx="7"
          cy="7"
          r="5.75"
          fill="none"
          stroke={c}
          strokeWidth="1.5"
          strokeDasharray="2.2 1.8"
        />
      ) : status === "verified" ? (
        <>
          <circle cx="7" cy="7" r="6.5" fill={c} />
          <path
            d="M4.2 7.2 6.1 9 9.9 5.2"
            fill="none"
            stroke="white"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      ) : (
        <>
          <circle cx="7" cy="7" r="5.75" fill="white" stroke={c} strokeWidth="1.5" />
          {status === "sent" && <path d="M7 7 L7 1.25 A5.75 5.75 0 0 1 12.75 7 Z" fill={c} />}
          {status === "received" && <path d="M7 7 L7 1.25 A5.75 5.75 0 0 1 7 12.75 Z" fill={c} />}
          {status === "pending" && <path d="M7 7 L7 1.25 A5.75 5.75 0 1 1 1.25 7 Z" fill={c} />}
          {status === "rejected" && (
            <path
              d="M4.8 4.8 9.2 9.2 M9.2 4.8 4.8 9.2"
              stroke={c}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          )}
        </>
      )}
    </svg>
  );
}

/** Glyph + word + tint. Use everywhere a report status appears. */
export function StatusBadge({
  status,
  className,
  short,
}: {
  status: ReportStatus;
  className?: string;
  short?: boolean;
}) {
  const tone = STATUS_TONE[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm px-2 py-0.5 text-xs font-semibold",
        TONE_PILL[tone],
        className,
      )}
    >
      <StatusGlyph status={status} size={12} />
      {short && status === "pending" ? "Pending" : STATUS_LABEL[status]}
    </span>
  );
}

/** Generic tinted pill (staff statuses, OK/Problem/Stale, severities). */
export function Pill({
  tone,
  icon,
  children,
  className,
}: {
  tone: Tone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm px-2 py-0.5 text-xs font-semibold [&_svg]:size-3.5",
        TONE_PILL[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

export const STAFF_STATUS_TONE: Record<string, Tone> = {
  Present: "verified",
  Late: "pending",
  Absent: "problem",
  "Approved leave": "sent",
  Leave: "sent",
  "Official duty": "neutral",
  Replacement: "sent",
  "On-call": "neutral",
  "Off-duty": "neutral",
  "Not reported": "neutral",
  Scheduled: "neutral",
};

export const SEVERITY_TONE: Record<string, Tone> = {
  Critical: "problem",
  High: "pending",
  Medium: "sent",
  Low: "neutral",
};

export const LEGEND_ORDER: ReportStatus[] = [
  "draft",
  "sent",
  "received",
  "pending",
  "verified",
  "rejected",
  "none",
];

export function StatusLegend({ className }: { className?: string }) {
  return (
    <ul
      className={cn("flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-ink-muted", className)}
      aria-label="Report status legend"
    >
      {LEGEND_ORDER.map((s) => (
        <li key={s} className="inline-flex items-center gap-1.5">
          <StatusGlyph status={s} size={13} />
          {STATUS_LABEL[s]}
        </li>
      ))}
    </ul>
  );
}
