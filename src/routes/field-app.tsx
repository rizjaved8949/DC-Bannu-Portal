import { createFileRoute } from "@tanstack/react-router";
import { Check, ChevronRight, Signal, SignalLow, SignalZero, Wifi, WifiOff } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/dcms/page-header";
import { Code, Panel } from "@/components/dcms/section";
import { Segmented } from "@/components/dcms/segmented";
import { Pill, STAFF_STATUS_TONE } from "@/components/dcms/status";
import {
  formatDate,
  hhmm,
  schoolDays,
  schools,
  SERVICES,
  SHIFT_NAMES,
  shiftCoverage,
  shiftsByFacility,
  smsPayloadFor,
  staffByFacility,
  staffById,
  TODAY,
  type Facility,
  type ShiftKey,
} from "@/data/mock";
import { cn } from "@/lib/utils";
import { useApp, useScopedFacilities } from "@/lib/app-state";

export const Route = createFileRoute("/field-app")({
  head: () => ({
    meta: [
      { title: "Field app · DCMS Bannu" },
      {
        name: "description",
        content:
          "How school heads and hospital administrators report from the offline-capable Android app.",
      },
      { property: "og:title", content: "Field app · DCMS Bannu" },
      {
        property: "og:description",
        content:
          "How school heads and hospital administrators report from the offline-capable Android app.",
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

const REPORTING_SCHOOLS = schools.filter(
  (s) =>
    schoolDays[s.id]?.classes.some((c) => c.className === "Katchi") &&
    schoolDays[s.id]!.classes.every(
      (c) => c.presentBoys <= c.enrolledBoys && c.presentGirls <= c.enrolledGirls,
    ),
);
function goToScreen(screen: number) {
  const target = document.getElementById(`field-screen-${screen}`);
  target?.scrollIntoView({ block: "nearest", inline: "center", behavior: "instant" });
  target?.focus({ preventScroll: true });
}

function FieldAppPage() {
  const [persona, setPersona] = useState<Persona>("school");
  const [conn, setConn] = useState<Connection>("sms");
  const { role } = useApp();
  const scope = useScopedFacilities({ applyFilters: false });
  const ids = new Set(scope.map((f) => f.id));
  const schoolOptions = REPORTING_SCHOOLS.filter((f) => ids.has(f.id));
  const school =
    schoolOptions.find(
      (f) => (staffByFacility[f.id]?.length ?? 0) >= 12 && f.rosterVersion === "RV04",
    ) ??
    schoolOptions.find((f) => (staffByFacility[f.id]?.length ?? 0) >= 12) ??
    schoolOptions[0];
  const hospital = scope.find((f) => f.id === "HF203") ?? scope.find((f) => f.kind === "health");
  const activePersona =
    role.department === "Education"
      ? "school"
      : role.department === "Health"
        ? "hospital"
        : persona;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Field app"
        urdu="فیلڈ ایپ"
        description="The Android app facility administrators use. It works offline, and where there is no mobile internet it sends a compact coded SMS instead."
      >
        <div className="flex flex-wrap items-center gap-3">
          <Segmented
            label="Administrator type"
            value={activePersona}
            onChange={setPersona}
            options={(
              [
                { value: "school", label: "School administrator" },
                { value: "hospital", label: "Hospital administrator" },
              ] as { value: Persona; label: string }[]
            ).filter((option) => (option.value === "school" ? !!school : !!hospital))}
          />
          <Segmented
            label="Connection simulator"
            value={conn}
            onChange={setConn}
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
            Switch the connection to see how the fourth screen changes.
          </span>
        </div>
      </PageHeader>

      {activePersona === "school" && school ? (
        <SchoolFlow key={school.id} conn={conn} f={school} />
      ) : hospital ? (
        <HospitalFlow key={hospital.id} conn={conn} f={hospital} />
      ) : (
        <p className="panel p-5 text-ink-muted">No facility is available in this role's scope.</p>
      )}

      <Panel
        title="What the app does in each connectivity condition"
        aside="Same report, different path"
      >
        <table className="ledger">
          <thead>
            <tr>
              <th scope="col">Condition</th>
              <th scope="col">What the app does</th>
              <th scope="col">What the district sees</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td data-label="Condition" className="font-semibold">
                Reliable internet
              </td>
              <td data-label="What the app does">
                Uploads the full report with class totals and notes over mobile data. Receives the
                acknowledgement within seconds.
              </td>
              <td data-label="What the district sees">
                Report appears as Received with the app channel icon. Verification can begin at
                once.
              </td>
            </tr>
            <tr>
              <td data-label="Condition" className="font-semibold">
                No internet but SMS works
              </td>
              <td data-label="What the app does">
                Compresses the report into a coded SMS of 160 characters or fewer, usually one
                segment. Waits for the acknowledgement SMS carrying the report sequence.
              </td>
              <td data-label="What the district sees">
                The SMS gateway parses the code against the current roster. Received only after the
                server acknowledges; delivery alone is not enough.
              </td>
            </tr>
            <tr>
              <td data-label="Condition" className="font-semibold">
                Weak SMS
              </td>
              <td data-label="What the app does">
                Retries each segment up to 3 times over 20 minutes. Shows Sent, awaiting
                acknowledgement until the server replies.
              </td>
              <td data-label="What the district sees">
                Status stays Sent. An incomplete multipart message is rejected and the facility is
                asked to resend.
              </td>
            </tr>
            <tr>
              <td data-label="Condition" className="font-semibold">
                No signal
              </td>
              <td data-label="What the app does">
                Saves the report on the phone with the observed time. Sends automatically when any
                signal returns, keeping the original observed time.
              </td>
              <td data-label="What the district sees">
                No report yet. At 10:00 a review task is opened so someone follows up, with no
                assumption about the staff.
              </td>
            </tr>
          </tbody>
        </table>
      </Panel>
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
  return (
    <figure className="flex flex-col items-center gap-2">
      <div
        id={`field-screen-${n}`}
        tabIndex={-1}
        className="phone-device relative flex h-[740px] w-[360px] shrink-0 flex-col overflow-hidden rounded-phone border-[6px] border-topbar bg-surface"
      >
        <div className="flex h-7 items-center justify-between bg-topbar px-5 text-[11px] text-topbar-foreground">
          <span className="tabular-nums">11:40</span>
          <span className="inline-flex items-center gap-1 [&_svg]:size-3">
            {conn === "online" ? <Wifi /> : conn === "sms" ? <Signal /> : <WifiOff />}
            <span>{conn === "online" ? "4G" : conn === "sms" ? "2G" : "No service"}</span>
          </span>
        </div>
        <div className="flex items-start justify-between gap-2 border-b border-line bg-kurram px-4 py-2.5 text-white">
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
        <div className="flex-1 overflow-y-auto px-4 py-3 text-sm text-ink">{children}</div>
        {footer && <div className="border-t border-line bg-surface px-4 py-3">{footer}</div>}
      </div>
      <figcaption className="inline-flex items-center gap-2 text-xs text-ink-muted">
        <span
          aria-hidden
          className="flex size-5 items-center justify-center rounded-full bg-kurram text-[11px] font-bold text-white"
        >
          {n}
        </span>
        Screen {n} of 4
      </figcaption>
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
      className="flex w-full flex-col items-center rounded-md bg-kurram px-4 py-2 text-white disabled:opacity-50"
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
  const staff = (staffByFacility[f.id] ?? []).slice(0, 12);
  const day = schoolDays[f.id]!;
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
  const classes = day.classes.filter((c) =>
    ["Katchi", "Class 1", "Class 2", "Class 3", "Class 4", "Class 5"].includes(c.className),
  );
  const [present, setPresent] = useState<Record<string, string>>(() =>
    Object.fromEntries(classes.map((c) => [c.className, String(c.presentBoys + c.presentGirls)])),
  );
  const [sent, setSent] = useState(false);
  const [saved, setSaved] = useState(false);
  const submit = () => {
    if (conn === "none") {
      setSaved(true);
      toast.success("Saved on phone", {
        description: "This demo keeps the draft in this session. It is waiting for a connection.",
      });
    } else {
      setSent(true);
      toast.success(conn === "sms" ? "Sent by SMS" : "Sent report", {
        description: "Simulated district acknowledgement: R018.",
      });
    }
  };

  const payload = useMemo(
    () =>
      smsPayloadFor({
        type: "A1",
        code: f.code,
        session: "M",
        roster: f.rosterVersion,
        seq: 18,
        absent: staff.filter((s) => marks[s.id] === "A").map((s) => s.code),
        leave: staff.filter((s) => marks[s.id] === "L").map((s) => s.code),
        full: true,
      }),
    [f, staff, marks],
  );
  const segments = Math.max(1, Math.ceil(payload.length / 160));
  const invalid = classes.filter(
    (c) => Number(present[c.className] ?? 0) > c.enrolledBoys + c.enrolledGirls,
  );
  const counts = { P: 0, A: 0, L: 0, OD: 0 } as Record<Mark, number>;
  for (const m of Object.values(marks)) counts[m]++;

  return (
    <div className="phone-sequence overflow-x-auto pb-4">
      <div className="flex min-w-max gap-5 2xl:justify-center">
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
                <dd className="tabular-nums">Fri 20 Nov, acknowledged R017</dd>
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
              Reports are due by 10:00. Marking takes about two minutes.
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
                    setSaved(false);
                  }}
                  className="rounded-md border border-line px-2.5 py-1.5 text-xs font-semibold text-kurram hover:bg-subtle"
                >
                  Mark all present
                </button>
                <button
                  type="button"
                  onClick={() => goToScreen(3)}
                  className="rounded-sm bg-kurram px-3 py-1.5 text-xs font-semibold text-topbar-foreground"
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
              const bad = Number(v) > enrolled;
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
            Enrolled figures are prefilled from the last approved register. Try typing a number
            above the enrolment to see the check.
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
                disabled={sent || invalid.length > 0}
              >
                {sent ? "Sent" : conn === "sms" ? "Send by SMS" : "Send report"}
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
                    {payload.length} of 160 characters, {segments} SMS
                  </div>
                </div>
              </>
            )}
            {conn === "online" && (
              <div className="rounded-md border border-line px-3 py-2 text-sm">
                <div className="font-semibold">Ready to upload</div>
                <div className="text-xs text-ink-muted">
                  {staff.length} staff marks, {classes.length} class totals, roster{" "}
                  {f.rosterVersion}. About 2 KB over mobile data.
                </div>
              </div>
            )}
            {conn === "none" && (
              <div className="rounded-md border border-problem/30 bg-problem-tint px-3 py-2 text-sm text-problem">
                <div className="font-semibold">No signal. Saved on phone.</div>
                <div className="text-xs">
                  The report keeps its observed time of 08:15 and will send on its own when any
                  signal returns.
                </div>
              </div>
            )}
            <Steps
              steps={
                conn === "none"
                  ? [
                      {
                        label: "Saved on phone",
                        urdu: "فون پر محفوظ",
                        state: "done",
                        time: "08:17",
                      },
                      { label: "Sent", state: "blocked" },
                      { label: "Waiting for district acknowledgement", state: "waiting" },
                      { label: "Acknowledged", state: "waiting" },
                    ]
                  : [
                      {
                        label: "Saved on phone",
                        urdu: "فون پر محفوظ",
                        state: "done",
                        time: "08:17",
                      },
                      {
                        label: "Sent",
                        urdu: "بھیج دیا گیا",
                        state: sent ? "done" : "active",
                        ...(sent ? { time: "08:21" } : {}),
                      },
                      {
                        label: "Waiting for district acknowledgement",
                        urdu: "ضلعی تصدیق کا انتظار",
                        state: sent ? "done" : "waiting",
                        ...(sent ? { time: conn === "sms" ? "08:24" : "08:21" } : {}),
                      },
                      {
                        label: sent ? "Acknowledged (R018)" : "Acknowledged",
                        urdu: "تصدیق ہو گئی",
                        state: sent ? "done" : "waiting",
                        ...(sent ? { time: conn === "sms" ? "08:24" : "08:21" } : {}),
                      },
                    ]
              }
            />
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
  const all = shiftsByFacility[f.id]!;
  const [key, setKey] = useState<ShiftKey>("N");
  const shift = all[key];
  const cov = shiftCoverage(shift);
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
  };
  const submit = () => {
    if (conn === "none") {
      setSaved(true);
      toast.success("Saved on phone", {
        description: "Shift draft is kept in this demo session until a connection is available.",
      });
    } else {
      setSent(true);
      toast.success("Sent shift report", {
        description: "Simulated district acknowledgement: R021.",
      });
    }
  };
  const avail = SERVICES.filter((s) => s in shift.services);

  return (
    <div className="phone-sequence overflow-x-auto pb-4">
      <div className="flex min-w-max gap-5 2xl:justify-center">
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
                      setAcked(s.handover.acknowledgedAt != null);
                      setSent(false);
                      setSaved(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left",
                      active ? "border-kurram bg-kurram-soft" : "border-line hover:bg-subtle",
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
            {shift.assignments.map((a) => {
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
                  <Pill tone={STAFF_STATUS_TONE[a.status] ?? "neutral"}>{a.status}</Pill>
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
              disabled={invalidBeds || invalidOpd || (conn === "none" ? saved : sent)}
            >
              {conn === "none"
                ? saved
                  ? "Saved on phone"
                  : "Save on phone"
                : sent
                  ? "Sent"
                  : "Send shift report"}
            </PrimaryButton>
          }
        >
          <div className="space-y-3">
            <HandoverBlock title="Unresolved faults" items={shift.handover.faults} />
            <HandoverBlock title="Stock-outs" items={shift.handover.stockOuts} />
            <HandoverBlock title="Service interruptions" items={shift.handover.interruptions} />
            <div className="rounded-md border border-line p-3">
              <div className="text-xs text-ink-muted">Incoming shift acknowledgement</div>
              {acked ? (
                <p className="mt-1 text-sm text-verified">
                  <Check className="mr-1 inline size-4" aria-hidden />
                  Acknowledged by incoming shift at{" "}
                  {hhmm(shift.handover.acknowledgedAt ?? shift.startMin + 12 * 60 + 5)}
                </p>
              ) : (
                <>
                  <p className="mt-1 text-sm text-ink-muted">Not yet acknowledged.</p>
                  <button
                    type="button"
                    onClick={() => setAcked(true)}
                    className="mt-2 rounded-md border border-line px-2.5 py-1 text-xs font-semibold text-kurram hover:bg-subtle"
                  >
                    Incoming in-charge acknowledges
                  </button>
                </>
              )}
            </div>
            <Steps
              steps={
                conn === "none"
                  ? [
                      { label: "Saved on phone", state: "done", time: hhmm(shift.endMin + 4) },
                      { label: "Sent", state: "blocked" },
                      { label: "Waiting for district acknowledgement", state: "waiting" },
                    ]
                  : [
                      { label: "Saved on phone", state: "done", time: hhmm(shift.endMin + 4) },
                      {
                        label: conn === "sms" ? "Sent by SMS" : "Uploaded",
                        state: sent ? "done" : "active",
                        ...(sent ? { time: hhmm(shift.endMin + 6) } : {}),
                      },
                      {
                        label: sent
                          ? "Acknowledged (R021)"
                          : "Waiting for district acknowledgement",
                        state: sent ? "done" : "waiting",
                        ...(sent ? { time: hhmm(shift.endMin + (conn === "sms" ? 9 : 6)) } : {}),
                      },
                    ]
              }
            />
          </div>
        </Phone>
      </div>
    </div>
  );
}

function HandoverBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="text-xs text-ink-muted">{title}</div>
      {items.length === 0 ? (
        <p className="text-sm text-ink-muted">None recorded</p>
      ) : (
        <ul className="mt-0.5 space-y-1">
          {items.map((i) => (
            <li key={i} className="rounded-sm border border-line px-2.5 py-1.5 text-sm">
              {i}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
