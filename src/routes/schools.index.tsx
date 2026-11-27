import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { ChannelLabel } from "@/components/dcms/channel";
import { DemoNote, SchoolRegisterStatus } from "@/components/dcms/school-source";
import { FilterBar } from "@/components/dcms/filter-bar";
import { KpiTile } from "@/components/dcms/kpi-tile";
import { PageHeader } from "@/components/dcms/page-header";
import { Code, EmptyState, Panel } from "@/components/dcms/section";
import { SortTh } from "@/components/dcms/sort-header";
import { StatusBadge } from "@/components/dcms/status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  biometricByFacility,
  hhmm,
  REPORT_STATUS_ORDER,
  STATUS_LABEL,
  type ReportStatus,
  type SchoolLevel,
} from "@/data/mock";
import { downloadCsv } from "@/lib/csv";
import { useApp, useScopedFacilities } from "@/lib/app-state";
import { pct, schoolStaffCounts, schoolStudentCounts } from "@/lib/metrics";
import { useSort } from "@/lib/use-sort";

export const Route = createFileRoute("/schools/")({
  head: () => ({
    meta: [
      { title: "Schools · DCMS Bannu" },
      {
        name: "description",
        content: "North Waziristan school register (DEO data) with live school-day reporting.",
      },
      { property: "og:title", content: "Schools · DCMS Bannu" },
      {
        property: "og:description",
        content: "North Waziristan school register (DEO data) with live school-day reporting.",
      },
    ],
  }),
  component: SchoolsPage,
});

type Col =
  | "name"
  | "code"
  | "tehsil"
  | "level"
  | "register"
  | "enrolled"
  | "teachers"
  | "principal"
  | "students"
  | "status"
  | "channel"
  | "received";
const LEVELS: ("All" | SchoolLevel)[] = ["All", "Primary", "Middle", "High", "Higher Secondary"];
const REGISTER = ["All", "Functional", "Non-functional", "Closed"] as const;
type Register = (typeof REGISTER)[number];

