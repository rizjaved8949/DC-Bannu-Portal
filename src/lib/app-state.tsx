import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  facilities,
  facilityById,
  hhmm,
  LAST_SYNC,
  NOW_MIN,
  reports as baseReports,
  reviewItems as baseReviewItems,
  SIMULATION_POOL,
  smsPayloadFor,
  TODAY,
  TODAY_COMPACT,
  schoolDays,
  shiftsByFacility,
  staffByFacility,
  shiftCoverage,
  isAccepted,
  todayStatus,
  reportPayloadFor,
  codedSmsBudget,
  type Department,
  type Facility,
  type Section,
  type Report,
  type ReportStatus,
  type ReviewItem,
  type SchoolDay,
  type Shift,
  type ShiftKey,
  type Staff,
  type Tehsil,
  type TodayStaffStatus,
  type Complaint,
  type SmsEntry,
  complaints as baseComplaints,
  COMPLAINT_CATEGORIES,
  COMPLAINT_STATUSES,
} from "@/data/mock";
import {
  restoreWorkspace,
  complaintSchema,
  WORKSPACE_STORAGE_KEY,
  type StoredWorkspace,
  type SubmissionData,
} from "./workspace-storage";

export type RoleId = "dc" | "deo-m" | "deo-f" | "dho-m" | "dho-f" | "ac-domel-m" | "ac-domel-f";
export const ROLE_IDS = [
  "dc",
  "deo-m",
  "deo-f",
  "dho-m",
  "dho-f",
  "ac-domel-m",
  "ac-domel-f",
] as const satisfies readonly RoleId[];
export interface RoleMeta {
  id: RoleId;
  label: string;
  person: string;
  scopeLabel: string;
  department?: Department;
  tehsil?: Tehsil;
  /** Male and female officers see only their own section's schools and health facilities. */
  section?: Section;
}
export const ROLES: RoleMeta[] = [
  {
    id: "dc",
    label: "Deputy Commissioner",
    person: "Shah Saud Marwat",
    scopeLabel: "Whole district · male and female",
  },
  {
    id: "deo-m",
    label: "District Education Officer (Male)",
    person: "Fazal Rahim Khattak",
    scopeLabel: "Boys' schools only",
    department: "Education",
    section: "Male",
  },
  {
    id: "deo-f",
    label: "District Education Officer (Female)",
    person: "Naheed Akhtar",
    scopeLabel: "Girls' schools only",
    department: "Education",
    section: "Female",
  },
  {
    id: "dho-m",
    label: "District Health Officer (Male)",
    person: "Dr. Amjad Ali Wazir",
    scopeLabel: "General health facilities only",
    department: "Health",
    section: "Male",
  },
  {
    id: "dho-f",
    label: "District Health Officer (Female)",
    person: "Dr. Samina Gul",
    scopeLabel: "Women's health facilities only",
    department: "Health",
    section: "Female",
  },
  {
    id: "ac-domel-m",
    label: "Assistant Commissioner Domel (Male)",
    person: "Liaqat Ali Bangash",
    scopeLabel: "Domel tehsil · male section",
    tehsil: "Domel",
    section: "Male",
  },
  {
    id: "ac-domel-f",
    label: "Assistant Commissioner Domel (Female)",
    person: "Saima Bibi",
    scopeLabel: "Domel tehsil · female section",
    tehsil: "Domel",
    section: "Female",
  },
];
export const roleById = Object.fromEntries(ROLES.map((r) => [r.id, r])) as Record<RoleId, RoleMeta>;
export type DateRange = "today" | "yesterday" | "7d" | "month";
export const DATE_RANGE_LABEL: Record<DateRange, string> = {
  today: "Today, 23 Nov",
  yesterday: "Yesterday, 22 Nov",
  "7d": "Last 7 days",
  month: "This month",
};
export interface Filters {
  department: "All" | Department;
  tehsil: "All" | Tehsil;
  dateRange: DateRange;
  shift: "All" | "Morning" | "Evening" | "Night";
}
const DEFAULT_FILTERS: Filters = {
  department: "All",
  tehsil: "All",
  dateRange: "today",
  shift: "All",
};
export type Connection = "online" | "sms" | "none";
export interface FieldSubmission extends SubmissionData {
  facilityId: string;
  connection: Connection;
}
export interface FollowUpInput {
  facilityId: string;
  title: string;
  note: string;
  severity: ReviewItem["severity"];
  owner: string;
}
export type ComplaintInput = Pick<
  Complaint,
  "facilityIds" | "title" | "description" | "category" | "priority" | "owner"
