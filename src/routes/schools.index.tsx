import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { ChannelLabel } from "@/components/dcms/channel";
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
        content: "Today's school reports, staff and student attendance for District Bannu.",
      },
      { property: "og:title", content: "Schools · DCMS Bannu" },
      {
        property: "og:description",
        content: "Today's school reports, staff and student attendance for District Bannu.",
      },
    ],
  }),
  component: SchoolsPage,
});

type Col =
  "name" | "code" | "tehsil" | "level" | "staff" | "students" | "status" | "channel" | "received";
const LEVELS: ("All" | SchoolLevel)[] = ["All", "Primary", "Middle", "High", "Higher Secondary"];

function SchoolsPage() {
  const { statusFor, reportFor, resetFilters, filters, schoolDayFor } = useApp();
  const schools = useScopedFacilities({ kind: "school" });
  const [q, setQ] = useState("");
  const [level, setLevel] = useState<"All" | SchoolLevel>("All");
  const [status, setStatus] = useState<"All" | ReportStatus>("All");

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
        .filter((x) => (status === "All" ? true : x.st === status))
        .filter((x) => {
          if (!q) return true;
          const s = q.toLowerCase();
          return (
            x.f.name.toLowerCase().includes(s) ||
            x.f.code.toLowerCase().includes(s) ||
            x.f.village.toLowerCase().includes(s)
          );
        }),
    [schools, statusFor, reportFor, schoolDayFor, level, status, q],
  );

  const { sorted, key, dir, toggle } = useSort<(typeof rows)[number], Col>(
    rows,
    {
      name: (x) => x.f.name,
      code: (x) => x.f.code,
      tehsil: (x) => x.f.tehsil,
      level: (x) => LEVELS.indexOf(x.f.level!),
      staff: (x) => (x.staff.present == null ? -1 : x.staff.present / Math.max(1, x.staff.total)),
      students: (x) =>
        x.students.present == null ? -1 : x.students.present / Math.max(1, x.students.enrolled),
      status: (x) => REPORT_STATUS_ORDER.indexOf(x.st),
      channel: (x) => x.r?.channel ?? x.f.channel,
      received: (x) => x.r?.receivedAt ?? 9999,
    },
    "tehsil",
  );

  const reported = rows.filter(
    (x) => x.st === "received" || x.st === "pending" || x.st === "verified",
  ).length;
  const staffP = rows.reduce((a, x) => a + (x.staff.present ?? 0), 0);
  const staffT = rows.reduce((a, x) => a + (x.staff.present == null ? 0 : x.staff.total), 0);
  const stuP = rows.reduce((a, x) => a + (x.students.present ?? 0), 0);
  const stuT = rows.reduce((a, x) => a + (x.students.present == null ? 0 : x.students.enrolled), 0);
  const stuEnrolledAll = rows.reduce((a, x) => a + x.students.enrolled, 0);

  const exportCsv = () =>
    downloadCsv(
      "dcms-bannu-schools-2026-11-23.csv",
      sorted.map((x) => ({
        School: x.f.name,
        Code: x.f.code,
        Tehsil: x.f.tehsil,
        Level: x.f.level ?? "",
        Gender: x.f.gender ?? "",
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
        description="Today's school day reports: who has reported, staff present and students present, by school."
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
                Status
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
                placeholder="Search name, code or village"
                aria-label="Search schools"
                className="h-8 w-[220px]"
              />
            </>
          }
        />
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile
          label="Reported today"
          value={reported}
          sub={`of ${rows.length} schools`}
          tone={reported / Math.max(1, rows.length) > 0.7 ? "verified" : "pending"}
          freshness="Accepted by the district server"
        />
        <KpiTile
          label="Staff present"
          value={staffT ? `${pct(staffP, staffT)}%` : "No data"}
          sub={`${staffP} of ${staffT} in reporting schools`}
          tone="verified"
          freshness={`${reported} of ${rows.length} schools counted`}
        />
        <KpiTile
          label="Students present"
          value={stuT ? `${pct(stuP, stuT)}%` : "No data"}
          sub={`${stuP.toLocaleString("en")} of ${stuT.toLocaleString("en")} enrolled`}
          tone="verified"
          freshness={`Enrolment on record: ${stuEnrolledAll.toLocaleString("en")}`}
        />
        <KpiTile
          label="No report yet"
          value={rows.filter((x) => x.st === "none").length}
          sub="schools without a report"
          tone={rows.some((x) => x.st === "none") ? "problem" : "neutral"}
          freshness="Each creates a review task at 10:00"
        />
      </div>

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
            <table className="ledger">
              <thead>
                <tr>
                  <SortTh id="name" active={key} dir={dir} onSort={toggle}>
                    School
                  </SortTh>
                  <SortTh id="code" active={key} dir={dir} onSort={toggle}>
                    Code
                  </SortTh>
                  <SortTh id="tehsil" active={key} dir={dir} onSort={toggle}>
                    Tehsil
                  </SortTh>
                  <SortTh id="level" active={key} dir={dir} onSort={toggle}>
                    Level
                  </SortTh>
                  <SortTh id="staff" active={key} dir={dir} onSort={toggle} num>
                    Staff present
                  </SortTh>
                  <SortTh id="students" active={key} dir={dir} onSort={toggle} num>
                    Students present
                  </SortTh>
                  <SortTh id="status" active={key} dir={dir} onSort={toggle}>
                    Report status
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
                {sorted.map(({ f, st, r, staff, students }) => (
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
                    <td data-label="Code">
                      <Code>{f.code}</Code>
                    </td>
                    <td data-label="Tehsil">{f.tehsil}</td>
                    <td data-label="Level">{f.level}</td>
                    <td data-label="Staff present" className="num">
                      {staff.present == null ? (
                        <span className="text-ink-muted">— of {staff.total}</span>
                      ) : (
                        `${staff.present} of ${staff.total}`
                      )}
                    </td>
                    <td data-label="Students present" className="num">
                      {students.present == null ? (
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
                    <td data-label="Report status">
                      <StatusBadge status={st} short />
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
