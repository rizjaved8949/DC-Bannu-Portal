import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, X } from "lucide-react";
import { useState } from "react";

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
import { Segmented } from "@/components/dcms/segmented";
import { Pill, STAFF_STATUS_TONE } from "@/components/dcms/status";
import {
  facilityById,
  hhmm,
  SERVICES,
  SHIFT_NAMES,
  shiftCoverage,
  shiftsByFacility,
  staffByFacility,
  staffById,
  type ShiftKey,
  type ShiftStaffStatus,
} from "@/data/mock";
import { inRoleScope, useApp } from "@/lib/app-state";
import { pct } from "@/lib/metrics";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/health/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `${facilityById[params.id]?.name ?? "Health facility record"} · DCMS Bannu` },
      {
        name: "description",
        content: "Shift roster against minimum staffing, OPD, beds, services and handover notes.",
      },
      {
        property: "og:title",
        content: `${facilityById[params.id]?.name ?? "Health facility record"} · DCMS Bannu`,
      },
      {
        property: "og:description",
        content: "Shift roster against minimum staffing, OPD, beds, services and handover notes.",
      },
    ],
  }),
  component: HealthDetailPage,
});

const STATUS_ORDER: ShiftStaffStatus[] = [
  "Present",
  "Late",
  "Replacement",
  "On-call",
  "Leave",
  "Absent",
  "Off-duty",
];

