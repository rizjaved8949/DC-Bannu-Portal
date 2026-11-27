import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";

import { FilterBar } from "@/components/dcms/filter-bar";
import { KpiTile } from "@/components/dcms/kpi-tile";
import { PageHeader } from "@/components/dcms/page-header";
import { Code, EmptyState, Panel } from "@/components/dcms/section";
import { SortTh } from "@/components/dcms/sort-header";
import { Pill, StatusBadge } from "@/components/dcms/status";
import { Button } from "@/components/ui/button";
import {
  isAccepted,
  hhmm,
  patientStatsById,
  facilityBillingToday,
  REPORT_STATUS_ORDER,
  SERVICES,
  SHIFT_NAMES,
  shiftCoverage,
  shiftsByFacility,
  STATUS_LABEL,
  type ShiftKey,
} from "@/data/mock";
import { downloadCsv } from "@/lib/csv";
import { useApp, useScopedFacilities } from "@/lib/app-state";
import { formatPkr, pct, patientSummary } from "@/lib/metrics";
import { useSort } from "@/lib/use-sort";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/health/")({
  head: () => ({
    meta: [
      { title: "Health facilities · DCMS Bannu" },
      {
        name: "description",
        content:
          "Shift coverage, OPD, beds and services for public health facilities in District Bannu.",
      },
      { property: "og:title", content: "Health facilities · DCMS Bannu" },
      {
        property: "og:description",
        content:
          "Shift coverage, OPD, beds and services for public health facilities in District Bannu.",
      },
    ],
  }),
  component: HealthPage,
});

type Col =
  | "name"
  | "type"
  | "tehsil"
  | "coverage"
  | "opd"
  | "beds"
  | "down"
  | "status"
  | "emergency"
  | "admissions"
  | "billing";

