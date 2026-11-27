import { PaginatedRegister } from "@/components/dcms/paginated-register";
import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";

import { infraTone } from "@/components/dcms/facility-bits";
import { FilterBar } from "@/components/dcms/filter-bar";
import { PageHeader } from "@/components/dcms/page-header";
import { Code, EmptyState, Panel } from "@/components/dcms/section";
import { Pill, StatusBadge, StatusGlyph, StatusLegend } from "@/components/dcms/status";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { INFRA_KEYS, INFRA_LABELS, isStale, TEHSILS, type InfraFlag } from "@/data/mock";
import { downloadCsv } from "@/lib/csv";
import { useApp, useScopedFacilities } from "@/lib/app-state";
import { cn } from "@/lib/utils";

// Leaflet touches `window` on import, so the map loads lazily and only in the browser.
const FacilityMap = lazy(() => import("@/components/dcms/map/facility-map"));

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "Facilities & map · NWDCMS" },
      {
        name: "description",
        content: "Facility registry, map and infrastructure checklist for North Waziristan.",
      },
      { property: "og:title", content: "Facilities & map · NWDCMS" },
      {
        property: "og:description",
        content: "Facility registry, map and infrastructure checklist for North Waziristan.",
      },
    ],
  }),
  component: MapPage,
});

function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}

