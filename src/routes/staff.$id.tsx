import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { BackLink, NotFoundPanel } from "@/components/dcms/facility-bits";
import { KpiTile } from "@/components/dcms/kpi-tile";
import { PageHeader } from "@/components/dcms/page-header";
import { Code, Panel } from "@/components/dcms/section";
import { Segmented } from "@/components/dcms/segmented";
import {
  Pill,
  STAFF_STATUS_TONE,
  TONE_TINT_VAR,
  TONE_VAR,
  type Tone,
} from "@/components/dcms/status";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  addDays,
  biometricLogs,
  doctorProfiles,
  facilityById,
  formatDate,
  hhmm,
  staffById,
  staffHistory,
  TODAY,
  todayStatus,
  treatmentLogsByDoctor,
  type DayMark,
} from "@/data/mock";
import { pct, formatPkr } from "@/lib/metrics";
import { cn } from "@/lib/utils";
import { inRoleScope, useApp } from "@/lib/app-state";
import { CalendarDays, Download, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadCsv } from "@/lib/csv";

export const Route = createFileRoute("/staff/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `${staffById[params.id]?.name ?? "Employee record"} · NWD Connect` },
      {
        name: "description",
        content:
          "Attendance record for one staff member, marked by the facility administrator and approved by the supervisor.",
      },
      {
        property: "og:title",
        content: `${staffById[params.id]?.name ?? "Employee record"} · NWD Connect`,
      },
      { property: "og:description", content: "Attendance record for one staff member." },
    ],
  }),
  component: StaffDetailPage,
});

type Period = "thisWeek" | "lastWeek" | "thisMonth" | "lastMonth" | "last30";
const PERIODS: { value: Period; label: string; from: string; to: string }[] = [
  { value: "thisWeek", label: "This week", from: "2026-11-23", to: TODAY },
  { value: "lastWeek", label: "Last week", from: "2026-11-16", to: "2026-11-22" },
  { value: "thisMonth", label: "This month", from: "2026-11-01", to: TODAY },
  { value: "lastMonth", label: "Last month", from: "2026-10-01", to: "2026-10-31" },
  { value: "last30", label: "Last 30 days", from: addDays(TODAY, -29), to: TODAY },
];

const MARK_TONE: Record<DayMark, Tone | "off"> = {
  Present: "verified",
  Late: "pending",
  Absent: "problem",
  "Approved leave": "sent",
  "Official duty": "neutral",
  Off: "off",
  Holiday: "off",
  "Not reported": "neutral",
};

