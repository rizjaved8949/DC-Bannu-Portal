import { Link } from "@tanstack/react-router";
import { AlertTriangle, Check, Clock, ChevronLeft } from "lucide-react";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ageLabel,
  formatDate,
  formatShortDate,
  hhmm,
  INFRA_KEYS,
  INFRA_LABELS,
  isStale,
  STATUS_LABEL,
  submissionHistory,
  weekday,
  type Facility,
  type InfraFlag,
  type Report,
} from "@/data/mock";
import { cn } from "@/lib/utils";
import { useApp } from "@/lib/app-state";
import { ChannelLabel } from "./channel";
import { Code } from "./section";
import { Pill, StatusBadge, StatusGlyph, type Tone } from "./status";

/** Observed, sent, received, verified: four separate times, "Not yet" when missing. */
export function TimestampStrip({
  report,
  status,
}: {
  report: Report | undefined;
  status: Report["status"];
}) {
  const steps: { label: string; at: number | null | undefined; hint: string }[] = [
    {
      label: "Observed",
      at: report?.observedAt,
      hint: "When attendance was marked at the facility",
    },
    { label: "Sent", at: report?.sentAt, hint: "When the phone sent the report" },
    { label: "Received", at: report?.receivedAt, hint: "When the district server accepted it" },
    { label: "Verified", at: report?.verifiedAt, hint: "When an officer checked it" },
  ];
  return (
    <div className="panel grid grid-cols-2 divide-line sm:grid-cols-5 sm:divide-x">
      {steps.map((s) => (
        <div key={s.label} className="px-4 py-2.5" title={s.hint}>
          <div className="text-xs text-ink-muted">{s.label}</div>
          <div
            className={cn(
              "text-md font-semibold tabular-nums",
              s.at == null ? "text-ink-muted" : "text-ink",
            )}
          >
            {hhmm(s.at)}
          </div>
        </div>
      ))}
      <div className="col-span-2 flex items-center px-4 py-2.5 sm:col-span-1">
        <StatusBadge status={status} />
      </div>
    </div>
  );
}

