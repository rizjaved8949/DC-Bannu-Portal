import { PaginatedRegister } from "@/components/dcms/paginated-register";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { FilterBar } from "@/components/dcms/filter-bar";
import { KpiTile } from "@/components/dcms/kpi-tile";
import { PageHeader } from "@/components/dcms/page-header";
import { Code, EmptyState, Panel } from "@/components/dcms/section";
import { Segmented } from "@/components/dcms/segmented";
import { SortTh } from "@/components/dcms/sort-header";
import { Pill, STAFF_STATUS_TONE } from "@/components/dcms/status";
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
  facilityById,
  posts,
  staffByFacility,
  staffHistory,
  todayStatus,
  type Designation,
  type Facility,
  type Staff,
  type TodayStaffStatus,
} from "@/data/mock";
import { downloadCsv } from "@/lib/csv";
import { useApp, useScopedFacilities } from "@/lib/app-state";
import { pct } from "@/lib/metrics";
import { useSort } from "@/lib/use-sort";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/staff/")({
  validateSearch: (s: Record<string, unknown>): { tab?: Tab } =>
    s["tab"] === "posts" || s["tab"] === "exceptions" ? { tab: s["tab"] } : {},
  head: () => ({
    meta: [
      { title: "Staff · DCMS Bannu" },
      {
        name: "description",
        content:
          "Staff directory, sanctioned and filled posts, and absence and leave exceptions for District Bannu.",
      },
      { property: "og:title", content: "Staff · DCMS Bannu" },
      {
        property: "og:description",
        content:
          "Staff directory, sanctioned and filled posts, and absence and leave exceptions for District Bannu.",
      },
    ],
  }),
  component: StaffPage,
});

type Tab = "directory" | "posts" | "exceptions";

function StaffPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const tab: Tab = search.tab ?? "directory";
  const setTab = (t: Tab) =>
    navigate({ search: t === "directory" ? {} : { tab: t }, resetScroll: false });
  const facilities = useScopedFacilities();
  const { statusFor, staffStatusFor } = useApp();
  const all = useMemo(
    () =>
      facilities.flatMap((f) =>
        (staffByFacility[f.id] ?? []).map((s) => ({
          s,
          f,
          today: staffStatusFor(s),
        })),
      ),
    [facilities, staffStatusFor],
  );

  const present = all.filter(
    (x) => x.today === "Present" || x.today === "Late" || x.today === "Replacement",
  ).length;
  const marked = all.filter(
    (x) => x.today !== "Not reported" && x.today !== "Scheduled" && x.today !== "Off-duty",
  ).length;
  const absent = all.filter((x) => x.today === "Absent").length;
  const leave = all.filter((x) => x.today === "Approved leave" || x.today === "Leave").length;
  const scopedPosts = posts.filter((p) => facilities.some((f) => f.id === p.facilityId));
  const sanctioned = scopedPosts.reduce((a, p) => a + p.sanctioned, 0);
  const filled = scopedPosts.reduce((a, p) => a + p.filled, 0);

  return (
    <div>
      <PageHeader
        title="Staff"
        urdu="عملہ"
        description="Who is posted where, which posts are vacant, and whose attendance needs a second look. Marked by facility administrators, approved by supervisors."
      >
        <Segmented
          label="Staff view"
          value={tab}
          onChange={setTab}
          options={[
            { value: "directory", label: "Directory", count: all.length },
            { value: "posts", label: "Posts and vacancies", count: sanctioned - filled },
            { value: "exceptions", label: "Absence and leave exceptions" },
          ]}
        />
      </PageHeader>

      <div className="mt-4">
        <FilterBar />
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile
          label="Marked today"
          value={marked}
          sub={`of ${all.length} staff on roster`}
          tone="sent"
          freshness="From accepted reports and morning shifts"
        />
        <KpiTile
          label="Present"
          value={marked ? `${pct(present, marked)}%` : "—"}
          sub={`${present} of ${marked} marked`}
          tone="verified"
          freshness="Present, late or replacement"
        />
        <KpiTile
          label="Absent"
          value={absent}
          sub={`${leave} on approved leave`}
          tone={absent ? "problem" : "neutral"}
          freshness="Without leave or official duty"
        />
        <KpiTile
          label="Vacant posts"
          value={sanctioned - filled}
          sub={`${filled} of ${sanctioned} sanctioned posts filled`}
          tone="pending"
          freshness="Sanctioned strength from department records"
        />
      </div>

      {tab === "directory" && <Directory rows={all} />}
      {tab === "posts" && <PostsAndVacancies facilities={facilities} />}
      {tab === "exceptions" && <Exceptions rows={all} />}
    </div>
  );
}

type Row = { s: Staff; f: Facility; today: TodayStaffStatus };
type DirCol = "name" | "personal" | "designation" | "bps" | "posting" | "today";

