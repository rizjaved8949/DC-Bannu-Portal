import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  Ambulance,
  Banknote,
  BedDouble,
  Building2,
  ClipboardCheck,
  GraduationCap,
  HeartPulse,
  MapPinned,
  ShieldCheck,
  Smartphone,
  Stethoscope,
  TriangleAlert,
  UsersRound,
  Wallet,
} from "lucide-react";

import { DistrictRegister } from "@/components/dcms/district-register";
import { ChannelIcon } from "@/components/dcms/channel";
import { KpiTile } from "@/components/dcms/kpi-tile";
import {
  AttendanceTrend,
  CoverageByTehsil,
  ReviewByType,
  ShiftsBelowMinimum,
} from "@/components/dcms/overview/charts";
import { IncomingFeed } from "@/components/dcms/overview/incoming-feed";
import { ReportingBoard } from "@/components/dcms/overview/reporting-board";
import { PageHeader } from "@/components/dcms/page-header";
import { Panel } from "@/components/dcms/section";
import { FilterBar } from "@/components/dcms/filter-bar";
import { STATUS_TONE, TONE_VAR, Pill } from "@/components/dcms/status";
import {
  facilityById,
  hhmm,
  LAST_SYNC,
  REPORT_STATUS_ORDER,
  STATUS_LABEL,
  staffByFacility,
  schoolDays,
  isAccepted,
  budgetLines,
} from "@/data/mock";
import { useApp, useScopedFacilities } from "@/lib/app-state";
import {
  districtSummary,
  pct,
  budgetSummary,
  patientSummary,
  formatPkr,
  schoolStaffCounts,
  schoolStudentCounts,
} from "@/lib/metrics";
import { downloadCsv } from "@/lib/csv";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Overview · DCMS Bannu" },
      {
        name: "description",
        content:
          "Today's reporting board, incoming reports and district indicators for Bannu.",
      },
      { property: "og:title", content: "Overview · DCMS Bannu" },
      {
        property: "og:description",
        content:
          "Today's reporting board, incoming reports and district indicators for Bannu.",
      },
    ],
  }),
  component: OverviewPage,
});