/** Name, code, tehsil, channel, roster version, head. */
export function FacilityHeaderMeta({ f, report }: { f: Facility; report: Report | undefined }) {
  return (
    <dl className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-ink-muted">
      <div className="flex items-center gap-1.5">
        <dt className="sr-only">Code</dt>
        <dd>
          <Code className="text-sm">{f.code}</Code>
        </dd>
      </div>
      <div className="flex items-center gap-1.5">
        <dt>Tehsil</dt>
        <dd className="text-ink">{f.tehsil}</dd>
      </div>
      <div className="flex items-center gap-1.5">
        <dt>Channel</dt>
        <dd className="text-ink">
          <ChannelLabel channel={report?.channel ?? f.channel} />
        </dd>
      </div>
      <div className="flex items-center gap-1.5">
        <dt>Roster</dt>
        <dd>
          <Code className="text-sm">{f.rosterVersion}</Code>
        </dd>
      </div>
      {report && (
        <div className="flex items-center gap-1.5">
          <dt>Report</dt>
          <dd>
            <Code className="text-sm">{report.id}</Code>
          </dd>
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <dt>{f.kind === "school" ? "Head" : "In charge"}</dt>
        <dd className="text-ink">{f.headName}</dd>
      </div>
    </dl>
  );
}

/** Last 14 days of submissions as a row of glyphs, today ringed in wheat. */
export function SubmissionHistoryRow({ facilityId }: { facilityId: string }) {
  const { statusFor } = useApp();
  const rows = submissionHistory(facilityId).map((r, index, all) =>
    index === all.length - 1 ? { ...r, status: statusFor(facilityId) } : r,
  );
  return (
    <TooltipProvider>
      <ol className="flex flex-wrap gap-1.5" aria-label="Last 14 days of submissions">
        {rows.map((r, i) => {
          const isToday = i === rows.length - 1;
          const wd = weekday(r.date);
          const closed = r.status === "draft" && (wd === 0 || wd === 6);
          return (
            <li key={r.date}>
              <Tooltip delayDuration={100}>
                <TooltipTrigger asChild>
                  <span
                    tabIndex={0}
                    className={cn(
                      "flex size-7 flex-col items-center justify-center rounded-sm border border-line bg-surface",
                      isToday && "ring-2 ring-wheat ring-offset-1",
                    )}
                    aria-label={`${formatShortDate(r.date)}: ${closed ? "School closed" : STATUS_LABEL[r.status]}`}
                  >
                    {closed ? (
                      <span className="text-2xs text-ink-muted">—</span>
                    ) : (
                      <StatusGlyph status={r.status} size={13} />
                    )}
                  </span>
                </TooltipTrigger>
                <TooltipContent className="rounded-md border border-line bg-surface px-2 py-1 text-xs text-ink shadow-pop">
                  {formatDate(r.date, true)}: {closed ? "Closed (weekend)" : STATUS_LABEL[r.status]}
                </TooltipContent>
              </Tooltip>
              <span className="mt-0.5 block text-center text-[10px] tabular-nums text-ink-muted">
                {r.date.slice(8)}
              </span>
            </li>
          );
        })}
      </ol>
    </TooltipProvider>
  );
}

export function infraTone(flag: InfraFlag): {
  tone: Tone;
  word: "OK" | "Problem" | "Stale";
  icon: React.ReactNode;
} {
  if (isStale(flag.updated)) return { tone: "pending", word: "Stale", icon: <Clock /> };
  if (!flag.ok) return { tone: "problem", word: "Problem", icon: <AlertTriangle /> };
  return { tone: "verified", word: "OK", icon: <Check /> };
}

export function InfraPill({ flag }: { flag: InfraFlag }) {
  const t = infraTone(flag);
  return (
    <Pill tone={t.tone} icon={t.icon}>
      {t.word}
    </Pill>
  );
}

/** Facility checklist with last-updated dates and stale marking. */
export function InfraChecklist({ f }: { f: Facility }) {
  const rows = [
    ...INFRA_KEYS.map((k) => ({ label: INFRA_LABELS[k], flag: f.infra[k] })),
    { label: f.equipment.label, flag: f.equipment },
  ];
  return (
    <table className="ledger">
      <thead>
        <tr>
          <th scope="col">Item</th>
          <th scope="col">State</th>
          <th scope="col">Last updated</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.label}>
            <td data-label="Item">{r.label}</td>
            <td data-label="State">
              <InfraPill flag={r.flag} />
              {r.flag.note && <span className="ml-2 text-xs text-ink-muted">{r.flag.note}</span>}
            </td>
            <td
              data-label="Last updated"
              className={cn("text-xs", isStale(r.flag.updated) ? "text-pending" : "text-ink-muted")}
            >
              {formatDate(r.flag.updated)}, {ageLabel(r.flag.updated)}
              {isStale(r.flag.updated) && " · older than 3 days"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function BackLink({
  to,
  label,
}: {
  to: "/schools" | "/health" | "/staff" | "/inbox" | "/review";
  label: string;
}) {
  return (
    <Link
      to={to}
      search={{}}
      resetScroll={false}
      className="record-back-link inline-flex items-center gap-1.5 text-sm text-dept hover:underline"
    >
      <ChevronLeft className="size-4" aria-hidden />
      {label}
    </Link>
  );
}

export function NotFoundPanel({
  what,
  back,
  backLabel,
}: {
  what: string;
  back: "/schools" | "/health" | "/staff";
  backLabel: string;
}) {
  return (
    <div className="panel px-6 py-10 text-center">
      <p className="font-semibold text-ink">No {what} with this code.</p>
      <p className="mt-1 text-sm text-ink-muted">Check the code, or choose one from the list.</p>
      <div className="mt-3">
        <BackLink to={back} label={backLabel} />
      </div>
    </div>
  );
}
