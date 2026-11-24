import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  ClipboardCheck,
  GraduationCap,
  HeartPulse,
  MapPinned,
  ShieldCheck,
  Smartphone,
  TriangleAlert,
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
import { STATUS_TONE, TONE_VAR } from "@/components/dcms/status";
import { facilityById, hhmm, LAST_SYNC, REPORT_STATUS_ORDER, STATUS_LABEL } from "@/data/mock";
import { useApp, useScopedFacilities } from "@/lib/app-state";
import { districtSummary, pct } from "@/lib/metrics";
import { downloadCsv } from "@/lib/csv";

// The home route ships no og:image, so serve-time hosting can inject the
// project's social preview (explicit og:image or latest screenshot).
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Overview · DCMS Bannu" },
      {
        name: "description",
        content: "Today's reporting board, incoming reports and district indicators for Bannu.",
      },
      { property: "og:title", content: "Overview · DCMS Bannu" },
      {
        property: "og:description",
        content: "Today's reporting board, incoming reports and district indicators for Bannu.",
      },
    ],
  }),
  component: OverviewPage,
});

function OverviewPage() {
  const { statusFor, reviewItems, role, lastSync, clockMin, reports, schoolDayFor, shiftFor } =
    useApp();
  const facilities = useScopedFacilities();
  const s = districtSummary(facilities, statusFor, { schoolDayFor, shiftFor });
  const ids = new Set(facilities.map((f) => f.id));
  const critical = reviewItems.filter(
    (r) => r.severity === "Critical" && r.status !== "Closed" && ids.has(r.facilityId),
  );
  const openItems = reviewItems.filter((r) => r.status !== "Closed" && ids.has(r.facilityId));
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
        Received: hhmm(reports.find((r) => r.facilityId === f.id)?.receivedAt),
      })),
    );
  const reportForChannel = (id: string) =>
    reports.find((r) => r.facilityId === id)?.channel ?? facilityById[id]?.channel ?? "";

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
              {critical.length} critical {critical.length === 1 ? "item needs" : "items need"} your
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
                  {facilityById[c.facilityId]?.name}: {c.detected.replace(/\.$/, "")}
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
              Synced <span className="tabular-nums text-ink">{lastSync}</span>
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
                {facilityWord.charAt(0).toUpperCase() + facilityWord.slice(1)} reported today
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

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiTile
          label="Reported today"
          value={s.reported}
          sub={`of ${s.total} ${facilityWord}`}
          tone={s.reported / Math.max(1, s.total) > 0.7 ? "verified" : "pending"}
          freshness={`Received up to ${lastReceived}`}
        />
        <KpiTile
          label="Staff present"
          value={s.staffTotal ? `${pct(s.staffPresent, s.staffTotal)}%` : "No data"}
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
            value={s.shiftRequired ? `${pct(s.shiftOnSite, s.shiftRequired, 0)}%` : "No data"}
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
          sub={critical.length === 1 ? "open critical item" : "open critical items"}
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
      <div className="panel grid overflow-hidden md:grid-cols-4">
        {showSchools && (
          <Link to="/schools" className="overview-shortcut">
            <span className="overview-shortcut-icon">
              <GraduationCap className="size-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold">Education</span>
              <span className="text-xs text-ink-muted">
                {facilities.filter((f) => f.kind === "school").length} schools in scope
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
              <span className="block text-sm font-semibold">Public health</span>
              <span className="text-xs text-ink-muted">{s.healthCount} facilities in scope</span>
            </span>
          </Link>
        )}
        <Link to="/review" className="overview-shortcut">
          <span className="overview-shortcut-icon">
            <ClipboardCheck className="size-5" />
          </span>
          <span>
            <span className="block text-sm font-semibold">Review queue</span>
            <span className="text-xs text-ink-muted">{openItems.length} items to follow up</span>
          </span>
        </Link>
        <Link to="/field-app" className="overview-shortcut">
          <span className="overview-shortcut-icon">
            <Smartphone className="size-5" />
          </span>
          <span>
            <span className="block text-sm font-semibold">Field reporting</span>
            <span className="text-xs text-ink-muted">Explore the offline app</span>
          </span>
        </Link>
      </div>
    </div>
  );
}