function OverviewPage() {
  const {
    statusFor,
    reviewItems,
    role,
    lastSync,
    clockMin,
    reports,
    schoolDayFor,
    shiftFor,
  } = useApp();
  const facilities = useScopedFacilities();
  const s = districtSummary(facilities, statusFor, { schoolDayFor, shiftFor });
  const ids = new Set(facilities.map((f) => f.id));
  const critical = reviewItems.filter(
    (r) =>
      r.severity === "Critical" && r.status !== "Closed" && ids.has(r.facilityId),
  );
  const openItems = reviewItems.filter(
    (r) => r.status !== "Closed" && ids.has(r.facilityId),
  );
  const lastReceivedMin = reports
    .filter((r) => ids.has(r.facilityId) && r.receivedAt != null)
    .reduce((m, r) => Math.max(m, r.receivedAt ?? 0), 0);
  const lastReceived = lastReceivedMin ? hhmm(lastReceivedMin) : LAST_SYNC;

  const showSchools = !role.department || role.department === "Education";
  const showHealth = !role.department || role.department === "Health";
  const facilityWord =
    role.department === "Education"
      ? "schools"
      : role.department === "Health"
        ? "health facilities"
        : "facilities";
  const distribution = REPORT_STATUS_ORDER.map((status) => ({
    status,
    count: facilities.filter((f) => statusFor(f.id) === status).length,
  }));

  const schoolFacilities = facilities.filter((f) => f.kind === "school");
  const healthFacilities = facilities.filter((f) => f.kind === "health");
  const healthIds = healthFacilities.map((f) => f.id);
  const ps = patientSummary(healthIds);
  const bs = budgetSummary(role.department);

  const schoolsReported = schoolFacilities.filter((f) =>
    isAccepted(statusFor(f.id)),
  ).length;
  const totalStudentsEnrolled = schoolFacilities.reduce((sum, f) => {
    const c = schoolStudentCounts(f, statusFor(f.id), schoolDayFor(f.id));
    return sum + c.enrolled;
  }, 0);
  const totalStudentsPresent = schoolFacilities.reduce((sum, f) => {
    const c = schoolStudentCounts(f, statusFor(f.id), schoolDayFor(f.id));
    return sum + (c.present ?? 0);
  }, 0);
  const schoolStaffPresent = schoolFacilities.reduce((sum, f) => {
    const c = schoolStaffCounts(f, statusFor(f.id), schoolDayFor(f.id));
    return sum + (c.present ?? 0);
  }, 0);
  const schoolStaffTotal = schoolFacilities.reduce((sum, f) => {
    const c = schoolStaffCounts(f, statusFor(f.id), schoolDayFor(f.id));
    return sum + (c.present != null ? c.total : 0);
  }, 0);

  const exportCsv = () =>
    downloadCsv(
      "dcms-bannu-overview-2026-11-23.csv",
      facilities.map((f) => ({
        Facility: f.name,
        Code: f.code,
        Department: f.department,
        Tehsil: f.tehsil,
        Status: STATUS_LABEL[statusFor(f.id)],
        Channel: reportForChannel(f.id),
        Received: hhmm(
          reports.find((r) => r.facilityId === f.id)?.receivedAt,
        ),
      })),
    );
  const reportForChannel = (id: string) =>
    reports.find((r) => r.facilityId === id)?.channel ??
    facilityById[id]?.channel ??
    "";

  return (
    <div className="space-y-5">
      <PageHeader
        title="Overview"
        urdu="ضلعی جائزہ"
        description={`A clear view of today's reporting, people and public services across ${role.scopeLabel === "Whole district" ? "District Bannu" : role.scopeLabel.toLowerCase()}.`}
      />

      <DistrictRegister facilities={facilities} />
      <FilterBar onExportCsv={exportCsv} />

      {critical.length > 0 && (
        <div className="overview-alert">
          <TriangleAlert className="size-5 text-pending" />
          <div>
            <p className="text-sm font-semibold text-ink">
              {critical.length} critical{" "}
              {critical.length === 1 ? "item needs" : "items need"} your
              attention
            </p>
            <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-muted">
              {critical.slice(0, 3).map((c) => (
                <Link
                  key={c.id}
                  to="/review"
                  search={{ item: c.id }}
                  className="underline decoration-pending/30 underline-offset-3 hover:text-kurram"
                >
                  {facilityById[c.facilityId]?.name}:{" "}
                  {c.detected.replace(/\.$/, "")}
                </Link>
              ))}
            </div>
          </div>
          <Link
            to="/review"
            className="shrink-0 rounded-sm border border-pending/30 bg-surface px-3 py-1.5 text-xs font-semibold text-ink hover:bg-subtle"
          >
            Review issues
          </Link>
        </div>
      )}

      {/* ── Key numbers bar ── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiTile
          label="Reported today"
          value={s.reported}
          sub={`of ${s.total} ${facilityWord}`}
          tone={
            s.reported / Math.max(1, s.total) > 0.7 ? "verified" : "pending"
          }
          freshness={`Received up to ${lastReceived}`}
        />
        <KpiTile
          label="Staff present"
          value={
            s.staffTotal
              ? `${pct(s.staffPresent, s.staffTotal)}%`
              : "No data"
          }
          sub={`${s.staffPresent} of ${s.staffTotal} in reporting ${facilityWord}`}
          tone="verified"
          freshness={
            showSchools
              ? `From ${s.schoolsWithStaffData} accepted school reports${showHealth ? " and morning shifts" : ""}`
              : "From morning shift rosters"
          }
        />
        {showHealth && (
          <KpiTile
            label="Shift coverage"
            value={
              s.shiftRequired
                ? `${pct(s.shiftOnSite, s.shiftRequired, 0)}%`
                : "No data"
            }
            sub={`${s.shiftOnSite} of ${s.shiftRequired} required posts on site`}
            tone={s.shiftsBelow > 0 ? "pending" : "verified"}
            freshness={`Morning shift, observed 08:00 to ${hhmm(clockMin)}`}
          />
        )}
        <KpiTile
          label="Pending verification"
          value={s.pending}
          sub="received, not yet checked"
          tone="pending"
          freshness="Updated as reports are accepted"
        />
        <KpiTile
          label="Critical issues"
          value={critical.length}
          sub={
            critical.length === 1
              ? "open critical item"
              : "open critical items"
          }
          tone={critical.length ? "problem" : "neutral"}
          freshness={
            critical.length
              ? `Oldest raised ${hhmm(Math.min(...critical.map((c) => c.createdMin)))}`
              : "Nothing critical right now"
          }
        />
        <KpiTile
          label="Stale records"
          value={s.staleRecords}
          sub="checklist items older than 3 days"
          tone={s.staleRecords ? "pending" : "neutral"}
          freshness="Checked against 23 Nov"
        />
      </div>

      {/* ── Department summaries side by side ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {showHealth && (
          <Panel
            title={
              <span className="flex items-center gap-2">
                <HeartPulse className="size-[18px] text-kurram" />
                Health facilities — today's snapshot
              </span>
            }
            aside={`${healthFacilities.length} facilities`}
            bodyClassName="p-4"
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatBox
                icon={<Stethoscope className="size-4" />}
                label="OPD patients"
                value={ps.opdTotal.toLocaleString("en")}
                sub="since 08:00"
              />
              <StatBox
                icon={<Ambulance className="size-4" />}
                label="Emergency cases"
                value={ps.emergencyTotal.toString()}
                sub="today"
              />
              <StatBox
                icon={<BedDouble className="size-4" />}
                label="Beds occupied"
                value={`${ps.bedsOccupied} / ${ps.bedsTotal}`}
                sub={`${pct(ps.bedsOccupied, ps.bedsTotal, 0)}% occupancy`}
              />
              <StatBox
                label="Admissions"
                value={ps.admissionsTotal.toString()}
                sub="today"
              />
              <StatBox
                label="Discharges"
                value={ps.dischargesToday.toString()}
                sub="today"
              />
              <StatBox
                label="Referrals out"
                value={ps.referralsTotal.toString()}
                sub="to higher facility"
              />
            </div>
            {ps.icuTotal > 0 && (
              <div className="mt-3 flex items-center gap-2 rounded-md border border-line bg-subtle px-3 py-2 text-xs">
                <AlertTriangle
                  className={cn(
                    "size-4 shrink-0",
                    ps.icuOccupied / ps.icuTotal > 0.85
                      ? "text-problem"
                      : "text-ink-muted",
                  )}
                />
                <span>
                  ICU: <strong>{ps.icuOccupied}</strong> of{" "}
                  <strong>{ps.icuTotal}</strong> beds occupied (
                  {pct(ps.icuOccupied, ps.icuTotal, 0)}%)
                </span>
              </div>
            )}
            <div className="mt-3 text-right">
              <Link
                to="/health"
                className="text-xs font-semibold text-kurram hover:underline"
              >
                View all health facilities →
              </Link>
            </div>
          </Panel>
        )}

        {showSchools && (
          <Panel
            title={
              <span className="flex items-center gap-2">
                <GraduationCap className="size-[18px] text-kurram" />
                Schools — today's snapshot
              </span>
            }
            aside={`${schoolFacilities.length} schools`}
            bodyClassName="p-4"
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatBox
                icon={<Building2 className="size-4" />}
                label="Schools reported"
                value={`${schoolsReported} / ${schoolFacilities.length}`}
                sub={`${pct(schoolsReported, schoolFacilities.length, 0)}% coverage`}
              />
              <StatBox
                icon={<UsersRound className="size-4" />}
                label="Students present"
                value={totalStudentsPresent.toLocaleString("en")}
                sub={`of ${totalStudentsEnrolled.toLocaleString("en")} enrolled`}
              />
              <StatBox
                label="Student attendance"
                value={
                  totalStudentsEnrolled
                    ? `${pct(totalStudentsPresent, totalStudentsEnrolled, 0)}%`
                    : "—"
                }
                sub="present / enrolled"
              />
              <StatBox
                label="Staff present"
                value={schoolStaffPresent.toString()}
                sub={`of ${schoolStaffTotal} in reporting schools`}
              />
              <StatBox
                label="Staff attendance"
                value={
                  schoolStaffTotal
                    ? `${pct(schoolStaffPresent, schoolStaffTotal, 0)}%`
                    : "—"
                }
                sub="teachers & support"
              />
              <StatBox
                label="No report yet"
                value={(
                  schoolFacilities.length - schoolsReported
                ).toString()}
                sub="awaiting report"
                warn={schoolFacilities.length - schoolsReported > 5}
              />
            </div>
            <div className="mt-3 text-right">
              <Link
                to="/schools"
                className="text-xs font-semibold text-kurram hover:underline"
              >
                View all schools →
              </Link>
            </div>
          </Panel>
        )}
      </div>

      {/* ── Finance & budget ── */}
      <Panel
        title={
          <span className="flex items-center gap-2">
            <Wallet className="size-[18px] text-kurram" />
            Budget & expenditure — FY 2026-27
          </span>
        }
        aside="Year to date (Jul–Nov)"
        bodyClassName="p-4"
      >
        <BudgetOverview
          showSchools={showSchools}
          showHealth={showHealth}
          budget={bs}
        />
      </Panel>

      {/* ── Reporting board + feed ── */}
      <div className="grid gap-4 xl:grid-cols-12">
        <Panel
          className="flex flex-col xl:col-span-8"
          title={
            <span className="flex items-center gap-2">
              <MapPinned className="size-[18px] text-kurram" />
              Today's reporting board
            </span>
          }
          aside={
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-kurram" />
              Synced{" "}
              <span className="tabular-nums text-ink">{lastSync}</span>
            </span>
          }
          bodyClassName="flex-1 px-5 py-5"
        >
          <div className="coverage-summary">
            <div className="coverage-number num">
              {s.reported}
              <small> / {s.total}</small>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">
                {facilityWord.charAt(0).toUpperCase() +
                  facilityWord.slice(1)}{" "}
                reported today
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-ink-muted">
                <span className="inline-flex items-center gap-1">
                  <ChannelIcon channel="sms" className="size-3.5" />
                  {s.bySms} by SMS
                </span>
                <span>·</span>
                <span>{s.noReport} awaiting a report</span>
                <span>·</span>
                <span>{s.rejected} need a resend</span>
              </p>
              <div
                className="coverage-progress mt-3"
                aria-label="Facility reporting status distribution"
              >
                {distribution
                  .filter((d) => d.count)
                  .map((d) => (
                    <span
                      key={d.status}
                      style={{
                        width: `${(d.count / Math.max(s.total, 1)) * 100}%`,
                        background: TONE_VAR[STATUS_TONE[d.status]],
                      }}
                      title={`${d.count} ${STATUS_LABEL[d.status]}`}
                    />
                  ))}
              </div>
            </div>
            <div className="hidden self-start rounded-sm border border-line bg-subtle px-2 py-1 text-xs text-ink-muted sm:block">
              {pct(s.reported, s.total, 0)}% coverage
            </div>
          </div>
          <ReportingBoard facilities={facilities} />
          <p className="mt-3 text-2xs text-ink-muted">
            Each square is one facility. Select a square to open its record.
          </p>
        </Panel>
        <div className="xl:col-span-4">
          <IncomingFeed />
        </div>
      </div>

      {/* ── Charts ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Coverage by tehsil"
          aside="Today's reporting completeness"
          bodyClassName="px-2 py-3"
        >
          <CoverageByTehsil facilities={facilities} statusFor={statusFor} />
        </Panel>
        <Panel
          title={
            <span className="flex items-center gap-2">
              <Activity className="size-[18px] text-kurram" />
              Staff attendance
            </span>
          }
          aside="Last 14 days · % of rostered staff"
          bodyClassName="px-2 py-3"
        >
          <AttendanceTrend
            facilities={facilities}
            showSchools={showSchools}
            showHealth={showHealth}
          />
        </Panel>
        {showHealth && (
          <Panel
            title="Health shifts below minimum"
            aside={`${s.healthCount} facilities, 3 shifts each`}
            bodyClassName="px-2 py-3"
          >
            <ShiftsBelowMinimum facilities={facilities} />
          </Panel>
        )}
        <Panel
          title="Open review items by type"
          aside={`${openItems.length} open or in review`}
          bodyClassName="px-2 py-3"
        >
          <ReviewByType items={reviewItems} facilities={facilities} />
        </Panel>
      </div>

      {/* ── Quick navigation ── */}
      <div className="panel grid overflow-hidden md:grid-cols-4">
        {showSchools && (
          <Link to="/schools" className="overview-shortcut">
            <span className="overview-shortcut-icon">
              <GraduationCap className="size-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold">Education</span>
              <span className="text-xs text-ink-muted">
                {schoolFacilities.length} schools in scope
              </span>
            </span>
          </Link>
        )}
        {showHealth && (
          <Link to="/health" className="overview-shortcut">
            <span className="overview-shortcut-icon">
              <HeartPulse className="size-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold">
                Public health
              </span>
              <span className="text-xs text-ink-muted">
                {s.healthCount} facilities in scope
              </span>
            </span>
          </Link>
        )}
        <Link to="/review" className="overview-shortcut">
          <span className="overview-shortcut-icon">
            <ClipboardCheck className="size-5" />
          </span>
          <span>
            <span className="block text-sm font-semibold">Review queue</span>
            <span className="text-xs text-ink-muted">
              {openItems.length} items to follow up
            </span>
          </span>
        </Link>
        <Link to="/field-app" className="overview-shortcut">
          <span className="overview-shortcut-icon">
            <Smartphone className="size-5" />
          </span>
          <span>
            <span className="block text-sm font-semibold">
              Field reporting
            </span>
            <span className="text-xs text-ink-muted">
              Explore the offline app
            </span>
          </span>
        </Link>
      </div>
    </div>
  );
}