function StaffDetailPage() {
  const { id } = Route.useParams();
  const s = staffById[id];
  const { role, statusFor, staffStatusFor } = useApp();
  const [period, setPeriod] = useState<Period>("thisMonth");
  if (!s || !facilityById[s.facilityId] || !inRoleScope(role, facilityById[s.facilityId]!))
    return (
      <NotFoundPanel what="staff member in your scope" back="/staff" backLabel="Staff directory" />
    );
  const f = facilityById[s.facilityId]!;
  const today = staffStatusFor(s);
  const p = PERIODS.find((x) => x.value === period)!;
  const history = staffHistory(s.id, 62, statusFor(f.id), staffStatusFor(s)).filter(
    (d) => d.date >= p.from && d.date <= p.to,
  );
  const working = history.filter(
    (d) => d.mark !== "Off" && d.mark !== "Holiday" && d.mark !== "Not reported",
  );
  const n = (m: DayMark) => working.filter((d) => d.mark === m).length;
  const attended = n("Present") + n("Late");
  const todayIncluded = p.to === TODAY;

  return (
    <div className="space-y-5">
      <div>
        <BackLink to="/staff" label="Staff directory" />
        <PageHeader
          title={s.name}
          description={`${s.designation}, BPS-${s.bps}, ${s.employment.toLowerCase()}. Posted at ${f.name}, ${f.tehsil}.`}
        >
          <div className="panel mt-5 flex flex-wrap items-center gap-4 px-5 py-5">
            <span
              aria-hidden
              className="flex size-14 items-center justify-center rounded-full bg-dept text-lg font-bold text-topbar-foreground"
            >
              {s.initials}
            </span>
            <dl className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-ink-muted">
              <div className="flex items-center gap-1.5">
                <dt>Personal no.</dt>
                <dd>
                  <Code className="text-sm">{s.personalNoMasked}</Code>
                </dd>
              </div>
              <div className="flex items-center gap-1.5">
                <dt>Posting</dt>
                <dd>
                  <Link
                    to={f.kind === "school" ? "/schools/$id" : "/health/$id"}
                    params={{ id: f.id }}
                    className="text-dept hover:underline"
                  >
                    {f.name}
                  </Link>
                </dd>
              </div>
              <div className="flex items-center gap-1.5">
                <dt>On roster since</dt>
                <dd className="text-ink">{formatDate(s.onRosterSince)}</dd>
              </div>
              {f.kind === "health" && (
                <div className="flex items-center gap-1.5">
                  <dt>Shift eligibility</dt>
                  <dd className="text-ink">
                    {(s.shiftEligibility as string[])
                      .map((k) => ({ M: "Morning", E: "Evening", N: "Night" })[k] ?? k)
                      .join(", ")}
                  </dd>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <dt>Today</dt>
                <dd>
                  <Pill tone={STAFF_STATUS_TONE[today] ?? "neutral"}>{today}</Pill>
                </dd>
              </div>
            </dl>
          </div>
        </PageHeader>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label="Period"
          value={period}
          onChange={setPeriod}
          options={PERIODS.map((x) => ({ value: x.value, label: x.label }))}
        />
        <p className="inline-flex items-center gap-2 text-xs text-ink-muted">
          <CalendarDays className="size-4 shrink-0" />
          Showing {formatDate(p.from, true)} to {formatDate(p.to, true)}.{" "}
          {f.kind === "school"
            ? "Working days are Monday to Friday."
            : "Hospital rosters run seven days a week."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <KpiTile
          label="Attendance"
          value={working.length ? `${pct(attended, working.length)}%` : "—"}
          sub={`${attended} of ${working.length} reported working days`}
          tone="verified"
          freshness={
            todayIncluded
              ? today === "Not reported"
                ? "Today's mark not received yet"
                : "Includes today's mark"
              : "Period closed"
          }
        />
        <KpiTile
          label="Present"
          value={n("Present") + n("Late")}
          sub={`${n("Late")} marked late`}
          tone="verified"
          freshness="Marked by the facility administrator"
        />
        <KpiTile
          label="Absent"
          value={n("Absent")}
          sub="days marked absent by the administrator"
          tone={n("Absent") ? "problem" : "neutral"}
          freshness="Without leave or duty"
        />
        <KpiTile
          label="Approved leave"
          value={n("Approved leave")}
          sub="days approved by the supervisor"
          tone="sent"
          freshness="Casual, medical or earned leave"
        />
        <KpiTile
          label="Official duty"
          value={n("Official duty")}
          sub="training, meetings, polio or exam duty"
          tone="neutral"
          freshness="Recorded with an order reference"
        />
      </div>

      <Panel title="Day by day" aside="One square per day" bodyClassName="px-4 py-3">
        <TooltipProvider>
          <ol className="flex flex-wrap gap-1.5" aria-label="Attendance by day">
            {history.map((d) => {
              const tone = MARK_TONE[d.mark];
              const isToday = d.date === TODAY;
              return (
                <li key={d.date}>
                  <Tooltip delayDuration={80}>
                    <TooltipTrigger asChild>
                      <span
                        tabIndex={0}
                        aria-label={`${formatDate(d.date, true)}: ${d.mark}`}
                        className={cn(
                          "flex size-9 items-center justify-center rounded-sm border text-xs font-semibold tabular-nums",
                          isToday && "ring-2 ring-wheat ring-offset-1",
                        )}
                        style={
                          tone === "off"
                            ? {
                                background: "var(--subtle)",
                                borderColor: "var(--line)",
                                color: "var(--ink-muted)",
                              }
                            : {
                                background: TONE_TINT_VAR[tone],
                                borderColor: TONE_VAR[tone],
                                color: TONE_VAR[tone],
                              }
                        }
                      >
                        {Number(d.date.slice(8))}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="rounded-md border border-line bg-surface px-2 py-1 text-xs text-ink shadow-pop">
                      {formatDate(d.date, true)}: {d.mark === "Off" ? "Off day" : d.mark}
                    </TooltipContent>
                  </Tooltip>
                </li>
              );
            })}
          </ol>
        </TooltipProvider>
        <ul
          className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-3 text-xs text-ink-muted"
          aria-label="Legend"
        >
          {(
            [
              "Present",
              "Late",
              "Absent",
              "Approved leave",
              "Official duty",
              "Off",
              "Not reported",
            ] as DayMark[]
          ).map((m) => {
            const tone = MARK_TONE[m];
            return (
              <li key={m} className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="inline-block size-3 rounded-[2px] border"
                  style={
                    tone === "off"
                      ? { background: "var(--subtle)", borderColor: "var(--line)" }
                      : { background: TONE_TINT_VAR[tone], borderColor: TONE_VAR[tone] }
                  }
                />
                {m === "Off" ? "Off day" : m}
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel
        title="Attendance register"
        aside={
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              downloadCsv(
                `nwd-connect-${s.code}-${period}.csv`,
                history.map((d) => ({
                  Date: d.date,
                  Employee: s.name,
                  Code: s.code,
                  Posting: f.name,
                  Status: d.mark,
                })),
              )
            }
          >
            <Download />
            Export record
          </Button>
        }
      >
        <div className="max-h-[420px] overflow-auto">
          <table className="ledger">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Attendance</th>
                <th scope="col">Recorded through</th>
                <th scope="col">Record type</th>
              </tr>
            </thead>
            <tbody>
              {[...history].reverse().map((d) => (
                <tr key={d.date}>
                  <td data-label="Date" className="font-semibold">
                    {formatDate(d.date, true)}
                    {d.date === TODAY && (
                      <span className="ml-2 rounded-sm bg-dept-tint px-1.5 py-0.5 text-xs text-dept">
                        Today
                      </span>
                    )}
                  </td>
                  <td data-label="Attendance">
                    <Pill
                      tone={MARK_TONE[d.mark] === "off" ? "neutral" : (MARK_TONE[d.mark] as Tone)}
                    >
                      {d.mark === "Off" ? "Off day" : d.mark}
                    </Pill>
                  </td>
                  <td data-label="Recorded through" className="text-ink-muted">
                    {d.mark === "Off" || d.mark === "Holiday"
                      ? "Scheduled non-working day"
                      : "Facility administrator"}
                  </td>
                  <td data-label="Record type" className="text-ink-muted">
                    Daily attendance mark
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* ── Biometric record ── */}
      {(() => {
        const bio = biometricLogs.find((l) => l.staffId === s.id);
        if (!bio) return null;
        return (
          <Panel title="Today's biometric record" aside={bio.method}>
            <div className="grid grid-cols-2 gap-3 px-4 py-3 sm:grid-cols-4">
              <div>
                <div className="text-2xs text-ink-muted">Check-in</div>
                <div className="text-sm font-bold tabular-nums">{hhmm(bio.checkIn)}</div>
              </div>
              <div>
                <div className="text-2xs text-ink-muted">Check-out</div>
                <div className="text-sm font-bold tabular-nums">
                  {bio.checkOut ? hhmm(bio.checkOut) : "Still on site"}
                </div>
              </div>
              <div>
                <div className="text-2xs text-ink-muted">Method</div>
                <div className="text-sm font-semibold">{bio.method}</div>
              </div>
              <div>
                <div className="text-2xs text-ink-muted">Punctuality</div>
                <Pill
                  tone={
                    bio.status === "On time"
                      ? "verified"
                      : bio.status === "Late"
                        ? "pending"
                        : "problem"
                  }
                >
                  {bio.status}
                </Pill>
              </div>
            </div>
          </Panel>
        );
      })()}

      {/* ── Doctor profile (if medical officer) ── */}
      {(() => {
        const doc = doctorProfiles.find((d) => d.staffId === s.id);
        if (!doc) return null;
        const logs = treatmentLogsByDoctor[s.id] ?? [];
        const totalBilled = logs.reduce((a, l) => a + l.billingPkr, 0);
        const waivedCount = logs.filter((l) => l.waived).length;
        return (
          <>
            <Panel title="Doctor profile" aside={doc.qualification}>
              <div className="grid grid-cols-2 gap-3 px-4 py-3 sm:grid-cols-3 lg:grid-cols-6">
                <div>
                  <div className="text-2xs text-ink-muted">Qualification</div>
                  <div className="text-sm font-semibold">{doc.qualification}</div>
                </div>
                <div>
                  <div className="text-2xs text-ink-muted">Specialisation</div>
                  <div className="text-sm font-semibold">{doc.specialisation}</div>
                </div>
                <div>
                  <div className="text-2xs text-ink-muted">Department</div>
                  <div className="text-sm font-semibold">{doc.department}</div>
                </div>
                <div>
                  <div className="text-2xs text-ink-muted">Years of service</div>
                  <div className="text-sm font-bold tabular-nums">{doc.yearsOfService}</div>
                </div>
                <div>
                  <div className="text-2xs text-ink-muted">Patients today</div>
                  <div className="text-sm font-bold tabular-nums">{doc.patientsSeenToday}</div>
                </div>
                <div>
                  <div className="text-2xs text-ink-muted">This month</div>
                  <div className="text-sm font-bold tabular-nums">{doc.patientsThisMonth}</div>
                </div>
              </div>
            </Panel>
            {logs.length > 0 && (
              <Panel
                title="Today's treatment log"
                aside={`${logs.length} patients · ₨${formatPkr(totalBilled)} billed · ${waivedCount} waived`}
              >
                <div className="max-h-[400px] overflow-auto">
                  <table className="ledger">
                    <thead>
                      <tr>
                        <th scope="col">Time</th>
                        <th scope="col">Patient</th>
                        <th scope="col" className="num">
                          Age
                        </th>
                        <th scope="col">Complaint</th>
                        <th scope="col">Diagnosis</th>
                        <th scope="col">Treatment</th>
                        <th scope="col">Outcome</th>
                        <th scope="col" className="num">
                          Billing
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((t) => (
                        <tr key={t.id}>
                          <td data-label="Time" className="num whitespace-nowrap">
                            {hhmm(t.timeMin)}
                          </td>
                          <td data-label="Patient" className="font-semibold">
                            {t.patientName}
                          </td>
                          <td data-label="Age" className="num">
                            {t.age}
                          </td>
                          <td data-label="Complaint" className="max-w-[140px] text-xs">
                            {t.complaint}
                          </td>
                          <td data-label="Diagnosis" className="max-w-[140px] text-xs">
                            {t.diagnosis}
                          </td>
                          <td data-label="Treatment" className="max-w-[140px] text-xs">
                            {t.treatment}
                          </td>
                          <td data-label="Outcome">
                            <Pill
                              tone={
                                t.outcome === "Discharged"
                                  ? "verified"
                                  : t.outcome === "Follow-up advised"
                                    ? "sent"
                                    : t.outcome === "Referred"
                                      ? "pending"
                                      : "neutral"
                              }
                            >
                              {t.outcome}
                            </Pill>
                          </td>
                          <td data-label="Billing" className="num">
                            {t.waived ? (
                              <span className="text-ink-muted">Waived</span>
                            ) : (
                              <span className="font-semibold">₨{t.billingPkr}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
            )}
          </>
        );
      })()}

      <p className="inline-flex items-center gap-2 text-xs text-ink-muted">
        <ShieldCheck className="size-4 shrink-0 text-dept" />
        Attendance is marked by the facility administrator and approved by the supervisor. Check-in
        times come from the facility's biometric gate.
      </p>
    </div>
  );
}