>;
function initialWorkspace(): StoredWorkspace {
  return {
    smsEntries: [],
    complaints: structuredClone(baseComplaints),
    version: 3,
    referenceDate: TODAY,
    roleId: "dc",
    filters: { ...DEFAULT_FILTERS },
    extraReports: [],
    overrides: {},
    submissions: {},
    arrivals: [],
    feedPaused: true,
    clockMin: NOW_MIN,
    reviewItems: structuredClone(baseReviewItems),
    poolIndex: 0,
  };
}
function materializeReports(state: StoredWorkspace): Report[] {
  return [...baseReports, ...state.extraReports].map((r) => {
    const o = state.overrides[r.id];
    return o
      ? {
          ...r,
          status: o.status,
          ...(o.reason ? { rejectionReason: o.reason } : {}),
          ...(o.verifiedAt != null ? { verifiedAt: o.verifiedAt } : {}),
        }
      : r;
  });
}
function latestFor(reports: Report[], id: string) {
  const list = reports.filter((r) => r.facilityId === id);
  const published = list.filter((r) => r.status !== "draft");
  return [...(published.length ? published : list)].sort((a, b) => b.sequence - a.sequence)[0];
}
function nextReviewId(items: ReviewItem[]) {
  return `RV-${Math.max(1000, ...items.map((r) => Number(r.id.slice(3)) || 1000)) + 1}`;
}
function appendReview(
  state: StoredWorkspace,
  input: FollowUpInput,
  type: ReviewItem["type"] = "Inspector finding",
): StoredWorkspace {
  const existing = state.reviewItems.find(
    (r) => r.facilityId === input.facilityId && r.detected === input.title && r.status !== "Closed",
  );
  if (existing) return state;
  const item: ReviewItem = {
    id: nextReviewId(state.reviewItems),
    facilityId: input.facilityId,
    type,
    severity: input.severity,
    createdDate: TODAY,
    createdMin: state.clockMin,
    owner: input.owner,
    status: "Open",
    detected: input.title,
    why: input.note,
    evidence: [
      { label: "Facility", value: facilityById[input.facilityId]!.name },
      { label: "Recorded at", value: hhmm(state.clockMin) },
    ],
    timeline: [
      {
        at: `23 Nov ${hhmm(state.clockMin)}`,
        text: "Follow-up opened",
        by: roleById[state.roleId].person,
      },
    ],
  };
  return { ...state, reviewItems: [item, ...state.reviewItems] };
}
function receivedReviews(state: StoredWorkspace, report: Report): StoredWorkspace {
  let next = {
    ...state,
    reviewItems: state.reviewItems.map((r) =>
      r.facilityId === report.facilityId &&
      (r.type === "No report by 10:00" ||
        r.detected.startsWith("Resend requested for ") ||
        r.detected === "Report requires correction and resubmission.") &&
      r.status !== "Closed"
        ? {
            ...r,
            status: "Closed" as const,
            timeline: [
              ...r.timeline,
              {
                at: `23 Nov ${hhmm(state.clockMin)}`,
                text: `Report received: ${report.id}`,
                by: "Reporting register",
              },
            ],
          }
        : r,
    ),
  };
  const shift = state.submissions[report.id]?.shift;
  if (shift) {
    const cov = shiftCoverage(shift);
    const f = facilityById[report.facilityId]!;
    if (cov.belowMinimum)
      next = appendReview(
        next,
        {
          facilityId: f.id,
          title: `${shift.key === "M" ? "Morning" : shift.key === "E" ? "Evening" : "Night"} shift staffing requires follow-up.`,
          note: `${cov.covered} of ${cov.required} required positions are covered. ${cov.byRole
            .filter((r) => r.short > 0)
            .map((r) => `${r.role}: short by ${r.short}`)
            .join("; ")}.`,
          severity: "High",
          owner: "DHO office",
        },
        "Below minimum staffing",
      );
    if (shift.services.Oxygen === false)
      next = appendReview(
        next,
        {
          facilityId: f.id,
          title: "Oxygen service interruption reported.",
          note: "Check cylinder availability, equipment and the shift handover with the facility in-charge.",
          severity: "Critical",
          owner: "DHO office",
        },
        "Critical facility issue",
      );
  }
  return next;
}
function createReport(
  state: StoredWorkspace,
  input: FieldSubmission,
): { state: StoredWorkspace; report: Report } {
  const f = facilityById[input.facilityId];
  if (!f || !inRoleScope(roleById[state.roleId], f))
    throw new Error("Choose a facility in your role's scope.");
  const roster = staffByFacility[f.id] ?? [];
  if (f.kind === "school") {
    const day = input.schoolDay;
    if (
      !day ||
      day.facilityId !== f.id ||
      roster.some((s) => !day.staffStatus[s.id]) ||
      Object.keys(day.staffStatus).length !== roster.length
    )
      throw new Error("Mark the full staff roster before sending.");
    const expected = schoolDays[f.id]!.classes;
    if (
      day.classes.length !== expected.length ||
      day.classes.some(
        (c, i) =>
          c.className !== expected[i]?.className ||
          !Number.isInteger(c.presentBoys) ||
          !Number.isInteger(c.presentGirls) ||
          c.presentBoys < 0 ||
          c.presentGirls < 0 ||
          c.presentBoys > expected[i]!.enrolledBoys ||
          c.presentGirls > expected[i]!.enrolledGirls ||
          c.enrolledBoys !== expected[i]!.enrolledBoys ||
          c.enrolledGirls !== expected[i]!.enrolledGirls,
      )
    )
      throw new Error("Check each class total against its approved enrolment.");
  } else if (
    !input.shift ||
    input.shift.facilityId !== f.id ||
    !Number.isInteger(input.shift.bedsAvailable) ||
    input.shift.bedsAvailable < 0 ||
    input.shift.bedsAvailable > input.shift.bedsTotal ||
    (input.shift.opd != null && (!Number.isInteger(input.shift.opd) || input.shift.opd < 0))
  )
    throw new Error("Check the shift, OPD and available bed totals.");
  if (input.shift) {
    const expectedShift = shiftsByFacility[f.id]?.[input.shift.key];
    if (
      !expectedShift ||
      input.shift.id !== expectedShift.id ||
      input.shift.date !== expectedShift.date ||
      input.shift.bedsTotal !== expectedShift.bedsTotal ||
      input.shift.assignments.length !== expectedShift.assignments.length ||
      new Set(input.shift.assignments.map((a) => a.staffId)).size !==
        expectedShift.assignments.length ||
      input.shift.assignments.some(
        (a) =>
          !expectedShift.assignments.some(
            (expected) => expected.staffId === a.staffId && expected.role === a.role,
          ),
      )
    )
      throw new Error("Use the complete approved shift roster and bed capacity.");
    if (expectedShift.phase === "upcoming")
      throw new Error("This shift has not started. Select a current or completed shift.");
  }
  const at = Math.min(1430, state.clockMin + 1);
  const sequence =
    Math.max(
      0,
      ...materializeReports(state)
        .filter((r) => r.facilityId === f.id)
        .map((r) => r.sequence),
    ) + 1;
  const reportDate = (input.shift?.date ?? TODAY).replaceAll("-", "");
  const payload = reportPayloadFor({
    facilityId: f.id,
    sequence,
    ...(input.schoolDay ? { schoolDay: input.schoolDay } : {}),
    ...(input.shift ? { shift: input.shift } : {}),
    ...(input.equipmentOk != null ? { equipmentOk: input.equipmentOk } : {}),
  });
  const status =
    input.connection === "none" ? "draft" : input.connection === "sms" ? "sent" : "received";
  const total = codedSmsBudget(payload).segments;
  const report: Report = {
    id: `RPT-${f.code}-${reportDate}-${String(sequence).padStart(3, "0")}`,
    facilityId: f.id,
    type: f.kind === "school" ? "A1" : "H1",
    session: input.shift?.key ?? "M",
    channel: input.connection === "online" ? "app" : "sms",
    rosterVersion: f.rosterVersion,
    sequence,
    segments: { received: status === "received" ? total : 0, total },
    status,
    observedAt: state.clockMin,
    sentAt: status === "draft" ? null : at,
    receivedAt: status === "received" ? at : null,
    verifiedAt: null,
    smsPayload: input.connection === "online" ? null : payload,
    sender: { registered: true, masked: f.phoneMasked },
    totalsPlausible: true,
    lifecycle: [
      { label: "Saved on phone", at: state.clockMin },
      { label: "Sent", at: status === "draft" ? null : at },
      {
        label:
          input.connection === "online" ? "Uploaded over mobile data" : "Delivered to SMS provider",
        at: status === "received" ? at : null,
      },
      { label: "Accepted by district server", at: status === "received" ? at : null },
      { label: "Acknowledgement sent", at: status === "received" ? at : null },
    ],
  };
  const data: SubmissionData = {
    ...(input.schoolDay ? { schoolDay: structuredClone(input.schoolDay) } : {}),
    ...(input.shift ? { shift: structuredClone(input.shift) } : {}),
    ...(input.equipmentOk != null ? { equipmentOk: input.equipmentOk } : {}),
  };
  let next = {
    ...state,
    clockMin: at,
    extraReports: [...state.extraReports, report].slice(-500),
    submissions: { ...state.submissions, [report.id]: data },
    arrivals: status === "received" ? [report.id, ...state.arrivals].slice(0, 100) : state.arrivals,
  };
  if (status === "received") next = receivedReviews(next, report);
  if (status === "sent") next = queueSms(next, "report", report.id, [f.id], payload);
  return { state: next, report };
}
function deliver(
  state: StoredWorkspace,
  id: string,
  connection: Exclude<Connection, "none">,
  gateway = false,
): StoredWorkspace {
  const report = state.extraReports.find((r) => r.id === id);
  if (
    !report ||
    !["draft", "sent"].includes(report.status) ||
    (!gateway && !inRoleScope(roleById[state.roleId], facilityById[report.facilityId]!))
  )
    return state;
  const at = Math.min(1430, state.clockMin + 1);
  const nextReport: Report = {
    ...report,
    channel: connection === "online" ? "app" : "sms",
    status: "received",
    sentAt: report.sentAt ?? at,
    receivedAt: at,
    segments: { ...report.segments, received: report.segments.total },
    lifecycle: report.lifecycle.map((step) => ({
      ...step,
      label:
        step.label === "Delivered to SMS provider" && connection === "online"
          ? "Uploaded over mobile data"
          : step.label,
      at: step.at ?? at,
    })),
  };
  return receivedReviews(
    {
      ...state,
      clockMin: at,
      extraReports: state.extraReports.map((r) => (r.id === id ? nextReport : r)),
      arrivals: [id, ...state.arrivals].slice(0, 100),
      smsEntries: state.smsEntries.map((entry) =>
        entry.referenceId === id && entry.status !== "received"
          ? { ...entry, status: "received", receivedMin: at }
          : entry,
      ),
    },
    nextReport,
  );
}
function queueSms(
  state: StoredWorkspace,
  kind: SmsEntry["kind"],
  referenceId: string,
  facilityIds: string[],
  payload: string,
  saved = false,
): StoredWorkspace {
  if (state.smsEntries.some((entry) => entry.referenceId === referenceId)) return state;
  const sequence =
    Math.max(0, ...state.smsEntries.map((entry) => Number(entry.id.split("-").at(-1)) || 0)) + 1;
  const entry: SmsEntry = {
    id: `SMS-${TODAY_COMPACT}-${String(sequence).padStart(4, "0")}`,
    kind,
    referenceId,
    facilityIds,
    payload,
    status: saved ? "saved" : "sent",
    createdMin: state.clockMin,
    receivedMin: null,
    segments: codedSmsBudget(payload).segments,
  };
  return { ...state, smsEntries: [...state.smsEntries, entry].slice(-1500) };
}
function receiveSms(state: StoredWorkspace, id: string): StoredWorkspace {
  const entry = state.smsEntries.find((entry) => entry.id === id);
  if (!entry || entry.status !== "sent") return state;
  const at = Math.min(1430, state.clockMin + 1);
  try {
    if (entry.segments !== codedSmsBudget(entry.payload).segments)
      throw new Error("SMS segments are incomplete. Resend the entry.");
    let next = state;
    if (entry.kind === "report") {
      const report = state.extraReports.find((r) => r.id === entry.referenceId);
      if (
        !report ||
        report.smsPayload !== entry.payload ||
        !report.sender.registered ||
        !report.totalsPlausible ||
        !["draft", "sent", "received", "pending", "verified"].includes(report.status) ||
        report.rosterVersion !== facilityById[report.facilityId]!.rosterVersion
      )
        throw new Error("The sender, roster or SMS payload could not be validated.");
      next = deliver(state, report.id, "sms", true);
    } else {
      const [protocol, reference, body] = entry.payload.split("|");
      const complaint = complaintSchema.parse(JSON.parse(decodeURIComponent(body ?? "")));
      if (
        protocol !== "C1" ||
        reference !== entry.referenceId ||
        complaint.id !== entry.referenceId ||
        complaint.facilityIds.length !== entry.facilityIds.length ||
        complaint.facilityIds.some((id) => !entry.facilityIds.includes(id))
      )
        throw new Error("The complaint SMS could not be validated.");
      if (!state.complaints.some((c) => c.id === complaint.id))
        next = {
          ...state,
          complaints: [
            ...state.complaints,
            {
              ...complaint,
              timeline: [
                ...complaint.timeline,
                {
                  at: `23 Nov ${hhmm(at)}`,
                  by: "District SMS intake",
                  text: "Received and validated through SMS. Complaint register updated.",
                },
              ],
            },
          ],
        };
    }
    return {
      ...next,
      clockMin: at,
      smsEntries: next.smsEntries.map((item) =>
        item.id === id ? { ...item, status: "received", receivedMin: at } : item,
      ),
    };
  } catch (error) {
    return {
      ...state,
      smsEntries: state.smsEntries.map((item) =>
        item.id === id
          ? {
              ...item,
              status: "rejected",
              reason: error instanceof Error ? error.message : "SMS validation failed.",
            }
          : item,
      ),
    };
  }
}
function sendSaved(
  state: StoredWorkspace,
  facilityId: string,
  connection: Exclude<Connection, "none">,
): StoredWorkspace {
  const facility = facilityById[facilityId];
  if (!facility || !inRoleScope(roleById[state.roleId], facility)) return state;
  let next = state;
  for (const report of state.extraReports.filter(
    (r) => r.facilityId === facilityId && ["draft", "sent"].includes(r.status),
  )) {
    if (connection === "online") {
      next = deliver(next, report.id, "online");
      continue;
    }
    const data = state.submissions[report.id];
    if (!data) continue;
    const payload =
      report.smsPayload ?? reportPayloadFor({ facilityId, sequence: report.sequence, ...data });
    const at = Math.min(1430, next.clockMin + 1);
    next = {
      ...next,
      clockMin: at,
      extraReports: next.extraReports.map((r) =>
        r.id === report.id
          ? {
              ...r,
              channel: "sms",
              status: "sent",
              smsPayload: payload,
              sentAt: r.sentAt ?? at,
              segments: { received: 0, total: codedSmsBudget(payload).segments },
              lifecycle: r.lifecycle.map((step) =>
                step.label === "Sent" ? { ...step, at: step.at ?? at } : step,
              ),
            }
          : r,
      ),
    };
    next = queueSms(next, "report", report.id, [facilityId], payload);
  }
  for (const entry of next.smsEntries.filter(
    (entry) =>
      entry.kind === "complaint" &&
      entry.facilityIds.includes(facilityId) &&
      entry.status === "saved" &&
      entry.facilityIds.every((id) => inRoleScope(roleById[next.roleId], facilityById[id]!)),
  )) {
    next = {
      ...next,
      smsEntries: next.smsEntries.map((item) =>
        item.id === entry.id ? { ...item, status: "sent" } : item,
      ),
    };
    if (connection === "online") next = receiveSms(next, entry.id);
  }
  return next;
}
interface AppState {
  smsEntries: SmsEntry[];
  retrySmsEntry: (id: string) => void;
  sendSavedEntries: (facilityId: string, connection: Exclude<Connection, "none">) => void;
  complaints: Complaint[];
  createComplaint: (input: ComplaintInput, connection?: Connection) => string;
  updateComplaint: (
    id: string,
    input: { status: Complaint["status"]; owner: string; note: string },
  ) => void;
  role: RoleMeta;
  setRole: (id: RoleId) => void;
  filters: Filters;
  setFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  resetFilters: () => void;
  reports: Report[];
  reportFor: (id: string) => Report | undefined;
  statusFor: (id: string) => ReportStatus;
  setReportStatus: (id: string, status: ReportStatus, reason?: string) => void;
  arrivals: string[];
  feedPaused: boolean;
  setFeedPaused: (p: boolean) => void;
  clockMin: number;
  lastSync: string;
  reviewItems: ReviewItem[];
  updateReviewItem: (
    id: string,
    patch: Partial<ReviewItem>,
    event?: { text: string; by?: string },
  ) => void;
  schoolDayFor: (id: string) => SchoolDay | undefined;
  shiftFor: (id: string, key: ShiftKey) => Shift | undefined;
  facilityFor: (id: string) => Facility | undefined;
  staffStatusFor: (s: Staff) => TodayStaffStatus;
  submissionFor: (reportId: string) => SubmissionData | undefined;
  submitReport: (input: FieldSubmission) => Report;
  deliverReport: (id: string, connection?: Exclude<Connection, "none">) => void;
  pendingOutbox: Report[];
  createFollowUp: (input: FollowUpInput) => string;
  requestResend: (reportId: string) => void;
  resetWorkspace: () => void;
  storageReady: boolean;
  storageAvailable: boolean;
}
const Ctx = createContext<AppState | null>(null);
export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(initialWorkspace);
  const stateRef = useRef(state);
  const [storageReady, setStorageReady] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const apply = useCallback((next: StoredWorkspace) => {
    stateRef.current = next;
    setState(next);
  }, []);
  useEffect(() => {
    try {
      const saved = restoreWorkspace(window.localStorage.getItem(WORKSPACE_STORAGE_KEY));
      if (saved) apply(saved);
    } catch {
      setStorageAvailable(false);
    }
    setStorageReady(true);
  }, [apply]);
  useEffect(() => {
    if (!storageReady) return;
    try {
      window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(state));
    } catch {
      setStorageAvailable(false);
    }
  }, [state, storageReady]);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key !== WORKSPACE_STORAGE_KEY || !event.newValue) return;
      const saved = restoreWorkspace(event.newValue);
      if (saved && JSON.stringify(saved) !== JSON.stringify(stateRef.current)) apply(saved);
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [apply]);
  useEffect(() => {
    if (!storageReady) return;
    let recovered = stateRef.current;
    for (const report of recovered.extraReports.filter(
      (r) =>
        r.status === "sent" && r.channel === "sms" && r.smsPayload && recovered.submissions[r.id],
    ))
      recovered = queueSms(recovered, "report", report.id, [report.facilityId], report.smsPayload!);
    if (recovered !== stateRef.current) {
      apply(recovered);
      return;
    }
    if (!state.smsEntries.some((entry) => entry.status === "sent")) return;
    const timer = window.setTimeout(() => {
      let next = stateRef.current;
      for (const entry of next.smsEntries.filter((entry) => entry.status === "sent"))
        next = receiveSms(next, entry.id);
      apply(next);
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [storageReady, state.smsEntries, state.extraReports, state.submissions, apply]);
  const role = roleById[state.roleId];
  const setRole = useCallback(
    (id: RoleId) => {
      const s = stateRef.current;
      const r = roleById[id];
      apply({
        ...s,
        roleId: id,
        filters: { ...s.filters, department: r.department ?? "All", tehsil: r.tehsil ?? "All" },
      });
    },
    [apply],
  );
  const setFilter = useCallback(
    <K extends keyof Filters>(key: K, value: Filters[K]) => {
      const s = stateRef.current;
      const r = roleById[s.roleId];
      apply({
        ...s,
        filters: {
          ...s.filters,
          [key]: value,
          ...(r.department ? { department: r.department } : {}),
          ...(r.tehsil ? { tehsil: r.tehsil } : {}),
        },
      });
    },
    [apply],
  );
  const resetFilters = useCallback(() => {
    const s = stateRef.current;
    const r = roleById[s.roleId];
    apply({
      ...s,
      filters: { ...DEFAULT_FILTERS, department: r.department ?? "All", tehsil: r.tehsil ?? "All" },
    });
  }, [apply]);
  const submitReport = useCallback(
    (input: FieldSubmission) => {
      const result = createReport(stateRef.current, input);
      apply(result.state);
      return result.report;
    },
    [apply],
  );
  const deliverReport = useCallback(
    (id: string, connection: Exclude<Connection, "none"> = "sms") =>
      apply(deliver(stateRef.current, id, connection)),
    [apply],
  );
  const sendSavedEntries = useCallback(
    (facilityId: string, connection: Exclude<Connection, "none">) => {
      apply(sendSaved(stateRef.current, facilityId, connection));
    },
    [apply],
  );
  const retrySmsEntry = useCallback(
    (id: string) => {
      const s = stateRef.current;
      const entry = s.smsEntries.find((entry) => entry.id === id);
      if (
        !entry ||
        entry.status !== "rejected" ||
        !entry.facilityIds.every((id) => inRoleScope(roleById[s.roleId], facilityById[id]!))
      )
        return;
      apply({
        ...s,
        smsEntries: s.smsEntries.map((item) => {
          if (item.id !== id) return item;
          const { reason: _reason, ...rest } = item;
          return { ...rest, status: "sent", segments: codedSmsBudget(item.payload).segments };
        }),
      });
    },
    [apply],
  );
  useEffect(() => {
    if (state.feedPaused || !storageReady) return;
    const timer = window.setInterval(() => {
      const s = stateRef.current;
      const nextId = SIMULATION_POOL.slice(s.poolIndex).find(
        (id) =>
          inRoleScope(roleById[s.roleId], facilityById[id]!) &&
          !isAccepted(latestFor(materializeReports(s), id)?.status ?? "none"),
      );
      if (!nextId) {
        apply({ ...s, feedPaused: true });
        return;
      }
      const f = facilityById[nextId]!;
      const input: FieldSubmission = {
        facilityId: nextId,
        connection: "online",
        ...(f.kind === "school"
          ? { schoolDay: schoolDays[nextId]! }
          : { shift: shiftsByFacility[nextId]!.M }),
      };
      const result = createReport(s, input);
      apply({ ...result.state, poolIndex: SIMULATION_POOL.indexOf(nextId) + 1 });
    }, 8000);
    return () => window.clearInterval(timer);
  }, [state.feedPaused, state.roleId, storageReady, apply]);
  const reports = useMemo(() => materializeReports(state), [state]);
  const reportFor = useCallback((id: string) => latestFor(reports, id), [reports]);
  const statusFor = useCallback(
    (id: string): ReportStatus => reportFor(id)?.status ?? "none",
    [reportFor],
  );
  const schoolDayFor = useCallback(
    (id: string) => {
      const r = reportFor(id);
      return r && isAccepted(r.status)
        ? (state.submissions[r.id]?.schoolDay ?? schoolDays[id])
        : schoolDays[id];
    },
    [reportFor, state.submissions],
  );
  const facilityFor = useCallback(
    (id: string) => {
      const f = facilityById[id];
      if (!f) return undefined;
      const r = reportFor(id);
      const equipmentOk =
        r && isAccepted(r.status) ? state.submissions[r.id]?.equipmentOk : undefined;
      return equipmentOk == null
        ? f
        : { ...f, equipment: { ...f.equipment, ok: equipmentOk, updated: TODAY } };
    },
    [reportFor, state.submissions],
  );
  const shiftFor = useCallback(
    (id: string, key: ShiftKey) => {
      const list = reports
        .filter((r) => r.facilityId === id && r.session === key && isAccepted(r.status))
        .sort((a, b) => b.sequence - a.sequence);
      return state.submissions[list[0]?.id ?? ""]?.shift ?? shiftsByFacility[id]?.[key];
    },
    [reports, state.submissions],
  );
  const staffStatusFor = useCallback(
    (s: Staff): TodayStaffStatus => {
      const f = facilityById[s.facilityId];
      if (f?.kind === "school")
        return isAccepted(statusFor(f.id))
          ? (schoolDayFor(f.id)?.staffStatus[s.id] ?? "Not reported")
          : "Not reported";
      if (!isAccepted(statusFor(s.facilityId))) return "Not reported";
      return (
        shiftFor(s.facilityId, "M")?.assignments.find((a) => a.staffId === s.id)?.status ??
        todayStatus(s, statusFor(s.facilityId))
      );
    },
    [schoolDayFor, shiftFor, statusFor],
  );
  const setReportStatus = useCallback(
    (id: string, status: ReportStatus, reason?: string) => {
      let s = stateRef.current;
      const r = materializeReports(s).find((r) => r.id === id);
      if (!r || !inRoleScope(roleById[s.roleId], facilityById[r.facilityId]!)) return;
      if (
        status === "verified" &&
        (!r.sender.registered ||
          !r.totalsPlausible ||
          r.rosterVersion !== facilityById[r.facilityId]!.rosterVersion ||
          r.segments.received !== r.segments.total ||
          !["received", "pending", "verified"].includes(r.status))
      )
        return;
      if (status === "rejected" && (!reason || reason.trim().length < 4)) return;
      s = {
        ...s,
        overrides: {
          ...s.overrides,
          [id]: {
            status,
            ...(reason ? { reason } : {}),
            ...(status === "verified" ? { verifiedAt: s.clockMin } : {}),
          },
        },
      };
      if (status === "rejected")
        s = appendReview(
          s,
          {
            facilityId: r.facilityId,
            title: "Report requires correction and resubmission.",
            note: reason!,
            severity: "Medium",
            owner:
              facilityById[r.facilityId]!.department === "Education" ? "DEO office" : "DHO office",
          },
          "Implausible totals",
        );
      apply(s);
    },
    [apply],
  );
  const updateReviewItem = useCallback(
    (id: string, patch: Partial<ReviewItem>, event?: { text: string; by?: string }) => {
      const s = stateRef.current;
      apply({
        ...s,
        reviewItems: s.reviewItems.map((it) =>
          it.id === id && inRoleScope(roleById[s.roleId], facilityById[it.facilityId]!)
            ? {
                ...it,
                ...patch,
                id: it.id,
                facilityId: it.facilityId,
                timeline: event
                  ? [
                      ...it.timeline,
                      {
                        at: `23 Nov ${hhmm(s.clockMin)}`,
                        by: event.by ?? roleById[s.roleId].person,
                        text: event.text,
                      },
                    ]
                  : it.timeline,
              }
            : it,
        ),
      });
    },
    [apply],
  );
  const createFollowUp = useCallback(
    (input: FollowUpInput) => {
      const s = stateRef.current;
      if (
        !facilityById[input.facilityId] ||
        !inRoleScope(roleById[s.roleId], facilityById[input.facilityId]!) ||
        input.title.trim().length < 4 ||
        input.note.trim().length < 4 ||
        !input.owner.trim()
      )
        throw new Error("Add a title, evidence and an owner for this follow-up.");
      const next = appendReview(s, input);
      apply(next);
      return next.reviewItems.find(
        (r) =>
          r.facilityId === input.facilityId && r.detected === input.title && r.status !== "Closed",
      )!.id;
    },
    [apply],
  );
  const requestResend = useCallback(
    (id: string) => {
      const s = stateRef.current;
      const r = materializeReports(s).find((r) => r.id === id);
      if (!r) return;
      createFollowUp({
        facilityId: r.facilityId,
        title: `Resend requested for ${r.id}.`,
        note: `Facility administrator to check the report against roster ${facilityById[r.facilityId]!.rosterVersion}, correct the record and submit a new report.`,
        severity: "Low",
        owner: facilityById[r.facilityId]!.headName,
      });
    },
    [createFollowUp],
  );
  const createComplaint = useCallback(
    (input: ComplaintInput, connection: Connection = "online") => {
      const s = stateRef.current;
      const ids = [...new Set(input.facilityIds)];
      if (
        !ids.length ||
        ids.some((id) => !facilityById[id] || !inRoleScope(roleById[s.roleId], facilityById[id]!))
      )
        throw new Error("Select at least one institution within your role's scope.");
      if (
        input.title.trim().length < 5 ||
        input.title.length > 160 ||
        input.description.trim().length < 15 ||
        input.description.length > 5000 ||
        !input.owner.trim() ||
        input.owner.length > 120 ||
        !COMPLAINT_CATEGORIES.includes(input.category) ||
        !["Critical", "High", "Medium", "Low"].includes(input.priority)
      )
        throw new Error("Add a title, detailed complaint, valid priority and assigned owner.");
      if (
        s.complaints.length +
          s.smsEntries.filter(
            (entry) => entry.kind === "complaint" && ["saved", "sent"].includes(entry.status),
          ).length >=
        1000
      )
        throw new Error("The complaint register is full. Reset the presentation to start again.");
      const id = `CMP-${Math.max(1000, ...s.complaints.map((c) => Number(c.id.slice(4)) || 1000), ...s.smsEntries.filter((e) => e.kind === "complaint").map((e) => Number(e.referenceId.slice(4)) || 1000)) + 1}`;
      const c: Complaint = {
        ...input,
        facilityIds: ids,
        title: input.title.trim(),
        description: input.description.trim(),
        owner: input.owner.trim(),
        id,
        status: "Open",
        createdDate: TODAY,
        createdMin: s.clockMin,
        createdBy: roleById[s.roleId].person,
        timeline: [
          {
            at: `23 Nov ${hhmm(s.clockMin)}`,
            by: roleById[s.roleId].person,
            text: `Complaint registered for ${ids.length} institution${ids.length === 1 ? "" : "s"} and assigned to ${input.owner.trim()}.`,
          },
        ],
      };
      if (connection === "online") apply({ ...s, complaints: [...s.complaints, c] });
      else
        apply(
          queueSms(
            s,
            "complaint",
            id,
            ids,
            `C1|${id}|${encodeURIComponent(JSON.stringify(c))}`,
            connection === "none",
          ),
        );
      return id;
    },
    [apply],
  );
  const updateComplaint = useCallback(
    (id: string, input: { status: Complaint["status"]; owner: string; note: string }) => {
      const s = stateRef.current;
      const c = s.complaints.find((c) => c.id === id);
      if (!c || c.facilityIds.some((id) => !inRoleScope(roleById[s.roleId], facilityById[id]!)))
        throw new Error(
          "A district-wide administrator must update a complaint spanning other role scopes.",
        );
      if (
        !COMPLAINT_STATUSES.includes(input.status) ||
        !input.owner.trim() ||
        input.owner.length > 120 ||
        input.note.trim().length < 5 ||
        input.note.length > 5000
      )
        throw new Error("Select a status and owner, and add an update or resolution note.");
      const changes = [
        c.status !== input.status
          ? `Status changed to ${input.status}.`
          : "Progress update recorded.",
        c.owner !== input.owner.trim() ? `Assigned to ${input.owner.trim()}.` : "",
        input.note.trim(),
      ]
        .filter(Boolean)
        .join(" ");
      apply({
        ...s,
        complaints: s.complaints.map((item) =>
          item.id === id
            ? {
                ...item,
                status: input.status,
                owner: input.owner.trim(),
                timeline: [
                  ...item.timeline,
                  {
                    at: `23 Nov ${hhmm(s.clockMin)}`,
                    by: roleById[s.roleId].person,
                    text: changes,
                  },
                ],
              }
            : item,
        ),
      });
    },
    [apply],
  );
  const resetWorkspace = useCallback(() => apply(initialWorkspace()), [apply]);
  const pendingOutbox = reports.filter(
    (r) =>
      state.submissions[r.id] &&
      (r.status === "draft" || r.status === "sent") &&
      inRoleScope(role, facilityById[r.facilityId]!),
  );
  const value: AppState = {
    smsEntries: state.smsEntries,
    retrySmsEntry,
    sendSavedEntries,
    complaints: state.complaints,
    createComplaint,
    updateComplaint,
    role,
    setRole,
    filters: state.filters,
    setFilter,
    resetFilters,
    reports,
    reportFor,
    statusFor,
    setReportStatus,
    arrivals: state.arrivals,
    feedPaused: state.feedPaused,
    setFeedPaused: (feedPaused) => apply({ ...stateRef.current, feedPaused }),
    clockMin: state.clockMin,
    lastSync: state.clockMin === NOW_MIN ? LAST_SYNC : hhmm(state.clockMin),
    reviewItems: state.reviewItems,
    updateReviewItem,
    schoolDayFor,
    shiftFor,
    staffStatusFor,
    facilityFor,
    submissionFor: (id) => state.submissions[id],
    submitReport,
    deliverReport,
    pendingOutbox,
    createFollowUp,
    requestResend,
    resetWorkspace,
    storageReady,
    storageAvailable,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export function useApp() {
  const value = useContext(Ctx);
  if (!value) throw new Error("useApp must be used inside AppStateProvider");
  return value;
}
export function inRoleScope(role: RoleMeta, f: Facility) {
  return (
    !(role.department && f.department !== role.department) &&
    !(role.tehsil && f.tehsil !== role.tehsil) &&
    !(role.section && f.section !== role.section)
  );
}
export function useScopedFacilities(
  opts: { kind?: "school" | "health"; applyFilters?: boolean } = {},
) {
  const { role, filters, facilityFor } = useApp();
  const { kind, applyFilters = true } = opts;
  return useMemo(
    () =>
      facilities
        .map((f) => facilityFor(f.id) ?? f)
        .filter(
          (f) =>
            inRoleScope(role, f) &&
            (!kind || f.kind === kind) &&
            (!applyFilters ||
              ((filters.department === "All" || f.department === filters.department) &&
                (filters.tehsil === "All" || f.tehsil === filters.tehsil))),
        ),
    [role, filters, facilityFor, kind, applyFilters],
  );
}
