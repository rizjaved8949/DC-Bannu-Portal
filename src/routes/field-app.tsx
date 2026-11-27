import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ChevronRight, Signal, SignalLow, SignalZero, Wifi, WifiOff } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/dcms/page-header";
import { Code } from "@/components/dcms/section";
import { FieldWorkspace, useFieldNavigation } from "@/components/dcms/field-workspace";
import { Segmented } from "@/components/dcms/segmented";
import { Pill, STAFF_STATUS_TONE, StatusBadge } from "@/components/dcms/status";
import {
  formatDate,
  hhmm,
  SERVICES,
  SHIFT_NAMES,
  shiftCoverage,
  staffByFacility,
  staffById,
  TODAY,
  type Facility,
  type ShiftKey,
  type ShiftStaffStatus,
  type SchoolStaffStatus,
  isAccepted,
  reportPayloadFor,
  codedSmsBudget,
} from "@/data/mock";
import { cn } from "@/lib/utils";
import { useApp, useScopedFacilities } from "@/lib/app-state";

export const Route = createFileRoute("/field-app")({
  validateSearch: (value: Record<string, unknown>): { facility?: string; view?: "app" } => ({
    ...(typeof value["facility"] === "string" ? { facility: value["facility"] } : {}),
    ...(value["view"] === "app" ? { view: "app" as const } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Field app · DCMS Bannu" },
      {
        name: "description",
        content:
          "Use institution reporting, saved reports, shift handover, complaints and the administrator guide.",
      },
      { property: "og:title", content: "Field app · DCMS Bannu" },
      {
        property: "og:description",
        content:
          "Use institution reporting, saved reports, shift handover, complaints and the administrator guide.",
      },
    ],
  }),
  component: FieldAppPage,
});

type Persona = "school" | "hospital";
type Connection = "online" | "sms" | "none";
type Mark = "P" | "A" | "L" | "OD";

const CONNECTION_META: Record<
  Connection,
  { label: string; urdu: string; icon: ReactNode; tone: "verified" | "pending" | "problem" }
> = {
  online: { label: "Online", urdu: "آن لائن", icon: <Wifi />, tone: "verified" },
  sms: { label: "SMS only", urdu: "صرف ایس ایم ایس", icon: <SignalLow />, tone: "pending" },
  none: { label: "No signal", urdu: "سگنل نہیں", icon: <SignalZero />, tone: "problem" },
};

function FieldAppPage() {
  const [persona, setPersona] = useState<Persona>("school");
  const [conn, setConn] = useState<Connection>("sms");
  const { role, sendSavedEntries, storageReady, statusFor } = useApp();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const scope = useScopedFacilities({ applyFilters: false });
  const schoolOptions = scope.filter((f) => f.kind === "school");
  const selected = scope.find((f) => f.id === search.facility);
  const school =
    (selected?.kind === "school" ? selected : undefined) ??
    schoolOptions.find((f) => statusFor(f.id) === "none") ??
    schoolOptions.find(
      (f) => (staffByFacility[f.id]?.length ?? 0) >= 12 && f.rosterVersion === "RV04",
    ) ??
    schoolOptions.find((f) => (staffByFacility[f.id]?.length ?? 0) >= 12) ??
    schoolOptions[0];
  const hospital =
    (selected?.kind === "health" ? selected : undefined) ??
    scope.find((f) => f.id === "HF203") ??
    scope.find((f) => f.kind === "health");
  const activePersona =
    role.department === "Education"
      ? "school"
      : role.department === "Health"
        ? "hospital"
        : selected
          ? selected.kind === "school"
            ? "school"
            : "hospital"
          : persona;
  const currentFacility = activePersona === "school" ? school : hospital;
  const currentFacilityId = currentFacility?.id;
  useEffect(() => {
    if (storageReady && currentFacilityId && search.facility !== currentFacilityId)
      navigate({ search: { ...search, facility: currentFacilityId }, replace: true });
  }, [storageReady, currentFacilityId, search, navigate]);
  const changeConnection = (value: Connection) => {
    setConn(value);
    if (value !== "none" && currentFacility) sendSavedEntries(currentFacility.id, value);
  };

  return (
    <div className={cn("space-y-5", search.view === "app" && "field-focused")}>
      <PageHeader
        title="Field app"
        urdu="فیلڈ ایپ"
        description="Submit institution attendance and shift reports, keep work safe without a signal, and track receipt by the district."
      >
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link
              to="/field-app"
              search={{
                ...(search.facility ? { facility: search.facility } : {}),
                ...(search.view === "app" ? {} : { view: "app" }),
              }}
            >
              {search.view === "app" ? "Back to portal view" : "Open app view"}
            </Link>
          </Button>
          <Segmented
            label="Administrator type"
            value={activePersona}
            onChange={(value) => {
              setPersona(value);
              navigate({ search: search.view ? { view: search.view } : {} });
            }}
            options={(
              [
                { value: "school", label: "School administrator" },
                { value: "hospital", label: "Hospital administrator" },
              ] as { value: Persona; label: string }[]
            ).filter((option) => (option.value === "school" ? !!school : !!hospital))}
          />
          <Segmented
            label="Connection"
            value={conn}
            onChange={changeConnection}
            options={(Object.keys(CONNECTION_META) as Connection[]).map((c) => ({
              value: c,
              label: (
                <span className="inline-flex items-center gap-1.5 [&_svg]:size-3.5">
                  {CONNECTION_META[c].icon}
                  {CONNECTION_META[c].label}
                </span>
              ),
            }))}
          />
          <span className="text-xs text-ink-muted">
            No Wi-Fi or mobile data? Select SMS only. A cellular SMS signal is enough to send
            entries.
          </span>
        </div>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface p-4">
        <span className="text-sm font-semibold">Reporting institution</span>
        <Select
          value={currentFacility?.id ?? ""}
          onValueChange={(facility) => navigate({ search: { ...search, facility } })}
        >
          <SelectTrigger className="w-full sm:w-[440px]" aria-label="Reporting institution">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {scope
              .filter((f) => f.kind === (activePersona === "school" ? "school" : "health"))
              .map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name} · {f.code}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        <span className="ml-auto text-xs text-ink-muted">
          {currentFacility?.tehsil} tehsil · {currentFacility?.rosterVersion}
        </span>
      </div>
      <div
        className="rounded-lg border border-line bg-sent-tint p-4 text-sm text-sent"
        role="status"
      >
        <p className="font-semibold">
          {conn === "sms"
            ? "No internet: SMS reporting is active"
            : conn === "none"
              ? "No cellular signal: entries stay saved"
              : "Internet reporting with SMS fallback"}
        </p>
        <p className="mt-1">
          {conn === "none"
            ? "Complete entries and save them on the device. When cellular SMS service returns, select SMS only to send them without Wi-Fi."
            : "Attendance, class totals, hospital data, equipment faults, handover notes and complaints can travel by SMS. Receipt and validation update the admin side automatically."}
        </p>
      </div>
      {!storageReady ? (
        <div className="panel px-5 py-8 text-ink-muted" role="status">
          Opening the saved reporting workspace…
        </div>
      ) : currentFacility ? (
        <FieldWorkspace key={currentFacility.id} facility={currentFacility} conn={conn}>
          {currentFacility.kind === "school" ? (
            <SchoolFlow key={currentFacility.id} conn={conn} f={currentFacility} />
          ) : (
            <HospitalFlow key={currentFacility.id} conn={conn} f={currentFacility} />
          )}
        </FieldWorkspace>
      ) : (
        <p className="panel p-5 text-ink-muted">
          No institution is available in this role's scope.
        </p>
      )}
    </div>
  );
}