function HealthPage() {
  const { statusFor, reportFor, filters, resetFilters, shiftFor } = useApp();
  const list = useScopedFacilities({ kind: "health" });
  const shiftKey: ShiftKey =
    filters.shift === "Evening" ? "E" : filters.shift === "Night" ? "N" : "M";

  const rows = useMemo(
    () =>
      list.map((f) => {
        const shift = shiftFor(f.id, shiftKey)!;
        const cov = shiftCoverage(shift);
        const down = SERVICES.filter((s) => shift.services[s] === false);
        const ps = patientStatsById[f.id];
        const bill = facilityBillingToday[f.id];
        return { f, st: statusFor(f.id), r: reportFor(f.id), shift, cov, down, ps, bill };
      }),
    [list, shiftKey, statusFor, reportFor, shiftFor],
  );

  const { sorted, key, dir, toggle } = useSort<(typeof rows)[number], Col>(
    rows,
    {
      name: (x) => x.f.name,
      type: (x) => ["DHQ", "WCH", "RHC", "BHU"].indexOf(x.f.healthType!),
      tehsil: (x) => x.f.tehsil,
      coverage: (x) => x.cov.covered / Math.max(1, x.cov.required),
      opd: (x) => x.shift.opd ?? -1,
      beds: (x) => x.shift.bedsAvailable,
      down: (x) => x.down.length,
      status: (x) => REPORT_STATUS_ORDER.indexOf(x.st),
      emergency: (x) => x.ps?.emergencyToday ?? -1,
      admissions: (x) => x.ps?.admissionsToday ?? -1,
      billing: (x) => x.bill?.totalCollected ?? -1,
    },
    "type",
  );

  const reported = rows.filter(
    (x) => x.st === "received" || x.st === "pending" || x.st === "verified",
  ).length;
  const covered = rows.reduce(
    (a, x) => a + (isAccepted(x.st) && x.shift.phase !== "upcoming" ? x.cov.covered : 0),
    0,
  );
  const required = rows.reduce((a, x) => a + x.cov.required, 0);
  const below = rows.filter(
    (x) => isAccepted(x.st) && x.shift.phase !== "upcoming" && x.cov.belowMinimum,
  ).length;
  const opd = rows.reduce((a, x) => a + (isAccepted(x.st) ? (x.shift.opd ?? 0) : 0), 0);
  const servicesDown = rows.reduce(
    (a, x) => a + (isAccepted(x.st) && x.shift.phase !== "upcoming" ? x.down.length : 0),
    0,
  );
  const shiftName = SHIFT_NAMES[shiftKey];

  const exportCsv = () =>
    downloadCsv(
      `dcms-bannu-health-${shiftKey}-2026-11-23.csv`,
      sorted.map((x) => ({
        Facility: x.f.name,
        Code: x.f.code,
        Type: x.f.typeLabel,
        Tehsil: x.f.tehsil,
        Shift: x.shift.id,
        "On site": x.cov.covered,
        Required: x.cov.required,
        "OPD today": x.shift.opd ?? "",
        "Beds available": x.shift.bedsAvailable,
        "Beds total": x.shift.bedsTotal,
        "Services down": x.down.join("; "),
        "Report status": STATUS_LABEL[x.st],
        "Last received": x.r?.receivedAt != null ? hhmm(x.r.receivedAt) : "",
      })),
    );

  return (
    <div>
      <PageHeader
        title="Health facilities"
        urdu="صحت کے مراکز"
        description="Patients seen, emergency load, beds, shift coverage and revenue collected, by facility. Open any facility for its daybook, doctors and billing."
      />
      <div className="mt-4">
        <FilterBar showDepartment={false} showShift onExportCsv={exportCsv} />
      </div>

      {(() => {
        const ps = patientSummary(rows.map((x) => x.f.id));
        const totalBilling = rows.reduce((a, x) => a + (x.bill?.totalCollected ?? 0), 0);
        const totalWaived = rows.reduce((a, x) => a + (x.bill?.totalWaived ?? 0), 0);
        return (
          <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            <KpiTile
              label="Reported today"
              value={reported}
              sub={`of ${rows.length} facilities`}
              tone={reported / Math.max(1, rows.length) > 0.7 ? "verified" : "pending"}
              freshness="Morning shift report, accepted by server"
            />
            <KpiTile
              label={`${shiftName} shift coverage`}
              value={required ? `${pct(covered, required, 0)}%` : "—"}
              sub={`${covered} of ${required} required posts on site`}
              tone={below ? "pending" : "verified"}
              freshness={`${below} ${below === 1 ? "facility" : "facilities"} below minimum`}
            />
            <KpiTile
              label="OPD patients"
              value={ps.opdTotal.toLocaleString("en")}
              sub="patients seen since 08:00"
              tone="kurram"
              freshness="Across all reporting facilities"
            />
            <KpiTile
              label="Emergency cases"
              value={ps.emergencyTotal.toString()}
              sub="today across all facilities"
              tone={ps.emergencyTotal > 50 ? "pending" : "neutral"}
              freshness="From facility daybooks"
            />
            <KpiTile
              label="Beds occupied"
              value={ps.bedsTotal ? `${pct(ps.bedsOccupied, ps.bedsTotal, 0)}%` : "—"}
              sub={`${ps.bedsOccupied} of ${ps.bedsTotal} beds`}
              tone={ps.bedsOccupied / Math.max(1, ps.bedsTotal) > 0.85 ? "problem" : "verified"}
              freshness="Current occupancy rate"
            />
            <KpiTile
              label="Admissions today"
              value={ps.admissionsTotal.toString()}
              sub={`${ps.dischargesToday} discharged · ${ps.referralsTotal} referred`}
              tone="sent"
              freshness="From patient daybook"
            />
            <KpiTile
              label="Revenue collected"
              value={`₨${formatPkr(totalBilling)}`}
              sub={`₨${formatPkr(totalWaived)} waived (free treatment)`}
              tone="verified"
              freshness="OPD + lab + bed + surgery + medicine"
            />
            <KpiTile
              label="Services down"
              value={servicesDown}
              sub={`across ${rows.filter((x) => x.down.length).length} facilities`}
              tone={servicesDown ? "problem" : "neutral"}
              freshness={`${shiftName} shift handover`}
            />
          </div>
        );
      })()}

      <Panel
        title={`Facilities, ${shiftName.toLowerCase()} shift`}
        aside={rows[0]?.shift.rangeLabel}
      >
        {sorted.length === 0 ? (
          <EmptyState
            title="No health facilities match these filters."
            hint="Clear the tehsil filter to see the whole district."
            action={
              <Button variant="outline" size="sm" onClick={resetFilters}>
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
                    Facility
                  </SortTh>
                  <SortTh id="type" active={key} dir={dir} onSort={toggle}>
                    Type
                  </SortTh>
                  <SortTh id="tehsil" active={key} dir={dir} onSort={toggle}>
                    Tehsil
                  </SortTh>
                  <SortTh id="coverage" active={key} dir={dir} onSort={toggle} num>
                    Shift coverage
                  </SortTh>
                  <SortTh id="opd" active={key} dir={dir} onSort={toggle} num>
                    OPD today
                  </SortTh>
                  <SortTh id="beds" active={key} dir={dir} onSort={toggle} num>
                    Beds available
                  </SortTh>
                  <SortTh id="down" active={key} dir={dir} onSort={toggle}>
                    Services down
                  </SortTh>
                  <SortTh id="emergency" active={key} dir={dir} onSort={toggle} num>
                    Emergency
                  </SortTh>
                  <SortTh id="admissions" active={key} dir={dir} onSort={toggle} num>
                    Admissions
                  </SortTh>
                  <SortTh id="billing" active={key} dir={dir} onSort={toggle} num>
                    Revenue
                  </SortTh>
                  <SortTh id="status" active={key} dir={dir} onSort={toggle}>
                    Report status
                  </SortTh>
                </tr>
              </thead>
              <tbody>
                {sorted.map(({ f, st, shift, cov, down, ps, bill }) => (
                  <tr key={f.id}>
                    <td data-label="Facility">
                      <Link
                        to="/health/$id"
                        params={{ id: f.id }}
                        className="font-semibold text-dept hover:underline"
                      >
                        {f.name}
                      </Link>
                      <span className="block">
                        <Code className="text-xs text-ink-muted">{f.code}</Code>
                      </span>
                    </td>
                    <td data-label="Type">{f.healthType}</td>
                    <td data-label="Tehsil">{f.tehsil}</td>
                    <td
                      data-label="Shift coverage"
                      className={cn(
                        "num",
                        isAccepted(st) &&
                          shift.phase !== "upcoming" &&
                          cov.belowMinimum &&
                          "font-semibold text-problem",
                      )}
                    >
                      {isAccepted(st) && shift.phase !== "upcoming" ? cov.covered : "—"} of{" "}
                      {cov.required} required
                      {isAccepted(st) && shift.phase !== "upcoming" && cov.belowMinimum && (
                        <span className="block text-xs font-normal text-problem">
                          Below minimum
                        </span>
                      )}
                    </td>
                    <td data-label="OPD today" className="num">
                      {!isAccepted(st) || shift.opd == null ? (
                        <span className="text-ink-muted">—</span>
                      ) : (
                        shift.opd.toLocaleString("en")
                      )}
                    </td>
                    <td data-label="Beds available" className="num">
                      {isAccepted(st) ? shift.bedsAvailable : "—"} of {shift.bedsTotal}
                    </td>
                    <td data-label="Services down">
                      {!isAccepted(st) || shift.phase === "upcoming" ? (
                        <span className="text-xs text-ink-muted">Awaiting report</span>
                      ) : down.length === 0 ? (
                        <span className="text-xs text-ink-muted">All up</span>
                      ) : (
                        <span className="flex flex-wrap gap-1">
                          {down.map((s) => (
                            <Pill key={s} tone="problem">
                              {s}
                            </Pill>
                          ))}
                        </span>
                      )}
                    </td>
                    <td data-label="Emergency" className="num">
                      {ps ? ps.emergencyToday : "—"}
                    </td>
                    <td data-label="Admissions" className="num">
                      {ps ? (
                        <>
                          {ps.admissionsToday}
                          <span className="ml-1 text-xs text-ink-muted">
                            ({ps.dischargesToday} disch.)
                          </span>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td data-label="Revenue" className="num">
                      {bill ? `₨${formatPkr(bill.totalCollected)}` : "—"}
                    </td>
                    <td data-label="Report status">
                      <StatusBadge status={st} short />
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