function StatBox({
  icon,
  label,
  value,
  sub,
  warn,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  warn?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-md border border-line px-3 py-2.5",
        warn ? "border-pending/40 bg-pending-tint/50" : "bg-subtle",
      )}
    >
      <div className="flex items-center gap-1.5 text-2xs text-ink-muted">
        {icon}
        {label}
      </div>
      <div
        className={cn(
          "mt-1 text-lg font-bold tabular-nums",
          warn ? "text-pending" : "text-ink",
        )}
      >
        {value}
      </div>
      <div className="text-2xs text-ink-muted">{sub}</div>
    </div>
  );
}

function BudgetOverview({
  showSchools,
  showHealth,
  budget,
}: {
  showSchools: boolean;
  showHealth: boolean;
  budget: ReturnType<typeof budgetSummary>;
}) {
  const eduBudget = budgetSummary("Education");
  const healthBudget = budgetSummary("Health");

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatBox
          icon={<Banknote className="size-4" />}
          label="Total allocated"
          value={`PKR ${formatPkr(budget.allocated)}`}
          sub={`${showSchools && showHealth ? "Education + Health" : showSchools ? "Education" : "Health"}`}
        />
        <StatBox
          label="Spent to date"
          value={`PKR ${formatPkr(budget.spent)}`}
          sub={`${pct(budget.spent, budget.allocated, 0)}% utilisation`}
        />
        <StatBox
          label="Committed (incl. orders)"
          value={`PKR ${formatPkr(budget.committed)}`}
          sub={`${pct(budget.committed, budget.allocated, 0)}% of budget`}
        />
      </div>

      {showSchools && showHealth && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-line p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-ink">
              <GraduationCap className="size-4 text-kurram" />
              Education budget
            </div>
            <BudgetBar
              allocated={eduBudget.allocated}
              spent={eduBudget.spent}
            />
            <div className="mt-1 text-2xs text-ink-muted">
              PKR {formatPkr(eduBudget.spent)} spent of PKR{" "}
              {formatPkr(eduBudget.allocated)} (
              {pct(eduBudget.spent, eduBudget.allocated, 0)}%)
            </div>
          </div>
          <div className="rounded-md border border-line p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-ink">
              <HeartPulse className="size-4 text-kurram" />
              Health budget
            </div>
            <BudgetBar
              allocated={healthBudget.allocated}
              spent={healthBudget.spent}
            />
            <div className="mt-1 text-2xs text-ink-muted">
              PKR {formatPkr(healthBudget.spent)} spent of PKR{" "}
              {formatPkr(healthBudget.allocated)} (
              {pct(healthBudget.spent, healthBudget.allocated, 0)}%)
            </div>
          </div>
        </div>
      )}

      <details className="text-sm">
        <summary className="cursor-pointer text-xs font-semibold text-kurram hover:underline">
          View budget breakdown by category
        </summary>
        <div className="mt-2 overflow-x-auto">
          <table className="ledger">
            <thead>
              <tr>
                <th scope="col">Category</th>
                <th scope="col">Department</th>
                <th scope="col" className="num">
                  Allocated
                </th>
                <th scope="col" className="num">
                  Spent
                </th>
                <th scope="col" className="num">
                  Utilisation
                </th>
              </tr>
            </thead>
            <tbody>
              {budget.lines.map((line, i) => (
                <tr key={i}>
                  <td data-label="Category">{line.category}</td>
                  <td data-label="Department">{line.department}</td>
                  <td data-label="Allocated" className="num">
                    {formatPkr(line.allocated)}
                  </td>
                  <td data-label="Spent" className="num">
                    {formatPkr(line.spent)}
                  </td>
                  <td data-label="Utilisation" className="num">
                    <span
                      className={cn(
                        "font-semibold",
                        line.spent / line.allocated > 0.8
                          ? "text-problem"
                          : line.spent / line.allocated > 0.6
                            ? "text-pending"
                            : "text-verified",
                      )}
                    >
                      {pct(line.spent, line.allocated, 0)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

function BudgetBar({
  allocated,
  spent,
}: {
  allocated: number;
  spent: number;
}) {
  const pctVal = Math.min(100, (spent / Math.max(1, allocated)) * 100);
  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-subtle">
      <div
        className={cn(
          "h-full rounded-full transition-all",
          pctVal > 80
            ? "bg-problem"
            : pctVal > 60
              ? "bg-pending"
              : "bg-verified",
        )}
        style={{ width: `${pctVal}%` }}
      />
    </div>
  );
}