// ---------- Phone frame ----------
function Phone({
  n,
  title,
  urdu,
  conn,
  children,
  footer,
}: {
  n: number;
  title: string;
  urdu: string;
  conn: Connection;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const meta = CONNECTION_META[conn];
  const { step, journey, goToScreen } = useFieldNavigation();
  const { clockMin } = useApp();
  return (
    <figure
      hidden={!journey && step !== n}
      className="field-report-screen flex flex-col items-center gap-2"
    >
      <div
        id={`field-screen-${n}`}
        tabIndex={-1}
        className={cn(
          "phone-device relative flex h-[740px] w-[360px] shrink-0 flex-col overflow-hidden rounded-phone border-[6px] border-topbar bg-surface",
          !journey && "field-report-device",
        )}
      >
        <div className="field-report-status flex h-7 items-center justify-between bg-topbar px-5 text-[11px] text-topbar-foreground">
          <span className="tabular-nums">{hhmm(clockMin)}</span>
          <span className="inline-flex items-center gap-1 [&_svg]:size-3">
            {conn === "online" ? <Wifi /> : conn === "sms" ? <Signal /> : <WifiOff />}
            <span>{conn === "online" ? "4G" : conn === "sms" ? "2G" : "No service"}</span>
          </span>
        </div>
        <div className="flex items-start justify-between gap-2 border-b border-line bg-dept px-4 py-2.5 text-white">
          <div>
            <div className="text-md font-bold leading-tight">{title}</div>
            <div
              dir="rtl"
              lang="ur"
              className="font-urdu text-left text-[16px] leading-[1.8] text-white/85"
            >
              {urdu}
            </div>
          </div>
          <span
            className={cn(
              "mt-1 inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[11px] font-semibold [&_svg]:size-3",
              meta.tone === "verified"
                ? "bg-white/15"
                : meta.tone === "pending"
                  ? "bg-wheat/80 text-topbar"
                  : "bg-problem-tint text-problem",
            )}
          >
            {meta.icon}
            {meta.label}
          </span>
        </div>
        {!journey && n > 1 && (
          <button
            type="button"
            className="border-b border-line bg-subtle px-4 py-2 text-left text-xs font-semibold text-dept"
            onClick={() => goToScreen(n - 1)}
          >
            Previous step
          </button>
        )}
        <div className="field-report-body flex-1 overflow-y-auto px-4 py-3 text-sm text-ink">
          {children}
        </div>
        {footer && <div className="border-t border-line bg-surface px-4 py-3">{footer}</div>}
      </div>
      {journey && (
        <figcaption className="inline-flex items-center gap-2 text-xs text-ink-muted">
          <span
            aria-hidden
            className="flex size-5 items-center justify-center rounded-full bg-dept text-[11px] font-bold text-white"
          >
            {n}
          </span>
          Screen {n} of 4
        </figcaption>
      )}
    </figure>
  );
}

function PrimaryButton({
  children,
  urdu,
  disabled,
  onClick,
}: {
  children: ReactNode;
  urdu: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex w-full flex-col items-center rounded-md bg-dept px-4 py-2 text-white disabled:opacity-50"
    >
      <span className="text-sm font-semibold">{children}</span>
      <span dir="rtl" lang="ur" className="font-urdu text-[16px] leading-[1.8] text-white/85">
        {urdu}
      </span>
    </button>
  );
}

function Steps({
  steps,
}: {
  steps: {
    label: string;
    urdu?: string;
    state: "done" | "active" | "waiting" | "blocked";
    time?: string;
  }[];
}) {
  return (
    <ol className="space-y-2">
      {steps.map((s) => (
        <li key={s.label} className="flex items-start gap-2.5">
          <span
            aria-hidden
            className={cn(
              "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 [&_svg]:size-3",
              s.state === "done"
                ? "border-verified bg-verified text-white"
                : s.state === "active"
                  ? "border-wheat bg-surface"
                  : s.state === "blocked"
                    ? "border-problem bg-surface"
                    : "border-line bg-surface",
            )}
          >
            {s.state === "done" && <Check />}
          </span>
          <span className="flex-1">
            <span
              className={cn(
                "block text-sm",
                s.state === "waiting" && "text-ink-muted",
                s.state === "blocked" && "text-problem",
              )}
            >
              {s.label}
            </span>
            {s.urdu && (
              <span
                dir="rtl"
                lang="ur"
                className="font-urdu block text-left text-[16px] leading-[1.8] text-ink-muted"
              >
                {s.urdu}
              </span>
            )}
          </span>
          {s.time && <span className="text-xs tabular-nums text-ink-muted">{s.time}</span>}
        </li>
      ))}
    </ol>
  );
}

// ---------- School flow ----------
function SchoolFlow({ conn, f }: { conn: Connection; f: Facility }) {
  const { goToScreen, journey } = useFieldNavigation();
  const { submitReport, reports, schoolDayFor, submissionFor, clockMin } = useApp();
  const previous = reports
    .filter((r) => r.facilityId === f.id && !!submissionFor(r.id))
    .sort((a, b) => b.sequence - a.sequence)[0];
  const staff = staffByFacility[f.id] ?? [];
  const day = (previous ? submissionFor(previous.id)?.schoolDay : undefined) ?? schoolDayFor(f.id)!;
  const [submissionId, setSubmissionId] = useState<string | null>(previous?.id ?? null);
  const currentReport = reports.find((r) => r.id === submissionId);
  const nextSequence =
    Math.max(0, ...reports.filter((r) => r.facilityId === f.id).map((r) => r.sequence)) + 1;
  const [marks, setMarks] = useState<Record<string, Mark>>(() =>
    Object.fromEntries(
      staff.map((s) => [
        s.id,
        day.staffStatus[s.id] === "Absent"
          ? "A"
          : day.staffStatus[s.id] === "Approved leave"
            ? "L"
            : day.staffStatus[s.id] === "Official duty"
              ? "OD"
              : "P",
      ]),
    ),
  );
  const classes = day.classes;
  const [present, setPresent] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      classes.map((c) => [
        c.className,
        String(Math.min(c.enrolledBoys + c.enrolledGirls, c.presentBoys + c.presentGirls)),
      ]),
    ),
  );
  const [sent, setSent] = useState(false);
  const [saved, setSaved] = useState(false);
  const submit = () => {
    try {
      const statusMap: Record<Mark, SchoolStaffStatus> = {
        P: "Present",
        A: "Absent",
        L: "Approved leave",
        OD: "Official duty",
      };
      const report = submitReport({
        facilityId: f.id,
        connection: conn,
        schoolDay: {
          facilityId: f.id,
          staffStatus: Object.fromEntries(staff.map((s) => [s.id, statusMap[marks[s.id] ?? "P"]])),
          classes: classes.map((c) => {
            const total = Number(present[c.className]);
            const enrolled = c.enrolledBoys + c.enrolledGirls;
            let boys = Math.min(
              c.enrolledBoys,
              Math.round((total * c.enrolledBoys) / Math.max(1, enrolled)),
            );
            let girls = total - boys;
            if (girls > c.enrolledGirls) {
              girls = c.enrolledGirls;
              boys = total - girls;
            }
            return { ...c, presentBoys: boys, presentGirls: girls };
          }),
        },
      });
      setSubmissionId(report.id);
      setSaved(conn === "none");
      setSent(conn !== "none");
      toast.success(
        conn === "none" ? "Report saved" : conn === "sms" ? "SMS queued" : "Report received",
        {
          description: `${report.id}${conn === "sms" ? " · awaiting district acknowledgement" : conn === "none" ? " · ready to sync when a connection returns" : " · ready for district verification"}`,
        },
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Check the report details.");
    }
  };

  const previewDay = {
    ...day,
    staffStatus: Object.fromEntries(
      staff.map((s) => [
        s.id,
        ({ P: "Present", A: "Absent", L: "Approved leave", OD: "Official duty" } as const)[
          marks[s.id] ?? "P"
        ],
      ]),
    ),
    classes: classes.map((c) => {
      const count = Number(present[c.className] ?? 0);
      const boys = Math.min(
        c.enrolledBoys,
        Math.round((count * c.enrolledBoys) / Math.max(1, c.enrolledBoys + c.enrolledGirls)),
      );
      return { ...c, presentBoys: boys, presentGirls: count - boys };
    }),
  };
  const payload =
    currentReport?.smsPayload ??
    reportPayloadFor({
      facilityId: f.id,
      sequence: currentReport?.sequence ?? nextSequence,
      schoolDay: previewDay,
    });
  const budget = codedSmsBudget(payload);
  const invalid = classes.filter(
    (c) =>
      present[c.className] === "" ||
      Number(present[c.className] ?? 0) > c.enrolledBoys + c.enrolledGirls,
  );
  const counts = { P: 0, A: 0, L: 0, OD: 0 } as Record<Mark, number>;
  for (const m of Object.values(marks)) counts[m]++;

  return (
    <div className={cn("phone-sequence pb-4", journey && "overflow-x-auto")}>
      <div className={journey ? "flex min-w-max gap-5" : "w-full"}>
        <Phone
          n={1}
          title="Today"
          urdu="آج"
          conn={conn}
          footer={
            <PrimaryButton urdu="آج کی رپورٹ شروع کریں" onClick={() => goToScreen(2)}>
              Start today's report
            </PrimaryButton>
          }
        >
          <div className="space-y-3">
            <div className="rounded-md border border-line p-3">
              <div className="text-xs text-ink-muted">School</div>
              <div className="font-semibold">{f.name}</div>
              <div className="mt-1 flex items-center gap-2 text-xs text-ink-muted">
                <Code className="text-xs">{f.code}</Code>
                {f.tehsil} tehsil
              </div>
            </div>
            <dl className="divide-y divide-line rounded-md border border-line text-sm">
              <div className="flex justify-between px-3 py-2">
                <dt className="text-ink-muted">Date</dt>
                <dd className="font-semibold">{formatDate(TODAY, true)}</dd>
              </div>
              <div className="flex justify-between px-3 py-2">
                <dt className="text-ink-muted">Roster</dt>
                <dd>
                  <Code className="text-sm">{f.rosterVersion}</Code> · {staff.length} staff
                </dd>
              </div>
              <div className="flex justify-between px-3 py-2">
                <dt className="text-ink-muted">Connection</dt>
                <dd>
                  <Pill tone={CONNECTION_META[conn].tone}>{CONNECTION_META[conn].label}</Pill>
                </dd>
              </div>
              <div className="flex justify-between px-3 py-2">
                <dt className="text-ink-muted">Last report</dt>
                <dd className="tabular-nums">
                  {reports.some((r) => r.facilityId === f.id && r.status !== "draft")
                    ? "Latest submission on register"
                    : "Awaiting today’s submission"}
                </dd>
              </div>
            </dl>
            {conn !== "online" && (
              <p className="rounded-md bg-pending-tint px-3 py-2 text-xs text-pending">
                {conn === "sms"
                  ? "No internet. Today's report will go by coded SMS."
                  : "No signal. You can still fill the report; it will be saved on the phone."}
              </p>
            )}
            <p className="text-xs text-ink-muted">
              Reports are due by 10:00. Record every staff member and class before sending.
            </p>
          </div>
        </Phone>

        <Phone
          n={2}
          title="Staff attendance"
          urdu="عملے کی حاضری"
          conn={conn}
          footer={
            <div className="space-y-2">
              <span className="text-xs tabular-nums text-ink-muted">
                {counts.P} present · {counts.A} absent · {counts.L} leave · {counts.OD} duty
              </span>
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMarks(Object.fromEntries(staff.map((s) => [s.id, "P" as Mark])));
                    setSent(false);
                    setSubmissionId(null);
                    setSaved(false);
                  }}
                  className="rounded-md border border-line px-2.5 py-1.5 text-xs font-semibold text-dept hover:bg-subtle"
                >
                  Mark all present
                </button>
                <button
                  type="button"
                  onClick={() => goToScreen(3)}
                  className="rounded-sm bg-dept px-3 py-1.5 text-xs font-semibold text-topbar-foreground"
                >
                  Continue
                </button>
              </div>
            </div>
          }
        >
          <ul className="divide-y divide-line">
            {staff.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2 py-1.5">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{s.name}</span>
                  <span className="block text-2xs text-ink-muted">
                    {s.designation} · <Code className="text-2xs">{s.code}</Code>
                  </span>
                </span>
                <span
                  role="group"
                  aria-label={`Status for ${s.name}`}
                  className="inline-flex shrink-0 rounded-sm border border-line"
                >
                  {(["P", "A", "L", "OD"] as Mark[]).map((m) => {
                    const active = marks[s.id] === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        aria-pressed={active}
                        onClick={() => {
                          setMarks((x) => ({ ...x, [s.id]: m }));
                          setSent(false);
                          setSubmissionId(null);
                          setSaved(false);
                        }}
                        aria-label={`${{ P: "Present", A: "Absent", L: "Approved leave", OD: "Official duty" }[m]} for ${s.name}`}
                        className={cn(
                          "min-w-8 px-1.5 py-1 text-xs font-semibold first:rounded-l-[3px] last:rounded-r-[3px]",
                          active
                            ? m === "P"
                              ? "bg-verified text-white"
                              : m === "A"
                                ? "bg-problem text-white"
                                : m === "L"
                                  ? "bg-sent text-white"
                                  : "bg-neutral text-white"
                            : "text-ink-muted hover:bg-subtle",
                        )}
                      >
                        {m}
                      </button>
                    );
                  })}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-2xs text-ink-muted">
            P present · A absent · L approved leave · OD official duty
          </p>
        </Phone>

        <Phone
          n={3}
          title="Class totals"
          urdu="جماعت وار تعداد"
          conn={conn}
          footer={
            <PrimaryButton urdu="آگے" onClick={() => goToScreen(4)} disabled={invalid.length > 0}>
              Continue
            </PrimaryButton>
          }
        >
          <ul className="divide-y divide-line">
            {classes.map((c) => {
              const enrolled = c.enrolledBoys + c.enrolledGirls;
              const v = present[c.className] ?? "";
              const bad = v === "" || Number(v) > enrolled;
              const id = `fa-${c.className.replace(/\s/g, "-")}`;
              return (
                <li key={c.className} className="py-2">
                  <div className="flex items-center justify-between gap-3">
                    <label htmlFor={id} className="text-sm font-semibold">
                      {c.className}
                      <span className="block text-2xs font-normal text-ink-muted">
                        Enrolled {enrolled}
                      </span>
                    </label>
                    <input
                      id={id}
                      inputMode="numeric"
                      value={v}
                      onChange={(e) => {
                        setPresent((p) => ({
                          ...p,
                          [c.className]: e.target.value.replace(/\D/g, "").slice(0, 3),
                        }));
                        setSent(false);
                        setSubmissionId(null);
                        setSaved(false);
                      }}
                      aria-invalid={bad}
                      aria-describedby={bad ? `${id}-err` : undefined}
                      className={cn(
                        "h-9 w-20 rounded-sm border bg-surface px-2 text-right text-sm tabular-nums",
                        bad ? "border-problem text-problem" : "border-line",
                      )}
                    />
                  </div>
                  {bad && (
                    <p id={`${id}-err`} className="mt-1 text-right text-xs text-problem">
                      Present can't be more than enrolled ({enrolled})
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-2xs text-ink-muted">
            Enrolment comes from the institution register. Report totals cannot exceed approved
            enrolment.
          </p>
        </Phone>

        <Phone
          n={4}
          title="Send"
          urdu="بھیجیں"
          conn={conn}
          footer={
            conn === "none" ? (
              <PrimaryButton
                urdu="فون پر محفوظ کریں"
                onClick={submit}
                disabled={saved || invalid.length > 0}
              >
                {saved ? "Saved on phone" : "Save on phone"}
              </PrimaryButton>
            ) : (
              <PrimaryButton
                urdu={conn === "sms" ? "ایس ایم ایس سے بھیجیں" : "رپورٹ بھیجیں"}
                onClick={submit}
                disabled={
                  sent ||
                  !!(currentReport && isAccepted(currentReport.status)) ||
                  invalid.length > 0
                }
              >
                {currentReport && isAccepted(currentReport.status)
                  ? "Received by district"
                  : sent
                    ? "Sent"
                    : conn === "sms"
                      ? "Send by SMS"
                      : "Send report"}
              </PrimaryButton>
            )
          }
        >
          <div className="space-y-3">
            {conn === "sms" && (
              <>
                <div className="rounded-md border border-pending/40 bg-pending-tint px-3 py-2 text-sm text-pending">
                  <div className="font-semibold">No internet. Send by SMS?</div>
                  <div
                    dir="rtl"
                    lang="ur"
                    className="font-urdu text-left text-[16px] leading-[1.8]"
                  >
                    انٹرنیٹ نہیں۔ ایس ایم ایس سے بھیجیں؟
                  </div>
                </div>
                <div>
                  <div className="mb-1 text-xs text-ink-muted">Coded SMS preview</div>
                  <pre className="code whitespace-pre-wrap break-all rounded-sm border border-line bg-subtle px-3 py-2 text-[13px] leading-relaxed">
                    {payload}
                  </pre>
                  <div className="mt-1 text-2xs tabular-nums text-ink-muted">
                    {budget.units} of {budget.capacity} SMS units · {budget.segments}{" "}
                    {budget.segments === 1 ? "message" : "messages"}
                  </div>
                </div>
              </>
            )}
            {conn === "online" && (
              <div className="rounded-md border border-line px-3 py-2 text-sm">
                <div className="font-semibold">Ready to upload</div>
                <div className="text-xs text-ink-muted">
                  {staff.length} staff marks, {classes.length} class totals, roster{" "}
                  {f.rosterVersion}. Includes the complete institution roster.
                </div>
              </div>
            )}
            {conn === "none" && (
              <div className="rounded-md border border-problem/30 bg-problem-tint px-3 py-2 text-sm text-problem">
                <div className="font-semibold">
                  {saved ? "No signal. Report saved." : "No signal. Continue working offline."}
                </div>
                <div className="text-xs">
                  The observed time is {hhmm(currentReport?.observedAt ?? clockMin)}. Save this
                  report to keep it in the outbox until the connection returns.
                </div>
              </div>
            )}
            <SubmissionReceipt reportId={submissionId} />
            <SubmissionProgress reportId={submissionId} />
            {conn === "sms" && (
              <p className="text-2xs text-ink-muted">
                An SMS is counted as received only when the district server replies with its
                sequence number.
              </p>
            )}
          </div>
        </Phone>
      </div>
    </div>
  );
}

// ---------- Hospital flow ----------
function HospitalFlow({ conn, f }: { conn: Connection; f: Facility }) {
  const { goToScreen, journey } = useFieldNavigation();
  const { submitReport, reports, shiftFor, submissionFor, clockMin, role } = useApp();
  const all = Object.fromEntries(
    (["M", "E", "N"] as ShiftKey[]).map((key) => [key, shiftFor(f.id, key)!]),
  ) as Record<ShiftKey, NonNullable<ReturnType<typeof shiftFor>>>;
  const previous = reports
    .filter((r) => r.facilityId === f.id && !!submissionFor(r.id))
    .sort((a, b) => b.sequence - a.sequence)[0];
  const [key, setKey] = useState<ShiftKey>(previous?.session ?? "M");
  const shift =
    (previous?.session === key ? submissionFor(previous.id)?.shift : undefined) ?? all[key];
  const [submissionId, setSubmissionId] = useState<string | null>(previous?.id ?? null);
  const currentReport = reports.find((r) => r.id === submissionId);
  const [assignmentEdits, setAssignmentEdits] = useState<Record<string, ShiftStaffStatus>>({});
  const assignments = shift.assignments.map((a) => ({
    ...a,
    status: assignmentEdits[`${key}-${a.staffId}`] ?? a.status,
  }));
  const cov = shiftCoverage({ ...shift, assignments });
  const [acked, setAcked] = useState(shift.handover.acknowledgedAt != null);
  const [sent, setSent] = useState(false);
  const [saved, setSaved] = useState(false);
  const [opdEdits, setOpdEdits] = useState<Partial<Record<ShiftKey, string>>>({});
  const [bedEdits, setBedEdits] = useState<Partial<Record<ShiftKey, string>>>({});
  const [serviceEdits, setServiceEdits] = useState<Record<string, boolean>>({});
  const [equipmentEdits, setEquipmentEdits] = useState<Partial<Record<ShiftKey, boolean>>>({});
  const beds = bedEdits[key] ?? String(shift.bedsAvailable);
  const invalidBeds = beds === "" || Number(beds) > shift.bedsTotal;
  const invalidOpd = shift.opd != null && opdEdits[key] === "";
  const resetSubmission = () => {
    setSent(false);
    setSaved(false);
    setSubmissionId(null);
  };
  const [handoverEdits, setHandoverEdits] = useState<Record<string, string>>({});
  const handoverLines = (name: "faults" | "stockOuts" | "interruptions") =>
    (handoverEdits[`${key}-${name}`] ?? shift.handover[name].join("\n"))
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  const submit = () => {
    try {
      const report = submitReport({
        facilityId: f.id,
        connection: conn,
        equipmentOk: equipmentEdits[key] ?? f.equipment.ok,
        shift: {
          ...shift,
          assignments,
          opd: shift.opd == null ? null : Number(opdEdits[key] ?? shift.opd),
          bedsAvailable: Number(beds),
          services: Object.fromEntries(
            Object.entries(shift.services).map(([name, value]) => [
              name,
              serviceEdits[`${key}-${name}`] ?? value,
            ]),
          ),
          handover: {
            faults: handoverLines("faults"),
            stockOuts: handoverLines("stockOuts"),
            interruptions: handoverLines("interruptions"),
            acknowledgedAt: acked ? (shift.handover.acknowledgedAt ?? clockMin) : null,
            acknowledgedBy: acked ? (shift.handover.acknowledgedBy ?? role.person) : null,
          },
        },
      });
      setSubmissionId(report.id);
      setSaved(conn === "none");
      setSent(conn !== "none");
      toast.success(
        conn === "none"
          ? "Shift report saved"
          : conn === "sms"
            ? "SMS queued"
            : "Shift report received",
        {
          description: `${report.id}${conn === "sms" ? " · awaiting acknowledgement" : conn === "none" ? " · waiting for a connection" : " · staffing and service status updated"}`,
        },
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Check the shift report.");
    }
  };

  const avail = SERVICES.filter((s) => s in shift.services);

  return (
    <div className={cn("phone-sequence pb-4", journey && "overflow-x-auto")}>
      <div className={journey ? "flex min-w-max gap-5" : "w-full"}>
        <Phone
          n={1}
          title="Select shift"
          urdu="شفٹ منتخب کریں"
          conn={conn}
          footer={
            <PrimaryButton urdu="شفٹ رپورٹ کھولیں" onClick={() => goToScreen(2)}>
              Open shift report
            </PrimaryButton>
          }
        >
          <div className="mb-3 rounded-md border border-line p-3">
            <div className="text-xs text-ink-muted">Facility</div>
            <div className="font-semibold">{f.name}</div>
            <div className="mt-1 flex items-center gap-2 text-xs text-ink-muted">
              <Code className="text-xs">{f.code}</Code>
              Roster <Code className="text-xs">{f.rosterVersion}</Code>
            </div>
          </div>
          <ul className="space-y-2" aria-label="Shifts">
            {(["N", "M", "E"] as ShiftKey[]).map((k) => {
              const s = all[k];
              const active = k === key;
              return (
                <li key={k}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setKey(k);
                      setSubmissionId(null);
                      setAcked(s.handover.acknowledgedAt != null);
                      setSent(false);
                      setSaved(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left",
                      active ? "border-dept bg-dept-tint" : "border-line hover:bg-subtle",
                    )}
                  >
                    <span className="flex-1">
                      <span className="block text-sm font-semibold">{SHIFT_NAMES[k]} shift</span>
                      <span className="block text-xs tabular-nums text-ink-muted">
                        {s.rangeLabel}
                      </span>
                      <span className="block">
                        <Code className="text-2xs">{s.id}</Code>
                      </span>
                    </span>
                    <Pill
                      tone={
                        s.phase === "completed"
                          ? "neutral"
                          : s.phase === "in progress"
                            ? "verified"
                            : "sent"
                      }
                    >
                      {s.phase === "completed"
                        ? "Ended"
                        : s.phase === "in progress"
                          ? "Now"
                          : "Next"}
                    </Pill>
                    <ChevronRight className="size-4 text-ink-muted" aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-2xs text-ink-muted">
            The night shift belongs to the date it started. No patient information is collected.
          </p>
        </Phone>

        <Phone
          n={2}
          title="Roster vs actual"
          urdu="روسٹر بمقابلہ حاضری"
          conn={conn}
          footer={
            <div className="space-y-2 text-xs">
              <span
                className={cn("font-semibold", cov.belowMinimum ? "text-problem" : "text-verified")}
              >
                {cov.covered} of {cov.required} required on site
              </span>
              {cov.belowMinimum && (
                <span className="block text-problem">
                  {cov.byRole
                    .filter((r) => r.short > 0)
                    .map((r) => `Short by ${r.short} ${r.role}${r.short > 1 ? "s" : ""}`)
                    .join(" · ")}
                </span>
              )}
              <PrimaryButton urdu="آگے" onClick={() => goToScreen(3)}>
                Continue
              </PrimaryButton>
            </div>
          }
        >
          <ul className="divide-y divide-line">
            {assignments.map((a) => {
              const s = staffById[a.staffId]!;
              const rep = a.replacesStaffId ? staffById[a.replacesStaffId] : undefined;
              return (
                <li key={a.staffId} className="flex items-center justify-between gap-2 py-1.5">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{s.name}</span>
                    <span className="block text-2xs text-ink-muted">
                      {a.role}
                      {rep && ` · covering ${rep.name}`}
                      {a.note && ` · ${a.note}`}
                    </span>
                  </span>
                  <select
                    className="duty-select"
                    aria-label={`Duty status for ${s.name}`}
                    value={a.status}
                    onChange={(e) => {
                      setAssignmentEdits((v) => ({
                        ...v,
                        [`${key}-${a.staffId}`]: e.target.value as ShiftStaffStatus,
                      }));
                      resetSubmission();
                    }}
                  >
                    {(
                      [
                        "Present",
                        "Absent",
                        "Leave",
                        "Late",
                        "Replacement",
                        "On-call",
                        "Off-duty",
                      ] as ShiftStaffStatus[]
                    ).map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </li>
              );
            })}
          </ul>
        </Phone>

        <Phone
          n={3}
          title="OPD, beds and services"
          urdu="او پی ڈی، بستر اور خدمات"
          conn={conn}
          footer={
            <PrimaryButton
              urdu="آگے"
              onClick={() => goToScreen(4)}
              disabled={invalidBeds || invalidOpd}
            >
              Continue
            </PrimaryButton>
          }
        >
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md border border-line p-3">
              <div className="text-xs text-ink-muted">OPD this shift</div>
              <div className="text-lg font-bold tabular-nums">
                {shift.opd == null ? (
                  "—"
                ) : (
                  <input
                    aria-label="OPD this shift"
                    inputMode="numeric"
                    value={opdEdits[key] ?? String(shift.opd)}
                    onChange={(e) => {
                      setOpdEdits((v) => ({
                        ...v,
                        [key]: e.target.value.replace(/\D/g, "").slice(0, 4),
                      }));
                      resetSubmission();
                    }}
                    aria-invalid={invalidOpd}
                    className="w-full rounded-sm border border-line bg-surface px-2 py-1 text-lg"
                  />
                )}
              </div>
              <div className="text-2xs text-ink-muted">
                {shift.opd == null ? "Not counted in this shift" : "patients seen"}
              </div>
            </div>
            <div className="rounded-md border border-line p-3">
              <div className="text-xs text-ink-muted">Beds available</div>
              <div className="text-lg font-bold tabular-nums">
                <input
                  aria-label="Beds available"
                  inputMode="numeric"
                  value={beds}
                  onChange={(e) => {
                    setBedEdits((v) => ({
                      ...v,
                      [key]: e.target.value.replace(/\D/g, "").slice(0, 3),
                    }));
                    resetSubmission();
                  }}
                  aria-invalid={invalidBeds}
                  className={cn(
                    "w-full rounded-sm border bg-surface px-2 py-1 text-lg",
                    invalidBeds ? "border-problem" : "border-line",
                  )}
                />{" "}
                <span className="text-sm font-normal text-ink-muted">of {shift.bedsTotal}</span>
              </div>
              {invalidBeds && (
                <p className="text-xs text-problem" role="alert">
                  Enter 0 to {shift.bedsTotal} beds.
                </p>
              )}
            </div>
          </div>
          <div className="mt-3 text-xs text-ink-muted">Services</div>
          <ul className="mt-1 divide-y divide-line rounded-md border border-line">
            {avail.map((s) => {
              const up = serviceEdits[`${key}-${s}`] ?? shift.services[s] !== false;
              return (
                <li key={s} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className={cn(!up && "font-semibold text-problem")}>{s}</span>
                  <span
                    role="group"
                    aria-label={`${s} status`}
                    className="inline-flex rounded-sm border border-line text-xs font-semibold"
                  >
                    <button
                      type="button"
                      aria-label={`${s} up`}
                      aria-pressed={up}
                      onClick={() => {
                        setServiceEdits((v) => ({ ...v, [`${key}-${s}`]: true }));
                        resetSubmission();
                      }}
                      className={cn(
                        "px-2 py-1",
                        up ? "bg-verified text-topbar-foreground" : "text-ink-muted",
                      )}
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      aria-label={`${s} down`}
                      aria-pressed={!up}
                      onClick={() => {
                        setServiceEdits((v) => ({ ...v, [`${key}-${s}`]: false }));
                        resetSubmission();
                      }}
                      className={cn(
                        "px-2 py-1",
                        !up ? "bg-problem text-topbar-foreground" : "text-ink-muted",
                      )}
                    >
                      Down
                    </button>
                  </span>
                </li>
              );
            })}
            <li className="flex items-center justify-between px-3 py-2 text-sm">
              <span className={cn(!f.equipment.ok && "font-semibold text-problem")}>
                {f.equipment.label}
              </span>
              <span className="inline-flex rounded-sm border border-line text-xs font-semibold">
                <button
                  type="button"
                  aria-pressed={equipmentEdits[key] ?? f.equipment.ok}
                  onClick={() => {
                    setEquipmentEdits((v) => ({ ...v, [key]: true }));
                    resetSubmission();
                  }}
                  className={cn(
                    "px-2 py-1",
                    (equipmentEdits[key] ?? f.equipment.ok)
                      ? "bg-verified text-topbar-foreground"
                      : "text-ink-muted",
                  )}
                >
                  Working
                </button>
                <button
                  type="button"
                  aria-pressed={!(equipmentEdits[key] ?? f.equipment.ok)}
                  onClick={() => {
                    setEquipmentEdits((v) => ({ ...v, [key]: false }));
                    resetSubmission();
                  }}
                  className={cn(
                    "px-2 py-1",
                    !(equipmentEdits[key] ?? f.equipment.ok)
                      ? "bg-problem text-topbar-foreground"
                      : "text-ink-muted",
                  )}
                >
                  Fault
                </button>
              </span>
            </li>
          </ul>
        </Phone>

        <Phone
          n={4}
          title="Handover"
          urdu="چارج کی منتقلی"
          conn={conn}
          footer={
            <PrimaryButton
              urdu={conn === "none" ? "فون پر محفوظ کریں" : "شفٹ رپورٹ بھیجیں"}
              onClick={submit}
              disabled={
                shift.phase === "upcoming" ||
                invalidBeds ||
                invalidOpd ||
                (conn === "none"
                  ? saved
                  : sent || !!(currentReport && isAccepted(currentReport.status)))
              }
            >
              {currentReport && isAccepted(currentReport.status)
                ? "Received by district"
                : conn === "none"
                  ? saved
                    ? "Saved on phone"
                    : "Save on phone"
                  : sent
                    ? "Sent"
                    : conn === "sms"
                      ? "Send shift by SMS"
                      : "Send shift report"}
            </PrimaryButton>
          }
        >
          <div className="space-y-3">
            {(
              [
                ["faults", "Unresolved faults"],
                ["stockOuts", "Stock-outs"],
                ["interruptions", "Service interruptions"],
              ] as const
            ).map(([name, label]) => (
              <div key={name} className="space-y-1">
                <label htmlFor={`handover-${name}`} className="text-xs text-ink-muted">
                  {label}
                </label>
                <Textarea
                  id={`handover-${name}`}
                  rows={2}
                  value={handoverEdits[`${key}-${name}`] ?? shift.handover[name].join("\n")}
                  onChange={(e) => {
                    setHandoverEdits((v) => ({ ...v, [`${key}-${name}`]: e.target.value }));
                    resetSubmission();
                  }}
                  placeholder="None reported. Add one item per line."
                />
              </div>
            ))}
            <div className="rounded-md border border-line p-3">
              <div className="text-xs text-ink-muted">Incoming shift acknowledgement</div>
              {acked ? (
                <p className="mt-1 text-sm text-verified">
                  <Check className="mr-1 inline size-4" aria-hidden />
                  Acknowledged by incoming shift at{" "}
                  {hhmm(shift.handover.acknowledgedAt ?? clockMin)}
                </p>
              ) : (
                <>
                  <p className="mt-1 text-sm text-ink-muted">Not yet acknowledged.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setAcked(true);
                      resetSubmission();
                    }}
                    className="mt-2 rounded-md border border-line px-2.5 py-1 text-xs font-semibold text-dept hover:bg-subtle"
                  >
                    Incoming in-charge acknowledges
                  </button>
                </>
              )}
            </div>
            <SubmissionReceipt reportId={submissionId} />
            <SubmissionProgress reportId={submissionId} />
          </div>
        </Phone>
      </div>
    </div>
  );
}

function SubmissionReceipt({ reportId }: { reportId: string | null }) {
  const { reports } = useApp();
  const r = reports.find((r) => r.id === reportId);
  if (!r) return null;
  return (
    <div className="report-receipt space-y-2" data-testid="report-receipt">
      <StatusBadge status={r.status} />
      <p className="code break-all text-xs">{r.id}</p>
      <p className="text-xs text-ink-muted">
        {r.status === "draft"
          ? "Saved in the outbox. Change the connection to send this report."
          : r.status === "sent"
            ? "SMS sent over the cellular network. The admin record will update automatically after receipt and validation."
            : r.status === "rejected"
              ? "Check the correction note and submit a revised report."
              : "This report is available in the district reporting register."}
      </p>
      <Link to="/inbox" search={{ report: r.id }} className="block text-xs font-semibold text-dept">
        Track in reports inbox
      </Link>
    </div>
  );
}
function SubmissionProgress({ reportId }: { reportId: string | null }) {
  const { reports } = useApp();
  const r = reports.find((r) => r.id === reportId);
  if (!r)
    return (
      <p className="rounded-sm border border-line bg-subtle p-3 text-xs text-ink-muted">
        Review the full report before sending. Receipt and acknowledgement will be tracked here.
      </p>
    );
  const waiting = r.lifecycle.findIndex((step) => step.at == null);
  return (
    <Steps
      steps={r.lifecycle.map((step, index) => ({
        label: step.label,
        state:
          step.at != null
            ? "done"
            : index === waiting
              ? r.status === "draft"
                ? "blocked"
                : "active"
              : "waiting",
        ...(step.at != null ? { time: hhmm(step.at) } : {}),
      }))}
    />
  );
}