function MapPage() {
  const { statusFor } = useApp();
  const facilities = useScopedFacilities();
  const mounted = useMounted();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const rowRefs = useRef<Record<string, HTMLLIElement | null>>({});

  const list = useMemo(
    () =>
      facilities.filter((f) => {
        if (!q) return true;
        const s = q.toLowerCase();
        return (
          f.name.toLowerCase().includes(s) ||
          f.code.toLowerCase().includes(s) ||
          f.village.toLowerCase().includes(s) ||
          f.tehsil.toLowerCase().includes(s)
        );
      }),
    [facilities, q],
  );

  useEffect(() => {
    if (selected)
      rowRefs.current[selected]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selected]);

  const unverified = facilities.filter((f) => !f.coordsVerified).length;

  const exportCsv = () =>
    downloadCsv(
      "nwdcms-facility-infrastructure-2026-11-23.csv",
      list.map((f) => ({
        Facility: f.name,
        Code: f.code,
        Tehsil: f.tehsil,
        Latitude: f.lat,
        Longitude: f.lng,
        "Coordinates verified": f.coordsVerified ? "Yes" : "No",
        ...Object.fromEntries(INFRA_KEYS.map((k) => [INFRA_LABELS[k], infraTone(f.infra[k]).word])),
        Equipment: `${f.equipment.label}: ${infraTone(f.equipment).word}`,
      })),
    );

  return (
    <div>
      <PageHeader
        title="Facilities & map"
        description="Where every school and health facility is, what state it reported today, and which infrastructure items need maintenance."
      />
      <div className="mt-4">
        <FilterBar onExportCsv={exportCsv} />
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <Panel
          className="xl:col-span-3"
          title="Map"
          aside={`${facilities.length} facilities, ${unverified} with unverified coordinates`}
          bodyClassName="p-1"
        >
          {mounted ? (
            <Suspense fallback={<Skeleton className="h-[520px] w-full rounded-[5px] bg-line/40" />}>
              <FacilityMap
                facilities={list}
                statusFor={statusFor}
                selectedId={selected}
                onSelect={setSelected}
              />
            </Suspense>
          ) : (
            <Skeleton className="h-[520px] w-full rounded-[5px] bg-line/40" />
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
            <span className="inline-flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
              <span className="font-semibold text-ink">Fill</span>
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden className="inline-block size-3 rounded-full bg-edu" /> School
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden className="inline-block size-3 rounded-full bg-health" /> Health
                facility
              </span>
              <span className="font-semibold text-ink">Ring</span>
            </span>
            <StatusLegend />
            <span className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
              <span
                aria-hidden
                className="inline-block size-3 rounded-full border-2 border-dashed border-ink-muted"
              />{" "}
              Hollow marker: non-functional school or coordinates not verified
            </span>
          </div>
          <p className="border-t border-line px-3 py-2 text-xs text-ink-muted">
            Location verification is tracked for each institution. Hollow markers need a field
            coordinate check.
          </p>
        </Panel>

        <Panel
          className="xl:col-span-2"
          title="Registry"
          aside={
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, code or village"
              aria-label="Search facilities"
              className="h-8 w-[220px]"
            />
          }
        >
          {list.length === 0 ? (
            <EmptyState
              title="No facilities match."
              hint="Try a shorter search or clear the tehsil filter."
            />
          ) : (
            <ul
              className="max-h-[560px] divide-y divide-line overflow-y-auto"
              aria-label="Facility registry"
            >
              {list.map((f) => {
                const st = statusFor(f.id);
                const active = f.id === selected;
                return (
                  <li
                    key={f.id}
                    ref={(el) => {
                      rowRefs.current[f.id] = el;
                    }}
                    className={cn("flex items-center gap-3 px-4 py-2", active && "bg-dept-tint")}
                  >
                    <button
                      type="button"
                      onClick={() => setSelected(f.id)}
                      aria-pressed={active}
                      aria-label={`Show ${f.name} on the map`}
                      className="flex min-w-0 flex-1 items-center gap-3 rounded-sm text-left"
                    >
                      <StatusGlyph status={st} size={14} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-ink">
                          {f.name}
                        </span>
                        <span className="flex items-center gap-2 text-xs text-ink-muted">
                          <Code className="text-xs">{f.code}</Code>
                          {f.tehsil}
                          {!f.coordsVerified && (
                            <span className="text-pending">Unverified location</span>
                          )}
                        </span>
                      </span>
                    </button>
                    <Link
                      to={f.kind === "school" ? "/schools/$id" : "/health/$id"}
                      params={{ id: f.id }}
                      className="shrink-0 text-xs text-dept hover:underline"
                    >
                      Open
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-4">
        <Panel
          className="xl:col-span-3"
          title="Infrastructure"
          aside="OK, Problem or Stale (older than 3 days)"
        >
          <div>
            <PaginatedRegister
              items={list}
              label="infrastructure records"
              resetKey={JSON.stringify([q, facilities.map((f) => f.id)])}
            >
              {(pageRows) => (
                <table className="ledger">
                  <thead className="sticky top-0">
                    <tr>
                      <th scope="col">Facility</th>
                      {INFRA_KEYS.map((k) => (
                        <th key={k} scope="col">
                          {INFRA_LABELS[k]}
                        </th>
                      ))}
                      <th scope="col">Equipment</th>
                      <th scope="col">Today</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((f) => (
                      <tr key={f.id} className={cn(f.id === selected && "bg-dept-tint")}>
                        <td data-label="Facility">
                          <Link
                            to={f.kind === "school" ? "/schools/$id" : "/health/$id"}
                            params={{ id: f.id }}
                            className="font-semibold text-ink hover:text-dept hover:underline"
                          >
                            {f.name}
                          </Link>
                          <span className="block text-xs text-ink-muted">{f.tehsil}</span>
                        </td>
                        {INFRA_KEYS.map((k) => (
                          <td key={k} data-label={INFRA_LABELS[k]}>
                            <InfraCell flag={f.infra[k]} />
                          </td>
                        ))}
                        <td data-label="Equipment">
                          <InfraCell flag={f.equipment} label={f.equipment.label} />
                        </td>
                        <td data-label="Today">
                          <StatusBadge status={statusFor(f.id)} short />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </PaginatedRegister>
          </div>
        </Panel>

        <Panel title="Maintenance flags by tehsil" aside="Problems and stale items">
          <table className="ledger">
            <thead>
              <tr>
                <th scope="col">Tehsil</th>
                <th scope="col" className="num">
                  Problems
                </th>
                <th scope="col" className="num">
                  Stale
                </th>
                <th scope="col" className="num">
                  Facilities
                </th>
              </tr>
            </thead>
            <tbody>
              {TEHSILS.filter((t) => facilities.some((f) => f.tehsil === t)).map((t) => {
                const fs = facilities.filter((f) => f.tehsil === t);
                const flags = fs.flatMap((f) => [
                  ...INFRA_KEYS.map((k) => f.infra[k]),
                  f.equipment,
                ]);
                const problems = flags.filter((x) => !isStale(x.updated) && !x.ok).length;
                const stale = flags.filter((x) => isStale(x.updated)).length;
                return (
                  <tr key={t}>
                    <td data-label="Tehsil" className="font-semibold">
                      {t}
                    </td>
                    <td
                      data-label="Problems"
                      className={cn("num", problems && "font-semibold text-problem")}
                    >
                      {problems}
                    </td>
                    <td data-label="Stale" className={cn("num", stale && "text-pending")}>
                      {stale}
                    </td>
                    <td data-label="Facilities" className="num">
                      {fs.length}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="border-t border-line px-4 py-2 text-xs text-ink-muted">
            A problem is a checklist item reported not working in the last 3 days. A stale item has
            not been checked for more than 3 days.
          </p>
        </Panel>
      </div>
    </div>
  );
}

function InfraCell({ flag, label }: { flag: InfraFlag; label?: string }) {
  const t = infraTone(flag);
  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <Pill tone={t.tone} icon={t.icon}>
        {t.word}
      </Pill>
      {label && <span className="text-2xs text-ink-muted">{label}</span>}
    </span>
  );
}
