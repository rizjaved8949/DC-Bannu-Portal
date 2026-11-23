import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";

import { FilterBar } from "@/components/dcms/filter-bar";
import { KpiTile } from "@/components/dcms/kpi-tile";
import { PageHeader } from "@/components/dcms/page-header";
import { Code, EmptyState, Panel } from "@/components/dcms/section";
import { SortTh } from "@/components/dcms/sort-header";
import { Pill, StatusBadge } from "@/components/dcms/status";
import { Button } from "@/components/ui/button";
import { hhmm, REPORT_STATUS_ORDER, SERVICES, SHIFT_NAMES, shiftCoverage, shiftsByFacility, STATUS_LABEL, type ShiftKey } from "@/data/mock";
import { downloadCsv } from "@/lib/csv";
import { useApp, useScopedFacilities } from "@/lib/app-state";
import { pct } from "@/lib/metrics";
import { useSort } from "@/lib/use-sort";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/health/")({
  head: () => ({
    meta: [
      { title: "Health facilities · DCMS Bannu" },
      { name: "description", content: "Shift coverage, OPD, beds and services for public health facilities in District Bannu." },
      { property: "og:title", content: "Health facilities · DCMS Bannu" },
      { property: "og:description", content: "Shift coverage, OPD, beds and services for public health facilities in District Bannu." },
    ],
  }),
  component: HealthPage,
});

type Col = "name" | "type" | "tehsil" | "coverage" | "opd" | "beds" | "down" | "status";

function HealthPage() {
  const { statusFor, reportFor, filters, resetFilters } = useApp();
  const list = useScopedFacilities({ kind: "health" });
  const shiftKey: ShiftKey = filters.shift === "Evening" ? "E" : filters.shift === "Night" ? "N" : "M";

  const rows = useMemo(
    () =>
      list.map((f) => {
        const shift = shiftsByFacility[f.id]![shiftKey];
        const cov = shiftCoverage(shift);
        const down = SERVICES.filter((s) => shift.services[s] === false);
        return { f, st: statusFor(f.id), r: reportFor(f.id), shift, cov, down };
      }),
    [list, shiftKey, statusFor, reportFor],
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
    },
    "type",
  );

  const reported = rows.filter((x) => x.st === "received" || x.st === "pending" || x.st === "verified").length;
  const covered = rows.reduce((a, x) => a + x.cov.covered, 0);
  const required = rows.reduce((a, x) => a + x.cov.required, 0);
  const below = rows.filter((x) => x.cov.belowMinimum).length;
  const opd = rows.reduce((a, x) => a + (x.shift.opd ?? 0), 0);
  const servicesDown = rows.reduce((a, x) => a + x.down.length, 0);
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
      <PageHeader title="Health facilities" urdu="صحت کے مراکز" description="Shift coverage against minimum staffing, OPD, beds and services, by facility. No patient information is collected." />
      <div className="mt-4">
        <FilterBar showDepartment={false} showShift onExportCsv={exportCsv} />
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile label="Reported today" value={reported} sub={`of ${rows.length} facilities`} tone={reported / Math.max(1, rows.length) > 0.7 ? "verified" : "pending"} freshness="Morning shift report, accepted by server" />
        <KpiTile label={`${shiftName} shift coverage`} value={required ? `${pct(covered, required, 0)}%` : "—"} sub={`${covered} of ${required} required posts on site`} tone={below ? "pending" : "verified"} freshness={`${below} ${below === 1 ? "facility" : "facilities"} below minimum`} />
        <KpiTile label="OPD so far" value={opd.toLocaleString("en")} sub={shiftKey === "M" ? "patients seen since 08:00" : "OPD counted in the morning shift only"} tone="kurram" freshness={shiftKey === "M" ? "Reported by facility administrators" : "Evening and night shifts have no OPD"} />
        <KpiTile label="Services down" value={servicesDown} sub={`across ${rows.filter((x) => x.down.length).length} facilities`} tone={servicesDown ? "problem" : "neutral"} freshness={`${shiftName} shift handover`} />
      </div>

      <Panel title={`Facilities, ${shiftName.toLowerCase()} shift`} aside={rows[0]?.shift.rangeLabel}>
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
                  <SortTh id="status" active={key} dir={dir} onSort={toggle}>
                    Report status
                  </SortTh>
                </tr>
              </thead>
              <tbody>
                {sorted.map(({ f, st, shift, cov, down }) => (
                  <tr key={f.id}>
                    <td data-label="Facility">
                      <Link to="/health/$id" params={{ id: f.id }} className="font-semibold text-ink hover:text-kurram hover:underline">
                        {f.name}
                      </Link>
                      <span className="block">
                        <Code className="text-xs text-ink-muted">{f.code}</Code>
                      </span>
                    </td>
                    <td data-label="Type">{f.healthType}</td>
                    <td data-label="Tehsil">{f.tehsil}</td>
                    <td data-label="Shift coverage" className={cn("num", cov.belowMinimum && "font-semibold text-problem")}>
                      {cov.covered} of {cov.required} required
                      {cov.belowMinimum && <span className="block text-xs font-normal text-problem">Below minimum</span>}
                    </td>
                    <td data-label="OPD today" className="num">
                      {shift.opd == null ? <span className="text-ink-muted">—</span> : shift.opd.toLocaleString("en")}
                    </td>
                    <td data-label="Beds available" className="num">
                      {shift.bedsAvailable} of {shift.bedsTotal}
                    </td>
                    <td data-label="Services down">
                      {down.length === 0 ? (
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