function HealthDetailPage() {
  const { id } = Route.useParams();
  const f = facilityById[id];
  const { statusFor, reportFor, filters, role } = useApp();
  const [shiftKey, setShiftKey] = useState<ShiftKey>(
    filters.shift === "Evening" ? "E" : filters.shift === "Night" ? "N" : "M",
  );
  if (!f || f.kind !== "health" || !inRoleScope(role, f))
    return (
      <NotFoundPanel
        what="health facility in your scope"
        back="/health"
        backLabel="All health facilities"
      />
    );

  const st = statusFor(f.id);
  const r = reportFor(f.id);
  const shifts = shiftsByFacility[f.id]!;
  const shift = shifts[shiftKey];
  const cov = shiftCoverage(shift);
  const shortLines = cov.byRole.filter((x) => x.short > 0);
  const staffList = staffByFacility[f.id] ?? [];
  const sortedAssignments = [...shift.assignments].sort(
    (a, b) =>
      STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) ||
      a.role.localeCompare(b.role),
  );
  const upcoming = shift.phase === "upcoming";
  const avail = SERVICES.filter((s) => s in shift.services);
  const down = avail.filter((s) => shift.services[s] === false);

  return (
    <div className="space-y-5">
      <div>
        <BackLink to="/health" label="All health facilities" />
        <PageHeader
          title={f.name}
          urdu="صحت کے مراکز"
          description={`${f.typeLabel}, ${f.village}. ${staffList.length} staff on roster ${f.rosterVersion}. No patient information is collected.`}
        >
          <FacilityHeaderMeta f={f} report={r} />
        </PageHeader>
      </div>

      <TimestampStrip report={r} status={st} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label="Shift"
          value={shiftKey}
          onChange={setShiftKey}
          options={(["M", "E", "N"] as ShiftKey[]).map((k) => ({
            value: k,
            label: SHIFT_NAMES[k],
          }))}
        />
        <p className="text-sm text-ink-muted">
          <span className="font-semibold text-ink">{SHIFT_NAMES[shiftKey]} shift</span>,{" "}
          {shift.rangeLabel}
          {" · "}
          <Code className="text-sm">{shift.id}</Code>
          {" · "}
          <span className="capitalize">{shift.phase}</span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile
          label="On site of required"
          value={`${cov.covered} of ${cov.required}`}
          sub={
            cov.belowMinimum
              ? `${shortLines.length} ${shortLines.length === 1 ? "role" : "roles"} below minimum`
              : "All minimums met"
          }
          tone={cov.belowMinimum ? "problem" : "verified"}
          freshness={
            upcoming
              ? "Roster only, shift has not started"
              : `Observed ${hhmm(shift.startMin)} onwards`
          }
        />
        <KpiTile
          label="OPD"
          value={shift.opd == null ? "—" : shift.opd.toLocaleString("en")}
          sub={shift.opd == null ? "counted in morning shift only" : "patients seen since 08:00"}
          tone="kurram"
          freshness={shift.opd == null ? "No OPD in this shift" : `Reported ${hhmm(r?.observedAt)}`}
        />
        <KpiTile
          label="Beds available"
          value={shift.bedsAvailable}
          sub={`of ${shift.bedsTotal} total`}
          tone="sent"
          freshness={`${pct(shift.bedsTotal - shift.bedsAvailable, shift.bedsTotal, 0)}% occupied`}
        />
        <KpiTile
          label="Services down"
          value={down.length}
          sub={`of ${avail.length} services at this facility`}
          tone={down.length ? "problem" : "neutral"}
          freshness={down.length ? down.join(", ") : "All services up"}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <Panel
          className="xl:col-span-2"
          title="Roster vs actual by role"
          aside="Against the shift minimum"
        >
          <table className="ledger">
            <thead>
              <tr>
                <th scope="col">Role</th>
                <th scope="col" className="num">
                  Minimum
                </th>
                <th scope="col" className="num">
                  Rostered
                </th>
                <th scope="col" className="num">
                  On site
                </th>
              </tr>
            </thead>
            <tbody>
              {cov.byRole.map((x) => (
                <tr key={x.role}>
                  <td data-label="Role">{x.role}</td>
                  <td data-label="Minimum" className="num">
                    {x.min}
                  </td>
                  <td data-label="Rostered" className="num">
                    {x.rostered}
                  </td>
                  <td
                    data-label="On site"
                    className={cn("num", x.short > 0 && "font-semibold text-problem")}
                  >
                    {x.actual}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {shortLines.length > 0 && (
            <ul className="border-t border-line px-4 py-2.5 text-sm text-problem">
              {shortLines.map((x) => (
                <li key={x.role}>
                  Short by {x.short} {x.role}
                  {x.short > 1 ? "s" : ""}
                </li>
              ))}
            </ul>
          )}
          {shortLines.length === 0 && (
            <p className="border-t border-line px-4 py-2.5 text-sm text-verified">
              Every role meets its minimum.
            </p>
          )}
        </Panel>

        <Panel
          className="xl:col-span-3"
          title="Staff on this shift"
          aside={`${shift.assignments.length} entries`}
        >
          <div className="overflow-x-auto">
            <table className="ledger">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Role</th>
                  <th scope="col">Status</th>
                  <th scope="col">Note</th>
                </tr>
              </thead>
              <tbody>
                {sortedAssignments.map((a) => {
                  const s = staffById[a.staffId]!;
                  const replaces = a.replacesStaffId ? staffById[a.replacesStaffId] : undefined;
                  return (
                    <tr key={a.staffId}>
                      <td data-label="Name">
                        <Link
                          to="/staff/$id"
                          params={{ id: s.id }}
                          className="font-semibold text-ink hover:text-kurram hover:underline"
                        >
                          {s.name}
                        </Link>
                        <span className="block">
                          <Code className="text-xs text-ink-muted">{s.personalNoMasked}</Code>
                        </span>
                      </td>
                      <td data-label="Role">{a.role}</td>
                      <td data-label="Status">
                        <Pill tone={STAFF_STATUS_TONE[a.status] ?? "neutral"}>{a.status}</Pill>
                      </td>
                      <td data-label="Note" className="text-xs text-ink-muted">
                        {a.status === "Replacement" && replaces
                          ? `Covering for ${replaces.name}`
                          : a.status === "On-call"
                            ? "Reachable by phone, not on site"
                            : (a.note ?? "")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel
          title="Services and equipment"
          aside={`${avail.length - down.length} of ${avail.length} up`}
        >
          <ul className="grid grid-cols-2 divide-y divide-line sm:grid-cols-3 sm:divide-y-0">
            {avail.map((s) => {
              const up = shift.services[s] !== false;
              return (
                <li key={s} className="flex items-center gap-2 px-4 py-2.5 text-sm">
                  {up ? (
                    <Check className="size-4 text-verified" aria-label="Up" />
                  ) : (
                    <X className="size-4 text-problem" aria-label="Down" />
                  )}
                  <span className={cn(!up && "font-semibold text-problem")}>{s}</span>
                  <span className="ml-auto text-xs text-ink-muted">{up ? "Up" : "Down"}</span>
                </li>
              );
            })}
            <li className="flex items-center gap-2 px-4 py-2.5 text-sm">
              {f.equipment.ok ? (
                <Check className="size-4 text-verified" aria-label="Up" />
              ) : (
                <X className="size-4 text-problem" aria-label="Down" />
              )}
              <span className={cn(!f.equipment.ok && "font-semibold text-problem")}>
                {f.equipment.label}
              </span>
              <span className="ml-auto text-xs text-ink-muted">
                {f.equipment.ok ? "Working" : "Fault"}
              </span>
            </li>
          </ul>
        </Panel>

        <Panel
          title="Handover"
          aside={
            shift.phase === "completed"
              ? "To the incoming morning shift"
              : upcoming
                ? "Shift not yet started"
                : "In progress"
          }
        >
          <div className="space-y-3 px-4 py-3 text-sm">
            <HandoverList
              title="Unresolved faults"
              items={shift.handover.faults}
              none="No faults reported"
            />
            <HandoverList
              title="Stock-outs"
              items={shift.handover.stockOuts}
              none="No stock-outs reported"
            />
            <HandoverList
              title="Service interruptions"
              items={shift.handover.interruptions}
              none="No interruptions reported"
            />
            <div
              className={cn(
                "rounded-sm border px-3 py-2 text-xs",
                shift.handover.acknowledgedAt != null
                  ? "border-verified/30 bg-verified-tint text-verified"
                  : "border-line bg-subtle text-ink-muted",
              )}
            >
              {shift.handover.acknowledgedAt != null
                ? `Acknowledged by incoming shift at ${hhmm(shift.handover.acknowledgedAt)} (${shift.handover.acknowledgedBy})`
                : shift.phase === "completed"
                  ? "Not yet acknowledged by the incoming shift"
                  : "Handover is acknowledged when the next shift begins"}
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Facility checklist" aside="Older than 3 days is stale">
          <InfraChecklist f={f} />
        </Panel>
        <Panel title="Last 14 days of submissions" aside="Today ringed" bodyClassName="px-4 py-3">
          <SubmissionHistoryRow facilityId={f.id} />
        </Panel>
      </div>
    </div>
  );
}

function HandoverList({ title, items, none }: { title: string; items: string[]; none: string }) {
  return (
    <div>
      <div className="text-xs font-semibold text-ink-muted">{title}</div>
      {items.length === 0 ? (
        <p className="text-xs text-ink-muted">{none}</p>
      ) : (
        <ul className="mt-0.5 list-disc space-y-0.5 pl-5">
          {items.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
