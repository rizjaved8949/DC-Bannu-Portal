import { Link } from "@tanstack/react-router";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { hhmm, isReported, STATUS_LABEL, TEHSILS, type Facility } from "@/data/mock";
import { useApp } from "@/lib/app-state";
import { ChannelIcon } from "../channel";
import { Code } from "../section";
import { StatusBadge, StatusGlyph, StatusLegend, STATUS_TONE, TONE_TINT_VAR } from "../status";

function Cell({ f }: { f: Facility }) {
  const { statusFor, reportFor } = useApp();
  const status = statusFor(f.id);
  const r = reportFor(f.id);
  const detail = f.kind === "school" ? "/schools/$id" : "/health/$id";
  return (
    <Tooltip delayDuration={120}>
      <TooltipTrigger asChild>
        <Link
          to={detail}
          params={{ id: f.id }}
          aria-label={`${f.name}, ${STATUS_LABEL[status]}`}
          className="reporting-cell flex size-7 items-center justify-center rounded-sm border border-line hover:border-ink-muted"
          style={{ backgroundColor: TONE_TINT_VAR[STATUS_TONE[status]] }}
        >
          <StatusGlyph status={status} size={13} />
        </Link>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="w-64 rounded-lg border border-line bg-surface p-3 text-ink shadow-pop"
      >
        <div className="text-sm font-semibold leading-snug">{f.name}</div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-ink-muted">
          <Code className="text-xs">{f.code}</Code>
          <span>{f.tehsil}</span>
        </div>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
          <dt className="text-ink-muted">Channel</dt>
          <dd className="flex items-center gap-1.5">
            <ChannelIcon channel={r?.channel ?? f.channel} className="size-3.5" />
            {(r?.channel ?? f.channel) === "sms" ? "SMS" : "App"}
          </dd>
          <dt className="text-ink-muted">Last received</dt>
          <dd className="tabular-nums">{r?.receivedAt != null ? hhmm(r.receivedAt) : "Not yet"}</dd>
          <dt className="text-ink-muted">Status</dt>
          <dd>
            <StatusBadge status={status} />
          </dd>
        </dl>
      </TooltipContent>
    </Tooltip>
  );
}

/** Today's reporting board: one 22px cell per facility, one column per tehsil. */
export function ReportingBoard({ facilities }: { facilities: Facility[] }) {
  const { statusFor } = useApp();
  const tehsils = TEHSILS.filter((t) => facilities.some((f) => f.tehsil === t));
  return (
    <TooltipProvider>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {tehsils.map((t) => {
          const list = facilities.filter((f) => f.tehsil === t);
          const schools = list.filter((f) => f.kind === "school");
          const health = list.filter((f) => f.kind === "health");
          const reported = list.filter((f) => isReported(statusFor(f.id))).length;
          return (
            <div
              key={t}
              className="tehsil-column min-w-0 rounded-sm border border-line bg-subtle px-2.5 pb-3 pt-2.5"
            >
              <div className="border-b border-line pb-2.5">
                <div className="text-sm font-semibold text-ink">{t}</div>
                <div className="text-xs tabular-nums text-ink-muted">
                  {reported} of {list.length} reported
                </div>
              </div>
              <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-line" aria-hidden>
                <div
                  className="h-full bg-dept"
                  style={{ width: `${(reported / list.length) * 100}%` }}
                />
              </div>
              {schools.length > 0 && (
                <div className="mt-2">
                  <div className="mb-1 text-2xs text-ink-muted">Schools</div>
                  <div className="flex flex-wrap gap-1">
                    {schools.map((f) => (
                      <Cell key={f.id} f={f} />
                    ))}
                  </div>
                </div>
              )}
              {health.length > 0 && (
                <div className="mt-2.5">
                  <div className="mb-1 text-2xs text-ink-muted">Health</div>
                  <div className="flex flex-wrap gap-1">
                    {health.map((f) => (
                      <Cell key={f.id} f={f} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {facilities.length === 0 && (
        <p className="py-8 text-center text-ink-muted">
          No facilities match these filters. Clear the department or tehsil filter.
        </p>
      )}
      <StatusLegend className="mt-4 border-t border-line pt-3" />
    </TooltipProvider>
  );
}
