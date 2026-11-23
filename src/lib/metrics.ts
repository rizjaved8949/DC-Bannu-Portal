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
} from "@/data/mock";

/** Staff present of total for a school, or null if its report has not been accepted yet. */
export function schoolStaffCounts(f: Facility, status: ReportStatus) {
  const list = staffByFacility[f.id] ?? [];
  if (!isAccepted(status)) return { present: null as number | null, total: list.length };
  const day = schoolDays[f.id];
  const present = list.filter((s) => day?.staffStatus[s.id] === "Present").length;
  return { present, total: list.length };
}

/** Students present of enrolled for a school, or null when no accepted report. */
export function schoolStudentCounts(f: Facility, status: ReportStatus) {
  const day = schoolDays[f.id];
  const enrolled = day?.classes.reduce((a, c) => a + c.enrolledBoys + c.enrolledGirls, 0) ?? 0;
  if (!isAccepted(status) || !day) return { present: null as number | null, enrolled };
  const present = day.classes.reduce((a, c) => a + c.presentBoys + c.presentGirls, 0);
  return { present, enrolled };
}

export function healthStaffCounts(f: Facility, key: ShiftKey = "M") {
  const s = shiftsByFacility[f.id]?.[key];
  if (!s) return { onSite: 0, required: 0, covered: 0, belowMinimum: false };
  const cov = shiftCoverage(s);
  return { onSite: cov.onSite, required: cov.required, covered: cov.covered, belowMinimum: cov.belowMinimum };
}

/** District-level roll-up used on the Overview. */
export function districtSummary(facilities: Facility[], statusFor: (id: string) => ReportStatus) {
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
  for (const f of facilities) {
    const st = statusFor(f.id);
    if (st === "received" || st === "pending" || st === "verified" || st === "rejected") reported++;
    if (st === "none") noReport++;
    if (st === "pending" || st === "received") pending++;
    if (st === "rejected") rejected++;
    if ((st === "received" || st === "pending" || st === "verified") && f.channel === "sms") bySms++;
    if (f.kind === "school") {
      const c = schoolStaffCounts(f, st);
      if (c.present != null) {
        staffPresent += c.present;
        staffTotal += c.total;
        schoolsWithStaffData++;
      }
    } else {
      healthCount++;
      const h = healthStaffCounts(f);
      shiftOnSite += h.covered;
      shiftRequired += h.required;
      if (h.belowMinimum) shiftsBelow++;
      const m = shiftsByFacility[f.id]?.M;
      if (m) {
        staffPresent += m.assignments.filter((a) => ON_SITE.includes(a.status)).length;
        const rostered = m.assignments.filter((a) => a.status !== "Off-duty").length;
        staffTotal += rostered;
        healthStaffTotal += rostered;
      }
    }
    for (const k of INFRA_KEYS) if (isStale(f.infra[k].updated)) staleRecords++;
  }
  return {
    total: facilities.length,
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

export const pct = (a: number, b: number, digits = 1) => (b === 0 ? "0" : ((a / b) * 100).toFixed(digits));