function Directory({ rows }: { rows: Row[] }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"All" | TodayStaffStatus>("All");
  const filtered = useMemo(
    () =>
      rows
        .filter((x) => (status === "All" ? true : x.today === status))
        .filter((x) => {
          if (!q) return true;
          const s = q.toLowerCase();
          return (
            x.s.name.toLowerCase().includes(s) ||
            x.s.designation.toLowerCase().includes(s) ||
            x.f.name.toLowerCase().includes(s) ||
            x.s.personalNoMasked.endsWith(q) ||
            x.s.code.toLowerCase() === s
          );
        }),
    [rows, q, status],
  );
  const { sorted, key, dir, toggle } = useSort<Row, DirCol>(
    filtered,
    {
      name: (x) => x.s.name,
      personal: (x) => x.s.personalNoMasked,
      designation: (x) => x.s.designation,
      bps: (x) => x.s.bps,
      posting: (x) => x.f.name,
      today: (x) => x.today,
    },
    "posting",
  );
  const statuses = Array.from(new Set(rows.map((x) => x.today))).sort();

  const exportCsv = () =>
    downloadCsv(
      "dcms-bannu-staff-directory-2026-11-23.csv",
      sorted.map((x) => ({
        Name: x.s.name,
        "Personal no.": x.s.personalNoMasked,
        Designation: x.s.designation,
        BPS: x.s.bps,
        Posting: x.f.name,
        "Facility code": x.f.code,
        Tehsil: x.f.tehsil,
        Employment: x.s.employment,
        "Today's status": x.today,
      })),
    );

  return (
    <Panel
      title="Directory"
      aside={
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v as "All" | TodayStaffStatus);
            }}
          >
            <SelectTrigger className="h-8 w-[160px]" aria-label="Today's status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All statuses</SelectItem>
              {statuses.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
            }}
            placeholder="Search name, designation, posting or personal no."
            aria-label="Search staff"
            className="h-8 w-[300px]"
          />
          <Button variant="outline" size="sm" onClick={exportCsv}>
            Export CSV
          </Button>
        </div>
      }
    >
      {sorted.length === 0 ? (
        <EmptyState
          title="No staff match these filters."
          hint="Clear the status filter or try a shorter search."
        />
      ) : (
        <>
          <PaginatedRegister
            items={sorted}
            label="staff"
            resetKey={JSON.stringify([q, status, key, dir, rows.map((x) => x.s.id)])}
          >
            {(pageRows) => (
              <table className="ledger">
                <thead>
                  <tr>
                    <SortTh id="name" active={key} dir={dir} onSort={toggle}>
                      Name
                    </SortTh>
                    <SortTh id="personal" active={key} dir={dir} onSort={toggle}>
                      Personal no.
                    </SortTh>
                    <SortTh id="designation" active={key} dir={dir} onSort={toggle}>
                      Designation
                    </SortTh>
                    <SortTh id="bps" active={key} dir={dir} onSort={toggle} num>
                      BPS
                    </SortTh>
                    <SortTh id="posting" active={key} dir={dir} onSort={toggle}>
                      Posting
                    </SortTh>
                    <SortTh id="today" active={key} dir={dir} onSort={toggle}>
                      Today
                    </SortTh>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map(({ s, f, today }) => (
                    <tr key={s.id}>
                      <td data-label="Name">
                        <Link
                          to="/staff/$id"
                          params={{ id: s.id }}
                          className="inline-flex items-center gap-2 font-semibold text-ink hover:text-dept hover:underline"
                        >
                          <span
                            aria-hidden
                            className="flex size-7 items-center justify-center rounded-full bg-dept-tint text-xs font-bold text-dept"
                          >
                            {s.initials}
                          </span>
                          {s.name}
                        </Link>
                      </td>
                      <td data-label="Personal no.">
                        <Code>{s.personalNoMasked}</Code>
                      </td>
                      <td data-label="Designation">
                        {s.designation}
                        <span className="block text-xs text-ink-muted">{s.employment}</span>
                      </td>
                      <td data-label="BPS" className="num">
                        {s.bps}
                      </td>
                      <td data-label="Posting">
                        <Link
                          to={f.kind === "school" ? "/schools/$id" : "/health/$id"}
                          params={{ id: f.id }}
                          className="hover:text-dept hover:underline"
                        >
                          {f.name}
                        </Link>
                        <span className="block text-xs text-ink-muted">{f.tehsil}</span>
                      </td>
                      <td data-label="Today">
                        <Pill tone={STAFF_STATUS_TONE[today] ?? "neutral"}>{today}</Pill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </PaginatedRegister>
        </>
      )}
    </Panel>
  );
}

function PostsAndVacancies({ facilities }: { facilities: Facility[] }) {
  const [view, setView] = useState<"facility" | "designation">("facility");
  const scoped = posts.filter((p) => facilities.some((f) => f.id === p.facilityId));
  const byFacility = facilities
    .map((f) => {
      const lines = scoped.filter((p) => p.facilityId === f.id);
      const sanctioned = lines.reduce((a, p) => a + p.sanctioned, 0);
      const filled = lines.reduce((a, p) => a + p.filled, 0);
      return {
        f,
        sanctioned,
        filled,
        vacant: sanctioned - filled,
        lines: lines.filter((p) => p.sanctioned > p.filled),
      };
    })
    .sort((a, b) => b.vacant - a.vacant || a.f.name.localeCompare(b.f.name));
  const designations = Array.from(new Set(scoped.map((p) => p.designation))) as Designation[];
  const byDesignation = designations
    .map((d) => {
      const lines = scoped.filter((p) => p.designation === d);
      const sanctioned = lines.reduce((a, p) => a + p.sanctioned, 0);
      const filled = lines.reduce((a, p) => a + p.filled, 0);
      return {
        d,
        sanctioned,
        filled,
        vacant: sanctioned - filled,
        facilities: lines.filter((p) => p.sanctioned > p.filled).length,
      };
    })
    .sort((a, b) => b.vacant - a.vacant);

  const exportCsv = () =>
    downloadCsv(
      "dcms-bannu-posts-2026-11-23.csv",
      view === "facility"
        ? byFacility.map((x) => ({
            Facility: x.f.name,
            Code: x.f.code,
            Tehsil: x.f.tehsil,
            Sanctioned: x.sanctioned,
            Filled: x.filled,
            Vacant: x.vacant,
          }))
        : byDesignation.map((x) => ({
            Designation: x.d,
            Sanctioned: x.sanctioned,
            Filled: x.filled,
            Vacant: x.vacant,
            "Facilities with a vacancy": x.facilities,
          })),
    );

  return (
    <Panel
      title="Posts and vacancies"
      aside={
        <div className="flex items-center gap-2">
          <Segmented
            size="sm"
            label="Group posts by"
            value={view}
            onChange={setView}
            options={[
              { value: "facility", label: "By facility" },
              { value: "designation", label: "By designation" },
            ]}
          />
          <Button variant="outline" size="sm" onClick={exportCsv}>
            Export CSV
          </Button>
        </div>
      }
    >
      <div className="overflow-x-auto">
        {view === "facility" ? (
          <PaginatedRegister
            items={byFacility}
            label="facilities"
            resetKey={JSON.stringify([view, facilities.map((f) => f.id)])}
          >
            {(pageRows) => (
              <table className="ledger">
                <thead>
                  <tr>
                    <th scope="col">Facility</th>
                    <th scope="col">Tehsil</th>
                    <th scope="col" className="num">
                      Sanctioned
                    </th>
                    <th scope="col" className="num">
                      Filled
                    </th>
                    <th scope="col" className="num">
                      Vacant
                    </th>
                    <th scope="col">Vacant posts</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((x) => (
                    <tr key={x.f.id}>
                      <td data-label="Facility">
                        <Link
                          to={x.f.kind === "school" ? "/schools/$id" : "/health/$id"}
                          params={{ id: x.f.id }}
                          className="font-semibold text-ink hover:text-dept hover:underline"
                        >
                          {x.f.name}
                        </Link>
                        <span className="block">
                          <Code className="text-xs text-ink-muted">{x.f.code}</Code>
                        </span>
                      </td>
                      <td data-label="Tehsil">{x.f.tehsil}</td>
                      <td data-label="Sanctioned" className="num">
                        {x.sanctioned}
                      </td>
                      <td data-label="Filled" className="num">
                        {x.filled}
                      </td>
                      <td
                        data-label="Vacant"
                        className={cn("num", x.vacant > 0 && "font-semibold text-pending")}
                      >
                        {x.vacant}
                      </td>
                      <td data-label="Vacant posts" className="text-xs text-ink-muted">
                        {x.lines.length === 0
                          ? "None"
                          : x.lines
                              .map((l) => `${l.sanctioned - l.filled} ${l.designation}`)
                              .join(", ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </PaginatedRegister>
        ) : (
          <PaginatedRegister
            items={byDesignation}
            label="designations"
            resetKey={JSON.stringify([view, facilities.map((f) => f.id)])}
          >
            {(pageRows) => (
              <table className="ledger">
                <thead>
                  <tr>
                    <th scope="col">Designation</th>
                    <th scope="col" className="num">
                      Sanctioned
                    </th>
                    <th scope="col" className="num">
                      Filled
                    </th>
                    <th scope="col" className="num">
                      Vacant
                    </th>
                    <th scope="col" className="num">
                      Filled %
                    </th>
                    <th scope="col" className="num">
                      Facilities with a vacancy
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((x) => (
                    <tr key={x.d}>
                      <td data-label="Designation" className="font-semibold">
                        {x.d}
                      </td>
                      <td data-label="Sanctioned" className="num">
                        {x.sanctioned}
                      </td>
                      <td data-label="Filled" className="num">
                        {x.filled}
                      </td>
                      <td
                        data-label="Vacant"
                        className={cn("num", x.vacant > 0 && "font-semibold text-pending")}
                      >
                        {x.vacant}
                      </td>
                      <td data-label="Filled %" className="num">
                        {pct(x.filled, x.sanctioned)}%
                      </td>
                      <td data-label="Facilities with a vacancy" className="num">
                        {x.facilities}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </PaginatedRegister>
        )}
      </div>
    </Panel>
  );
}

function Exceptions({ rows }: { rows: Row[] }) {
  const items = useMemo(() => {
    return rows
      .map((x) => {
        const h = staffHistory(x.s.id, 30, undefined, x.today);
        const working = h.filter(
          (d) => d.mark !== "Off" && d.mark !== "Holiday" && d.mark !== "Not reported",
        );
        const absent = working.filter((d) => d.mark === "Absent").length;
        const late = working.filter((d) => d.mark === "Late").length;
        const leave = working.filter((d) => d.mark === "Approved leave").length;
        const reason =
          x.today === "Absent" && absent >= 3
            ? "Absent today and 3 or more absences in 30 days"
            : absent >= 3
              ? `${absent} absences in the last 30 days`
              : leave >= 6
                ? `${leave} leave days in the last 30 days`
                : late >= 4
                  ? `${late} late arrivals in the last 30 days`
                  : null;
        return { ...x, absent, late, leave, working: working.length, reason };
      })
      .filter((x) => x.reason)
      .sort(
        (a, b) =>
          (a.today === "Absent" ? -1 : 0) - (b.today === "Absent" ? -1 : 0) ||
          b.absent - a.absent ||
          b.leave - a.leave,
      );
  }, [rows]);

  const exportCsv = () =>
    downloadCsv(
      "dcms-bannu-attendance-exceptions-2026-11-23.csv",
      items.map((x) => ({
        Name: x.s.name,
        Designation: x.s.designation,
        Posting: x.f.name,
        "Today's status": x.today,
        "Absent (30 days)": x.absent,
        "Late (30 days)": x.late,
        "Leave (30 days)": x.leave,
        "Working days": x.working,
        Why: x.reason ?? "",
      })),
    );

  return (
    <Panel
      title="Absence and leave exceptions"
      aside={
        <div className="flex items-center gap-2">
          <span>{items.length} staff for a second look</span>
          <Button variant="outline" size="sm" onClick={exportCsv}>
            Export CSV
          </Button>
        </div>
      }
    >
      <p className="border-b border-line px-4 py-2 text-xs text-ink-muted">
        Listed when a pattern stands out over the last 30 days. An exception is a prompt to check
        the record with the facility head, not a finding against the person.
      </p>
      {items.length === 0 ? (
        <EmptyState
          title="No exceptions in this scope."
          hint="Nobody has 3 or more absences, 6 leave days or 4 late arrivals in the last 30 days."
        />
      ) : (
        <PaginatedRegister
          items={items}
          label="exceptions"
          resetKey={JSON.stringify(rows.map((x) => x.s.id))}
        >
          {(pageRows) => (
            <table className="ledger">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Posting</th>
                  <th scope="col">Today</th>
                  <th scope="col" className="num">
                    Absent
                  </th>
                  <th scope="col" className="num">
                    Leave
                  </th>
                  <th scope="col" className="num">
                    Late
                  </th>
                  <th scope="col">Why listed</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((x) => (
                  <tr key={x.s.id}>
                    <td data-label="Name">
                      <Link
                        to="/staff/$id"
                        params={{ id: x.s.id }}
                        className="font-semibold text-ink hover:text-dept hover:underline"
                      >
                        {x.s.name}
                      </Link>
                      <span className="block text-xs text-ink-muted">{x.s.designation}</span>
                    </td>
                    <td data-label="Posting">{x.f.name}</td>
                    <td data-label="Today">
                      <Pill tone={STAFF_STATUS_TONE[x.today] ?? "neutral"}>{x.today}</Pill>
                    </td>
                    <td
                      data-label="Absent"
                      className={cn("num", x.absent >= 3 && "font-semibold text-problem")}
                    >
                      {x.absent} of {x.working}
                    </td>
                    <td data-label="Leave" className="num">
                      {x.leave}
                    </td>
                    <td data-label="Late" className="num">
                      {x.late}
                    </td>
                    <td data-label="Why listed" className="text-xs text-ink-muted">
                      {x.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </PaginatedRegister>
      )}
    </Panel>
  );
}
