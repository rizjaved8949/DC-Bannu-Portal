import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  Building2,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Download,
  GraduationCap,
  HeartPulse,
  HelpCircle,
  Home,
  Inbox,
  MessageSquareWarning,
  ShieldCheck,
  UsersRound,
  Wifi,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ComplaintForm } from "./complaint-form";
import { FieldSmsEntries } from "./sms-delivery";
import { Code, EmptyState, Panel } from "./section";
import { Pill, SEVERITY_TONE, StatusBadge, STAFF_STATUS_TONE } from "./status";
import {
  formatDate,
  hhmm,
  institutionProfiles,
  isAccepted,
  posts,
  staffByFacility,
  INFRA_KEYS,
  INFRA_LABELS,
  TODAY,
  isStale,
  type Facility,
  type Report,
} from "@/data/mock";
import { useApp } from "@/lib/app-state";
import { downloadCsv } from "@/lib/csv";
import { cn } from "@/lib/utils";

type FieldTab = "home" | "report" | "reports" | "institution" | "complaints" | "help";
export type FieldConnection = "online" | "sms" | "none";
const NAV = [
  { id: "home", label: "Home", icon: Home },
  { id: "report", label: "Report", icon: ClipboardList },
  { id: "reports", label: "My reports", icon: Inbox },
  { id: "institution", label: "Institution", icon: Building2 },
  { id: "complaints", label: "Complaints", icon: MessageSquareWarning },
  { id: "help", label: "Help", icon: HelpCircle },
] as const;
interface FieldNavigation {
  tab: FieldTab;
  setTab: (tab: FieldTab) => void;
  step: number;
  goToScreen: (step: number) => void;
  journey: boolean;
  setJourney: (value: boolean) => void;
}
const FieldContext = createContext<FieldNavigation | null>(null);
export function useFieldNavigation() {
  const value = useContext(FieldContext);
  if (!value) throw new Error("Field reporting needs a field workspace.");
  return value;
}
export function FieldWorkspace({
  facility: f,
  conn,
  children,
}: {
  facility: Facility;
  conn: FieldConnection;
  children: ReactNode;
}) {
  const {
    role,
    clockMin,
    statusFor,
    reportFor,
    pendingOutbox,
    reviewItems,
    complaints,
    smsEntries,
    storageAvailable,
  } = useApp();
  const [tab, setTab] = useState<FieldTab>("home");
  const [step, setStep] = useState(1);
  const [journey, setJourney] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
  }, [tab, step, journey]);
  const current = reportFor(f.id);
  const queue = pendingOutbox.filter((r) => r.facilityId === f.id);
  const queueCount =
    queue.length +
    smsEntries.filter(
      (entry) =>
        entry.kind === "complaint" &&
        entry.facilityIds.includes(f.id) &&
        ["saved", "sent"].includes(entry.status),
    ).length;
  const issues = reviewItems.filter((r) => r.facilityId === f.id && r.status !== "Closed");
  const activeComplaints = complaints.filter(
    (c) => c.facilityIds.includes(f.id) && c.status !== "Resolved",
  );
  const goToScreen = (next: number) => {
    setTab("report");
    setStep(next);
    if (journey)
      document
        .getElementById(`field-screen-${next}`)
        ?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  };
  return (
    <FieldContext.Provider value={{ tab, setTab, step, goToScreen, journey, setJourney }}>
      <div
        className={cn("field-workspace", journey && tab === "report" && "field-workspace-journey")}
      >
        <aside className="field-context space-y-4">
          <Panel title="Your reporting workspace" bodyClassName="space-y-4 p-5">
            <span className="profile-icon">
              {f.kind === "school" ? <GraduationCap /> : <HeartPulse />}
            </span>
            <div>
              <p className="font-bold text-lg">{f.name}</p>
              <p className="mt-1 text-sm text-ink-muted">
                {f.typeLabel} · {f.tehsil}
              </p>
            </div>
            <dl className="space-y-3 text-sm">
              <InfoRow label="Institution" value={<Code>{f.code}</Code>} />
              <InfoRow label="Reporting head" value={f.headName} />
              <InfoRow label="Roster" value={f.rosterVersion} />
              <InfoRow label="Viewing as" value={role.label} />
              <InfoRow label="Reporting day" value={formatDate(TODAY)} />
            </dl>
            <Link
              to={f.kind === "school" ? "/schools/$id" : "/health/$id"}
              params={{ id: f.id }}
              className="block border-t border-line pt-3 text-sm font-semibold text-kurram hover:underline"
            >
              Open district institution record
            </Link>
          </Panel>
          <Panel title="District follow-up" bodyClassName="space-y-3 p-5">
            <InfoRow label="Reporting status" value={<StatusBadge status={statusFor(f.id)} />} />
            <InfoRow
              label="Saved / awaiting receipt"
              value={<span className="num font-bold">{queueCount}</span>}
            />
            <InfoRow
              label="Open follow-ups"
              value={<span className="num font-bold">{issues.length}</span>}
            />
            <InfoRow
              label="Active complaints"
              value={<span className="num font-bold">{activeComplaints.length}</span>}
            />
            <p className="border-t border-line pt-3 text-xs text-ink-muted">
              {storageAvailable
                ? "Saved reports and decisions remain available after refresh in this browser."
                : "Browser storage is unavailable. Keep this page open to retain your work."}
            </p>
          </Panel>
        </aside>
        <section
          className={cn(
            "field-app-shell min-w-0",
            !(journey && tab === "report") && "field-mobile-device",
          )}
          aria-label="Mobile field application"
        >
          <header className="field-app-masthead">
            <div className="flex items-center justify-between gap-3 text-xs text-topbar-muted">
              <span className="num">{hhmm(clockMin)} PKT</span>
              <span className="inline-flex items-center gap-1.5">
                {conn === "none" ? <WifiOff className="size-3.5" /> : <Wifi className="size-3.5" />}
                {conn === "online" ? "Online" : conn === "sms" ? "SMS only" : "No signal"}
              </span>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <span
                className="flex size-11 shrink-0 items-center justify-center rounded-full border border-topbar-muted/40 font-urdu text-2xl"
                aria-hidden
              >
                ب
              </span>
              <div>
                <p className="font-bold text-lg">DCMS Field</p>
                <p className="text-xs text-topbar-muted">
                  District Bannu ·{" "}
                  <span lang="ur" dir="rtl" className="font-urdu text-sm">
                    فیلڈ رپورٹنگ
                  </span>
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-topbar-muted/30 pt-3">
              <p className="min-w-0 flex-1 text-sm font-semibold">{f.name}</p>
              <Code className="!text-topbar-muted text-xs">{f.code}</Code>
            </div>
          </header>
          <nav className="field-app-nav" aria-label="Field application sections">
            {NAV.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                aria-current={tab === id ? "page" : undefined}
                onClick={() => setTab(id)}
                className={cn(tab === id && "active")}
              >
                <Icon className="size-4" />
                <span>{label}</span>
                {id === "reports" && queueCount > 0 && (
                  <span className="num rounded-sm bg-pending-tint px-1 text-pending">
                    {queueCount}
                  </span>
                )}
              </button>
            ))}
          </nav>
          <div
            ref={contentRef}
            className="field-app-content"
            tabIndex={0}
            role="region"
            aria-label="Mobile app content"
          >
            {tab === "home" && (
              <div className="space-y-5">
                <div>
                  <p className="text-sm text-ink-muted">Welcome, {f.headName}</p>
                  <h2 className="mt-1 text-2xl font-bold">Your institution, at a glance</h2>
                  <p className="mt-2 text-sm text-ink-muted">
                    {formatDate(TODAY, true)} ·{" "}
                    {f.kind === "school" ? "School day reporting" : "Shift reporting & handover"}
                  </p>
                </div>
                <div className="field-report-callout">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold">
                      {f.kind === "school" ? "Today's attendance report" : "Current duty reporting"}
                    </p>
                    <StatusBadge status={statusFor(f.id)} />
                  </div>
                  <p className="mt-3 text-lg font-bold">
                    {queueCount
                      ? "You have an entry waiting for receipt"
                      : isAccepted(statusFor(f.id))
                        ? "Your report is on the district register"
                        : "Keep your district record up to date"}
                  </p>
                  <p className="mt-2 text-sm text-ink-muted">
                    {queueCount
                      ? "Open My reports to check the outbox and district acknowledgement."
                      : f.kind === "school"
                        ? "Confirm the roster, mark every staff member and record class attendance before sending."
                        : "Choose a shift, review the duty roster, update services and record a clear handover."}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button onClick={() => goToScreen(1)}>
                      {current ? "Open reporting form" : "Start today's report"}
                    </Button>
                    <Button variant="outline" onClick={() => setTab("reports")}>
                      Track my reports
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <AppStat
                    label="Staff on roster"
                    value={staffByFacility[f.id]?.length ?? 0}
                    icon={<UsersRound />}
                  />
                  <AppStat label="Open follow-ups" value={issues.length} icon={<Clock3 />} />
                  <AppStat
                    label="Active complaints"
                    value={activeComplaints.length}
                    icon={<MessageSquareWarning />}
                  />
                  <AppStat label="Entries in outbox" value={queueCount} icon={<Inbox />} />
                </div>
                {issues.length > 0 && (
                  <section>
                    <h3 className="mb-2 font-semibold">Action needed</h3>
                    <ul className="divide-y divide-line rounded-md border border-line">
                      {issues.slice(0, 3).map((item) => (
                        <li key={item.id} className="p-3">
                          <Link
                            className="text-sm font-semibold text-kurram hover:underline"
                            to="/review"
                            search={{ item: item.id }}
                          >
                            {item.detected}
                          </Link>
                          <p className="mt-1 text-xs text-ink-muted">
                            {item.owner} · {item.severity} priority · {item.status}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  <button className="field-quick-action" onClick={() => setTab("institution")}>
                    <Building2 />
                    <span>
                      <strong>Institution information</strong>
                      <small>Roster, capacity, assets and facilities</small>
                    </span>
                  </button>
                  <button className="field-quick-action" onClick={() => setTab("complaints")}>
                    <MessageSquareWarning />
                    <span>
                      <strong>Complaints & action</strong>
                      <small>Raise an issue and track its progress</small>
                    </span>
                  </button>
                </div>
              </div>
            )}
            <div
              hidden={tab !== "report"}
              className={cn("field-report-workspace", journey && "journey")}
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold">
                    {f.kind === "school" ? "School day report" : "Hospital shift report"}
                  </h2>
                  <p className="mt-1 text-sm text-ink-muted">
                    {journey
                      ? "All screens in the reporting journey"
                      : `Step ${step} of 4 · complete each section before sending`}
                  </p>
                </div>
                <button
                  type="button"
                  className="text-sm font-semibold text-kurram underline"
                  onClick={() => setJourney(!journey)}
                >
                  {journey ? "Use step-by-step app" : "Show full journey"}
                </button>
              </div>
              <div className="field-step-nav" aria-label="Report steps">
                {[
                  "Institution",
                  "Staff attendance",
                  f.kind === "school" ? "Class attendance" : "Beds & services",
                  f.kind === "school" ? "Send & track" : "Handover & send",
                ].map((label, i) => (
                  <button
                    key={label}
                    type="button"
                    aria-current={step === i + 1 ? "step" : undefined}
                    onClick={() => goToScreen(i + 1)}
                    className={cn(step === i + 1 && "active")}
                  >
                    <span className="num">{i + 1}</span>
                    {label}
                  </button>
                ))}
              </div>
              {children}
              <p className="mt-3 text-xs text-ink-muted">
                Edits stay in place while you use the app sections. Save or submit your report
                before refreshing or changing institution.
              </p>
            </div>
            {tab === "reports" && <FieldReports facility={f} conn={conn} />}
            {tab === "institution" && <FieldInstitution facility={f} />}
            {tab === "complaints" && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold">Institution complaints</h2>
                    <p className="mt-1 text-sm text-ink-muted">Issues affecting {f.name}.</p>
                  </div>
                  <ComplaintForm facility={f} connection={conn} />
                </div>
                <FieldSmsEntries facilityId={f.id} conn={conn} pendingOnly />
                {complaints.filter((c) => c.facilityIds.includes(f.id)).length ? (
                  <ul className="space-y-3">
                    {complaints
                      .filter((c) => c.facilityIds.includes(f.id))
                      .map((c) => (
                        <li key={c.id} className="rounded-md border border-line p-4">
                          <div className="mb-2 flex flex-wrap gap-2">
                            <Pill
                              tone={c.status === "Resolved" ? "verified" : "pending"}
                              icon={c.status === "Resolved" ? <CheckCircle2 /> : <Clock3 />}
                            >
                              {c.status}
                            </Pill>
                            <Pill tone={SEVERITY_TONE[c.priority]!}>{c.priority}</Pill>
                          </div>
                          <Link
                            to="/complaints"
                            search={{ complaint: c.id, facility: f.id }}
                            className="font-semibold text-kurram hover:underline"
                          >
                            {c.title}
                          </Link>
                          <p className="mt-1 text-sm text-ink-muted">
                            {c.owner} · {c.id}
                          </p>
                          <p className="mt-2 text-sm">{c.description}</p>
                        </li>
                      ))}
                  </ul>
                ) : (
                  <EmptyState
                    title="No complaints for this institution"
                    hint="Raise a complaint to describe an issue, assign an office and track action."
                  />
                )}
                <Link
                  to="/complaints"
                  search={{ facility: f.id }}
                  className="inline-block text-sm font-semibold text-kurram underline"
                >
                  Open full complaint register
                </Link>
              </div>
            )}
            {tab === "help" && <FieldHelp school={f.kind === "school"} />}
          </div>
          <footer className="border-t border-line bg-subtle px-5 py-3 text-xs text-ink-muted">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="size-3.5" />
              {storageAvailable
                ? "Saved locally in this browser"
                : "Storage unavailable · keep this page open"}
            </span>
            <span className="mt-1 block">District Administration Bannu · {f.rosterVersion}</span>
          </footer>
        </section>
      </div>
    </FieldContext.Provider>
  );
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="text-right font-semibold">{value}</dd>
    </div>
  );
}
function AppStat({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return (
    <div className="rounded-md border border-line bg-surface p-4">
      <span className="flex items-center justify-between gap-2 text-xs text-ink-muted [&_svg]:size-4">
        {label}
        {icon}
      </span>
      <strong className="num mt-2 block text-2xl">{value}</strong>
    </div>
  );
}

function FieldReports({ facility: f, conn }: { facility: Facility; conn: FieldConnection }) {
  const { reports, pendingOutbox, sendSavedEntries } = useApp();
  const { goToScreen } = useFieldNavigation();
  const [status, setStatus] = useState("All");
  const [expanded, setExpanded] = useState<string | null>(null);
  const list = reports.filter((r) => r.facilityId === f.id).sort((a, b) => b.sequence - a.sequence);
  const visible = list.filter((r) => {
    if (status === "All") return true;
    if (status === "outbox") return pendingOutbox.some((p) => p.id === r.id);
    return r.status === status;
  });
  const acknowledge = (id: string) => {
    sendSavedEntries(f.id, conn === "online" ? "online" : "sms");
    toast.success(conn === "online" ? "Report delivered" : "Saved report sent by SMS", {
      description: id,
    });
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">My reports & outbox</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Every submission and revision for this institution.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={!visible.length}
          onClick={() =>
            downloadCsv(
              `${f.code}-reports.csv`,
              visible.map((r) => ({
                Report: r.id,
                Status: r.status,
                Shift: r.session,
                Channel: r.channel,
                Observed: hhmm(r.observedAt),
                Sent: hhmm(r.sentAt),
                Received: hhmm(r.receivedAt),
                Verified: hhmm(r.verifiedAt),
                Roster: r.rosterVersion,
              })),
            )
          }
        >
          <Download />
          Export
        </Button>
      </div>
      <label className="block space-y-1 text-sm">
        Report status
        <select
          aria-label="My report status"
          className="h-10 w-full rounded-md border border-line bg-surface px-3"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="All">All reports</option>
          <option value="outbox">Saved & awaiting receipt</option>
          <option value="received">Received</option>
          <option value="pending">Pending verification</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
        </select>
      </label>
      {visible.length ? (
        <ul className="space-y-3">
          {visible.map((r) => (
            <li key={r.id} className="rounded-md border border-line p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <StatusBadge status={r.status} />
                <span className="text-xs text-ink-muted">
                  {r.channel === "sms" ? "SMS" : "App"} ·{" "}
                  {r.session === "M" ? "Morning" : r.session === "E" ? "Evening" : "Night"}
                </span>
              </div>
              <p className="mt-3 break-all font-mono text-sm font-semibold">{r.id}</p>
              <p className="mt-1 text-xs text-ink-muted">
                Observed {hhmm(r.observedAt)} · Roster {r.rosterVersion} · Revision {r.sequence}
              </p>
              {r.rejectionReason && (
                <p className="mt-3 rounded border border-line bg-problem-tint p-2 text-sm text-problem">
                  Correction required: {r.rejectionReason}
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  aria-expanded={expanded === r.id}
                  className="text-sm font-semibold text-kurram underline"
                  onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                >
                  {expanded === r.id ? "Hide receipt details" : "View receipt details"}
                </button>
                {r.status === "draft" && pendingOutbox.some((p) => p.id === r.id) && (
                  <Button size="sm" disabled={conn === "none"} onClick={() => acknowledge(r.id)}>
                    Send saved report
                  </Button>
                )}
                {r.status === "rejected" && (
                  <Button size="sm" variant="outline" onClick={() => goToScreen(1)}>
                    Correct & resubmit
                  </Button>
                )}
              </div>
              {expanded === r.id && <ReportReceiptDetails report={r} />}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title="No reports in this view"
          hint={
            list.length
              ? "Choose another status to see earlier submissions."
              : "Start a report and its receipt will appear here."
          }
          action={<Button onClick={() => goToScreen(1)}>Open reporting form</Button>}
        />
      )}
      <FieldSmsEntries facilityId={f.id} conn={conn} />
      {conn === "none" && (
        <p className="rounded-md border border-line bg-pending-tint p-3 text-sm text-pending">
          No signal is selected. Saved reports remain in the outbox; select an available connection
          above to deliver them.
        </p>
      )}
    </div>
  );
}
function ReportReceiptDetails({ report: r }: { report: Report }) {
  return (
    <div className="mt-4 space-y-3 border-t border-line pt-3">
      <dl className="space-y-2">
        <InfoRow label="Observed at institution" value={hhmm(r.observedAt)} />
        <InfoRow label="Sent" value={hhmm(r.sentAt)} />
        <InfoRow label="Received by district" value={hhmm(r.receivedAt)} />
        <InfoRow label="Officer verification" value={hhmm(r.verifiedAt)} />
        <InfoRow
          label="Registered sender"
          value={r.sender.registered ? "Confirmed" : "Not confirmed"}
        />
        <InfoRow label="Message segments" value={`${r.segments.received} / ${r.segments.total}`} />
      </dl>
      <ol className="space-y-2">
        {r.lifecycle.map((event, index) => (
          <li key={index} className="flex justify-between gap-3 text-sm">
            <span className={cn(event.at == null && "text-ink-muted")}>{event.label}</span>
            <span className="num shrink-0 text-ink-muted">
              {event.at == null ? "Waiting" : hhmm(event.at)}
            </span>
          </li>
        ))}
      </ol>
      {r.smsPayload && (
        <details>
          <summary className="cursor-pointer text-sm font-semibold text-kurram">
            Coded SMS payload
          </summary>
          <p className="mt-2 break-all rounded border border-line bg-subtle p-3 font-mono text-xs">
            {r.smsPayload}
          </p>
        </details>
      )}
      <Link
        to="/inbox"
        search={{ report: r.id }}
        className="inline-block text-sm font-semibold text-kurram underline"
      >
        Open district report record
      </Link>
    </div>
  );
}

function FieldInstitution({ facility: f }: { facility: Facility }) {
  const { schoolDayFor, shiftFor, facilityFor, staffStatusFor } = useApp();
  const live = facilityFor(f.id) ?? f;
  const profile = institutionProfiles[f.id]!;
  const staff = staffByFacility[f.id] ?? [];
  const sanctioned = posts
    .filter((p) => p.facilityId === f.id)
    .reduce((n, p) => n + p.sanctioned, 0);
  const students = schoolDayFor(f.id)?.classes.reduce(
    (n, c) => n + c.enrolledBoys + c.enrolledGirls,
    0,
  );
  const fields: [string, ReactNode][] = [
    ["Institution code", f.code],
    ["Register reference", profile.reference],
    ["Institution type", f.typeLabel],
    ["Department", f.department],
    ["Tehsil", f.tehsil],
    ["Address", profile.address],
    ["Head / in-charge", f.headName],
    ["Registered reporting number", f.phoneMasked],
    ["Operating hours", profile.hours],
    ["Reporting roster", f.rosterVersion],
    ["Established", profile.established],
    ["Site area", profile.area],
    ["Usable rooms", `${profile.usableRooms} of ${profile.rooms}`],
    [
      f.kind === "school" ? "Enrolled students" : "Bed capacity",
      students ?? shiftFor(f.id, "M")?.bedsTotal ?? 0,
    ],
    ["Sanctioned / filled posts", `${sanctioned} / ${staff.length}`],
    ["Last monitoring visit", formatDate(profile.inspectionDate)],
    ["Next monitoring visit", formatDate(profile.nextInspection)],
  ];
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">Institution information</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Reference details, approved capacity and the current staff register.
        </p>
      </div>
      <dl className="divide-y divide-line rounded-md border border-line px-4">
        {fields.map(([label, value]) => (
          <div className="py-3" key={label}>
            <InfoRow label={label} value={value} />
          </div>
        ))}
      </dl>
      <section>
        <h3 className="mb-3 font-semibold">Staff roster · {staff.length}</h3>
        <ul className="max-h-80 divide-y divide-line overflow-y-auto rounded-md border border-line">
          {staff.map((s) => (
            <li className="flex flex-wrap items-start justify-between gap-2 p-3" key={s.id}>
              <div>
                <Link
                  to="/staff/$id"
                  params={{ id: s.id }}
                  className="text-sm font-semibold text-kurram hover:underline"
                >
                  {s.name}
                </Link>
                <p className="mt-1 text-xs text-ink-muted">
                  {s.designation} · {s.code} · BPS {s.bps}
                </p>
              </div>
              <Pill tone={STAFF_STATUS_TONE[staffStatusFor(s)] ?? "neutral"}>
                {staffStatusFor(s)}
              </Pill>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h3 className="mb-3 font-semibold">Facilities & infrastructure</h3>
        <dl className="divide-y divide-line rounded-md border border-line px-4">
          {INFRA_KEYS.map((key) => (
            <div className="py-3" key={key}>
              <InfoRow
                label={INFRA_LABELS[key]}
                value={
                  <Pill
                    tone={
                      isStale(live.infra[key].updated)
                        ? "neutral"
                        : live.infra[key].ok
                          ? "verified"
                          : "problem"
                    }
                  >
                    {isStale(live.infra[key].updated)
                      ? "Needs update"
                      : live.infra[key].ok
                        ? "Available"
                        : "Problem"}
                  </Pill>
                }
              />
              <p className="mt-1 text-xs text-ink-muted">
                Updated {formatDate(live.infra[key].updated)}
                {live.infra[key].note ? ` · ${live.infra[key].note}` : ""}
              </p>
            </div>
          ))}
          <div className="py-3">
            <InfoRow
              label={live.equipment.label}
              value={
                <Pill
                  tone={
                    isStale(live.equipment.updated)
                      ? "neutral"
                      : live.equipment.ok
                        ? "verified"
                        : "problem"
                  }
                >
                  {isStale(live.equipment.updated)
                    ? "Needs update"
                    : live.equipment.ok
                      ? "Working"
                      : "Fault"}
                </Pill>
              }
            />
            <p className="mt-1 text-xs text-ink-muted">
              Updated {formatDate(live.equipment.updated)}
              {live.equipment.note ? ` · ${live.equipment.note}` : ""}
            </p>
          </div>
        </dl>
      </section>
      <section>
        <h3 className="mb-3 font-semibold">Assets & equipment</h3>
        <ul className="divide-y divide-line rounded-md border border-line">
          {profile.assets.map((asset) => (
            <li key={asset.id} className="p-3">
              <div className="flex justify-between gap-3 text-sm">
                <span className="font-semibold">{asset.name}</span>
                <span className="num">
                  {asset.working} / {asset.quantity} working
                </span>
              </div>
              <p className="mt-1 text-xs text-ink-muted">
                Checked {formatDate(asset.checkedOn)} · {asset.custodian}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
function FieldHelp({ school }: { school: boolean }) {
  const sections = [
    [
      "How do I complete a report?",
      school
        ? "Open Report, confirm your institution and roster, mark every staff member, then enter attendance for every class. Review the totals and choose Send or Save on phone. School reports are due by 10:00 on the fixed reporting day."
        : "Open Report and choose the correct shift. Review every duty assignment, OPD, beds and services. Record unresolved faults, stock-outs and interruptions before sending. An overnight shift belongs to its start date; an upcoming shift cannot be submitted.",
    ],
    [
      "What do the reporting statuses mean?",
      "Draft means saved locally. Sent means district acknowledgement is pending. Received means the district register has accepted the submission. Pending verification means it awaits an officer's check. Verified confirms that check. Rejected requires correction and a new revision. No report means no accepted record is available; it does not mean staff are absent.",
    ],
    [
      "What happens without internet?",
      "Use the connection control above the app. No signal lets you save a report locally. Selecting Online or SMS only delivers saved reports for the selected institution. SMS submissions move from Sent to Received automatically when the simulated gateway validates them. The admin register updates at the same time. My reports shows the actual receipt and lifecycle.",
    ],
    [
      "When are my edits saved?",
      "Submitted reports and reports saved with Save on phone survive refresh in this browser. Moving between Home, Report and the other app sections keeps unsent form edits in place. Refreshing or changing institution can discard edits that you have not saved. Browser storage is specific to this device, browser and site address.",
    ],
    [
      "How do I correct a report?",
      "Reopen Report, change the incorrect fields and submit again. A new revision is created and the earlier record stays in My reports. For a rejected report, read its reason first. Check the roster version, staff marks and class or bed totals before resending.",
    ],
    [
      "What should I enter for attendance?",
      school
        ? "Mark Present, Absent, Approved leave or Official duty for every rostered staff member. Leave requires prior approval; official duty is recorded separately from on-site attendance. Class attendance must be a whole number between zero and approved enrolment. The report cannot be sent with missing or excessive totals."
        : "Present, Late and Replacement can count as on site. On-call is reachable but off site; Off-duty is not scheduled for the current duty period. Record leave and absence separately. Available beds cannot exceed approved capacity. Report service availability for this shift and add handover notes for unresolved issues.",
    ],
    [
      "How do complaints and follow-ups work?",
      "Use Complaints to raise an issue for this institution and, when your role permits, add other schools or health facilities. Select category, priority and assigned office. Each complaint has its own progress and resolution history. Joint complaints spanning departments require district-wide authority to update. Home lists current review follow-ups.",
    ],
    [
      "Who can see and change information?",
      "The role menu in the portal controls the presentation scope: district, education, health or Domel tehsil. Every app institution selector and reporting action respects that scope. This simulator does not provide production authentication, shared accounts or a government connection.",
    ],
    [
      "What data should I avoid entering?",
      "Reports cover staffing and institution operations. Do not enter patient names, diagnoses, CNICs, passwords or personal medical information. Registered phone numbers are masked. SMS payloads use institution and roster codes rather than personal names.",
    ],
    [
      "What is available in this presentation?",
      "This is a working browser simulator with generated institution records and a fixed reporting day of 23 November 2026. Forms, SMS outbox, automatic gateway receipt, revisions, complaints and district updates work locally. Open views in the same browser stay in sync. No actual SMS is sent, and no GPS, camera or biometric check is performed. Use Workspace controls to reset the presentation or start background reporting activity.",
    ],
  ];
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Help & reporting guide</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Practical guidance for the institution administrator.
        </p>
      </div>
      <div className="rounded-md border border-line bg-subtle p-4">
        <p className="font-semibold">Before you send</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          <li>Confirm the institution, date and current roster.</li>
          <li>Review every staff mark and operational total.</li>
          <li>Save when there is no signal; check the district receipt after sending.</li>
          <li>Keep unresolved faults and follow-up notes clear and actionable.</li>
        </ul>
      </div>
      {sections.map(([title, body]) => (
        <details key={title} className="rounded-md border border-line p-4">
          <summary className="cursor-pointer font-semibold text-sm">{title}</summary>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">{body}</p>
        </details>
      ))}
    </div>
  );
}
