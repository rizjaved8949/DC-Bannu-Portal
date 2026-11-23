import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";

import {
  BackLink,
  FacilityHeaderMeta,
  InfraChecklist,
  NotFoundPanel,
  SubmissionHistoryRow,
  TimestampStrip,
} from "@/components/dcms/facility-bits";
import { KpiTile } from "@/components/dcms/kpi-tile";
import { PageHeader } from "@/components/dcms/page-header";
import { Code, Panel } from "@/components/dcms/section";
import { Pill, STAFF_STATUS_TONE } from "@/components/dcms/status";
import {
  facilityById,
  isAccepted,
  schoolDays,
  staffByFacility,
  type SchoolStaffStatus,
} from "@/data/mock";
import { inRoleScope, useApp } from "@/lib/app-state";
import { pct } from "@/lib/metrics";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/schools/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `${facilityById[params.id]?.name ?? "School record"} · DCMS Bannu` },
      {
        name: "description",
        content: "School day report, staff roster, class totals and facility checklist.",
      },
      {
        property: "og:title",
        content: `${facilityById[params.id]?.name ?? "School record"} · DCMS Bannu`,
      },
      {
        property: "og:description",
        content: "School day report, staff roster, class totals and facility checklist.",
      },
    ],
  }),
  component: SchoolDetailPage,
});

const STAFF_ORDER: SchoolStaffStatus[] = ["Present", "Absent", "Approved leave", "Official duty"];

