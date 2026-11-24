/**
 * All prototype data for DCMS Bannu. Generated deterministically from a seeded
 * mulberry32 RNG (seed 2311) and short name lists. "Now" is Mon 23 Nov 2026, 11:40 PKT.
 * Times are stored as minutes-since-midnight or "YYYY-MM-DD" strings so server and
 * browser render identically.
 */

// ---------- RNG ----------
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(2311);
const rand = (min: number, max: number) => Math.floor(rng() * (max - min + 1)) + min;
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)] as T;
const chance = (p: number) => rng() < p;
function shuffle<T>(arr: T[], r: () => number = rng): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j] as T, a[i] as T];
  }
  return a;
}
function hashString(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ---------- Time ----------
export const TODAY = "2026-11-23";
export const TODAY_COMPACT = "20261123";
export const NOW_MIN = 11 * 60 + 40; // 11:40 PKT
export const NOW_LABEL = "Mon 23 Nov 2026, 11:40";
export const LAST_SYNC = "11:38";

export function hhmm(min: number | null | undefined): string {
  if (min == null) return "Not yet";
  const m = ((min % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Add days to a YYYY-MM-DD date (UTC math, no time zone drift). */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export function daysBetween(a: string, b: string): number {
  return Math.round(
    (new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime()) / 86400000,
  );
}
export function weekday(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}
export function formatDate(date: string, withWeekday = false): string {
  const d = new Date(`${date}T00:00:00Z`);
  const s = `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  return withWeekday ? `${WEEKDAYS[d.getUTCDay()]} ${s}` : s;
}
export function formatShortDate(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}
/** Freshness rule: older than 3 days is stale. */
export function isStale(date: string): boolean {
  return daysBetween(date, TODAY) > 3;
}
export function ageLabel(date: string): string {
  const d = daysBetween(date, TODAY);
  if (d <= 0) return "today";
  if (d === 1) return "yesterday";
  return `${d} days ago`;
}

// ---------- Domain types ----------
export const TEHSILS = ["Bannu", "Domel", "Kakki", "Miryan", "Baka Khel", "Wazir"] as const;
export type Tehsil = (typeof TEHSILS)[number];

export type ReportStatus =
  "draft" | "sent" | "received" | "pending" | "verified" | "rejected" | "none";

export const REPORT_STATUS_ORDER: ReportStatus[] = [
  "verified",
  "pending",
  "received",
  "sent",
  "draft",
  "rejected",
  "none",
];

export type Channel = "app" | "sms";
export type Department = "Education" | "Health";
export type SchoolLevel = "Primary" | "Middle" | "High" | "Higher Secondary";
export type Gender = "Boys" | "Girls";
export type HealthType = "DHQ" | "WCH" | "RHC" | "BHU";

export const INFRA_KEYS = ["water", "electricity", "toilets", "boundaryWall", "ramp"] as const;
export type InfraKey = (typeof INFRA_KEYS)[number];
export const INFRA_LABELS: Record<InfraKey, string> = {
  water: "Drinking water",
  electricity: "Electricity",
  toilets: "Usable toilets",
  boundaryWall: "Boundary wall",
  ramp: "Ramp access",
};
export interface InfraFlag {
  ok: boolean;
  updated: string; // YYYY-MM-DD
  note?: string;
}

export interface Facility {
  id: string; // same as code, lowercase-free e.g. SCH114
  code: string;
  name: string;
  kind: "school" | "health";
  department: Department;
  tehsil: Tehsil;
  village: string;
  lat: number;
  lng: number;
  coordsVerified: boolean;
  channel: Channel;
  rosterVersion: string; // current roster on the district server
  infra: Record<InfraKey, InfraFlag>;
  equipment: InfraFlag & { label: string };
  level?: SchoolLevel;
  gender?: Gender;
  healthType?: HealthType;
  typeLabel: string;
  headName: string;
  phoneMasked: string;
}

export type SchoolDesignation =
  | "Headmaster"
  | "Headmistress"
  | "SST"
  | "PST"
  | "CT"
  | "AT"
  | "TT"
  | "DM"
  | "PET"
  | "Naib Qasid"
  | "Chowkidar";
export type HealthDesignation =
  | "Medical Officer"
  | "Women Medical Officer"
  | "Charge Nurse"
  | "LHV"
  | "Dispenser"
  | "Pharmacist"
  | "Lab Technician"
  | "Ward Orderly";
export type Designation = SchoolDesignation | HealthDesignation;

export type ShiftKey = "M" | "E" | "N";
export const SHIFT_NAMES: Record<ShiftKey, "Morning" | "Evening" | "Night"> = {
  M: "Morning",
  E: "Evening",
  N: "Night",
};

export interface Staff {
  id: string; // ST0001
  code: string; // T103 within facility
  name: string;
  initials: string;
  gender: "M" | "F";
  personalNoMasked: string;
  designation: Designation;
  bps: number;
  facilityId: string;
  employment: "Regular" | "Contract";
  shiftEligibility: ShiftKey[] | ["Day"];
  onRosterSince: string;
}

export type SchoolStaffStatus = "Present" | "Absent" | "Approved leave" | "Official duty";
export type ShiftStaffStatus =
  "Present" | "Absent" | "Leave" | "Late" | "Replacement" | "On-call" | "Off-duty";
export type TodayStaffStatus = SchoolStaffStatus | ShiftStaffStatus | "Not reported" | "Scheduled";

export interface ClassRow {
  className: string;
  enrolledBoys: number;
  enrolledGirls: number;
  presentBoys: number;
  presentGirls: number;
}

export interface SchoolDay {
  facilityId: string;
  staffStatus: Record<string, SchoolStaffStatus>; // staffId -> status
  classes: ClassRow[];
}

export const SERVICES = [
  "Lab",
  "X-ray",
  "Ultrasound",
  "Ambulance",
  "Oxygen",
  "Delivery room",
] as const;
export type Service = (typeof SERVICES)[number];

export interface ShiftAssignment {
  staffId: string;
  role: HealthDesignation;
  status: ShiftStaffStatus;
  replacesStaffId?: string;
  note?: string;
}

export interface Shift {
  id: string; // SH-HF203-20261123-M
  facilityId: string;
  key: ShiftKey;
  date: string; // start date
  startMin: number;
  endMin: number;
  rangeLabel: string; // "22 Nov 20:00 to 23 Nov 08:00"
  phase: "completed" | "in progress" | "upcoming";
  required: Partial<Record<HealthDesignation, number>>;
  assignments: ShiftAssignment[];
  opd: number | null;
  bedsAvailable: number;
  bedsTotal: number;
  services: Partial<Record<Service, boolean>>;
  handover: {
    faults: string[];
    stockOuts: string[];
    interruptions: string[];
    acknowledgedAt: number | null;
    acknowledgedBy: string | null;
  };
}

export interface LifecycleStep {
  label: string;
  at: number | null;
}

export interface Report {
  id: string;
  facilityId: string;
  type: "A1" | "H1"; // A1 school day, H1 shift report
  session: ShiftKey;
  channel: Channel;
  rosterVersion: string;
  sequence: number;
  segments: { received: number; total: number };
  status: ReportStatus;
  observedAt: number | null;
  sentAt: number | null;
  receivedAt: number | null;
  verifiedAt: number | null;
  smsPayload: string | null;
  sender: { registered: boolean; masked: string };
  totalsPlausible: boolean;
  rejectionReason?: string;
  lifecycle: LifecycleStep[];
}

export type ReviewType =
  | "No report by 10:00"
  | "Implausible totals"
  | "Below minimum staffing"
  | "Roster version mismatch"
  | "Stale record"
  | "Critical facility issue"
  | "Inspector finding";
export const REVIEW_TYPES: ReviewType[] = [
  "No report by 10:00",
  "Implausible totals",
  "Below minimum staffing",
  "Roster version mismatch",
  "Stale record",
  "Critical facility issue",
  "Inspector finding",
];
export type Severity = "Critical" | "High" | "Medium" | "Low";
export type ReviewStatus = "Open" | "In review" | "Closed";

export interface ReviewEvent {
  at: string; // "23 Nov 10:00"
  text: string;
  by?: string;
}
export interface ReviewItem {
  id: string; // RV-1001
  type: ReviewType;
  severity: Severity;
  facilityId: string;
  createdDate: string;
  createdMin: number;
  owner: string;
  status: ReviewStatus;
  detected: string;
  why: string;
  evidence: { label: string; value: string }[];
  timeline: ReviewEvent[];
}

// ---------- Name lists ----------
const MALE_FIRST = [
  "Amjad",
  "Bakht",
  "Fazal",
  "Gul",
  "Hayat",
  "Ihsan",
  "Jamshed",
  "Khalid",
  "Liaqat",
  "Mumtaz",
  "Naseer",
  "Qadir",
  "Rahim",
  "Sher",
  "Tariq",
  "Umar",
  "Wali",
  "Zahir",
  "Asfandyar",
  "Inayat",
  "Saleem",
  "Habib",
  "Murad",
  "Irfan",
  "Shaukat",
  "Noor",
  "Farid",
  "Sajid",
] as const;
const FEMALE_FIRST = [
  "Amina",
  "Bushra",
  "Farzana",
  "Gulalai",
  "Hina",
  "Khadija",
  "Laila",
  "Mehwish",
  "Nasreen",
  "Palwasha",
  "Rukhsana",
  "Shabana",
  "Sadia",
  "Zarmina",
  "Tahira",
  "Nazia",
  "Saima",
  "Uzma",
] as const;
const MALE_MIDDLE = [
  "Ullah",
  "Khan",
  "Rahman",
  "Muhammad",
  "Ali",
  "Ahmad",
  "Zaman",
  "Din",
] as const;
const SURNAMES = [
  "Marwat",
  "Wazir",
  "Khattak",
  "Bangash",
  "Durrani",
  "Shah",
  "Bannuchi",
  "Niazi",
  "Daudzai",
  "Afridi",
  "Khan",
  "Yousafzai",
] as const;

const VILLAGES_BY_TEHSIL: Record<Tehsil, string[]> = {
  Bannu: ["Bannu City", "Township", "Mandan", "Hawaid"],
  Domel: ["Domel", "Sokari"],
  Kakki: ["Kakki", "Mamash Khel"],
  Miryan: ["Miryan", "Bazar Ahmad Khan"],
  "Baka Khel": ["Baka Khel", "Jani Khel"],
  Wazir: ["Ghoriwala", "Jani Khel"],
};
const TEHSIL_CENTRE: Record<Tehsil, [number, number]> = {
  Bannu: [32.99, 70.6],
  Domel: [33.09, 70.46],
  Kakki: [32.87, 70.56],
  Miryan: [33.06, 70.74],
  "Baka Khel": [32.92, 70.41],
  Wazir: [32.86, 70.79],
};

function personName(gender: "M" | "F"): string {
  if (gender === "F") return `${pick(FEMALE_FIRST)} ${pick(SURNAMES)}`;
  return chance(0.5)
    ? `${pick(MALE_FIRST)} ${pick(MALE_MIDDLE)}`
    : `${pick(MALE_FIRST)} ${pick(MALE_MIDDLE)} ${pick(SURNAMES)}`;
}
function initialsOf(name: string) {
  const parts = name.split(" ");
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}
const masked = () => `••••${rand(100, 989)}`;

function clampCoord(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}
function coordsFor(t: Tehsil): [number, number] {
  const [la, ln] = TEHSIL_CENTRE[t];
  return [
    +clampCoord(la + (rng() - 0.5) * 0.07, 32.8, 33.15).toFixed(4),
    +clampCoord(ln + (rng() - 0.5) * 0.08, 70.35, 70.85).toFixed(4),
  ];
}

function infraFlags(problemRate: number): Record<InfraKey, InfraFlag> {
  const out = {} as Record<InfraKey, InfraFlag>;
  for (const k of INFRA_KEYS) {
    const daysAgo = chance(0.16) ? rand(5, 41) : rand(0, 3);
    out[k] = { ok: !chance(problemRate), updated: addDays(TODAY, -daysAgo) };
  }
  return out;
}

// ---------- Facilities ----------
const SCHOOL_PLAN: { tehsil: Tehsil; count: number }[] = [
  { tehsil: "Bannu", count: 11 },
  { tehsil: "Domel", count: 8 },
  { tehsil: "Kakki", count: 8 },
  { tehsil: "Miryan", count: 7 },
  { tehsil: "Baka Khel", count: 7 },
  { tehsil: "Wazir", count: 7 },
];
const LEVELS: SchoolLevel[] = [
  "Primary",
  "Primary",
  "Primary",
  "Primary",
  "Middle",
  "Middle",
  "High",
  "High",
  "Higher Secondary",
];
const PREFIX: Record<SchoolLevel, Record<Gender, string>> = {
  Primary: { Boys: "GPS", Girls: "GGPS" },
  Middle: { Boys: "GMS", Girls: "GGMS" },
  High: { Boys: "GHS", Girls: "GGHS" },
  "Higher Secondary": { Boys: "GHSS", Girls: "GGHSS" },
};
const TYPE_LABEL: Record<SchoolLevel, string> = {
  Primary: "Primary school",
  Middle: "Middle school",
  High: "High school",
  "Higher Secondary": "Higher secondary school",
};

const schools: Facility[] = [];
{
  const usedNames = new Map<string, number>();
  let n = 101;
  for (const { tehsil, count } of SCHOOL_PLAN) {
    for (let i = 0; i < count; i++) {
      const level = pick(LEVELS);
      const gender: Gender = chance(0.42) ? "Girls" : "Boys";
      const village = pick(VILLAGES_BY_TEHSIL[tehsil]);
      const base = `${PREFIX[level][gender]} ${village}`;
      const seen = (usedNames.get(base) ?? 0) + 1;
      usedNames.set(base, seen);
      const name =
        village === "Bannu City"
          ? `${PREFIX[level][gender]} No. ${seen} Bannu City`
          : seen > 1
            ? `${base} No. ${seen}`
            : base;
      const [lat, lng] = coordsFor(tehsil);
      const code = `SCH${n++}`;
      schools.push({
        id: code,
        code,
        name,
        kind: "school",
        department: "Education",
        tehsil,
        village,
        lat,
        lng,
        coordsVerified: chance(0.72),
        channel: chance(0.3) ? "sms" : "app",
        rosterVersion: `RV0${rand(2, 6)}`,
        infra: infraFlags(0.14),
        equipment: {
          label: "Furniture and boards",
          ok: !chance(0.15),
          updated: addDays(TODAY, -rand(0, 9)),
        },
        level,
        gender,
        typeLabel: `${TYPE_LABEL[level]}, ${gender.toLowerCase()}`,
        headName: personName(gender === "Girls" ? "F" : "M"),
        phoneMasked: `03••-•••${rand(1000, 9899)}`,
      });
    }
  }
  // Fix a few well-known names from the brief so they appear exactly.
  const fixed: [number, string, SchoolLevel, Gender, string][] = [
    [0, "GHSS No. 1 Bannu City", "Higher Secondary", "Boys", "Bannu City"],
    [2, "GPS Mandan No. 2", "Primary", "Boys", "Mandan"],
    [3, "GGHS Hawaid", "High", "Girls", "Hawaid"],
    [40, "GGMS Jani Khel", "Middle", "Girls", "Jani Khel"],
    [42, "GHS Ghoriwala", "High", "Boys", "Ghoriwala"],
  ];
  for (const [idx, name, level, gender, village] of fixed) {
    const s = schools[idx];
    if (!s) continue;
    s.name = name;
    s.level = level;
    s.gender = gender;
    s.village = village;
    s.typeLabel = `${TYPE_LABEL[level]}, ${gender.toLowerCase()}`;
  }
  // SCH102 and SCH114 are SMS examples referenced in the brief.
  const s102 = schools[1];
  if (s102) {
    s102.channel = "sms";
    s102.rosterVersion = "RV04";
  }
  const s114 = schools[13];
  if (s114) s114.rosterVersion = "RV04";
}

const HEALTH_PLAN: { name: string; type: HealthType; tehsil: Tehsil; village: string }[] = [
  { name: "DHQ Teaching Hospital Bannu", type: "DHQ", tehsil: "Bannu", village: "Bannu City" },
  { name: "Women & Children Hospital Bannu", type: "WCH", tehsil: "Bannu", village: "Township" },
  { name: "RHC Domel", type: "RHC", tehsil: "Domel", village: "Domel" },
  { name: "RHC Kakki", type: "RHC", tehsil: "Kakki", village: "Kakki" },
  { name: "RHC Miryan", type: "RHC", tehsil: "Miryan", village: "Miryan" },
  { name: "RHC Baka Khel", type: "RHC", tehsil: "Baka Khel", village: "Baka Khel" },
  { name: "BHU Mandan", type: "BHU", tehsil: "Bannu", village: "Mandan" },
  { name: "BHU Hawaid", type: "BHU", tehsil: "Bannu", village: "Hawaid" },
  { name: "BHU Sokari", type: "BHU", tehsil: "Domel", village: "Sokari" },
  { name: "BHU Mamash Khel", type: "BHU", tehsil: "Kakki", village: "Mamash Khel" },
  { name: "BHU Bazar Ahmad Khan", type: "BHU", tehsil: "Miryan", village: "Bazar Ahmad Khan" },
  { name: "BHU Jani Khel", type: "BHU", tehsil: "Baka Khel", village: "Jani Khel" },
  { name: "BHU Ghoriwala", type: "BHU", tehsil: "Wazir", village: "Ghoriwala" },
  { name: "BHU Township", type: "BHU", tehsil: "Bannu", village: "Township" },
];
const HEALTH_TYPE_LABEL: Record<HealthType, string> = {
  DHQ: "District headquarters hospital",
  WCH: "Women and children hospital",
  RHC: "Rural health centre",
  BHU: "Basic health unit",
};

const healthFacilities: Facility[] = HEALTH_PLAN.map((h, i) => {
  const code = `HF${201 + i}`;
  const [lat, lng] = coordsFor(h.tehsil);
  return {
    id: code,
    code,
    name: h.name,
    kind: "health",
    department: "Health",
    tehsil: h.tehsil,
    village: h.village,
    lat,
    lng,
    coordsVerified: h.type !== "BHU" || chance(0.6),
    channel: h.type === "BHU" && chance(0.55) ? "sms" : "app",
    rosterVersion: `RV0${rand(2, 6)}`,
    infra: infraFlags(0.12),
    equipment: {
      label: h.type === "BHU" ? "Vaccine fridge" : "Generator",
      ok: !chance(0.22),
      updated: addDays(TODAY, -rand(0, 8)),
    },
    healthType: h.type,
    typeLabel: HEALTH_TYPE_LABEL[h.type],
    headName: personName("M"),
    phoneMasked: `03••-•••${rand(1000, 9899)}`,
  };
});
{
  const rhcKakki = healthFacilities[3];
  if (rhcKakki)
    rhcKakki.infra.electricity = { ok: false, updated: TODAY, note: "Feeder tripped since 06:10" };
  const hf203 = healthFacilities[2];
  if (hf203) hf203.channel = "app";
}

export const facilities: Facility[] = [...schools, ...healthFacilities];
export const facilityById: Record<string, Facility> = Object.fromEntries(
  facilities.map((f) => [f.id, f]),
);
export { schools, healthFacilities };

// ---------- Staff ----------
const BPS: Record<Designation, number> = {
  Headmaster: 17,
  Headmistress: 17,
  SST: 16,
  PST: 14,
  CT: 15,
  AT: 15,
  TT: 15,
  DM: 15,
  PET: 15,
  "Naib Qasid": 3,
  Chowkidar: 2,
  "Medical Officer": 17,
  "Women Medical Officer": 17,
  "Charge Nurse": 16,
  LHV: 12,
  Dispenser: 9,
  Pharmacist: 17,
  "Lab Technician": 12,
  "Ward Orderly": 3,
};

function schoolPostPlan(level: SchoolLevel): Partial<Record<SchoolDesignation, number>> {
  switch (level) {
    case "Primary":
      return { PST: rand(3, 5), CT: rand(0, 1), "Naib Qasid": 1, Chowkidar: 1 };
    case "Middle":
      return {
        SST: rand(1, 2),
        PST: rand(3, 4),
        CT: rand(1, 2),
        AT: 1,
        TT: 1,
        DM: rand(0, 1),
        "Naib Qasid": 1,
        Chowkidar: 1,
      };
    case "High":
      return {
        SST: rand(3, 4),
        PST: rand(2, 3),
        CT: rand(2, 3),
        AT: 1,
        TT: 1,
        DM: 1,
        PET: 1,
        "Naib Qasid": rand(1, 2),
        Chowkidar: 1,
      };
    case "Higher Secondary":
      return {
        SST: rand(5, 6),
        PST: rand(2, 3),
        CT: rand(3, 4),
        AT: 1,
        TT: rand(1, 2),
        DM: 1,
        PET: 1,
        "Naib Qasid": 2,
        Chowkidar: 1,
      };
  }
}
function healthPostPlan(t: HealthType): Partial<Record<HealthDesignation, number>> {
  switch (t) {
    case "DHQ":
      return {
        "Medical Officer": 22,
        "Women Medical Officer": 10,
        "Charge Nurse": 38,
        LHV: 6,
        Dispenser: 12,
        Pharmacist: 5,
        "Lab Technician": 11,
        "Ward Orderly": 36,
      };
    case "WCH":
      return {
        "Medical Officer": 8,
        "Women Medical Officer": 12,
        "Charge Nurse": 22,
        LHV: 8,
        Dispenser: 5,
        Pharmacist: 3,
        "Lab Technician": 5,
        "Ward Orderly": 16,
      };
    case "RHC":
      return {
        "Medical Officer": rand(3, 4),
        "Women Medical Officer": rand(1, 2),
        "Charge Nurse": rand(6, 8),
        LHV: 2,
        Dispenser: rand(3, 4),
        Pharmacist: 1,
        "Lab Technician": 2,
        "Ward Orderly": rand(6, 8),
      };
    case "BHU":
      return {
        "Medical Officer": 1,
        LHV: 1,
        Dispenser: rand(2, 3),
        "Charge Nurse": rand(2, 3),
        "Lab Technician": 1,
        "Ward Orderly": rand(4, 6),
        "Women Medical Officer": chance(0.4) ? 1 : 0,
      };
  }
}

export interface PostLine {
  facilityId: string;
  designation: Designation;
  sanctioned: number;
  filled: number;
}

export const staff: Staff[] = [];
export const posts: PostLine[] = [];
{
  let sid = 1;
  for (const f of facilities) {
    let tcode = 101;
    const plan: Partial<Record<Designation, number>> =
      f.kind === "school"
        ? { [f.gender === "Girls" ? "Headmistress" : "Headmaster"]: 1, ...schoolPostPlan(f.level!) }
        : healthPostPlan(f.healthType!);
    for (const [desig, sanctionedRaw] of Object.entries(plan) as [Designation, number][]) {
      if (!sanctionedRaw) continue;
      const sanctioned = sanctionedRaw;
      const vacancyRate = f.kind === "health" ? 0.13 : 0.09;
      let filled = sanctioned;
      for (let i = 0; i < sanctioned; i++) if (chance(vacancyRate)) filled--;
      if (desig === "Headmaster" || desig === "Headmistress") filled = chance(0.9) ? 1 : 0;
      posts.push({ facilityId: f.id, designation: desig, sanctioned, filled });
      for (let i = 0; i < filled; i++) {
        let gender: "M" | "F";
        if (f.kind === "school") gender = f.gender === "Girls" ? "F" : "M";
        else if (desig === "Women Medical Officer" || desig === "LHV") gender = "F";
        else if (desig === "Charge Nurse") gender = chance(0.7) ? "F" : "M";
        else gender = chance(0.2) ? "F" : "M";
        const name = personName(gender);
        const shiftEligibility: Staff["shiftEligibility"] =
          f.kind === "school"
            ? ["Day"]
            : (shuffle(["M", "E", "N"] as ShiftKey[]).slice(
                0,
                desig === "Medical Officer" || desig === "Charge Nurse" || desig === "Ward Orderly"
                  ? 3
                  : rand(1, 2),
              ) as ShiftKey[]);
        staff.push({
          id: `ST${String(sid++).padStart(4, "0")}`,
          code: `T${tcode++}`,
          name,
          initials: initialsOf(name),
          gender,
          personalNoMasked: masked(),
          designation: desig,
          bps: BPS[desig],
          facilityId: f.id,
          employment: chance(0.78) ? "Regular" : "Contract",
          shiftEligibility,
          onRosterSince: addDays(TODAY, -rand(60, 3400)),
        });
      }
    }
  }
}
export const staffById: Record<string, Staff> = Object.fromEntries(staff.map((s) => [s.id, s]));
export const staffByFacility: Record<string, Staff[]> = {};
for (const s of staff) (staffByFacility[s.facilityId] ??= []).push(s);

// ---------- Today's reports ----------
const STATUS_POOL: ReportStatus[] = [
  ...Array<ReportStatus>(25).fill("verified"),
  ...Array<ReportStatus>(8).fill("pending"),
  ...Array<ReportStatus>(8).fill("received"),
  ...Array<ReportStatus>(4).fill("sent"),
  ...Array<ReportStatus>(3).fill("rejected"),
  ...Array<ReportStatus>(2).fill("draft"),
  ...Array<ReportStatus>(12).fill("none"),
];
const statusAssignment = shuffle(STATUS_POOL);
// Keep the brief's named examples readable.
{
  const idx = (code: string) => facilities.findIndex((f) => f.code === code);
  const swap = (code: string, st: ReportStatus) => {
    const i = idx(code);
    const j = statusAssignment.findIndex((s, k) => s === st && k !== i);
    if (i < 0 || j < 0) return;
    [statusAssignment[i], statusAssignment[j]] = [
      statusAssignment[j] as ReportStatus,
      statusAssignment[i] as ReportStatus,
    ];
  };
  swap("SCH102", "rejected");
  swap("SCH114", "verified");
  swap("HF203", "pending");
  swap("HF201", "verified");
}

function sessionFor(_f: Facility): ShiftKey {
  return "M";
}

function buildLifecycle(r: Omit<Report, "lifecycle">): LifecycleStep[] {
  const accepted = r.status === "received" || r.status === "pending" || r.status === "verified";
  const delivered = r.sentAt != null ? r.sentAt + (r.channel === "sms" ? 1 : 0) : null;
  return [
    { label: "Saved on phone", at: r.observedAt != null ? r.observedAt + 2 : null },
    { label: "Sent", at: r.sentAt },
    {
      label: r.channel === "sms" ? "Delivered to SMS provider" : "Uploaded over mobile data",
      at: r.status === "draft" ? null : delivered,
    },
    { label: "Accepted by district server", at: accepted ? r.receivedAt : null },
    {
      label: "Acknowledgement sent",
      at: accepted && r.receivedAt != null ? r.receivedAt + 1 : null,
    },
  ];
}

export function smsPayloadFor(opts: {
  type: "A1" | "H1";
  code: string;
  session: ShiftKey;
  roster: string;
  seq: number;
  absent: string[];
  leave: string[];
  full: boolean;
}) {
  const parts = [
    opts.type,
    opts.code,
    TODAY_COMPACT,
    opts.session,
    opts.roster,
    `R${String(opts.seq).padStart(3, "0")}`,
  ];
  if (opts.absent.length) parts.push(`A:${opts.absent.join(",")}`);
  if (opts.leave.length) parts.push(`L:${opts.leave.join(",")}`);
  parts.push(`C:${opts.full ? 1 : 0}`);
  return parts.join("|");
}

// School day data (before reports so SMS payloads can cite absent staff codes)
const CLASS_SETS: Record<SchoolLevel, string[]> = {
  Primary: ["Katchi", "Class 1", "Class 2", "Class 3", "Class 4", "Class 5"],
  Middle: [
    "Katchi",
    "Class 1",
    "Class 2",
    "Class 3",
    "Class 4",
    "Class 5",
    "Class 6",
    "Class 7",
    "Class 8",
  ],
  High: [
    "Katchi",
    "Class 1",
    "Class 2",
    "Class 3",
    "Class 4",
    "Class 5",
    "Class 6",
    "Class 7",
    "Class 8",
    "Class 9",
    "Class 10",
  ],
  "Higher Secondary": ["Class 6", "Class 7", "Class 8", "Class 9", "Class 10"],
};

export const schoolDays: Record<string, SchoolDay> = {};
const IMPLAUSIBLE_SCHOOLS = new Set<string>();
for (const f of schools) {
  const st: Record<string, SchoolStaffStatus> = {};
  for (const s of staffByFacility[f.id] ?? []) {
    const r = rng();
    st[s.id] =
      r < 0.875 ? "Present" : r < 0.925 ? "Absent" : r < 0.98 ? "Approved leave" : "Official duty";
  }
  const classes: ClassRow[] = CLASS_SETS[f.level!].map((c) => {
    const big = c === "Katchi" || c === "Class 1";
    const eb =
      f.gender === "Boys"
        ? rand(big ? 34 : 22, big ? 58 : 46)
        : c.startsWith("Class") && Number(c.split(" ")[1]) <= 5
          ? rand(0, 4)
          : 0;
    const eg =
      f.gender === "Girls"
        ? rand(big ? 30 : 18, big ? 52 : 42)
        : Number(c.split(" ")[1] ?? 0) <= 3
          ? rand(0, 6)
          : 0;
    const pr = () => 0.78 + rng() * 0.16;
    return {
      className: c,
      enrolledBoys: eb,
      enrolledGirls: eg,
      presentBoys: Math.round(eb * pr()),
      presentGirls: Math.round(eg * pr()),
    };
  });
  schoolDays[f.id] = { facilityId: f.id, staffStatus: st, classes };
}
// Inject implausible class totals (present exceeds enrolled) for review items.
for (const code of ["SCH109", "SCH127", "SCH138"]) {
  const d = schoolDays[code];
  const row = d?.classes[2];
  if (d && row) {
    if (row.enrolledBoys >= row.enrolledGirls) row.presentBoys = row.enrolledBoys + rand(3, 9);
    else row.presentGirls = row.enrolledGirls + rand(3, 9);
    IMPLAUSIBLE_SCHOOLS.add(code);
  }
}

export const reports: Report[] = [];
export const reportByFacility: Record<string, Report> = {};
facilities.forEach((f, i) => {
  let status = statusAssignment[i] ?? "none";
  if (
    IMPLAUSIBLE_SCHOOLS.has(f.id) &&
    (status === "verified" || status === "none" || status === "draft")
  )
    status = "pending";
  if (status === "none") return;
  const isSchool = f.kind === "school";
  const observedAt = isSchool ? rand(8 * 60 + 5, 9 * 60 + 35) : rand(8 * 60 + 20, 10 * 60 + 15);
  const sentAt = status === "draft" ? null : observedAt + rand(3, 14);
  const receivedAt =
    sentAt == null || status === "sent"
      ? null
      : Math.min(NOW_MIN - 2, sentAt + (f.channel === "sms" ? rand(1, 19) : rand(1, 5)));
  const verifiedAt =
    status === "verified" && receivedAt != null
      ? Math.min(NOW_MIN - 3, receivedAt + rand(24, 95))
      : null;
  const seq = rand(4, 29);
  const staffList = staffByFacility[f.id] ?? [];
  const day = schoolDays[f.id];
  const absent = isSchool
    ? staffList.filter((s) => day?.staffStatus[s.id] === "Absent").map((s) => s.code)
    : [];
  const leave = isSchool
    ? staffList.filter((s) => day?.staffStatus[s.id] === "Approved leave").map((s) => s.code)
    : [];
  let rosterVersion = f.rosterVersion;
  let segments = { received: 1, total: 1 };
  let registered = true;
  let rejectionReason: string | undefined;
  if (status === "rejected") {
    const rejectedKinds = ["roster", "sender", "multipart"] as const;
    const kind = rejectedKinds[reports.filter((r) => r.status === "rejected").length % 3];
    if (f.id === "SCH102" || kind === "roster") {
      f.rosterVersion = "RV04";
      rosterVersion = "RV03";
      rejectionReason = "Roster version mismatch: RV03 received, RV04 is current";
    } else if (kind === "sender") {
      registered = false;
      rejectionReason = "Sent from an unregistered number";
    } else {
      segments = { received: 1, total: 2 };
      rejectionReason = "Incomplete multipart SMS: 1 of 2 segments received";
    }
  }
  const channel: Channel = status === "rejected" ? "sms" : f.channel;
  if (status === "rejected") f.channel = "sms";
  const smsPayload =
    channel === "sms"
      ? smsPayloadFor({
          type: isSchool ? "A1" : "H1",
          code: f.code,
          session: sessionFor(f),
          roster: rosterVersion,
          seq,
          absent,
          leave,
          full: segments.received === segments.total,
        })
      : null;
  const base: Omit<Report, "lifecycle"> = {
    id: `RPT-${f.code}-${TODAY_COMPACT}-${String(seq).padStart(3, "0")}`,
    facilityId: f.id,
    type: isSchool ? "A1" : "H1",
    session: sessionFor(f),
    channel,
    rosterVersion,
    sequence: seq,
    segments,
    status,
    observedAt,
    sentAt,
    receivedAt,
    verifiedAt,
    smsPayload,
    sender: { registered, masked: f.phoneMasked },
    totalsPlausible: !IMPLAUSIBLE_SCHOOLS.has(f.id),
    ...(rejectionReason ? { rejectionReason } : {}),
  };
  const report: Report = { ...base, lifecycle: buildLifecycle(base) };
  reports.push(report);
  reportByFacility[f.id] = report;
});

export function statusOf(facilityId: string): ReportStatus {
  return reportByFacility[facilityId]?.status ?? "none";
}
export const isReported = (s: ReportStatus) =>
  s === "received" || s === "pending" || s === "verified" || s === "rejected";
export const isAccepted = (s: ReportStatus) =>
  s === "received" || s === "pending" || s === "verified";

// ---------- Health shifts ----------
function minimums(t: HealthType, k: ShiftKey): Partial<Record<HealthDesignation, number>> {
  const night = k === "N";
  const eve = k === "E";
  switch (t) {
    case "DHQ":
      return night
        ? {
            "Medical Officer": 3,
            "Women Medical Officer": 1,
            "Charge Nurse": 6,
            Dispenser: 1,
            Pharmacist: 1,
            "Lab Technician": 1,
            "Ward Orderly": 5,
          }
        : eve
          ? {
              "Medical Officer": 4,
              "Women Medical Officer": 2,
              "Charge Nurse": 7,
              Dispenser: 2,
              Pharmacist: 1,
              "Lab Technician": 2,
              "Ward Orderly": 6,
            }
          : {
              "Medical Officer": 7,
              "Women Medical Officer": 3,
              "Charge Nurse": 10,
              LHV: 2,
              Dispenser: 3,
              Pharmacist: 2,
              "Lab Technician": 3,
              "Ward Orderly": 9,
            };
    case "WCH":
      return night
        ? {
            "Medical Officer": 1,
            "Women Medical Officer": 2,
            "Charge Nurse": 4,
            LHV: 1,
            "Ward Orderly": 3,
          }
        : eve
          ? {
              "Medical Officer": 2,
              "Women Medical Officer": 2,
              "Charge Nurse": 5,
              LHV: 2,
              "Ward Orderly": 4,
            }
          : {
              "Medical Officer": 3,
              "Women Medical Officer": 4,
              "Charge Nurse": 7,
              LHV: 3,
              Dispenser: 2,
              Pharmacist: 1,
              "Lab Technician": 2,
              "Ward Orderly": 5,
            };
    case "RHC":
      return night
        ? { "Medical Officer": 1, "Charge Nurse": 2, "Ward Orderly": 2 }
        : eve
          ? { "Medical Officer": 1, "Charge Nurse": 2, Dispenser: 1, "Ward Orderly": 2 }
          : {
              "Medical Officer": 2,
              "Women Medical Officer": 1,
              "Charge Nurse": 3,
              LHV: 1,
              Dispenser: 2,
              "Lab Technician": 1,
              "Ward Orderly": 2,
            };
    case "BHU":
      return night
        ? { "Charge Nurse": 1, "Ward Orderly": 1 }
        : eve
          ? { Dispenser: 1, "Charge Nurse": 1, "Ward Orderly": 1 }
          : { "Medical Officer": 1, LHV: 1, Dispenser: 1, "Charge Nurse": 1, "Ward Orderly": 1 };
  }
}

const FAULTS = [
  "Autoclave not reaching temperature",
  "Generator fuel below one quarter",
  "Ward 3 ceiling fan not working",
  "X-ray film processor jammed",
  "Water pump motor tripping",
  "Oxygen concentrator alarm in emergency",
];
const STOCKOUTS = [
  "ORS sachets",
  "Paracetamol syrup",
  "IV cannula 22G",
  "Ringer lactate",
  "Amoxicillin 250mg",
  "Gloves, size M",
  "Tetanus toxoid",
];
const INTERRUPTIONS = [
  "Power cut 02:10 to 03:25, generator covered emergency",
  "Lab closed 23:00 to 06:00, no technician",
  "Ambulance at Peshawar referral since 21:40",
];

export const shifts: Shift[] = [];
export const shiftsByFacility: Record<string, Record<ShiftKey, Shift>> = {};
for (const f of healthFacilities) {
  const t = f.healthType!;
  const list = staffByFacility[f.id] ?? [];
  const map = {} as Record<ShiftKey, Shift>;
  const used = new Set<string>();
  for (const k of ["M", "N", "E"] as ShiftKey[]) {
    const date = k === "N" ? addDays(TODAY, -1) : TODAY;
    const startMin = k === "M" ? 8 * 60 : k === "E" ? 14 * 60 : 20 * 60;
    const endMin = k === "M" ? 14 * 60 : k === "E" ? 20 * 60 : 8 * 60;
    const phase: Shift["phase"] = k === "N" ? "completed" : k === "M" ? "in progress" : "upcoming";
    const rangeLabel =
      k === "N"
        ? `${formatShortDate(date)} 20:00 to ${formatShortDate(TODAY)} 08:00`
        : `${formatShortDate(date)} ${hhmm(startMin)} to ${hhmm(endMin)}`;
    const required = minimums(t, k);
    const assignments: ShiftAssignment[] = [];
    for (const [role, min] of Object.entries(required) as [HealthDesignation, number][]) {
      // Prefer staff eligible for this shift, then fall back to anyone of the role not yet rostered.
      const eligible = list.filter(
        (s) =>
          s.designation === role && !used.has(s.id) && (s.shiftEligibility as string[]).includes(k),
      );
      const others = list.filter(
        (s) => s.designation === role && !used.has(s.id) && !eligible.includes(s),
      );
      const pool = [...eligible, ...others];
      const want = Math.min(pool.length, min + (chance(0.7) ? 1 : 0));
      for (let i = 0; i < want; i++) {
        const s = pool[i]!;
        used.add(s.id);
        let status: ShiftStaffStatus;
        if (phase === "upcoming") status = "Present";
        else {
          const r = rng();
          status =
            r < 0.82
              ? "Present"
              : r < 0.88
                ? "Late"
                : r < 0.93
                  ? "Absent"
                  : r < 0.97
                    ? "Leave"
                    : "On-call";
        }
        assignments.push({
          staffId: s.id,
          role,
          status,
          ...(status === "Late" ? { note: `Arrived ${hhmm(startMin + rand(12, 48))}` } : {}),
        });
      }
    }
    // Replacements cover some absences
    for (const a of assignments.filter((x) => x.status === "Absent" || x.status === "Leave")) {
      const sub = list.find((s) => s.designation === a.role && !used.has(s.id));
      if (sub && chance(0.75)) {
        used.add(sub.id);
        assignments.push({
          staffId: sub.id,
          role: a.role,
          status: "Replacement",
          replacesStaffId: a.staffId,
        });
      }
    }
    // Most shifts are covered: where a role is short only because of an absence, the in-charge
    // usually calls someone in. Shifts short because of vacancies stay short.
    if (phase !== "upcoming" && chance(0.6)) {
      for (const [role, min] of Object.entries(required) as [HealthDesignation, number][]) {
        let onSite = assignments.filter(
          (a) =>
            a.role === role &&
            (a.status === "Present" || a.status === "Late" || a.status === "Replacement"),
        ).length;
        for (const a of assignments) {
          if (onSite >= min) break;
          if (
            a.role === role &&
            (a.status === "Absent" || a.status === "Leave" || a.status === "On-call")
          ) {
            a.status = "Late";
            a.note = `Called in, arrived ${hhmm(startMin + rand(20, 70))}`;
            onSite++;
          }
        }
      }
    }
    // One off-duty entry for context
    const off = list.find((s) => !used.has(s.id));
    if (off && phase !== "upcoming") {
      used.add(off.id);
      assignments.push({
        staffId: off.id,
        role: off.designation as HealthDesignation,
        status: "Off-duty",
        note: "Rest day after night duty",
      });
    }
    if (phase === "upcoming") for (const a of assignments) a.status = "Present";
    const bedsTotal = t === "DHQ" ? 220 : t === "WCH" ? 120 : t === "RHC" ? 20 : 6;
    const services: Partial<Record<Service, boolean>> = {};
    const avail: Service[] =
      t === "BHU"
        ? ["Lab", "Delivery room"]
        : t === "RHC"
          ? ["Lab", "X-ray", "Ambulance", "Oxygen", "Delivery room"]
          : [...SERVICES];
    for (const s of avail) services[s] = !chance(0.13);
    const faults = chance(0.45) ? [pick(FAULTS)] : [];
    const stockOuts = chance(0.5) ? shuffle(STOCKOUTS).slice(0, rand(1, 2)) : [];
    const interruptions = k === "N" && chance(0.4) ? [pick(INTERRUPTIONS)] : [];
    const ack =
      phase === "completed" ? (chance(0.8) ? startMin + 12 * 60 + rand(2, 25) : null) : null;
    const shift: Shift = {
      id: `SH-${f.code}-${date.replaceAll("-", "")}-${k}`,
      facilityId: f.id,
      key: k,
      date,
      startMin,
      endMin,
      rangeLabel,
      phase,
      required,
      assignments,
      opd:
        k === "E"
          ? null
          : k === "N"
            ? null
            : t === "DHQ"
              ? rand(780, 1240)
              : t === "WCH"
                ? rand(310, 520)
                : t === "RHC"
                  ? rand(90, 210)
                  : rand(24, 78),
      bedsAvailable: Math.round(bedsTotal * (0.08 + rng() * 0.3)),
      bedsTotal,
      services,
      handover: {
        faults,
        stockOuts,
        interruptions,
        acknowledgedAt: ack,
        acknowledgedBy: ack != null ? personName("F") : null,
      },
    };
    if (f.code === "HF204" && k === "M") {
      shift.services.Oxygen = false;
      shift.handover.faults = [
        "Oxygen cylinders empty, refill vehicle delayed",
        ...shift.handover.faults,
      ];
    }
    map[k] = shift;
    shifts.push(shift);
  }
  shiftsByFacility[f.id] = map;
}

export const ON_SITE: ShiftStaffStatus[] = ["Present", "Late", "Replacement"];
export function shiftCoverage(s: Shift) {
  const required = Object.values(s.required).reduce((a, b) => a + (b ?? 0), 0);
  const onSite = s.assignments.filter(
    (a) => ON_SITE.includes(a.status) && a.role in s.required,
  ).length;
  const byRole = (Object.entries(s.required) as [HealthDesignation, number][]).map(
    ([role, min]) => {
      const rostered = s.assignments.filter(
        (a) => a.role === role && a.status !== "Replacement" && a.status !== "Off-duty",
      ).length;
      const actual = s.assignments.filter(
        (a) => a.role === role && ON_SITE.includes(a.status),
      ).length;
      return { role, min, rostered, actual, short: Math.max(0, min - actual) };
    },
  );
  const covered = byRole.reduce((acc, r) => acc + Math.min(r.min, r.actual), 0);
  return { required, onSite, covered, byRole, belowMinimum: byRole.some((r) => r.short > 0) };
}
export function currentShift(facilityId: string): Shift | undefined {
  return shiftsByFacility[facilityId]?.M;
}

// ---------- Today's staff status ----------
export function todayStatus(s: Staff, reportStatus?: ReportStatus): TodayStaffStatus {
  const f = facilityById[s.facilityId];
  if (!f) return "Not reported";
  if (f.kind === "school") {
    if (!isAccepted(reportStatus ?? statusOf(f.id))) return "Not reported";
    return schoolDays[f.id]?.staffStatus[s.id] ?? "Not reported";
  }
  const m = shiftsByFacility[f.id]?.M;
  const a = m?.assignments.find((x) => x.staffId === s.id);
  if (a) return a.status;
  const e = shiftsByFacility[f.id]?.E?.assignments.find((x) => x.staffId === s.id);
  if (e) return "Scheduled";
  return "Off-duty";
}

// ---------- 14-day submission history per facility ----------
export function submissionHistory(facilityId: string): { date: string; status: ReportStatus }[] {
  const r = mulberry32(hashString(facilityId) ^ 2311);
  const out: { date: string; status: ReportStatus }[] = [];
  const f = facilityById[facilityId];
  for (let d = 13; d >= 0; d--) {
    const date = addDays(TODAY, -d);
    if (d === 0) {
      out.push({ date, status: statusOf(facilityId) });
      continue;
    }
    const wd = weekday(date);
    if (f?.kind === "school" && (wd === 0 || wd === 6)) {
      out.push({ date, status: "draft" });
      continue;
    }
    const x = r();
    out.push({
      date,
      status: x < 0.8 ? "verified" : x < 0.86 ? "pending" : x < 0.9 ? "rejected" : "none",
    });
  }
  return out;
}
export const isSchoolWorkday = (date: string) => {
  const w = weekday(date);
  return w !== 0 && w !== 6;
};

// ---------- 30-day staff attendance ----------
export type DayMark =
  | "Present"
  | "Late"
  | "Absent"
  | "Approved leave"
  | "Official duty"
  | "Off"
  | "Holiday"
  | "Not reported";
export function staffHistory(
  staffId: string,
  days = 62,
  reportStatus?: ReportStatus,
  currentStatus?: TodayStaffStatus,
): { date: string; mark: DayMark }[] {
  const s = staffById[staffId];
  const r = mulberry32(hashString(staffId) ^ 0x2311);
  const out: { date: string; mark: DayMark }[] = [];
  const reliability = 0.86 + r() * 0.12;
  for (let d = Math.max(62, days) - 1; d >= 0; d--) {
    const date = addDays(TODAY, -d);
    const wd = weekday(date);
    const isSchool = s && facilityById[s.facilityId]?.kind === "school";
    if (isSchool ? wd === 0 || wd === 6 : wd === 0 && r() < 0.6) {
      out.push({ date, mark: "Off" });
      continue;
    }
    if (d === 0 && s) {
      const t = currentStatus ?? todayStatus(s, reportStatus);
      const mark: DayMark =
        t === "Present" || t === "Replacement"
          ? "Present"
          : t === "Late"
            ? "Late"
            : t === "Absent"
              ? "Absent"
              : t === "Approved leave" || t === "Leave"
                ? "Approved leave"
                : t === "Official duty"
                  ? "Official duty"
                  : t === "Not reported"
                    ? "Not reported"
                    : "Off";
      out.push({ date, mark });
      continue;
    }
    const x = r();
    out.push({
      date,
      mark:
        x < reliability
          ? r() < 0.08
            ? "Late"
            : "Present"
          : x < reliability + 0.04
            ? "Approved leave"
            : x < reliability + 0.06
              ? "Official duty"
              : "Absent",
    });
  }
  return out.slice(-days);
}

// ---------- District attendance trend (last 14 days) ----------
export const attendanceTrend: {
  date: string;
  label: string;
  schools: number | null;
  health: number | null;
}[] = (() => {
  const r = mulberry32(2311 * 7);
  const out = [];
  for (let d = 13; d >= 0; d--) {
    const date = addDays(TODAY, -d);
    const wd = weekday(date);
    const schoolDay = wd !== 0 && wd !== 6;
    out.push({
      date,
      label: formatShortDate(date),
      schools: schoolDay ? +(86 + r() * 6).toFixed(1) : null,
      health: +(82 + r() * 8).toFixed(1),
    });
  }
  return out;
})();

// ---------- Scoped attendance trend ----------
/** Attendance history rolled up from the same employee records used by detail pages. */
export function attendanceTrendFor(
  scope: Facility[],
  reportStatus?: (id: string) => ReportStatus,
  staffStatus?: (staff: Staff) => TodayStaffStatus,
) {
  const dates = attendanceTrend.map(({ date, label }) => ({
    date,
    label,
    schoolPresent: 0,
    schoolTotal: 0,
    healthPresent: 0,
    healthTotal: 0,
  }));
  const byDate = new Map(dates.map((day) => [day.date, day]));
  for (const facility of scope) {
    for (const employee of staffByFacility[facility.id] ?? []) {
      for (const day of staffHistory(
        employee.id,
        62,
        reportStatus?.(facility.id),
        staffStatus?.(employee),
      )) {
        const total = byDate.get(day.date);
        if (!total || day.mark === "Off" || day.mark === "Holiday" || day.mark === "Not reported")
          continue;
        const attended = day.mark === "Present" || day.mark === "Late";
        if (facility.kind === "school") {
          total.schoolTotal++;
          if (attended) total.schoolPresent++;
        } else {
          total.healthTotal++;
          if (attended) total.healthPresent++;
        }
      }
    }
  }
  return dates.map((day) => ({
    date: day.date,
    label: day.label,
    schools: day.schoolTotal
      ? Number(((100 * day.schoolPresent) / day.schoolTotal).toFixed(1))
      : null,
    health: day.healthTotal
      ? Number(((100 * day.healthPresent) / day.healthTotal).toFixed(1))
      : null,
  }));
}

// ---------- Review items ----------
export const OFFICERS = [
  "Hamid Khattak, education inspector",
  "Saima Bangash, education inspector",
  "Dr. Irfan Marwat, health inspector",
  "Dr. Nazia Wazir, health inspector",
  "Liaqat Ali, AC office Domel",
  "Murad Khan, district monitoring officer",
];
const OWNERS_EDU = ["DEO office", "Hamid Khattak", "Saima Bangash"];
const OWNERS_HEALTH = ["DHO office", "Dr. Irfan Marwat", "Dr. Nazia Wazir"];

export const reviewItems: ReviewItem[] = (() => {
  const items: ReviewItem[] = [];
  let n = 1001;
  const add = (
    it: Omit<ReviewItem, "id" | "owner" | "status" | "timeline"> &
      Partial<Pick<ReviewItem, "owner" | "status" | "timeline">>,
  ) => {
    const f = facilityById[it.facilityId]!;
    const owner = it.owner ?? pick(f.kind === "school" ? OWNERS_EDU : OWNERS_HEALTH);
    const status = it.status ?? (chance(0.62) ? "Open" : chance(0.6) ? "In review" : "Closed");
    const created = `${formatShortDate(it.createdDate)} ${hhmm(it.createdMin)}`;
    const timeline: ReviewEvent[] = it.timeline ?? [
      { at: created, text: "Flagged automatically", by: "DCMS rules" },
    ];
    if (!it.timeline && status !== "Open")
      timeline.push({
        at: `${formatShortDate(TODAY)} ${hhmm(Math.min(NOW_MIN - 5, it.createdMin + rand(10, 60)))}`,
        text: `Picked up by ${owner}`,
        by: owner,
      });
    if (!it.timeline && status === "Closed")
      timeline.push({
        at: `${formatShortDate(TODAY)} ${hhmm(NOW_MIN - rand(2, 20))}`,
        text: "Closed: facility sent a corrected report",
        by: owner,
      });
    items.push({ ...it, id: `RV-${n++}`, owner, status, timeline });
  };

  const noReport = facilities.filter((f) => statusOf(f.id) === "none").slice(0, 8);
  for (const f of noReport) {
    add({
      type: "No report by 10:00",
      severity: f.kind === "health" ? "High" : "Medium",
      facilityId: f.id,
      createdDate: TODAY,
      createdMin: 10 * 60,
      detected: `No ${f.kind === "school" ? "school day" : "morning shift"} report had reached the district server by 10:00.`,
      why: `${f.name} usually reports by ${f.kind === "school" ? "08:40" : "09:15"}. The facility may have no signal, or the report may be saved on the phone and not yet sent.`,
      evidence: [
        {
          label: "Last report received",
          value: `${formatShortDate(addDays(TODAY, -1))} ${hhmm(rand(8 * 60 + 10, 9 * 60 + 20))}`,
        },
        {
          label: "Reporting channel",
          value: f.channel === "sms" ? "SMS only" : "App with internet",
        },
        { label: "Reports in the last 14 days", value: `${rand(8, 10)} of 10 working days` },
      ],
      status: "Open",
    });
  }
  for (const code of IMPLAUSIBLE_SCHOOLS) {
    const d = schoolDays[code]!;
    const row = d.classes.find(
      (c) => c.presentBoys > c.enrolledBoys || c.presentGirls > c.enrolledGirls,
    )!;
    const boys = row.presentBoys > row.enrolledBoys;
    add({
      type: "Implausible totals",
      severity: "Medium",
      facilityId: code,
      createdDate: TODAY,
      createdMin: (reportByFacility[code]?.receivedAt ?? 9 * 60) + 1,
      detected: `${row.className} reports more ${boys ? "boys" : "girls"} present than enrolled.`,
      why: "Present can't be more than enrolled. This is usually a typing slip or an enrolment figure that was not updated after admissions.",
      evidence: [
        {
          label: `${row.className}, ${boys ? "boys" : "girls"} enrolled`,
          value: String(boys ? row.enrolledBoys : row.enrolledGirls),
        },
        {
          label: `${row.className}, ${boys ? "boys" : "girls"} present`,
          value: String(boys ? row.presentBoys : row.presentGirls),
        },
        { label: "Report ID", value: reportByFacility[code]?.id ?? "" },
      ],
    });
  }
  const shortShifts = shifts
    .filter((s) => s.phase !== "upcoming" && shiftCoverage(s).belowMinimum)
    .slice(0, 5);
  for (const s of shortShifts) {
    const cov = shiftCoverage(s);
    const worst = cov.byRole.filter((r) => r.short > 0).sort((a, b) => b.short - a.short)[0]!;
    add({
      type: "Below minimum staffing",
      severity:
        worst.role === "Medical Officer" || worst.role === "Charge Nurse" ? "High" : "Medium",
      facilityId: s.facilityId,
      createdDate: s.date,
      createdMin: s.startMin + 30,
      detected: `${SHIFT_NAMES[s.key]} shift is short by ${worst.short} ${worst.role}${worst.short > 1 ? "s" : ""}.`,
      why: `The minimum for this shift is ${worst.min} ${worst.role}${worst.min > 1 ? "s" : ""}. ${worst.actual} ${worst.actual === 1 ? "is" : "are"} on site after absences, leave and replacements.`,
      evidence: [
        { label: "Shift", value: s.id },
        { label: "On site of required", value: `${cov.covered} of ${cov.required}` },
        { label: `${worst.role}, on site of minimum`, value: `${worst.actual} of ${worst.min}` },
      ],
    });
  }
  for (const r of reports.filter(
    (x) => x.status === "rejected" && x.rosterVersion !== facilityById[x.facilityId]?.rosterVersion,
  )) {
    const f = facilityById[r.facilityId]!;
    add({
      type: "Roster version mismatch",
      severity: "Low",
      facilityId: f.id,
      createdDate: TODAY,
      createdMin: (r.sentAt ?? 9 * 60) + 2,
      detected: r.rejectionReason ?? "SMS report could not be matched to the current roster.",
      why: "The phone may be using an older staff list. The facility should update its roster and resend so absent and leave codes point to the right people.",
      evidence: [
        { label: "Roster in SMS", value: r.rosterVersion },
        { label: "Current roster", value: f.rosterVersion },
        { label: "Raw SMS", value: r.smsPayload ?? "" },
      ],
      status: "Open",
    });
  }
  const staleFacilities = facilities
    .flatMap((f) => INFRA_KEYS.filter((k) => isStale(f.infra[k].updated)).map((k) => ({ f, k })))
    .slice(0, 4);
  for (const { f, k } of staleFacilities) {
    add({
      type: "Stale record",
      severity: "Low",
      facilityId: f.id,
      createdDate: addDays(f.infra[k].updated, 4),
      createdMin: 6 * 60,
      detected: `${INFRA_LABELS[k]} has not been updated for ${daysBetween(f.infra[k].updated, TODAY)} days.`,
      why: "Facility checklist items older than 3 days are marked Stale. A fresh check confirms whether the last known state still holds.",
      evidence: [
        { label: "Last updated", value: formatDate(f.infra[k].updated) },
        { label: "Last known state", value: f.infra[k].ok ? "OK" : "Problem" },
      ],
    });
  }
  add({
    type: "Critical facility issue",
    severity: "Critical",
    facilityId: "HF204",
    createdDate: TODAY,
    createdMin: 8 * 60 + 35,
    detected: "Oxygen service is down in the morning shift.",
    why: "Oxygen is a critical service at a rural health centre. The handover notes say cylinders are empty and the refill vehicle is delayed.",
    evidence: [
      { label: "Service", value: "Oxygen: down" },
      { label: "Shift", value: shiftsByFacility["HF204"]?.M.id ?? "" },
      { label: "Patients referred since 08:00", value: "3" },
    ],
    status: "Open",
    owner: "DHO office",
  });
  add({
    type: "Critical facility issue",
    severity: "Critical",
    facilityId: "HF204",
    createdDate: TODAY,
    createdMin: 6 * 60 + 25,
    detected: "No electricity since 06:10.",
    why: "The feeder tripped and the facility is running on generator. Fuel is the limiting factor for the evening shift.",
    evidence: [
      { label: "Electricity", value: "Problem, updated today" },
      { label: "Generator fuel", value: "About 5 hours left" },
    ],
    status: "In review",
    owner: "Dr. Irfan Marwat",
  });
  add({
    type: "Critical facility issue",
    severity: "Critical",
    facilityId: "HF201",
    createdDate: TODAY,
    createdMin: 9 * 60 + 50,
    detected: "Emergency ward short of Charge Nurses during peak OPD hours.",
    why: "Two Charge Nurses are absent without replacement while OPD has crossed 800 by 11:00.",
    evidence: [
      { label: "OPD so far", value: String(shiftsByFacility["HF201"]?.M.opd ?? 0) },
      {
        label: "Charge Nurses on site",
        value: `${shiftCoverage(shiftsByFacility["HF201"]!.M).byRole.find((r) => r.role === "Charge Nurse")?.actual ?? 0} of 10`,
      },
    ],
    status: "Open",
    owner: "DHO office",
  });
  const inspector: [string, string, string][] = [
    [
      "SCH117",
      "Boundary wall breached on the north side; children leave during break.",
      "Hamid Khattak",
    ],
    [
      "SCH131",
      "Register shows 2 teachers present who were not found in class at 10:20.",
      "Saima Bangash",
    ],
    ["HF209", "Vaccine fridge log not filled for 4 days.", "Dr. Nazia Wazir"],
  ];
  for (const [code, text, who] of inspector) {
    add({
      type: "Inspector finding",
      severity: "Medium",
      facilityId: code,
      createdDate: addDays(TODAY, -1),
      createdMin: 10 * 60 + 20,
      detected: text,
      why: "Recorded during a field visit. A finding is a note for follow-up and is checked against the facility's own report.",
      evidence: [
        { label: "Visit", value: `${formatShortDate(addDays(TODAY, -1))}, 10:05 to 10:50` },
        { label: "Recorded by", value: who },
      ],
      owner: who,
      status: "In review",
      timeline: [
        {
          at: `${formatShortDate(addDays(TODAY, -1))} 10:50`,
          text: "Finding recorded during visit",
          by: who,
        },
        { at: `${formatShortDate(TODAY)} 08:30`, text: "Shared with facility head", by: who },
      ],
    });
  }
  return items;
})();

// ---------- Overview helpers ----------
export const STATUS_LABEL: Record<ReportStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  received: "Received",
  pending: "Pending verification",
  verified: "Verified",
  rejected: "Rejected",
  none: "No report",
};

/** Pool of facilities that can "arrive" in the simulated live feed. */
export const SIMULATION_POOL: string[] = facilities
  .filter((f) => ["none", "sent", "draft"].includes(statusOf(f.id)))
  .map((f) => f.id);

// ---------- Institutional register ----------
// The reporting contact and roster must refer to the same institution head.
for (const facility of facilities) {
  const head = (staffByFacility[facility.id] ?? []).find((s) =>
    facility.kind === "school"
      ? s.designation === "Headmaster" || s.designation === "Headmistress"
      : s.designation === "Medical Officer" || s.designation === "Women Medical Officer",
  );
  if (head) facility.headName = head.name;
  if (facility.level === "Higher Secondary") {
    const r = mulberry32(2311 + Number(facility.code.slice(3)));
    for (const grade of [11, 12]) {
      const enrolled = 24 + Math.floor(r() * 19);
      const boys = facility.gender === "Boys" ? enrolled : 0;
      const girls = facility.gender === "Girls" ? enrolled : 0;
      schoolDays[facility.id]!.classes.push({
        className: `Class ${grade}`,
        enrolledBoys: boys,
        enrolledGirls: girls,
        presentBoys: Math.round(boys * (0.84 + r() * 0.09)),
        presentGirls: Math.round(girls * (0.84 + r() * 0.09)),
      });
    }
  }
}
export interface RegisterAsset {
  id: string;
  name: string;
  quantity: number;
  working: number;
  checkedOn: string;
  custodian: string;
}
export interface InstitutionProfile {
  reference: string;
  established: number;
  address: string;
  hours: string;
  area: string;
  ownership: string;
  rooms: number;
  usableRooms: number;
  catchment: number;
  inspectionDate: string;
  nextInspection: string;
  officer: string;
  assets: RegisterAsset[];
}

/** Complete coded data accompanies attendance; personal names never enter an SMS. */
export function reportPayloadFor(input: {
  facilityId: string;
  sequence: number;
  schoolDay?: SchoolDay;
  shift?: Shift;
  equipmentOk?: boolean;
}) {
  const f = facilityById[input.facilityId]!;
  const roster = staffByFacility[f.id] ?? [];
  const statuses =
    input.schoolDay?.staffStatus ??
    Object.fromEntries((input.shift?.assignments ?? []).map((a) => [a.staffId, a.status]));
  const codesFor = (status: string) =>
    roster.filter((s) => statuses[s.id] === status).map((s) => s.code);
  let payload = smsPayloadFor({
    type: f.kind === "school" ? "A1" : "H1",
    code: f.code,
    session: input.shift?.key ?? "M",
    roster: f.rosterVersion,
    seq: input.sequence,
    absent: codesFor("Absent"),
    leave: [...codesFor("Approved leave"), ...codesFor("Leave")],
    full: true,
  });
  payload = payload.replace(
    `|${TODAY_COMPACT}|`,
    `|${(input.shift?.date ?? TODAY).replaceAll("-", "")}|`,
  );
  if (codesFor("Official duty").length) payload += `|D:${codesFor("Official duty").join(",")}`;
  if (input.schoolDay)
    payload += `|S:${input.schoolDay.classes.map((c) => `${c.className === "Katchi" ? "K" : c.className.replace(/\D/g, "")}=${c.presentBoys}/${c.presentGirls}`).join(",")}`;
  if (input.shift) {
    const shift = input.shift;
    const exceptionCodes: Record<string, string> = {
      Late: "T",
      Replacement: "R",
      "On-call": "C",
      "Off-duty": "O",
    };
    const extra = shift.assignments
      .filter((a) => exceptionCodes[a.status])
      .map(
        (a) =>
          `${roster.find((s) => s.id === a.staffId)?.code ?? a.staffId}=${exceptionCodes[a.status]}`,
      );
    if (extra.length) payload += `|X:${extra.join(",")}`;
    payload += `|B:${shift.bedsAvailable}/${shift.bedsTotal}`;
    if (shift.opd != null) payload += `|P:${shift.opd}`;
    payload += `|V:${SERVICES.filter((s) => s in shift.services)
      .map((s) => `${SERVICES.indexOf(s)}=${shift.services[s] ? 1 : 0}`)
      .join(",")}`;
    if (input.equipmentOk != null) payload += `|E:${input.equipmentOk ? 1 : 0}`;
    payload += `|N:${encodeURIComponent(JSON.stringify(shift.handover))}`;
  }
  return payload;
}
export function codedSmsBudget(payload: string) {
  // Protocol payloads are ASCII. GSM extension characters, including |, cost two units.
  const unicode = Array.from(payload).some((char) => char.charCodeAt(0) > 127);
  const units = unicode
    ? payload.length
    : Array.from(payload).reduce((sum, char) => sum + ("^{}\\[~]|".includes(char) ? 2 : 1), 0);
  const single = unicode ? 70 : 160;
  const multipart = unicode ? 67 : 153;
  const segments = units <= single ? 1 : Math.ceil(units / multipart);
  return { units, segments, capacity: segments === 1 ? single : segments * multipart };
}
export const COMPLAINT_CATEGORIES = [
  "Infrastructure",
  "Staff attendance",
  "Service availability",
  "Sanitation",
  "Equipment",
  "Other",
] as const;
export const COMPLAINT_STATUSES = ["Open", "In progress", "Resolved"] as const;
export interface Complaint {
  id: string;
  facilityIds: string[];
  title: string;
  description: string;
  category: (typeof COMPLAINT_CATEGORIES)[number];
  priority: Severity;
  status: (typeof COMPLAINT_STATUSES)[number];
  owner: string;
  createdBy: string;
  createdDate: string;
  createdMin: number;
  timeline: { at: string; by: string; text: string }[];
}
export interface SmsEntry {
  id: string;
  kind: "report" | "complaint";
  referenceId: string;
  facilityIds: string[];
  payload: string;
  status: "saved" | "sent" | "received" | "rejected";
  createdMin: number;
  receivedMin: number | null;
  segments: number;
  reason?: string;
}
export const complaints: Complaint[] = [
  {
    id: "CMP-1001",
    facilityIds: ["SCH103", "SCH108", "HF207"],
    title: "Joint inspection of water and sanitation facilities",
    description:
      "Arrange a coordinated inspection of drinking water and sanitation at the listed institutions. Each institution head should confirm availability, record repair needs and provide an action update to the district coordination cell.",
    category: "Sanitation",
    priority: "High",
    status: "In progress",
    owner: "District coordination cell",
    createdBy: "Shah Saud Marwat",
    createdDate: TODAY,
    createdMin: 570,
    timeline: [
      {
        at: "23 Nov 09:30",
        by: "Shah Saud Marwat",
        text: "Complaint registered for 3 institutions and assigned to District coordination cell.",
      },
      {
        at: "23 Nov 10:15",
        by: "District coordination cell",
        text: "Status changed to In progress. Institution heads contacted; joint site inspection being arranged.",
      },
    ],
  },
  {
    id: "CMP-1002",
    facilityIds: ["HF204"],
    title: "Restore oxygen availability at RHC Kakki",
    description:
      "Oxygen availability requires urgent follow-up. Coordinate refill delivery, check backup equipment and record confirmation from the facility in-charge before closing the complaint.",
    category: "Service availability",
    priority: "Critical",
    status: "Open",
    owner: "DHO office",
    createdBy: "Shah Saud Marwat",
    createdDate: TODAY,
    createdMin: 620,
    timeline: [
      {
        at: "23 Nov 10:20",
        by: "Shah Saud Marwat",
        text: "Complaint registered for 1 institution and assigned to DHO office.",
      },
    ],
  },
  {
    id: "CMP-1003",
    facilityIds: ["SCH112"],
    title: "Clear access to the school entrance",
    description:
      "Remove material obstructing the main entrance and confirm safe access with the school head.",
    category: "Infrastructure",
    priority: "Medium",
    status: "Resolved",
    owner: "DEO office",
    createdBy: "Fazal Rahim Khattak",
    createdDate: "2026-11-22",
    createdMin: 645,
    timeline: [
      {
        at: "22 Nov 10:45",
        by: "Fazal Rahim Khattak",
        text: "Complaint registered and assigned to DEO office.",
      },
      {
        at: "23 Nov 09:10",
        by: "DEO office",
        text: "Status changed to Resolved. Entrance cleared; school head confirmed safe access.",
      },
    ],
  },
];

export const institutionProfiles: Record<string, InstitutionProfile> = Object.fromEntries(
  facilities.map((f, index) => {
    const r = mulberry32(2311 + index * 503);
    const integer = (a: number, b: number) => a + Math.floor(r() * (b - a + 1));
    const school = f.kind === "school";
    const rooms = school ? integer(6, 19) : f.healthType === "DHQ" ? 74 : integer(9, 28);
    const names = school
      ? [
          "Student desks",
          "Teaching boards",
          "Library books",
          "Science learning kits",
          "Computer workstations",
          "Fire extinguishers",
        ]
      : [
          "Examination couches",
          "Patient monitors",
          "Oxygen cylinders",
          "Vaccine cold boxes",
          "Wheelchairs",
          "Fire extinguishers",
        ];
    const quantities = school
      ? [integer(58, 182), rooms, integer(184, 726), integer(3, 12), integer(4, 18), integer(2, 6)]
      : [
          integer(3, 14),
          integer(2, 8),
          integer(4, 16),
          integer(2, 7),
          integer(2, 8),
          integer(3, 9),
        ];
    return [
      f.id,
      {
        reference: `REG-BNU-${f.code}`,
        established: integer(1968, 2015),
        address: `${f.village}, ${f.tehsil} tehsil, District Bannu`,
        hours: school
          ? "Monday–Friday · 08:00–14:00"
          : f.healthType === "BHU"
            ? "OPD 08:00–14:00 · rostered duty thereafter"
            : "24-hour duty roster · OPD 08:00–14:00",
        area: `${integer(school ? 4 : 7, school ? 18 : 42)} kanal`,
        ownership: "Government / departmental use",
        rooms,
        usableRooms: rooms - integer(0, 2),
        catchment: integer(school ? 720 : 5600, school ? 4200 : 28500),
        inspectionDate: addDays(TODAY, -integer(4, 18)),
        nextInspection: addDays(TODAY, integer(5, 18)),
        officer: school ? "DEO monitoring cell" : "DHO monitoring cell",
        assets: names.map((name, i) => {
          const quantity = quantities[i]!;
          return {
            id: `${f.code}-AS${String(i + 1).padStart(2, "0")}`,
            name,
            quantity,
            working: quantity - integer(0, Math.min(quantity, i === 0 ? 5 : 2)),
            checkedOn: addDays(TODAY, -integer(0, 3)),
            custodian: f.headName,
          };
        }),
      } satisfies InstitutionProfile,
    ];
  }),
);
