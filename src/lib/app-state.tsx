import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import {
  facilities,
  facilityById,
  hhmm,
  LAST_SYNC,
  NOW_MIN,
  reportByFacility,
  reports as baseReports,
  reviewItems as baseReviewItems,
  SIMULATION_POOL,
  smsPayloadFor,
  TODAY_COMPACT,
  type Department,
  type Facility,
  type Report,
  type ReportStatus,
  type ReviewItem,
  type Tehsil,
} from "@/data/mock";

// ---------- Roles ----------
export type RoleId = "dc" | "deo" | "dho" | "ac-domel";
export interface RoleMeta {
  id: RoleId;
  label: string;
  person: string;
  scopeLabel: string;
  department?: Department;
  tehsil?: Tehsil;
}
export const ROLES: RoleMeta[] = [
  { id: "dc", label: "Deputy Commissioner", person: "Shah Saud Marwat", scopeLabel: "Whole district" },
  { id: "deo", label: "District Education Officer", person: "Fazal Rahim Khattak", scopeLabel: "Schools only", department: "Education" },
  { id: "dho", label: "District Health Officer", person: "Dr. Amjad Ali Wazir", scopeLabel: "Health only", department: "Health" },
  { id: "ac-domel", label: "Assistant Commissioner Domel", person: "Liaqat Ali Bangash", scopeLabel: "Domel tehsil", tehsil: "Domel" },
];
export const roleById = Object.fromEntries(ROLES.map((r) => [r.id, r])) as Record<RoleId, RoleMeta>;

// ---------- Filters ----------
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
const DEFAULT_FILTERS: Filters = { department: "All", tehsil: "All", dateRange: "today", shift: "All" };

interface AppState {
  role: RoleMeta;
  setRole: (id: RoleId) => void;
  filters: Filters;
  setFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  resetFilters: () => void;
  /** Live report list (base + simulated arrivals), with status overrides applied. */
  reports: Report[];
  reportFor: (facilityId: string) => Report | undefined;
  statusFor: (facilityId: string) => ReportStatus;
  setReportStatus: (reportId: string, status: ReportStatus, reason?: string) => void;
  arrivals: string[]; // report ids that arrived during the session, newest first
  feedPaused: boolean;
  setFeedPaused: (p: boolean) => void;
  clockMin: number;
  lastSync: string;
  reviewItems: ReviewItem[];
  updateReviewItem: (id: string, patch: Partial<ReviewItem>, event?: { text: string; by?: string }) => void;
}

