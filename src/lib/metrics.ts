import {
  INFRA_KEYS,
  isAccepted,
  isStale,
  ON_SITE,
  schoolDays,
  shiftCoverage,
  shiftsByFacility,
  staffByFacility,
  type Facility,
  type ReportStatus,
  type ShiftKey,
  type SchoolDay,
  type Shift,
} from "@/data/mock";

/** Staff present of total for a school, or null if its report has not been accepted yet. */
export function schoolStaffCounts(
  f: Facility,
  status: ReportStatus,
  day: SchoolDay | undefined = schoolDays[f.id],
) {
  const list = staffByFacility[f.id] ?? [];
  if (!isAccepted(status)) return { present: null as number | null, total: list.length };
  const present = list.filter((s) => day?.staffStatus[s.id] === "Present").length;
  return { present, total: list.length };
}

/** Students present of enrolled for a school, or null when no accepted report. */
export function schoolStudentCounts(
  f: Facility,
  status: ReportStatus,
  day: SchoolDay | undefined = schoolDays[f.id],
) {
  const enrolled = day?.classes.reduce((a, c) => a + c.enrolledBoys + c.enrolledGirls, 0) ?? 0;
  if (!isAccepted(status) || !day) return { present: null as number | null, enrolled };
  const present = day.classes.reduce((a, c) => a + c.presentBoys + c.presentGirls, 0);
  return { present, enrolled };
}

export function healthStaffCounts(
  f: Facility,
  key: ShiftKey = "M",
  s: Shift | undefined = shiftsByFacility[f.id]?.[key],
) {
  if (!s) return { onSite: 0, required: 0, covered: 0, belowMinimum: false };
  const cov = shiftCoverage(s);
  return {
    onSite: cov.onSite,
    required: cov.required,
    covered: cov.covered,
    belowMinimum: cov.belowMinimum,
  };
}

/** District-level roll-up used on the Overview. */
export function districtSummary(
  facilities: Facility[],
  statusFor: (id: string) => ReportStatus,
  data: {
    schoolDayFor?: (id: string) => SchoolDay | undefined;
    shiftFor?: (id: string, key: ShiftKey) => Shift | undefined;
  } = {},
) {
  let reported = 0;
  let bySms = 0;
  let noReport = 0;
  let pending = 0;
  let rejected = 0;
  let staffPresent = 0;
  let staffTotal = 0;
  let schoolsWithStaffData = 0;
  let shiftOnSite = 0;
  let shiftRequired = 0;
  let shiftsBelow = 0;
  let healthCount = 0;
  let staleRecords = 0;
  let healthStaffTotal = 0;
  // Non-functional and closed schools are not expected to report.
  const expected = facilities.filter((f) => f.operational);
  for (const f of facilities) {
    if (!f.operational) {
      for (const k of INFRA_KEYS) if (isStale(f.infra[k].updated)) staleRecords++;
      continue;
    }
    const st = statusFor(f.id);
    if (st === "received" || st === "pending" || st === "verified" || st === "rejected") reported++;
    if (st === "none") noReport++;
    if (st === "pending" || st === "received") pending++;
    if (st === "rejected") rejected++;
    if ((st === "received" || st === "pending" || st === "verified") && f.channel === "sms")
      bySms++;
    if (f.kind === "school") {
      const c = schoolStaffCounts(f, st, data.schoolDayFor?.(f.id) ?? schoolDays[f.id]);
      if (c.present != null) {
        staffPresent += c.present;
        staffTotal += c.total;
        schoolsWithStaffData++;
      }
    } else {
      healthCount++;
      const h = healthStaffCounts(f, "M", data.shiftFor?.(f.id, "M") ?? shiftsByFacility[f.id]?.M);
      shiftOnSite += isAccepted(st) ? h.covered : 0;
      shiftRequired += h.required;
      if (isAccepted(st) && h.belowMinimum) shiftsBelow++;
      const m = data.shiftFor?.(f.id, "M") ?? shiftsByFacility[f.id]?.M;
      if (m && isAccepted(st)) {
        staffPresent += m.assignments.filter((a) => ON_SITE.includes(a.status)).length;
        const rostered = m.assignments.filter((a) => a.status !== "Off-duty").length;
        staffTotal += rostered;
        healthStaffTotal += rostered;
      }
    }
    for (const k of INFRA_KEYS) if (isStale(f.infra[k].updated)) staleRecords++;
  }
  return {
    total: expected.length,
    reported,
    bySms,
    noReport,
    pending,
    rejected,
    staffPresent,
    staffTotal,
    schoolsWithStaffData,
    healthStaffTotal,
    shiftOnSite,
    shiftRequired,
    shiftsBelow,
    healthCount,
    staleRecords,
  };
}

export const pct = (a: number, b: number, digits = 1) =>
  b === 0 ? "0" : ((a / b) * 100).toFixed(digits);

export function formatPkr(amount: number): string {
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
  return String(amount);
}

import { budgetLines, patientStats, type Department, type BudgetLine } from "@/data/mock";

export function budgetSummary(dept?: Department) {
  const lines = dept ? budgetLines.filter((l) => l.department === dept) : budgetLines;
  const allocated = lines.reduce((a, l) => a + l.allocated, 0);
  const spent = lines.reduce((a, l) => a + l.spent, 0);
  const committed = lines.reduce((a, l) => a + l.committed, 0);
  return { allocated, spent, committed, lines };
}

export function patientSummary(facilityIds?: string[]) {
  const stats = facilityIds
    ? patientStats.filter((p) => facilityIds.includes(p.facilityId))
    : patientStats;
  return {
    opdTotal: stats.reduce((a, p) => a + p.opdToday, 0),
    emergencyTotal: stats.reduce((a, p) => a + p.emergencyToday, 0),
    admissionsTotal: stats.reduce((a, p) => a + p.admissionsToday, 0),
    dischargesToday: stats.reduce((a, p) => a + p.dischargesToday, 0),
    referralsTotal: stats.reduce((a, p) => a + p.referralsToday, 0),
    bedsOccupied: stats.reduce((a, p) => a + p.bedsOccupied, 0),
    bedsTotal: stats.reduce((a, p) => a + p.bedsTotal, 0),
    icuOccupied: stats.reduce((a, p) => a + p.icuOccupied, 0),
    icuTotal: stats.reduce((a, p) => a + p.icuTotal, 0),
  };
}
