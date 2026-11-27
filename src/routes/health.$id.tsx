import { healthRecordSearch, type HealthSection } from "@/components/dcms/navigation";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Check,
  FileText,
  Fingerprint,
  Stethoscope,
  UserRound,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useState } from "react";

import { SectionTabs } from "@/components/dcms/section-tabs";

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
  facilityBillingToday,
  formatDate,
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
  treatmentLogsByDoctor,
  treatmentLogsByFacility,
  weeklyBilling,
  type ShiftKey,
  type ShiftStaffStatus,
} from "@/data/mock";
import { formatPkr } from "@/lib/metrics";
import { inRoleScope, useApp } from "@/lib/app-state";
import { pct } from "@/lib/metrics";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/health/$id")({
  validateSearch: healthRecordSearch,
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
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const shiftKey: ShiftKey =
    search.shift ?? (filters.shift === "Evening" ? "E" : filters.shift === "Night" ? "N" : "M");
  const section = search.section ?? "shift";
  const setSection = (next: HealthSection) =>
    navigate({
      search: {
        ...(search.shift ? { shift: search.shift } : {}),
        ...(next === "shift" ? {} : { section: next }),
      },
      resetScroll: false,
    });
  const setShiftKey = (next: ShiftKey) =>
    navigate({ search: { ...search, shift: next }, resetScroll: false });
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
          description={`${f.typeLabel}, ${f.village}. ${staffList.length} staff on roster ${f.rosterVersion}. Use the tabs below for patients, doctors, billing and attendance.`}
        >
          <FacilityHeaderMeta f={f} report={r} />
        </PageHeader>
      </div>

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

      <SectionTabs
        label="Facility record sections"
        value={section}
        onChange={setSection}
        options={[
          {
            value: "shift",
            label: "Shift & staffing",
            icon: Users,
            count: shift.assignments.length,
          },
          {
            value: "patients",
            label: "Patients",
            icon: Stethoscope,
            count: (daybookByFacility[f.id] ?? []).length,
          },
          {
            value: "doctors",
            label: "Doctors",
            icon: UserRound,
            count: (doctorsByFacility[f.id] ?? []).length,
          },
          { value: "billing", label: "Billing", icon: Wallet },
          {
            value: "attendance",
            label: "Attendance",
            icon: Fingerprint,
            count: (biometricByFacility[f.id] ?? []).length,
          },
          { value: "record", label: "Institution record", icon: FileText },
        ]}
      />

      {section === "shift" && (
        <>
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
                              className="font-semibold text-ink hover:text-dept hover:underline"
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
        </>
      )}

      {section === "patients" && <PatientDaybook facilityId={f.id} confirmed={confirmed} />}

      {section === "doctors" && (
        <>
          <DoctorProfiles facilityId={f.id} />
          <DoctorTreatmentLogs facilityId={f.id} />
        </>
      )}

      {section === "billing" && <BillingSection facilityId={f.id} />}

      {section === "attendance" && <BiometricAttendance facilityId={f.id} />}

      {section === "record" && (
        <>
          <InstitutionRecord facility={f} />
          <div className="grid gap-4 xl:grid-cols-2">
            <Panel title="Facility checklist" aside="Older than 3 days is stale">
              <InfraChecklist f={f} />
            </Panel>
            <Panel
              title="Last 14 days of submissions"
              aside="Today ringed"
              bodyClassName="px-4 py-3"
            >
              <SubmissionHistoryRow facilityId={f.id} />
            </Panel>
          </div>
        </>
      )}
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
              <th scope="col" className="num">
                Age
              </th>
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
                <td data-label="Time" className="num whitespace-nowrap">
                  {hhmm(e.timeMin)}
                </td>
                <td data-label="Patient">
                  <span className="font-semibold">{e.patientName}</span>
                  <span className="block text-2xs text-ink-muted">
                    {e.gender === "M" ? "Male" : "Female"} · CNIC {e.cnic}
                  </span>
                </td>
                <td data-label="Age" className="num">
                  {e.age}
                </td>
                <td data-label="Complaint" className="max-w-[160px] text-xs">
                  {e.complaint}
                </td>
                <td data-label="Diagnosis" className="max-w-[160px] text-xs">
                  {e.diagnosis}
                </td>
                <td data-label="Medicine" className="max-w-[200px] text-xs">
                  {e.medicine}
                </td>
                <td data-label="Doctor" className="whitespace-nowrap text-xs">
                  {e.doctor}
                </td>
                <td data-label="Status">
                  <Pill
                    tone={
                      e.status === "Treated"
                        ? "verified"
                        : e.status === "Referred"
                          ? "sent"
                          : e.status === "Admitted"
                            ? "pending"
                            : "neutral"
                    }
                  >
                    {e.status}
                  </Pill>
                </td>
                <td data-label="Follow-up" className="text-xs">
                  {e.followUp ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {entries.length > 10 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full border-t border-line px-4 py-2 text-xs font-semibold text-dept hover:bg-subtle"
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
              <th scope="col" className="num">
                Years
              </th>
              <th scope="col" className="num">
                Patients today
              </th>
              <th scope="col" className="num">
                This month
              </th>
            </tr>
          </thead>
          <tbody>
            {doctors.map((d) => (
              <tr key={d.staffId}>
                <td data-label="Name" className="font-semibold">
                  {d.name}
                </td>
                <td data-label="Qualification">{d.qualification}</td>
                <td data-label="Specialisation">{d.specialisation}</td>
                <td data-label="Department">{d.department}</td>
                <td data-label="Years" className="num">
                  {d.yearsOfService}
                </td>
                <td data-label="Patients today" className="num font-semibold">
                  {d.patientsSeenToday}
                </td>
                <td data-label="This month" className="num">
                  {d.patientsThisMonth}
                </td>
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
    <Panel title="Biometric attendance — today" aside={`${logs.length} staff checked in`}>
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
                <td data-label="Name" className="font-semibold">
                  {l.name}
                </td>
                <td data-label="Designation">{l.designation}</td>
                <td data-label="Method" className="text-xs">
                  {l.method}
                </td>
                <td data-label="Check-in" className="num">
                  {hhmm(l.checkIn)}
                </td>
                <td data-label="Check-out" className="num">
                  {l.checkOut ? hhmm(l.checkOut) : "—"}
                </td>
                <td data-label="Status">
                  <Pill
                    tone={
                      l.status === "On time"
                        ? "verified"
                        : l.status === "Late"
                          ? "pending"
                          : "problem"
                    }
                  >
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

function DoctorTreatmentLogs({ facilityId }: { facilityId: string }) {
  const allLogs = treatmentLogsByFacility[facilityId] ?? [];
  const doctors = doctorsByFacility[facilityId] ?? [];
  const [selectedDoc, setSelectedDoc] = useState<string>("all");
  const [expanded, setExpanded] = useState(false);

  const logs =
    selectedDoc === "all" ? allLogs : allLogs.filter((l) => l.doctorStaffId === selectedDoc);
  const shown = expanded ? logs : logs.slice(0, 8);
  const totalBilled = logs.reduce((a, l) => a + l.billingPkr, 0);
  const waivedCount = logs.filter((l) => l.waived).length;

  if (allLogs.length === 0) return null;

  return (
    <Panel
      title="Doctor treatment log — today"
      aside={`${allLogs.length} treatments · PKR ${formatPkr(totalBilled)} billed`}
    >
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-2">
        <span className="text-xs font-semibold text-ink-muted">Filter by doctor:</span>
        <select
          value={selectedDoc}
          onChange={(e) => {
            setSelectedDoc(e.target.value);
            setExpanded(false);
          }}
          className="rounded-sm border border-line bg-surface px-2 py-1 text-xs"
        >
          <option value="all">All doctors ({allLogs.length})</option>
          {doctors.map((d) => (
            <option key={d.staffId} value={d.staffId}>
              {d.name} ({(treatmentLogsByDoctor[d.staffId] ?? []).length})
            </option>
          ))}
        </select>
        <span className="ml-auto text-xs text-ink-muted">
          {waivedCount} waived · {logs.length - waivedCount} charged
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="ledger">
          <thead>
            <tr>
              <th scope="col">Time</th>
              <th scope="col">Patient</th>
              <th scope="col" className="num">
                Age
              </th>
              <th scope="col">Complaint</th>
              <th scope="col">Examination</th>
              <th scope="col">Diagnosis</th>
              <th scope="col">Treatment</th>
              <th scope="col">Medicine</th>
              <th scope="col">Lab tests</th>
              <th scope="col">Outcome</th>
              <th scope="col" className="num">
                Billing
              </th>
              <th scope="col">Follow-up</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((t) => (
              <tr key={t.id}>
                <td data-label="Time" className="num whitespace-nowrap">
                  {hhmm(t.timeMin)}
                </td>
                <td data-label="Patient">
                  <span className="font-semibold">{t.patientName}</span>
                  <span className="block text-2xs text-ink-muted">
                    {t.gender === "M" ? "M" : "F"}
                  </span>
                </td>
                <td data-label="Age" className="num">
                  {t.age}
                </td>
                <td data-label="Complaint" className="max-w-[130px] text-xs">
                  {t.complaint}
                </td>
                <td data-label="Examination" className="max-w-[150px] text-xs">
                  {t.examination}
                </td>
                <td data-label="Diagnosis" className="max-w-[130px] text-xs">
                  {t.diagnosis}
                </td>
                <td data-label="Treatment" className="max-w-[140px] text-xs">
                  {t.treatment}
                </td>
                <td data-label="Medicine" className="max-w-[160px] text-xs">
                  {t.medicine}
                </td>
                <td data-label="Lab tests" className="text-xs">
                  {t.labTests ?? "—"}
                </td>
                <td data-label="Outcome">
                  <Pill
                    tone={
                      t.outcome === "Discharged"
                        ? "verified"
                        : t.outcome === "Follow-up advised"
                          ? "sent"
                          : t.outcome === "Referred"
                            ? "pending"
                            : "neutral"
                    }
                  >
                    {t.outcome}
                  </Pill>
                </td>
                <td data-label="Billing" className="num">
                  {t.waived ? (
                    <span className="text-ink-muted">Waived</span>
                  ) : (
                    <span className="font-semibold">₨{t.billingPkr}</span>
                  )}
                </td>
                <td data-label="Follow-up" className="text-xs">
                  {t.followUpDate ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {logs.length > 8 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full border-t border-line px-4 py-2 text-xs font-semibold text-dept hover:bg-subtle"
        >
          {expanded ? "Show fewer" : `Show all ${logs.length} treatments`}
        </button>
      )}
    </Panel>
  );
}

function BillingSection({ facilityId }: { facilityId: string }) {
  const billing = facilityBillingToday[facilityId];
  const weekly = weeklyBilling[facilityId] ?? [];
  if (!billing) return null;

  const weekTotal = weekly.reduce((a, r) => a + r.total, 0);
  const weekWaived = weekly.reduce((a, r) => a + r.waivedAmount, 0);

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Panel
        title="Today's billing summary"
        aside={`${billing.patientsCharged + billing.patientsWaived} patients`}
      >
        <div className="space-y-3 px-4 py-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <BillItem label="OPD fees" amount={billing.opdFees} />
            <BillItem label="Lab charges" amount={billing.labCharges} />
            <BillItem label="Bed charges" amount={billing.bedCharges} />
            <BillItem label="Surgery fees" amount={billing.surgeryFees} />
            <BillItem label="Medicine" amount={billing.medicineCharges} />
            <BillItem label="Waived" amount={billing.totalWaived} muted />
          </div>
          <div className="flex items-center justify-between rounded-md border border-line bg-subtle px-3 py-2">
            <span className="text-sm font-semibold text-ink">Total collected</span>
            <span className="text-lg font-bold tabular-nums text-dept">
              ₨{billing.totalCollected.toLocaleString("en")}
            </span>
          </div>
          <div className="flex gap-4 text-xs text-ink-muted">
            <span>{billing.patientsCharged} patients charged</span>
            <span>{billing.patientsWaived} patients waived (free treatment)</span>
          </div>
        </div>
      </Panel>

      <Panel
        title="Weekly billing trend"
        aside={`Total: ₨${formatPkr(weekTotal)} · Waived: ₨${formatPkr(weekWaived)}`}
      >
        <div className="overflow-x-auto">
          <table className="ledger">
            <thead>
              <tr>
                <th scope="col">Day</th>
                <th scope="col" className="num">
                  OPD
                </th>
                <th scope="col" className="num">
                  Lab
                </th>
                <th scope="col" className="num">
                  Bed
                </th>
                <th scope="col" className="num">
                  Surgery
                </th>
                <th scope="col" className="num">
                  Medicine
                </th>
                <th scope="col" className="num">
                  Total
                </th>
                <th scope="col" className="num">
                  Waived
                </th>
                <th scope="col" className="num">
                  Patients
                </th>
              </tr>
            </thead>
            <tbody>
              {weekly.map((row) => (
                <tr key={row.date}>
                  <td data-label="Day" className="whitespace-nowrap">
                    {row.day} {formatDate(row.date).split(" ").slice(0, 2).join(" ")}
                  </td>
                  <td data-label="OPD" className="num">
                    ₨{formatPkr(row.opdFees)}
                  </td>
                  <td data-label="Lab" className="num">
                    ₨{formatPkr(row.labCharges)}
                  </td>
                  <td data-label="Bed" className="num">
                    ₨{formatPkr(row.bedCharges)}
                  </td>
                  <td data-label="Surgery" className="num">
                    ₨{formatPkr(row.surgeryFees)}
                  </td>
                  <td data-label="Medicine" className="num">
                    ₨{formatPkr(row.medicineCharges)}
                  </td>
                  <td data-label="Total" className="num font-semibold">
                    ₨{formatPkr(row.total)}
                  </td>
                  <td data-label="Waived" className="num text-ink-muted">
                    ₨{formatPkr(row.waivedAmount)}
                  </td>
                  <td data-label="Patients" className="num">
                    {row.patientsTotal}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function BillItem({ label, amount, muted }: { label: string; amount: number; muted?: boolean }) {
  return (
    <div className="rounded-md border border-line px-3 py-2">
      <div className="text-2xs text-ink-muted">{label}</div>
      <div
        className={cn(
          "mt-0.5 text-sm font-bold tabular-nums",
          muted ? "text-ink-muted" : "text-ink",
        )}
      >
        ₨{amount.toLocaleString("en")}
      </div>
    </div>
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