const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [roleId, setRoleId] = useState<RoleId>("dc");
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [extraReports, setExtraReports] = useState<Report[]>([]);
  const [overrides, setOverrides] = useState<Record<string, { status: ReportStatus; reason?: string; verifiedAt?: number }>>({});
  const [arrivals, setArrivals] = useState<string[]>([]);
  const [feedPaused, setFeedPaused] = useState(false);
  const [clockMin, setClockMin] = useState(NOW_MIN);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>(baseReviewItems);
  const poolIndex = useRef(0);

  const role = roleById[roleId];

  const setRole = useCallback((id: RoleId) => {
    setRoleId(id);
    const r = roleById[id];
    setFilters((f) => ({ ...f, department: r.department ?? "All", tehsil: r.tehsil ?? "All" }));
  }, []);

  const setFilter = useCallback(<K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((f) => ({ ...f, [key]: value }));
  }, []);
  const resetFilters = useCallback(() => {
    setFilters({ ...DEFAULT_FILTERS, department: role.department ?? "All", tehsil: role.tehsil ?? "All" });
  }, [role]);

  // Simulated incoming reports: one every 8 seconds.
  useEffect(() => {
    if (feedPaused) return;
    const t = window.setInterval(() => {
      const id = SIMULATION_POOL[poolIndex.current];
      if (!id) return;
      poolIndex.current += 1;
      const f = facilityById[id];
      if (!f) return;
      setClockMin((c) => {
        const at = c + 1;
        const prev = reportByFacility[id];
        const seq = (prev?.sequence ?? 3) + 1;
        const channel = f.channel;
        const report: Report = {
          id: `RPT-${f.code}-${TODAY_COMPACT}-${String(seq).padStart(3, "0")}`,
          facilityId: id,
          type: f.kind === "school" ? "A1" : "H1",
          session: "M",
          channel,
          rosterVersion: f.rosterVersion,
          sequence: seq,
          segments: { received: 1, total: 1 },
          status: "received",
          observedAt: prev?.observedAt ?? at - 70,
          sentAt: prev?.sentAt ?? at - 3,
          receivedAt: at,
          verifiedAt: null,
          smsPayload:
            channel === "sms"
              ? smsPayloadFor({ type: f.kind === "school" ? "A1" : "H1", code: f.code, session: "M", roster: f.rosterVersion, seq, absent: [], leave: [], full: true })
              : null,
          sender: { registered: true, masked: f.phoneMasked },
          totalsPlausible: true,
          lifecycle: [
            { label: "Saved on phone", at: at - 6 },
            { label: "Sent", at: at - 3 },
            { label: channel === "sms" ? "Delivered to SMS provider" : "Uploaded over mobile data", at: at - 2 },
            { label: "Accepted by district server", at },
            { label: "Acknowledgement sent", at: at + 1 },
          ],
        };
        setExtraReports((r) => [report, ...r.filter((x) => x.facilityId !== id)]);
        setArrivals((a) => [report.id, ...a].slice(0, 40));
        return at;
      });
    }, 8000);
    return () => window.clearInterval(t);
  }, [feedPaused]);

  const reports = useMemo(() => {
    const replaced = new Set(extraReports.map((r) => r.facilityId));
    const list = [...extraReports, ...baseReports.filter((r) => !replaced.has(r.facilityId))];
    return list.map((r) => {
      const o = overrides[r.id];
      if (!o) return r;
      return {
        ...r,
        status: o.status,
        ...(o.reason ? { rejectionReason: o.reason } : {}),
        ...(o.verifiedAt != null ? { verifiedAt: o.verifiedAt } : {}),
      };
    });
  }, [extraReports, overrides]);

  const byFacility = useMemo(() => {
    const m: Record<string, Report> = {};
    for (const r of reports) m[r.facilityId] = r;
    return m;
  }, [reports]);

  const reportFor = useCallback((id: string) => byFacility[id], [byFacility]);
  const statusFor = useCallback((id: string): ReportStatus => byFacility[id]?.status ?? "none", [byFacility]);

  const setReportStatus = useCallback(
    (reportId: string, status: ReportStatus, reason?: string) => {
      setOverrides((o) => ({
        ...o,
        [reportId]: { status, ...(reason ? { reason } : {}), ...(status === "verified" ? { verifiedAt: clockMin } : {}) },
      }));
    },
    [clockMin],
  );

  const updateReviewItem = useCallback((id: string, patch: Partial<ReviewItem>, event?: { text: string; by?: string }) => {
    setReviewItems((items) =>
      items.map((it) =>
        it.id === id
          ? {
              ...it,
              ...patch,
              timeline: event ? [...it.timeline, { at: `23 Nov ${hhmm(clockMinRef.current)}`, ...event }] : it.timeline,
            }
          : it,
      ),
    );
  }, []);
  const clockMinRef = useRef(clockMin);
  clockMinRef.current = clockMin;

  const value: AppState = {
    role,
    setRole,
    filters,
    setFilter,
    resetFilters,
    reports,
    reportFor,
    statusFor,
    setReportStatus,
    arrivals,
    feedPaused,
    setFeedPaused,
    clockMin,
    lastSync: clockMin === NOW_MIN ? LAST_SYNC : hhmm(clockMin),
    reviewItems,
    updateReviewItem,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used inside AppStateProvider");
  return v;
}

/** True when a facility is inside the signed-in role's scope (ignores filter bar). */
export function inRoleScope(role: RoleMeta, f: Facility) {
  if (role.department && f.department !== role.department) return false;
  if (role.tehsil && f.tehsil !== role.tehsil) return false;
  return true;
}

/** Facilities in role scope, and (by default) narrowed by the filter bar. */
export function useScopedFacilities(opts: { kind?: "school" | "health"; applyFilters?: boolean } = {}) {
  const { role, filters } = useApp();
  const { kind, applyFilters = true } = opts;
  return useMemo(
    () =>
      facilities.filter((f) => {
        if (!inRoleScope(role, f)) return false;
        if (kind && f.kind !== kind) return false;
        if (applyFilters) {
          if (filters.department !== "All" && f.department !== filters.department) return false;
          if (filters.tehsil !== "All" && f.tehsil !== filters.tehsil) return false;
        }
        return true;
      }),
    [role, filters, kind, applyFilters],
  );
}