function SchoolsPage() {
  const { statusFor, reportFor, resetFilters, filters, schoolDayFor } = useApp();
  const schools = useScopedFacilities({ kind: "school" });
  const [q, setQ] = useState("");
  const [level, setLevel] = useState<"All" | SchoolLevel>("All");
  const [status, setStatus] = useState<"All" | ReportStatus>("All");
  const [register, setRegister] = useState<Register>("All");

  const rows = useMemo(
    () =>
      schools
        .map((f) => {
          const st = statusFor(f.id);
          const r = reportFor(f.id);
          const staff = schoolStaffCounts(f, st, schoolDayFor(f.id));
          const students = schoolStudentCounts(f, st, schoolDayFor(f.id));
          return { f, st, r, staff, students };
        })
        .filter((x) => (level === "All" ? true : x.f.level === level))
        .filter((x) => (register === "All" ? true : x.f.source?.status === register))
        .filter((x) => (status === "All" ? true : x.st === status))
        .filter((x) => {
          if (!q) return true;
          const s = q.toLowerCase();
          return (
            x.f.name.toLowerCase().includes(s) ||
            x.f.code.toLowerCase().includes(s) ||
            x.f.village.toLowerCase().includes(s) ||
            (x.f.source?.principal ?? "").toLowerCase().includes(s)
          );
        }),
    [schools, statusFor, reportFor, schoolDayFor, level, status, register, q],
  );

  const { sorted, key, dir, toggle } = useSort<(typeof rows)[number], Col>(
    rows,
    {
      name: (x) => x.f.name,
      code: (x) => x.f.code,
      tehsil: (x) => x.f.tehsil,
      level: (x) => LEVELS.indexOf(x.f.level!),
      register: (x) => REGISTER.indexOf(x.f.source?.status ?? "Functional"),
      enrolled: (x) => x.f.source?.students ?? -1,
      teachers: (x) => x.f.source?.teachers ?? -1,
      principal: (x) => x.f.source?.principal ?? "~",
      students: (x) =>
        x.students.present == null ? -1 : x.students.present / Math.max(1, x.students.enrolled),
      status: (x) => REPORT_STATUS_ORDER.indexOf(x.st),
      channel: (x) => x.r?.channel ?? x.f.channel,
      received: (x) => x.r?.receivedAt ?? 9999,
    },
    "tehsil",
  );

  // Register figures, straight from the source files.
  const functional = rows.filter((x) => x.f.operational);
  const notFunctional = rows.length - functional.length;
  const closed = rows.filter((x) => x.f.source?.status === "Closed").length;
  const regStudents = rows.reduce((a, x) => a + (x.f.source?.students ?? 0), 0);
  const regTeachers = rows.reduce((a, x) => a + (x.f.source?.teachers ?? 0), 0);
  const withCounts = rows.filter((x) => x.f.source?.students != null);
  const noTeacher = rows.filter((x) => x.f.operational && x.f.source?.teachers === 0).length;
  const noPrincipal = withCounts.filter((x) => !x.f.source?.principal).length;
  // Daily reporting (demo). Only functional schools are expected to report.
  const reported = functional.filter(
    (x) => x.st === "received" || x.st === "pending" || x.st === "verified",
  ).length;
  const staffP = rows.reduce((a, x) => a + (x.staff.present ?? 0), 0);
  const staffT = rows.reduce((a, x) => a + (x.staff.present == null ? 0 : x.staff.total), 0);
  const stuP = rows.reduce((a, x) => a + (x.students.present ?? 0), 0);
  const stuT = rows.reduce((a, x) => a + (x.students.present == null ? 0 : x.students.enrolled), 0);
  const stuEnrolledAll = rows.reduce((a, x) => a + x.students.enrolled, 0);

  const exportCsv = () =>
    downloadCsv(
      "north-waziristan-schools.csv",
      sorted.map((x) => ({
        School: x.f.name,
        "EMIS code": x.f.source?.emis ?? "",
        Tehsil: x.f.tehsil,
        Village: x.f.source?.village ?? "",
        Level: x.f.level ?? "",
        Gender: x.f.gender ?? "",
        "Register status": x.f.source?.statusText ?? "",
        "Reason (NF)": x.f.source?.reason ?? "",
        "No of students": x.f.source?.students ?? "",
        "Working teachers": x.f.source?.teachers ?? "",
        Principal: x.f.source?.principal ?? "",
        Latitude: x.f.lat ?? "",
        Longitude: x.f.lng ?? "",
        "Staff present": x.staff.present ?? "",
        "Staff total": x.staff.total,
        "Students present": x.students.present ?? "",
        "Students enrolled": x.students.enrolled,
        "Report status": STATUS_LABEL[x.st],
        Channel: (x.r?.channel ?? x.f.channel) === "sms" ? "SMS" : "App",
        "Last received": x.r?.receivedAt != null ? hhmm(x.r.receivedAt) : "",
        "Report ID": x.r?.id ?? "",
      })),
    );

  return (
    <div>
      <PageHeader
        title="Schools"
        urdu="اسکول"
        description="North Waziristan school register from the DEO's files, with today's school-day reporting shown as a live demo."
      />
      <div className="mt-4">
        <FilterBar
          showDepartment={false}
          onExportCsv={exportCsv}
          extra={
            <>
              <label className="flex items-center gap-2 text-xs text-ink-muted">
                Level
                <Select value={level} onValueChange={(v) => setLevel(v as "All" | SchoolLevel)}>
                  <SelectTrigger className="h-8 w-[150px]" aria-label="School level">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEVELS.map((l) => (
                      <SelectItem key={l} value={l}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="flex items-center gap-2 text-xs text-ink-muted">
                Register
                <Select value={register} onValueChange={(v) => setRegister(v as Register)}>
                  <SelectTrigger className="h-8 w-[150px]" aria-label="Register status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REGISTER.map((l) => (
                      <SelectItem key={l} value={l}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="flex items-center gap-2 text-xs text-ink-muted">
                Report
                <Select value={status} onValueChange={(v) => setStatus(v as "All" | ReportStatus)}>
                  <SelectTrigger className="h-8 w-[170px]" aria-label="Report status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All</SelectItem>
                    {REPORT_STATUS_ORDER.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search name, EMIS, village or principal"
                aria-label="Search schools"
                className="h-8 w-[220px]"
              />
            </>
          }
        />
      </div>

      {(() => {
        const bioLogs = rows.flatMap((x) => biometricByFacility[x.f.id] ?? []);
        const bioOnTime = bioLogs.filter((l) => l.status === "On time").length;
        const bioLate = bioLogs.filter(
          (l) => l.status === "Late" || l.status === "Very late",
        ).length;
        const absentStaff = rows.reduce((a, x) => {
          if (x.staff.present == null) return a;
          return a + (x.staff.total - x.staff.present);
        }, 0);
        return (
          <>
            <h2 className="mb-2 text-sm font-semibold text-ink">School register</h2>
            <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
              <KpiTile
                label="Schools"
                value={rows.length}
                sub={`${functional.length} functional`}
                tone="neutral"
                freshness="DEO(M) data, 26 Nov 2026"
              />
              <KpiTile
                label="Non-functional & closed"
                value={notFunctional}
                sub={`${closed} closed, ${notFunctional - closed} non-functional`}
                tone={notFunctional ? "problem" : "neutral"}
                freshness="Male register + female NF list"
              />
              <KpiTile
                label="Students enrolled"
                value={regStudents.toLocaleString("en")}
                sub={`in ${withCounts.length} schools with figures`}
                tone="neutral"
                freshness="No of Students column"
              />
              <KpiTile
                label="Working teachers"
                value={regTeachers.toLocaleString("en")}
                sub={
                  regTeachers
                    ? `${(regStudents / regTeachers).toFixed(1)} students per teacher`
                    : "No figures in this selection"
                }
                tone="neutral"
                freshness="No of Working Teachers column"
              />
              <KpiTile
                label="Functional, no teacher"
                value={noTeacher}
                sub="functional schools with 0 working teachers"
                tone={noTeacher ? "problem" : "neutral"}
                freshness="From the school register"
              />
              <KpiTile
                label="Principal not recorded"
                value={noPrincipal}
                sub={`of ${withCounts.length} schools with figures`}
                tone={noPrincipal ? "pending" : "neutral"}
                freshness="Principal Name column blank"
              />
            </div>
            <h2 className="mb-2 text-sm font-semibold text-ink">
              Today's reporting{" "}
              <span className="text-xs font-normal text-ink-muted">· live demo</span>
            </h2>
            <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
              <KpiTile
                label="Reported today"
                value={reported}
                sub={`of ${functional.length} functional schools`}
                tone={reported / Math.max(1, functional.length) > 0.7 ? "verified" : "pending"}
                freshness="Demo: accepted by the district server"
              />
              <KpiTile
                label="Staff present"
                value={staffT ? `${pct(staffP, staffT)}%` : "No data"}
                sub={`${staffP} of ${staffT} in reporting schools`}
                tone="verified"
                freshness={`Demo · ${reported} schools counted`}
              />
              <KpiTile
                label="Students present"
                value={stuT ? `${pct(stuP, stuT)}%` : "No data"}
                sub={`${stuP.toLocaleString("en")} of ${stuT.toLocaleString("en")} enrolled`}
                tone="verified"
                freshness={`Demo · enrolment is real: ${stuEnrolledAll.toLocaleString("en")}`}
              />
              <KpiTile
                label="No report yet"
                value={functional.filter((x) => x.st === "none").length}
                sub="functional schools without a report"
                tone={functional.some((x) => x.st === "none") ? "problem" : "neutral"}
                freshness="Demo · non-functional schools not expected"
              />
              <KpiTile
                label="Staff absent"
                value={absentStaff.toString()}
                sub="absent without leave or on duty"
                tone={absentStaff > 10 ? "problem" : "neutral"}
                freshness="Demo · from accepted school reports"
              />
              <KpiTile
                label="Biometric on time"
                value={bioLogs.length ? `${pct(bioOnTime, bioLogs.length, 0)}%` : "—"}
                sub={`${bioOnTime} on time · ${bioLate} late`}
                tone={bioLate / Math.max(1, bioLogs.length) > 0.2 ? "pending" : "verified"}
                freshness="Demo · fingerprint / NFC check-ins"
              />
            </div>
          </>
        );
      })()}

      <Panel title="Schools" aside={`${sorted.length} of ${schools.length} shown`}>
        {sorted.length === 0 ? (
          <EmptyState
            title="No schools match these filters."
            hint={
              filters.tehsil !== "All"
                ? "Clear the tehsil filter or widen the status filter."
                : "Try another level, status or search term."
            }
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  resetFilters();
                  setLevel("All");
                  setStatus("All");
                  setQ("");
                }}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <DemoNote>
              EMIS to Principal are from the source files. Report today, Present today, Channel and
              Last received are simulated to show how the live feed will look.
            </DemoNote>
            <table className="ledger">
              <thead>
                <tr>
                  <SortTh id="name" active={key} dir={dir} onSort={toggle}>
                    School
                  </SortTh>
                  <SortTh id="code" active={key} dir={dir} onSort={toggle}>
                    EMIS
                  </SortTh>
                  <SortTh id="tehsil" active={key} dir={dir} onSort={toggle}>
                    Tehsil
                  </SortTh>
                  <SortTh id="level" active={key} dir={dir} onSort={toggle}>
                    Level
                  </SortTh>
                  <SortTh id="register" active={key} dir={dir} onSort={toggle}>
                    Register
                  </SortTh>
                  <SortTh id="enrolled" active={key} dir={dir} onSort={toggle} num>
                    Students
                  </SortTh>
                  <SortTh id="teachers" active={key} dir={dir} onSort={toggle} num>
                    Teachers
                  </SortTh>
                  <SortTh id="principal" active={key} dir={dir} onSort={toggle}>
                    Principal
                  </SortTh>
                  <SortTh id="status" active={key} dir={dir} onSort={toggle}>
                    Report today
                  </SortTh>
                  <SortTh id="students" active={key} dir={dir} onSort={toggle} num>
                    Present today
                  </SortTh>
                  <SortTh id="channel" active={key} dir={dir} onSort={toggle}>
                    Channel
                  </SortTh>
                  <SortTh id="received" active={key} dir={dir} onSort={toggle} num>
                    Last received
                  </SortTh>
                </tr>
              </thead>
              <tbody>
                {sorted.map(({ f, st, r, students }) => (
                  <tr key={f.id}>
                    <td data-label="School">
                      <Link
                        to="/schools/$id"
                        params={{ id: f.id }}
                        className="font-semibold text-ink hover:text-kurram hover:underline"
                      >
                        {f.name}
                      </Link>
                      <span className="block text-xs text-ink-muted">{f.typeLabel}</span>
                    </td>
                    <td data-label="EMIS">
                      {f.source?.emis ? (
                        <Code>{f.source.emis}</Code>
                      ) : (
                        <span className="text-xs text-ink-muted">Not given</span>
                      )}
                    </td>
                    <td data-label="Tehsil">
                      {f.tehsil}
                      <span
                        className="block max-w-[180px] truncate text-xs text-ink-muted"
                        title={f.village}
                      >
                        {f.village}
                      </span>
                    </td>
                    <td data-label="Level">{f.level}</td>
                    <td data-label="Register">
                      <SchoolRegisterStatus f={f} />
                      {f.source?.reason && (
                        <span className="mt-0.5 block max-w-[200px] text-xs text-ink-muted">
                          {f.source.reason}
                        </span>
                      )}
                    </td>
                    <td data-label="Students" className="num">
                      {f.source?.students ?? <span className="text-ink-muted">Not given</span>}
                    </td>
                    <td data-label="Teachers" className="num">
                      {f.source?.teachers ?? <span className="text-ink-muted">Not given</span>}
                    </td>
                    <td data-label="Principal" className="text-xs">
                      {f.source?.principal ?? <span className="text-ink-muted">Not recorded</span>}
                    </td>
                    <td data-label="Report today">
                      {f.operational ? (
                        <StatusBadge status={st} short />
                      ) : (
                        <span className="text-xs text-ink-muted">Not expected</span>
                      )}
                    </td>
                    <td data-label="Present today" className="num">
                      {!f.operational ? (
                        <span className="text-ink-muted">—</span>
                      ) : students.present == null ? (
                        <span className="text-ink-muted">— of {students.enrolled}</span>
                      ) : (
                        <>
                          {students.present} of {students.enrolled}
                          <span className="ml-1.5 text-xs text-ink-muted">
                            {pct(students.present, students.enrolled)}%
                          </span>
                        </>
                      )}
                    </td>
                    <td data-label="Channel">
                      <ChannelLabel channel={r?.channel ?? f.channel} />
                    </td>
                    <td data-label="Last received" className="num">
                      {r?.receivedAt != null ? (
                        hhmm(r.receivedAt)
                      ) : (
                        <span className="text-ink-muted">Not yet</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
