import { schoolRecordSearch, type SchoolSection } from "@/components/dcms/navigation";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  CalendarDays,
  ClipboardList,
  FileText,
  Fingerprint,
  Landmark,
  Users,
} from "lucide-react";
import { useState } from "react";
import type React from "react";

import { SectionTabs } from "@/components/dcms/section-tabs";

import {
  BackLink,
  FacilityHeaderMeta,
  InfraChecklist,
  NotFoundPanel,
  SubmissionHistoryRow,
  TimestampStrip,
} from "@/components/dcms/facility-bits";
import { InstitutionRecord } from "@/components/dcms/institution-record";
import { DemoNote, SchoolRegisterStatus } from "@/components/dcms/school-source";
import { SOURCE_FILE_LABEL } from "@/data/school-types";
import { KpiTile } from "@/components/dcms/kpi-tile";
import { PageHeader } from "@/components/dcms/page-header";
import { Code, Panel } from "@/components/dcms/section";
import { Pill, STAFF_STATUS_TONE } from "@/components/dcms/status";
import {
  classDailyAttendance,
  facilityById,
  formatDate,
  hhmm,
  isAccepted,
  schoolDays,
  staffByFacility,
  studentsByFacility,
  biometricByFacility,
  weeklyAttendance,
  type Facility,
  type SchoolStaffStatus,
} from "@/data/mock";
import { inRoleScope, useApp } from "@/lib/app-state";
import { pct } from "@/lib/metrics";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/schools/$id")({
  validateSearch: schoolRecordSearch,
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
  const { statusFor, reportFor, role, schoolDayFor } = useApp();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const section = search.section ?? "register";
  const setSection = (next: SchoolSection) =>
    navigate({ search: next === "register" ? {} : { section: next }, resetScroll: false });
  if (!f || f.kind !== "school" || !inRoleScope(role, f))
    return <NotFoundPanel what="school in your scope" back="/schools" backLabel="All schools" />;

  const st = statusFor(f.id);
  const r = reportFor(f.id);
  const accepted = isAccepted(st);
  const day = schoolDayFor(f.id)!;
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
          description={`${f.typeLabel}, ${f.village}, ${f.tehsil}. ${!f.operational ? `${f.source?.status ?? "Non-functional"} per the school register.` : accepted ? "Today's report is in." : "Today's report has not been accepted yet."}`}
        >
          <FacilityHeaderMeta f={f} report={r} />
        </PageHeader>
      </div>

      {f.operational && <TimestampStrip report={r} status={st} />}

      {!f.operational && (
        <div className="panel border-l-[3px] border-l-problem px-4 py-3 text-sm">
          <p className="font-semibold text-ink">
            {f.source?.status ?? "Non-functional"}: no daily report is expected.
          </p>
          <p className="text-ink-muted">
            {f.source?.reason
              ? `Reason in the register: ${f.source.reason}.`
              : "No reason given in the register."}
          </p>
        </div>
      )}

      {f.operational && !accepted && (
        <div className="panel border-l-[3px] border-l-pending px-4 py-3 text-sm">
          <p className="font-semibold text-ink">No accepted report for today yet.</p>
          <p className="text-ink-muted">
            Staff and class figures below are the roster and enrolment on record, not today's
            attendance.{" "}
            {st === "none" && (
              <>
                A review task was opened at 10:00.{" "}
                <Link to="/review" className="text-dept hover:underline">
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
          label="Students (register)"
          value={f.source?.students ?? "—"}
          sub={f.source?.students == null ? "Not given in the source file" : "No of Students"}
          tone="neutral"
          freshness="School register"
        />
        <KpiTile
          label="Working teachers"
          value={f.source?.teachers ?? "—"}
          sub={
            f.source?.teachers == null ? "Not given in the source file" : "No of Working Teachers"
          }
          tone={f.operational && f.source?.teachers === 0 ? "problem" : "neutral"}
          freshness="School register"
        />
        <KpiTile
          label="Principal"
          value={f.source?.principal ?? "Not recorded"}
          sub={f.source?.emis ? `EMIS ${f.source.emis}` : "EMIS not given"}
          tone={f.source?.principal ? "neutral" : "pending"}
          freshness="School register"
        />
        <KpiTile
          label="Register status"
          value={f.source?.status ?? "Functional"}
          sub={f.source?.reason ?? "No reason recorded"}
          tone={f.operational ? "verified" : "problem"}
          freshness="School register"
        />
      </div>

      {f.operational && (
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
                : "Demo · totals plausible"
            }
          />
        </div>
      )}

      <SectionTabs
        label="School record sections"
        value={section}
        onChange={setSection}
        options={[
          { value: "register", label: "Register", icon: Landmark },
          { value: "today", label: "Today", icon: ClipboardList },
          { value: "attendance", label: "Attendance history", icon: CalendarDays },
          {
            value: "students",
            label: "Students",
            icon: Users,
            count: (studentsByFacility[f.id] ?? []).length,
          },
          {
            value: "staff",
            label: "Staff attendance",
            icon: Fingerprint,
            count: (biometricByFacility[f.id] ?? []).length,
          },
          { value: "record", label: "Institution record", icon: FileText },
        ]}
      />

      {section === "register" && <SchoolRegisterPanel f={f} />}

      {section !== "register" && section !== "record" && (
        <div className="panel overflow-hidden">
          <DemoNote>
            {f.operational
              ? `Simulated to show the live feed. Enrolment (${f.source?.students ?? 0}) and the number of teachers (${f.source?.teachers ?? 0}) are real; names other than the principal, the split across classes and all daily attendance are not.`
              : "This school is not functional, so it sends no daily report. Anything below is empty or simulated."}
          </DemoNote>
        </div>
      )}

      {section === "today" && (
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
                            className="font-semibold text-ink hover:text-dept hover:underline"
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
                      const bad =
                        c.presentBoys > c.enrolledBoys || c.presentGirls > c.enrolledGirls;
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
                  {flagged.map((c) => c.className).join(", ")}: present is more than enrolled.
                  Flagged for review, usually a typing slip.
                </p>
              )}
            </Panel>
          </div>
        </div>
      )}

      {section === "attendance" && (
        <>
          <WeeklyAttendanceRegister facilityId={f.id} />
          <ClassDailyBreakdown facilityId={f.id} />
        </>
      )}

      {section === "students" && <StudentDirectory facilityId={f.id} />}

      {section === "staff" && <SchoolBiometric facilityId={f.id} />}

      {section === "record" && (
        <>
          <InstitutionRecord facility={f} />
          <div className="grid gap-4 xl:grid-cols-2">
            <Panel title="Facility checklist" aside="Older than 3 days is stale">
              <InfraChecklist f={f} />
            </Panel>
            <Panel
              title="Last 14 days of submissions"
              aside="Today ringed"
              bodyClassName="px-4 py-3"
            >
              <SubmissionHistoryRow facilityId={f.id} />
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}

function StudentDirectory({ facilityId }: { facilityId: string }) {
  const students = studentsByFacility[facilityId] ?? [];
  const [expanded, setExpanded] = useState(false);
  const [filterClass, setFilterClass] = useState<string>("all");
  if (students.length === 0) return null;

  const classes = [...new Set(students.map((s) => s.className))].sort();
  const filtered =
    filterClass === "all" ? students : students.filter((s) => s.className === filterClass);
  const shown = expanded ? filtered : filtered.slice(0, 15);
  const biometric = students.filter((s) => s.attendanceMethod === "Biometric").length;

  return (
    <Panel
      title="Student directory"
      aside={`${students.length} students on record · ${pct(biometric, students.length, 0)}% biometric`}
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2">
        <span className="text-xs font-semibold text-ink-muted">Filter by class:</span>
        <select
          value={filterClass}
          onChange={(e) => {
            setFilterClass(e.target.value);
            setExpanded(false);
          }}
          className="rounded-sm border border-line bg-surface px-2 py-1 text-xs"
        >
          <option value="all">All classes</option>
          {classes.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <span className="text-xs text-ink-muted">Showing {filtered.length} students</span>
      </div>
      <div className="overflow-x-auto">
        <table className="ledger">
          <thead>
            <tr>
              <th scope="col" className="num">
                Roll
              </th>
              <th scope="col">Name</th>
              <th scope="col">Father's name</th>
              <th scope="col" className="num">
                Age
              </th>
              <th scope="col">Class</th>
              <th scope="col">Subjects</th>
              <th scope="col" className="num">
                Attendance
              </th>
              <th scope="col">Method</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((s) => (
              <tr key={s.id}>
                <td data-label="Roll" className="num">
                  {s.rollNo}
                </td>
                <td data-label="Name">
                  <span className="font-semibold">{s.name}</span>
                  <span className="block text-2xs text-ink-muted">
                    {s.gender === "M" ? "Male" : "Female"}
                  </span>
                </td>
                <td data-label="Father's name" className="text-xs">
                  {s.fatherName}
                </td>
                <td data-label="Age" className="num">
                  {s.age}
                </td>
                <td data-label="Class">{s.className}</td>
                <td data-label="Subjects" className="max-w-[200px] text-xs">
                  {s.subjects.join(", ")}
                </td>
                <td data-label="Attendance" className="num">
                  <span
                    className={cn(
                      "font-semibold",
                      s.daysAttended / s.totalDays < 0.75 ? "text-problem" : "text-verified",
                    )}
                  >
                    {s.daysAttended}/{s.totalDays}
                  </span>
                  <span className="block text-2xs text-ink-muted">
                    {pct(s.daysAttended, s.totalDays, 0)}%
                  </span>
                </td>
                <td data-label="Method">
                  <Pill tone={s.attendanceMethod === "Biometric" ? "verified" : "neutral"}>
                    {s.attendanceMethod}
                  </Pill>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length > 15 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full border-t border-line px-4 py-2 text-xs font-semibold text-dept hover:bg-subtle"
        >
          {expanded ? "Show fewer" : `Show all ${filtered.length} students`}
        </button>
      )}
    </Panel>
  );
}

function WeeklyAttendanceRegister({ facilityId }: { facilityId: string }) {
  const rows = weeklyAttendance[facilityId] ?? [];
  if (rows.length === 0) return null;

  const avgAttendance =
    rows.length > 0 ? (rows.reduce((a, r) => a + r.percentage, 0) / rows.length).toFixed(1) : "0";
  const totalLate = rows.reduce((a, r) => a + r.lateArrivals, 0);

  return (
    <Panel
      title="Weekly attendance register"
      aside={`Last ${rows.length} working days · Avg ${avgAttendance}% student attendance`}
    >
      <div className="overflow-x-auto">
        <table className="ledger">
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Day</th>
              <th scope="col" className="num">
                Enrolled
              </th>
              <th scope="col" className="num">
                Present
              </th>
              <th scope="col" className="num">
                Absent
              </th>
              <th scope="col" className="num">
                Attendance %
              </th>
              <th scope="col" className="num">
                Staff present
              </th>
              <th scope="col" className="num">
                Staff absent
              </th>
              <th scope="col" className="num">
                Late arrivals
              </th>
              <th scope="col">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.date}>
                <td data-label="Date" className="whitespace-nowrap">
                  {formatDate(r.date).split(" ").slice(0, 2).join(" ")}
                </td>
                <td data-label="Day">{r.day}</td>
                <td data-label="Enrolled" className="num">
                  {r.enrolled}
                </td>
                <td data-label="Present" className="num font-semibold">
                  {r.present}
                </td>
                <td data-label="Absent" className="num">
                  {r.absent}
                </td>
                <td data-label="Attendance %" className="num">
                  <span
                    className={cn(
                      "font-semibold",
                      r.percentage < 78
                        ? "text-problem"
                        : r.percentage < 85
                          ? "text-pending"
                          : "text-verified",
                    )}
                  >
                    {r.percentage}%
                  </span>
                </td>
                <td data-label="Staff present" className="num">
                  {r.staffPresent}/{r.staffTotal}
                </td>
                <td data-label="Staff absent" className="num">
                  {r.staffAbsent}
                </td>
                <td data-label="Late arrivals" className="num">
                  <span className={cn(r.lateArrivals > 2 && "font-semibold text-pending")}>
                    {r.lateArrivals}
                  </span>
                </td>
                <td data-label="Remarks" className="max-w-[180px] text-xs text-ink-muted">
                  {r.remarks}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-semibold">
              <td colSpan={2}>Week summary</td>
              <td className="num">{rows[0]?.enrolled ?? 0}</td>
              <td className="num">
                {Math.round(rows.reduce((a, r) => a + r.present, 0) / rows.length)}
              </td>
              <td className="num">
                {Math.round(rows.reduce((a, r) => a + r.absent, 0) / rows.length)}
              </td>
              <td className="num">{avgAttendance}%</td>
              <td className="num" colSpan={2}>
                —
              </td>
              <td className="num">{totalLate} total</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </Panel>
  );
}

function ClassDailyBreakdown({ facilityId }: { facilityId: string }) {
  const allRows = classDailyAttendance[facilityId] ?? [];
  const dates = [...new Set(allRows.map((r) => r.date))].sort();
  const [picked, setSelectedDate] = useState<string | null>(null);
  if (allRows.length === 0) return null;

  const classes = [...new Set(allRows.map((r) => r.className))];
  const selectedDate = picked && dates.includes(picked) ? picked : (dates[dates.length - 1] ?? "");
  const rows = allRows.filter((r) => r.date === selectedDate);

  const totalE = rows.reduce((a, r) => a + r.enrolledBoys + r.enrolledGirls, 0);
  const totalP = rows.reduce((a, r) => a + r.presentBoys + r.presentGirls, 0);

  return (
    <Panel
      title="Class-wise daily attendance"
      aside={`${classes.length} classes · ${dates.length} days`}
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2">
        <span className="text-xs font-semibold text-ink-muted">Select date:</span>
        <select
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="rounded-sm border border-line bg-surface px-2 py-1 text-xs"
        >
          {dates.map((d) => (
            <option key={d} value={d}>
              {formatDate(d, true)}
            </option>
          ))}
        </select>
        <span className="ml-auto text-xs text-ink-muted">
          Overall: {totalP}/{totalE} ({totalE > 0 ? pct(totalP, totalE, 0) : 0}%)
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="ledger">
          <thead>
            <tr>
              <th scope="col">Class</th>
              <th scope="col" className="num">
                Boys enrolled
              </th>
              <th scope="col" className="num">
                Boys present
              </th>
              <th scope="col" className="num">
                Boys absent
              </th>
              <th scope="col" className="num">
                Girls enrolled
              </th>
              <th scope="col" className="num">
                Girls present
              </th>
              <th scope="col" className="num">
                Girls absent
              </th>
              <th scope="col" className="num">
                Attendance %
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.className}>
                <td data-label="Class">{r.className}</td>
                <td data-label="Boys enrolled" className="num">
                  {r.enrolledBoys}
                </td>
                <td data-label="Boys present" className="num font-semibold">
                  {r.presentBoys}
                </td>
                <td data-label="Boys absent" className="num">
                  {r.absentBoys}
                </td>
                <td data-label="Girls enrolled" className="num">
                  {r.enrolledGirls}
                </td>
                <td data-label="Girls present" className="num font-semibold">
                  {r.presentGirls}
                </td>
                <td data-label="Girls absent" className="num">
                  {r.absentGirls}
                </td>
                <td data-label="Attendance %" className="num">
                  <span
                    className={cn(
                      "font-semibold",
                      r.percentage < 75
                        ? "text-problem"
                        : r.percentage < 85
                          ? "text-pending"
                          : "text-verified",
                    )}
                  >
                    {r.percentage}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-semibold">
              <td>Total</td>
              <td className="num">{rows.reduce((a, r) => a + r.enrolledBoys, 0)}</td>
              <td className="num">{rows.reduce((a, r) => a + r.presentBoys, 0)}</td>
              <td className="num">{rows.reduce((a, r) => a + r.absentBoys, 0)}</td>
              <td className="num">{rows.reduce((a, r) => a + r.enrolledGirls, 0)}</td>
              <td className="num">{rows.reduce((a, r) => a + r.presentGirls, 0)}</td>
              <td className="num">{rows.reduce((a, r) => a + r.absentGirls, 0)}</td>
              <td className="num">{totalE > 0 ? pct(totalP, totalE, 0) : 0}%</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Panel>
  );
}

function SchoolBiometric({ facilityId }: { facilityId: string }) {
  const logs = biometricByFacility[facilityId] ?? [];
  if (logs.length === 0) return null;
  const onTime = logs.filter((l) => l.status === "On time").length;
  const late = logs.filter((l) => l.status === "Late").length;
  const veryLate = logs.filter((l) => l.status === "Very late").length;

  return (
    <Panel title="Staff biometric attendance — today" aside={`${logs.length} staff checked in`}>
      <p className="border-b border-line bg-subtle px-4 py-2 text-xs text-ink-muted">
        The register records only present or absent. These check-in times come from the facility's
        fingerprint and card reader, so a teacher marked present may still show as late here.
      </p>
      <div className="grid grid-cols-3 gap-2 border-b border-line px-4 py-3">
        <div className="text-center">
          <div className="text-lg font-bold tabular-nums text-verified">{onTime}</div>
          <div className="text-2xs text-ink-muted">On time</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold tabular-nums text-pending">{late}</div>
          <div className="text-2xs text-ink-muted">Late</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold tabular-nums text-problem">{veryLate}</div>
          <div className="text-2xs text-ink-muted">Very late</div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="ledger">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Designation</th>
              <th scope="col">Method</th>
              <th scope="col">Check-in</th>
              <th scope="col">Check-out</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.staffId}>
                <td data-label="Name" className="font-semibold">
                  {l.name}
                </td>
                <td data-label="Designation">{l.designation}</td>
                <td data-label="Method" className="text-xs">
                  {l.method}
                </td>
                <td data-label="Check-in" className="num">
                  {hhmm(l.checkIn)}
                </td>
                <td data-label="Check-out" className="num">
                  {l.checkOut ? hhmm(l.checkOut) : "—"}
                </td>
                <td data-label="Status">
                  <Pill
                    tone={
                      l.status === "On time"
                        ? "verified"
                        : l.status === "Late"
                          ? "pending"
                          : "problem"
                    }
                  >
                    {l.status}
                  </Pill>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function SchoolRegisterPanel({ f }: { f: Facility }) {
  const src = f.source;
  if (!src) return null;
  const rows: [string, React.ReactNode][] = [
    ["School name", src.name],
    ["EMIS code", src.emis ?? "Not given"],
    ["Level", src.level],
    ["Boys / girls", src.gender],
    ["Tehsil", src.tehsil ?? "Not stated: the location column does not name a single tehsil"],
    ["Location (village)", src.village ?? "Not stated"],
    ["Status", <SchoolRegisterStatus key="st" f={f} />],
    ["Status as written", src.statusText || "Not stated"],
    ["Reason of non-functionality", src.reason ?? "None recorded"],
    ["No of students", src.students ?? "Not given"],
    ["No of working teachers", src.teachers ?? "Not given"],
    ["Principal name", src.principal ?? "Not recorded"],
    [
      "Coordinates",
      src.lat != null && src.lng != null
        ? `${src.lat.toFixed(5)}, ${src.lng.toFixed(5)}`
        : "Not in the coordinates file",
    ],
    ["Source", `${SOURCE_FILE_LABEL[src.source]}, row ${src.serial}`],
  ];
  return (
    <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
      <Panel title="School register" aside="Exactly as given in the DEO's files">
        <dl className="grid grid-cols-1 divide-y divide-line text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[minmax(140px,1fr)_2fr] gap-3 px-5 py-2.5">
              <dt className="text-ink-muted">{k}</dt>
              <dd className="text-ink">{v}</dd>
            </div>
          ))}
        </dl>
      </Panel>
      <Panel title="DEO review remark" aside="Non-functional schools review">
        <div className="px-5 py-4 text-sm">
          {src.deoRemark ? (
            <blockquote className="border-l-[3px] border-l-dept pl-3 text-ink">
              {src.deoRemark}
            </blockquote>
          ) : (
            <p className="text-ink-muted">This school is not listed in the DEO's review.</p>
          )}
        </div>
      </Panel>
    </div>
  );
}