function SchoolDetailPage() {
  const { id } = Route.useParams();
  const f = facilityById[id];
  const { statusFor, reportFor, role } = useApp();
  if (!f || f.kind !== "school" || !inRoleScope(role, f))
    return <NotFoundPanel what="school in your scope" back="/schools" backLabel="All schools" />;

  const st = statusFor(f.id);
  const r = reportFor(f.id);
  const accepted = isAccepted(st);
  const day = schoolDays[f.id]!;
  const staff = staffByFacility[f.id] ?? [];
  const counts = Object.fromEntries(
    STAFF_ORDER.map((s) => [s, staff.filter((x) => day.staffStatus[x.id] === s).length]),
  ) as Record<SchoolStaffStatus, number>;
  const enrolled = day.classes.reduce((a, c) => a + c.enrolledBoys + c.enrolledGirls, 0);
  const present = day.classes.reduce((a, c) => a + c.presentBoys + c.presentGirls, 0);
  const flagged = day.classes.filter(
    (c) => c.presentBoys > c.enrolledBoys || c.presentGirls > c.enrolledGirls,
  );

  return (
    <div className="space-y-5">
      <div>
        <BackLink to="/schools" label="All schools" />
        <PageHeader
          title={f.name}
          urdu="اسکول"
          description={`${f.typeLabel}, ${f.village}. ${accepted ? "Today's report is in." : "Today's report has not been accepted yet."}`}
        >
          <FacilityHeaderMeta f={f} report={r} />
        </PageHeader>
      </div>

      <TimestampStrip report={r} status={st} />

      {!accepted && (
        <div className="panel border-l-[3px] border-l-pending px-4 py-3 text-sm">
          <p className="font-semibold text-ink">No accepted report for today yet.</p>
          <p className="text-ink-muted">
            Staff and class figures below are the roster and enrolment on record, not today's
            attendance.{" "}
            {st === "none" && (
              <>
                A review task was opened at 10:00.{" "}
                <Link to="/review" className="text-kurram hover:underline">
                  Open the review queue
                </Link>
                .
              </>
            )}
            {st === "rejected" && r?.rejectionReason && <>Reason: {r.rejectionReason}.</>}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile
          label="Staff present"
          value={accepted ? counts.Present : "—"}
          sub={`of ${staff.length} on roster ${f.rosterVersion}`}
          tone="verified"
          freshness={accepted ? "From today's accepted report" : "Awaiting today's report"}
        />
        <KpiTile
          label="Approved leave"
          value={accepted ? counts["Approved leave"] : "—"}
          sub={`${accepted ? counts["Official duty"] : "—"} on official duty`}
          tone="sent"
          freshness="Approved by the supervisor"
        />
        <KpiTile
          label="Absent"
          value={accepted ? counts.Absent : "—"}
          sub="without leave or duty"
          tone={accepted && counts.Absent > 0 ? "problem" : "neutral"}
          freshness="Marked by the head teacher"
        />
        <KpiTile
          label="Students present"
          value={accepted ? `${pct(present, enrolled)}%` : "—"}
          sub={`${accepted ? present : "—"} of ${enrolled} enrolled`}
          tone={flagged.length ? "pending" : "verified"}
          freshness={
            flagged.length
              ? `${flagged.length} class ${flagged.length === 1 ? "row needs" : "rows need"} review`
              : "Totals plausible"
          }
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Staff roster" aside={`${staff.length} staff, roster ${f.rosterVersion}`}>
          <div className="overflow-x-auto">
            <table className="ledger">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Code</th>
                  <th scope="col">Designation</th>
                  <th scope="col" className="num">
                    BPS
                  </th>
                  <th scope="col">Today</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((s) => {
                  const status = accepted
                    ? (day.staffStatus[s.id] ?? "Not reported")
                    : "Not reported";
                  return (
                    <tr key={s.id}>
                      <td data-label="Name">
                        <Link
                          to="/staff/$id"
                          params={{ id: s.id }}
                          className="font-semibold text-ink hover:text-kurram hover:underline"
                        >
                          {s.name}
                        </Link>
                        <span className="block text-xs text-ink-muted">{s.employment}</span>
                      </td>
                      <td data-label="Code">
                        <Code>{s.code}</Code>
                      </td>
                      <td data-label="Designation">{s.designation}</td>
                      <td data-label="BPS" className="num">
                        {s.bps}
                      </td>
                      <td data-label="Today">
                        <Pill tone={STAFF_STATUS_TONE[status] ?? "neutral"}>{status}</Pill>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel
            title="Class-wise attendance"
            aside={accepted ? "Today's figures" : "Enrolment on record"}
          >
            <div className="overflow-x-auto">
              <table className="ledger">
                <thead>
                  <tr>
                    <th scope="col">Class</th>
                    <th scope="col" className="num">
                      Enrolled boys
                    </th>
                    <th scope="col" className="num">
                      Enrolled girls
                    </th>
                    <th scope="col" className="num">
                      Present boys
                    </th>
                    <th scope="col" className="num">
                      Present girls
                    </th>
                    <th scope="col" className="num">
                      %
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {day.classes.map((c) => {
                    const bad = c.presentBoys > c.enrolledBoys || c.presentGirls > c.enrolledGirls;
                    const e = c.enrolledBoys + c.enrolledGirls;
                    const p = c.presentBoys + c.presentGirls;
                    return (
                      <tr
                        key={c.className}
                        className={cn(bad && "bg-problem-tint/60 hover:bg-problem-tint")}
                      >
                        <td data-label="Class">
                          <span className="inline-flex items-center gap-1.5">
                            {bad && (
                              <AlertTriangle
                                className="size-3.5 text-problem"
                                aria-label="Present exceeds enrolled"
                              />
                            )}
                            {c.className}
                          </span>
                        </td>
                        <td data-label="Enrolled boys" className="num">
                          {c.enrolledBoys}
                        </td>
                        <td data-label="Enrolled girls" className="num">
                          {c.enrolledGirls}
                        </td>
                        <td
                          data-label="Present boys"
                          className={cn(
                            "num",
                            c.presentBoys > c.enrolledBoys && "font-semibold text-problem",
                          )}
                        >
                          {accepted ? c.presentBoys : "—"}
                        </td>
                        <td
                          data-label="Present girls"
                          className={cn(
                            "num",
                            c.presentGirls > c.enrolledGirls && "font-semibold text-problem",
                          )}
                        >
                          {accepted ? c.presentGirls : "—"}
                        </td>
                        <td data-label="%" className="num">
                          {accepted && e > 0 ? `${pct(p, e, 0)}%` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="font-semibold">
                    <td data-label="Class">Total</td>
                    <td data-label="Enrolled boys" className="num">
                      {day.classes.reduce((a, c) => a + c.enrolledBoys, 0)}
                    </td>
                    <td data-label="Enrolled girls" className="num">
                      {day.classes.reduce((a, c) => a + c.enrolledGirls, 0)}
                    </td>
                    <td data-label="Present boys" className="num">
                      {accepted ? day.classes.reduce((a, c) => a + c.presentBoys, 0) : "—"}
                    </td>
                    <td data-label="Present girls" className="num">
                      {accepted ? day.classes.reduce((a, c) => a + c.presentGirls, 0) : "—"}
                    </td>
                    <td data-label="%" className="num">
                      {accepted ? `${pct(present, enrolled)}%` : "—"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            {flagged.length > 0 && accepted && (
              <p className="border-t border-line px-4 py-2 text-xs text-problem">
                {flagged.map((c) => c.className).join(", ")}: present is more than enrolled. Flagged
                for review, usually a typing slip.
              </p>
            )}
          </Panel>

          <Panel title="Facility checklist" aside="Older than 3 days is stale">
            <InfraChecklist f={f} />
          </Panel>
        </div>
      </div>

      <Panel title="Last 14 days of submissions" aside="Today ringed" bodyClassName="px-4 py-3">
        <SubmissionHistoryRow facilityId={f.id} />
      </Panel>
    </div>
  );
}
