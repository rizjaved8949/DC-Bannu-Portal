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
import { InstitutionRecord } from "@/components/dcms/institution-record";
import { KpiTile } from "@/components/dcms/kpi-tile";
import { PageHeader } from "@/components/dcms/page-header";
import { Code, Panel } from "@/components/dcms/section";
import { Segmented } from "@/components/dcms/segmented";
import { Pill, STAFF_STATUS_TONE } from "@/components/dcms/status";
import {
  daybookByFacility,
  doctorsByFacility,
  facilityById,
  hhmm,
  isAccepted,
  patientStatsById,
  SERVICES,
  SHIFT_NAMES,
  shiftCoverage,
  shiftsByFacility,
  staffByFacility,
  staffById,
  biometricByFacility,
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
  const { statusFor, reportFor, filters, role, shiftFor, facilityFor } = useApp();
  const f = facilityFor(id);
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
  const shifts = Object.fromEntries(
    (["M", "E", "N"] as ShiftKey[]).map((key) => [key, shiftFor(f.id, key)!]),
  ) as Record<ShiftKey, NonNullable<ReturnType<typeof shiftFor>>>;
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
  const confirmed = isAccepted(st) && !upcoming;
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

      <InstitutionRecord facility={f} />
      <TimestampStrip report={r} status={st} />
      {!confirmed && (
        <div className="panel border-l-[3px] border-l-pending p-4 text-sm">
          <p className="font-semibold">
            {upcoming ? "This shift has not started." : "Awaiting an accepted shift report."}
          </p>
          <p className="mt-1 text-ink-muted">
            The institution profile, staffing plan and capacity remain available. On-site attendance
            and service figures are confirmed after receipt of the shift report.
          </p>
        </div>
      )}

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
          value={`${confirmed ? cov.covered : "—"} of ${cov.required}`}
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
          value={!confirmed || shift.opd == null ? "—" : shift.opd.toLocaleString("en")}
          sub={shift.opd == null ? "counted in morning shift only" : "patients seen since 08:00"}
          tone="kurram"
          freshness={shift.opd == null ? "No OPD in this shift" : `Reported ${hhmm(r?.observedAt)}`}
        />
        <KpiTile
          label="Beds available"
          value={confirmed ? shift.bedsAvailable : "—"}
          sub={`of ${shift.bedsTotal} total`}
          tone="sent"
          freshness={`${pct(shift.bedsTotal - shift.bedsAvailable, shift.bedsTotal, 0)}% occupied`}
        />
        <KpiTile
          label="Services down"
          value={confirmed ? down.length : "—"}
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
                    {confirmed ? x.actual : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {confirmed && shortLines.length > 0 && (
            <ul className="border-t border-line px-4 py-2.5 text-sm text-problem">
              {shortLines.map((x) => (
                <li key={x.role}>
                  Short by {x.short} {x.role}
                  {x.short > 1 ? "s" : ""}
                </li>
              ))}
            </ul>
          )}
          {confirmed && shortLines.length === 0 && (
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
                        <Pill tone={STAFF_STATUS_TONE[a.status] ?? "neutral"}>
                          {confirmed ? a.status : "Scheduled"}
                        </Pill>
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

      {/* ── Patient daybook ── */}
      <PatientDaybook facilityId={f.id} confirmed={confirmed} />

      {/* ── Doctor profiles ── */}
      <DoctorProfiles facilityId={f.id} />

      {/* ── Biometric attendance ── */}
      <BiometricAttendance facilityId={f.id} />

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

function PatientDaybook({ facilityId, confirmed }: { facilityId: string; confirmed: boolean }) {
  const entries = daybookByFacility[facilityId] ?? [];
  const stats = patientStatsById[facilityId];
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? entries : entries.slice(0, 10);
  const admitted = entries.filter((e) => e.status === "Admitted").length;
  const referred = entries.filter((e) => e.status === "Referred").length;

  return (
    <Panel
      title="Patient daybook — today"
      aside={confirmed ? `${entries.length} entries` : "Awaiting report"}
    >
      {stats && (
        <div className="grid grid-cols-2 gap-2 border-b border-line px-4 py-3 sm:grid-cols-4">
          <MiniStat label="OPD" value={stats.opdToday} />
          <MiniStat label="Emergency" value={stats.emergencyToday} />
          <MiniStat label="Admitted" value={admitted} />
          <MiniStat label="Referred" value={referred} />
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="ledger">
          <thead>
            <tr>
              <th scope="col">Time</th>
              <th scope="col">Patient</th>
              <th scope="col" className="num">Age</th>
              <th scope="col">Complaint</th>
              <th scope="col">Diagnosis</th>
              <th scope="col">Medicine</th>
              <th scope="col">Doctor</th>
              <th scope="col">Status</th>
              <th scope="col">Follow-up</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((e) => (
              <tr key={e.id}>
                <td data-label="Time" className="num whitespace-nowrap">{hhmm(e.timeMin)}</td>
                <td data-label="Patient">
                  <span className="font-semibold">{e.patientName}</span>
                  <span className="block text-2xs text-ink-muted">{e.gender === "M" ? "Male" : "Female"} · CNIC {e.cnic}</span>
                </td>
                <td data-label="Age" className="num">{e.age}</td>
                <td data-label="Complaint" className="max-w-[160px] text-xs">{e.complaint}</td>
                <td data-label="Diagnosis" className="max-w-[160px] text-xs">{e.diagnosis}</td>
                <td data-label="Medicine" className="max-w-[200px] text-xs">{e.medicine}</td>
                <td data-label="Doctor" className="whitespace-nowrap text-xs">{e.doctor}</td>
                <td data-label="Status">
                  <Pill tone={e.status === "Treated" ? "verified" : e.status === "Referred" ? "sent" : e.status === "Admitted" ? "pending" : "neutral"}>
                    {e.status}
                  </Pill>
                </td>
                <td data-label="Follow-up" className="text-xs">{e.followUp ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {entries.length > 10 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full border-t border-line px-4 py-2 text-xs font-semibold text-kurram hover:bg-subtle"
        >
          {expanded ? "Show fewer" : `Show all ${entries.length} entries`}
        </button>
      )}
    </Panel>
  );
}

function DoctorProfiles({ facilityId }: { facilityId: string }) {
  const doctors = doctorsByFacility[facilityId] ?? [];
  if (doctors.length === 0) return null;

  return (
    <Panel title="Doctor profiles" aside={`${doctors.length} medical officers`}>
      <div className="overflow-x-auto">
        <table className="ledger">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Qualification</th>
              <th scope="col">Specialisation</th>
              <th scope="col">Department</th>
              <th scope="col" className="num">Years</th>
              <th scope="col" className="num">Patients today</th>
              <th scope="col" className="num">This month</th>
            </tr>
          </thead>
          <tbody>
            {doctors.map((d) => (
              <tr key={d.staffId}>
                <td data-label="Name" className="font-semibold">{d.name}</td>
                <td data-label="Qualification">{d.qualification}</td>
                <td data-label="Specialisation">{d.specialisation}</td>
                <td data-label="Department">{d.department}</td>
                <td data-label="Years" className="num">{d.yearsOfService}</td>
                <td data-label="Patients today" className="num font-semibold">{d.patientsSeenToday}</td>
                <td data-label="This month" className="num">{d.patientsThisMonth}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function BiometricAttendance({ facilityId }: { facilityId: string }) {
  const logs = biometricByFacility[facilityId] ?? [];
  if (logs.length === 0) return null;
  const onTime = logs.filter((l) => l.status === "On time").length;
  const late = logs.filter((l) => l.status === "Late").length;
  const veryLate = logs.filter((l) => l.status === "Very late").length;

  return (
    <Panel
      title="Biometric attendance — today"
      aside={`${logs.length} staff checked in`}
    >
      <div className="grid grid-cols-3 gap-2 border-b border-line px-4 py-3">
        <MiniStat label="On time" value={onTime} />
        <MiniStat label="Late (10–30 min)" value={late} />
        <MiniStat label="Very late (30+ min)" value={veryLate} />
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
                <td data-label="Name" className="font-semibold">{l.name}</td>
                <td data-label="Designation">{l.designation}</td>
                <td data-label="Method" className="text-xs">{l.method}</td>
                <td data-label="Check-in" className="num">{hhmm(l.checkIn)}</td>
                <td data-label="Check-out" className="num">{l.checkOut ? hhmm(l.checkOut) : "—"}</td>
                <td data-label="Status">
                  <Pill tone={l.status === "On time" ? "verified" : l.status === "Late" ? "pending" : "problem"}>
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

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="text-lg font-bold tabular-nums text-ink">{value}</div>
      <div className="text-2xs text-ink-muted">{label}</div>
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
