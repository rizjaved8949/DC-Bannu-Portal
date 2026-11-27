/**
 * All prototype data for DCMS Bannu. "Now" is Mon 23 Nov 2026, 11:40 PKT.
 * Times are stored as minutes-since-midnight or "YYYY-MM-DD" strings so server and
 * browser render identically.
 *
 * Schools: the register (name, EMIS, level, tehsil, village, functional status, reason,
 * students, working teachers, principal, coordinates, DEO remarks) is real North
 * Waziristan data from src/data/schools-source.ts. Everything a school does day to day
 * (reports, attendance, teacher names other than the principal, class split, checklist)
 * is a seeded simulation built on those real totals, to show how live data will appear.
 *
 * Health facilities are fully simulated (seeded mulberry32, seed 2311).
 */

import type { SchoolSourceRecord, SourceTehsil } from "./school-types";
import { SCHOOL_SOURCE } from "./schools-source";

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
/** Health facilities are Bannu's (simulated). Schools are North Waziristan's (real register). */
export const BANNU_TEHSILS = ["Bannu", "Domel", "Kakki", "Miryan", "Baka Khel", "Wazir"] as const;
export const NW_TEHSILS = [
  "Mirali",
  "Miranshah",
  "Datta Khel",
  "Dossali",
  "Spinwam",
  "Shewa",
  "Razmak",
  "Ghulam Khan",
  "Garyum",
] as const satisfies readonly SourceTehsil[];
/** Female schools whose location column does not name a single tehsil. */
export const TEHSIL_NOT_STATED = "Tehsil not stated";
export const TEHSILS = [...BANNU_TEHSILS, ...NW_TEHSILS, TEHSIL_NOT_STATED] as const;
export type Tehsil = (typeof TEHSILS)[number];
type BannuTehsil = (typeof BANNU_TEHSILS)[number];

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
  id: string; // schools: SCH-<EMIS>; health: HF201
  code: string; // schools: EMIS code; health: HF201
  name: string;
  kind: "school" | "health";
  department: Department;
  district: "Bannu" | "North Waziristan";
  tehsil: Tehsil;
  village: string;
  /** null when the coordinates file has no entry for this school. */
  lat: number | null;
  lng: number | null;
  coordsVerified: boolean;
  /** False for schools the source files list as non-functional or closed. They send no reports. */
  operational: boolean;
  /** The school's row from the North Waziristan source files. */
  source?: SchoolSourceRecord;
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

const VILLAGES_BY_TEHSIL: Record<BannuTehsil, string[]> = {
  Bannu: ["Bannu City", "Township", "Mandan", "Hawaid"],
  Domel: ["Domel", "Sokari"],
  Kakki: ["Kakki", "Mamash Khel"],
  Miryan: ["Miryan", "Bazar Ahmad Khan"],
  "Baka Khel": ["Baka Khel", "Jani Khel"],
  Wazir: ["Ghoriwala", "Jani Khel"],
};
const TEHSIL_CENTRE: Record<BannuTehsil, [number, number]> = {
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
/** Demo teacher name from a per-school seed (the files name only the principal). */
function demoName(gender: "M" | "F", r: () => number): string {
  const p = <T>(arr: readonly T[]) => arr[Math.floor(r() * arr.length)] as T;
  if (gender === "F") return `${p(FEMALE_FIRST)} ${p(SURNAMES)}`;
  return r() < 0.5
    ? `${p(MALE_FIRST)} ${p(MALE_MIDDLE)}`
    : `${p(MALE_FIRST)} ${p(MALE_MIDDLE)} ${p(SURNAMES)}`;
}
function initialsOf(name: string) {
  const parts = name.split(" ");
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}

function clampCoord(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}
function coordsFor(t: BannuTehsil): [number, number] {
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
const TYPE_LABEL: Record<SchoolLevel, string> = {
  Primary: "Primary school",
  Middle: "Middle school",
  High: "High school",
  "Higher Secondary": "Higher secondary school",
};
/** Not in the source files: per-school demo values come from a seed of the school id. */
const schoolRng = (id: string, salt: number) => mulberry32(hashString(id) ^ salt);

/** Real North Waziristan schools, one per row of the source files. */
const schools: Facility[] = SCHOOL_SOURCE.map((src) => {
  const code = src.emis ?? `GF${src.serial}`;
  const id = `SCH-${code}`;
  const r = schoolRng(id, 0x5c4);
  const int = (a: number, b: number) => a + Math.floor(r() * (b - a + 1));
  const infra = {} as Record<InfraKey, InfraFlag>;
  for (const k of INFRA_KEYS) {
    const daysAgo = r() < 0.16 ? int(5, 41) : int(0, 3);
    infra[k] = { ok: r() >= 0.14, updated: addDays(TODAY, -daysAgo) };
  }
  return {
    id,
    code,
    name: src.name,
    kind: "school",
    department: "Education",
    district: "North Waziristan",
    tehsil: src.tehsil ?? TEHSIL_NOT_STATED,
    village: src.village ?? "Location not stated",
    lat: src.lat,
    lng: src.lng,
    coordsVerified: src.lat != null,
    operational: src.status === "Functional",
    source: src,
    channel: r() < 0.3 ? "sms" : "app",
    rosterVersion: `RV0${int(2, 6)}`,
    infra,
    equipment: {
      label: "Furniture and boards",
      ok: r() >= 0.15,
      updated: addDays(TODAY, -int(0, 9)),
    },
    level: src.level,
    gender: src.gender,
    typeLabel: `${TYPE_LABEL[src.level]}, ${src.gender.toLowerCase()}`,
    headName: src.principal ?? "Not recorded",
    phoneMasked: `03••-•••${int(1000, 9899)}`,
  } satisfies Facility;
});

/**
 * Fixed functional schools used by the review queue, complaints and tests as stable
 * examples. Picked by position among functional schools that have students and teachers.
 */
const demoPool = schools.filter(
  (f) => f.operational && (f.source?.students ?? 0) >= 40 && (f.source?.teachers ?? 0) >= 2,
);
const demoAt = (i: number) => demoPool[(i * 37) % demoPool.length]!.id;
export const DEMO_SCHOOLS = {
  /** Rejected SMS report with a roster mismatch. */
  rejectedSms: demoAt(1),
  /** Verified SMS report. */
  verifiedSms: demoAt(2),
  /** Present-exceeds-enrolled examples. */
  implausible: [demoAt(3), demoAt(4), demoAt(5)],
  /** Used by complaints and the field app examples. */
  complaintA: demoAt(6),
  complaintB: demoAt(7),
  fieldExample: demoAt(8),
} as const;
{
  const rej = schools.find((f) => f.id === DEMO_SCHOOLS.rejectedSms)!;
  rej.channel = "sms";
  rej.rosterVersion = "RV04";
  const ver = schools.find((f) => f.id === DEMO_SCHOOLS.verifiedSms)!;
  ver.channel = "sms";
  ver.rosterVersion = "RV04";
}

const HEALTH_PLAN: { name: string; type: HealthType; tehsil: BannuTehsil; village: string }[] = [
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
    district: "Bannu",
    operational: true,
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

/** Teaching designations a school's working teachers are spread over (demo; files give only the count). */
const TEACHING_MIX: Record<SchoolLevel, SchoolDesignation[]> = {
  Primary: ["PST", "PST", "CT", "PST", "AT"],
  Middle: ["SST", "PST", "CT", "AT", "TT", "PST", "DM", "SST"],
  High: ["SST", "SST", "PST", "CT", "AT", "TT", "DM", "PET", "SST", "CT"],
  "Higher Secondary": ["SST", "SST", "CT", "PST", "AT", "TT", "DM", "PET", "SST", "CT", "SST"],
};
{
  let sid = 1;
  const pushStaff = (
    f: Facility,
    desig: Designation,
    tcode: number,
    gender: "M" | "F",
    name: string,
    shiftEligibility: Staff["shiftEligibility"],
    r: () => number,
  ) => {
    staff.push({
      id: `ST${String(sid++).padStart(4, "0")}`,
      code: `T${tcode}`,
      name,
      initials: initialsOf(name),
      gender,
      personalNoMasked: `••••${100 + Math.floor(r() * 890)}`,
      designation: desig,
      bps: BPS[desig],
      facilityId: f.id,
      employment: r() < 0.78 ? "Regular" : "Contract",
      shiftEligibility,
      onRosterSince: addDays(TODAY, -(60 + Math.floor(r() * 3341))),
    });
  };
  // Schools: exactly the "No of Working Teachers" from the source file. The principal, when
  // named in the file, is the head; the other names and designations are demo values.
  for (const f of schools) {
    const count = f.source?.teachers ?? 0;
    const r = schoolRng(f.id, 0x57a);
    const gender = f.gender === "Girls" ? "F" : "M";
    const mix = TEACHING_MIX[f.level!];
    let tcode = 101;
    for (let i = 0; i < count; i++) {
      const isHead = i === 0 && f.source?.principal;
      const desig: Designation = isHead
        ? gender === "F"
          ? "Headmistress"
          : "Headmaster"
        : mix[(i - 1 + mix.length) % mix.length]!;
      const name = isHead ? f.source!.principal! : demoName(gender, r);
      pushStaff(f, desig, tcode++, gender, name, ["Day"], r);
    }
  }
  for (const f of healthFacilities) {
    let tcode = 101;
    const plan = healthPostPlan(f.healthType!);
    for (const [desig, sanctioned] of Object.entries(plan) as [Designation, number][]) {
      if (!sanctioned) continue;
      let filled = sanctioned;
      for (let i = 0; i < sanctioned; i++) if (chance(0.13)) filled--;
      posts.push({ facilityId: f.id, designation: desig, sanctioned, filled });
      for (let i = 0; i < filled; i++) {
        let gender: "M" | "F";
        if (desig === "Women Medical Officer" || desig === "LHV") gender = "F";
        else if (desig === "Charge Nurse") gender = chance(0.7) ? "F" : "M";
        else gender = chance(0.2) ? "F" : "M";
        const name = personName(gender);
        const shiftEligibility = shuffle(["M", "E", "N"] as ShiftKey[]).slice(
          0,
          desig === "Medical Officer" || desig === "Charge Nurse" || desig === "Ward Orderly"
            ? 3
            : rand(1, 2),
        ) as ShiftKey[];
        pushStaff(f, desig, tcode++, gender, name, shiftEligibility, rng);
      }
    }
  }
}
export const staffById: Record<string, Staff> = Object.fromEntries(staff.map((s) => [s.id, s]));
export const staffByFacility: Record<string, Staff[]> = {};
for (const s of staff) (staffByFacility[s.facilityId] ??= []).push(s);

// ---------- Today's reports (demo) ----------
/** Share of operational facilities in each state at 11:40, matching a typical morning. */
const STATUS_WEIGHTS: [ReportStatus, number][] = [
  ["verified", 25],
  ["pending", 8],
  ["received", 8],
  ["sent", 4],
  ["rejected", 3],
  ["draft", 2],
  ["none", 12],
];
const STATUS_WEIGHT_TOTAL = STATUS_WEIGHTS.reduce((a, [, w]) => a + w, 0);
function demoStatusFor(f: Facility): ReportStatus {
  // Non-functional and closed schools send no report.
  if (!f.operational) return "none";
  let x = mulberry32(hashString(f.id) ^ 0x7e5)() * STATUS_WEIGHT_TOTAL;
  for (const [st, w] of STATUS_WEIGHTS) {
    if ((x -= w) < 0) return st;
  }
  return "none";
}
const STATUS_OVERRIDES: Record<string, ReportStatus> = {
  [DEMO_SCHOOLS.rejectedSms]: "rejected",
  [DEMO_SCHOOLS.verifiedSms]: "verified",
  HF203: "pending",
  HF201: "verified",
};

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
  "Higher Secondary": [
    "Class 6",
    "Class 7",
    "Class 8",
    "Class 9",
    "Class 10",
    "Class 11",
    "Class 12",
  ],
};
/** Relative class sizes used to split the real student total across classes (demo split). */
const classWeight = (c: string) =>
  c === "Katchi" || c === "Class 1" ? 1.5 : c === "Class 11" || c === "Class 12" ? 0.7 : 1;

/** Split a total into integer parts proportional to weights; the parts always sum to total. */
function splitTotal(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  const raw = weights.map((w) => (total * w) / sum);
  const out = raw.map(Math.floor);
  let left = total - out.reduce((a, b) => a + b, 0);
  const order = raw.map((v, i) => [v - Math.floor(v), i] as const).sort((a, b) => b[0] - a[0]);
  for (const [, i] of order) {
    if (left <= 0) break;
    out[i]!++;
    left--;
  }
  return out;
}

export const schoolDays: Record<string, SchoolDay> = {};
const IMPLAUSIBLE_SCHOOLS = new Set<string>();
for (const f of schools) {
  const r = schoolRng(f.id, 0xd41);
  const st: Record<string, SchoolStaffStatus> = {};
  for (const s of staffByFacility[f.id] ?? []) {
    const x = r();
    st[s.id] =
      x < 0.875 ? "Present" : x < 0.925 ? "Absent" : x < 0.98 ? "Approved leave" : "Official duty";
  }
  // Enrolment is the real "No of Students"; only its split across classes is a demo.
  const names = CLASS_SETS[f.level!];
  const split = splitTotal(f.source?.students ?? 0, names.map(classWeight));
  const classes: ClassRow[] = names.map((c, i) => {
    const n = split[i]!;
    const eb = f.gender === "Boys" ? n : 0;
    const eg = f.gender === "Girls" ? n : 0;
    const pr = () => 0.78 + r() * 0.16;
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
for (const code of DEMO_SCHOOLS.implausible) {
  const d = schoolDays[code];
  const row = d?.classes.find((c) => c.enrolledBoys + c.enrolledGirls > 0);
  if (d && row) {
    if (row.enrolledBoys >= row.enrolledGirls) row.presentBoys = row.enrolledBoys + rand(3, 9);
    else row.presentGirls = row.enrolledGirls + rand(3, 9);
    IMPLAUSIBLE_SCHOOLS.add(code);
  }
}

export const reports: Report[] = [];
export const reportByFacility: Record<string, Report> = {};
facilities.forEach((f) => {
  let status = STATUS_OVERRIDES[f.id] ?? demoStatusFor(f);
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
    if (f.id === DEMO_SCHOOLS.rejectedSms || kind === "roster") {
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

  const noReport = facilities.filter((f) => f.operational && statusOf(f.id) === "none").slice(0, 8);
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
  // Findings from the DEO's review of non-functional schools (Non Func School.pptx). The text
  // is the DEO's own; the slides carry no date, so the queue shows them as of today.
  for (const f of schools.filter((x) => x.source?.deoRemark)) {
    add({
      type: "Inspector finding",
      severity: f.operational ? "Medium" : "High",
      facilityId: f.id,
      createdDate: TODAY,
      createdMin: 8 * 60,
      detected: f.source!.deoRemark!,
      why: "Listed in the District Education Officer's review of non-functional schools. A finding is a note for follow-up and is checked against the school's own report.",
      evidence: [
        { label: "Source", value: "DEO(M) North Waziristan, non-functional schools review" },
        { label: "Status in school register", value: f.source!.statusText || "Not stated" },
        { label: "EMIS code", value: f.source!.emis ?? "Not given" },
      ],
      owner: "DEO office",
      status: "Open",
      timeline: [
        {
          at: "DEO review",
          text: "Remark recorded in the non-functional schools review",
          by: "DEO (Male) North Waziristan",
        },
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
  .filter((f) => f.operational && ["none", "sent", "draft"].includes(statusOf(f.id)))
  .map((f) => f.id);

// ---------- Institutional register ----------
// The reporting contact and roster must refer to the same institution head.
for (const facility of facilities) {
  const head = (staffByFacility[facility.id] ?? []).find((s) =>
    facility.kind === "school"
      ? s.designation === "Headmaster" || s.designation === "Headmistress"
      : s.designation === "Medical Officer" || s.designation === "Women Medical Officer",
  );
  if (head && facility.kind === "health") facility.headName = head.name;
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
    facilityIds: [DEMO_SCHOOLS.complaintA, DEMO_SCHOOLS.complaintB, "HF207"],
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
    facilityIds: [DEMO_SCHOOLS.fieldExample],
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
        reference: school ? `EMIS ${f.source?.emis ?? "not given"}` : `REG-BNU-${f.code}`,
        established: integer(1968, 2015),
        address: school
          ? `${f.village}, ${f.tehsil}, District North Waziristan`
          : `${f.village}, ${f.tehsil} tehsil, District Bannu`,
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

// ---------- Finance & budget (admin view) ----------
export interface BudgetLine {
  category: string;
  department: Department;
  allocated: number;
  spent: number;
  committed: number;
}

export const budgetLines: BudgetLine[] = (() => {
  const r = mulberry32(2311 * 11);
  const lines: BudgetLine[] = [];
  const eduCats = [
    { category: "Salaries & allowances", base: 182_000_000 },
    { category: "Maintenance & repairs", base: 14_200_000 },
    { category: "Teaching materials & supplies", base: 8_600_000 },
    { category: "Furniture & equipment", base: 6_100_000 },
    { category: "Utilities & communications", base: 4_800_000 },
    { category: "Travel & inspection", base: 2_400_000 },
    { category: "IT & digital infrastructure", base: 3_200_000 },
  ];
  const healthCats = [
    { category: "Salaries & allowances", base: 248_000_000 },
    { category: "Medicines & consumables", base: 42_000_000 },
    { category: "Medical equipment", base: 18_500_000 },
    { category: "Maintenance & repairs", base: 11_600_000 },
    { category: "Utilities & communications", base: 7_200_000 },
    { category: "Ambulance & transport", base: 3_800_000 },
    { category: "Lab & diagnostics supplies", base: 5_400_000 },
  ];
  for (const { category, base } of eduCats) {
    const allocated = base + Math.floor((r() - 0.5) * base * 0.08);
    const utilisation = 0.58 + r() * 0.28;
    const spent = Math.round(allocated * utilisation);
    const committed = Math.round(allocated * Math.min(1, utilisation + 0.05 + r() * 0.1));
    lines.push({ category, department: "Education", allocated, spent, committed });
  }
  for (const { category, base } of healthCats) {
    const allocated = base + Math.floor((r() - 0.5) * base * 0.08);
    const utilisation = 0.52 + r() * 0.32;
    const spent = Math.round(allocated * utilisation);
    const committed = Math.round(allocated * Math.min(1, utilisation + 0.05 + r() * 0.1));
    lines.push({ category, department: "Health", allocated, spent, committed });
  }
  return lines;
})();

export interface FacilityPatientStats {
  facilityId: string;
  opdToday: number;
  emergencyToday: number;
  admissionsToday: number;
  dischargesToday: number;
  referralsToday: number;
  bedsOccupied: number;
  bedsTotal: number;
  icuOccupied: number;
  icuTotal: number;
}

export const patientStats: FacilityPatientStats[] = (() => {
  const r = mulberry32(2311 * 13);
  const int = (a: number, b: number) => a + Math.floor(r() * (b - a + 1));
  return healthFacilities.map((f) => {
    const shift = shiftsByFacility[f.id]?.M;
    const opd = shift?.opd ?? 0;
    const t = f.healthType!;
    const bedsTotal = t === "DHQ" ? 220 : t === "WCH" ? 120 : t === "RHC" ? 20 : 6;
    const occ = Math.round(bedsTotal * (0.55 + r() * 0.3));
    const icuTotal = t === "DHQ" ? 18 : t === "WCH" ? 8 : 0;
    return {
      facilityId: f.id,
      opdToday: opd,
      emergencyToday:
        t === "DHQ"
          ? int(32, 68)
          : t === "WCH"
            ? int(12, 28)
            : t === "RHC"
              ? int(4, 12)
              : int(0, 3),
      admissionsToday:
        t === "DHQ" ? int(18, 42) : t === "WCH" ? int(8, 22) : t === "RHC" ? int(2, 8) : int(0, 2),
      dischargesToday:
        t === "DHQ" ? int(14, 36) : t === "WCH" ? int(6, 18) : t === "RHC" ? int(1, 6) : int(0, 2),
      referralsToday:
        t === "DHQ" ? int(2, 8) : t === "WCH" ? int(1, 5) : t === "RHC" ? int(0, 4) : int(0, 2),
      bedsOccupied: Math.min(occ, bedsTotal),
      bedsTotal,
      icuOccupied: icuTotal ? Math.min(int(Math.floor(icuTotal * 0.5), icuTotal), icuTotal) : 0,
      icuTotal,
    };
  });
})();

export const patientStatsById: Record<string, FacilityPatientStats> = Object.fromEntries(
  patientStats.map((p) => [p.facilityId, p]),
);

// ---------- Monthly attendance trend (school & health, last 6 months) ----------
export const monthlyTrend: {
  month: string;
  label: string;
  schoolPct: number;
  healthPct: number;
  opdTotal: number;
  emergencyTotal: number;
}[] = (() => {
  const r = mulberry32(2311 * 17);
  const months = ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"];
  return months.map((label, i) => ({
    month: `2026-${String(i + 6).padStart(2, "0")}`,
    label,
    schoolPct: +(78 + r() * 12).toFixed(1),
    healthPct: +(80 + r() * 10).toFixed(1),
    opdTotal: Math.round(28000 + r() * 8000),
    emergencyTotal: Math.round(1200 + r() * 600),
  }));
})();

// ---------- Patient daybook entries (health facility detail) ----------
export interface DaybookEntry {
  id: string;
  facilityId: string;
  timeMin: number;
  patientName: string;
  age: number;
  gender: "M" | "F";
  cnic: string;
  complaint: string;
  diagnosis: string;
  medicine: string;
  doctor: string;
  followUp: string | null;
  status: "Treated" | "Admitted" | "Referred" | "Under observation";
}

const COMPLAINTS = [
  "Fever and body aches",
  "Chest pain",
  "Difficulty breathing",
  "Abdominal pain",
  "Diarrhea and vomiting",
  "Road traffic injury",
  "High blood pressure",
  "Diabetic crisis",
  "Skin infection",
  "Eye infection",
  "Dental pain",
  "Pregnancy check-up",
  "Child vaccination",
  "Fracture / bone injury",
  "Allergic reaction",
  "UTI symptoms",
  "Severe headache",
  "Ear pain",
  "Wound / laceration",
  "Asthma attack",
];
const DIAGNOSES = [
  "Acute febrile illness",
  "Angina pectoris",
  "COPD exacerbation",
  "Acute gastroenteritis",
  "Gastroenteritis with dehydration",
  "Polytrauma",
  "Hypertensive emergency",
  "DKA",
  "Cellulitis",
  "Conjunctivitis",
  "Dental caries",
  "Antenatal – normal",
  "Routine immunisation",
  "Closed fracture",
  "Urticaria",
  "Urinary tract infection",
  "Migraine",
  "Otitis media",
  "Laceration – superficial",
  "Acute bronchospasm",
];
const MEDICINES = [
  "Paracetamol 500mg TDS + Azithromycin 500mg OD",
  "Aspirin 300mg stat + GTN spray",
  "Nebuliser salbutamol + IV hydrocortisone",
  "ORS + IV fluid + Metronidazole",
  "ORS + Zinc + Ciprofloxacin",
  "IV fluids + wound dressing + tetanus",
  "Amlodipine 10mg + Captopril 25mg stat",
  "Insulin infusion + IV NS",
  "Flucloxacillin 500mg QDS + wound care",
  "Ciprofloxacin eye drops QID",
  "Ibuprofen 400mg + referral to dental",
  "Folic acid + iron supplement",
  "BCG / OPV / Pentavalent as schedule",
  "Plaster cast + Diclofenac 50mg TDS",
  "Cetirizine 10mg + IM adrenaline PRN",
  "Nitrofurantoin 100mg BD × 5 days",
  "Sumatriptan 50mg + Domperidone 10mg",
  "Amoxicillin 500mg TDS + ear drops",
  "Wound suture + Augmentin 625mg TDS",
  "Salbutamol inhaler + Prednisolone 40mg",
];

const DOCTOR_FIRST = [
  "Dr. Saeed",
  "Dr. Farooq",
  "Dr. Hina",
  "Dr. Asim",
  "Dr. Nadia",
  "Dr. Khalid",
  "Dr. Rabia",
  "Dr. Tariq",
  "Dr. Sana",
  "Dr. Waqas",
];
const DOCTOR_LAST = ["Khan", "Ahmad", "Shah", "Afridi", "Khattak", "Marwat", "Wazir", "Bangash"];
const PATIENT_FIRST_M = [
  "Muhammad",
  "Ahmad",
  "Ali",
  "Usman",
  "Bilal",
  "Hamza",
  "Tariq",
  "Shahid",
  "Imran",
  "Kamran",
  "Saeed",
  "Farhan",
  "Zubair",
  "Naveed",
  "Irfan",
];
const PATIENT_FIRST_F = [
  "Fatima",
  "Ayesha",
  "Zainab",
  "Maryam",
  "Hina",
  "Nadia",
  "Sana",
  "Rabia",
  "Bushra",
  "Samina",
  "Nasreen",
  "Tahira",
  "Razia",
  "Parveen",
  "Kulsoom",
];
const PATIENT_LAST = [
  "Khan",
  "Ahmad",
  "Shah",
  "Afridi",
  "Khattak",
  "Marwat",
  "Wazir",
  "Bangash",
  "Orakzai",
  "Dawar",
  "Bhittani",
  "Niazi",
];

export const daybookEntries: DaybookEntry[] = (() => {
  const r = mulberry32(2311 * 19);
  const int = (a: number, b: number) => a + Math.floor(r() * (b - a + 1));
  const entries: DaybookEntry[] = [];
  for (const f of healthFacilities) {
    const count =
      f.healthType === "DHQ"
        ? int(35, 55)
        : f.healthType === "WCH"
          ? int(15, 30)
          : f.healthType === "RHC"
            ? int(8, 18)
            : int(3, 8);
    for (let i = 0; i < count; i++) {
      const isMale = r() > 0.45;
      const age = int(1, 85);
      const idx = int(0, COMPLAINTS.length - 1);
      const statuses: DaybookEntry["status"][] = [
        "Treated",
        "Treated",
        "Treated",
        "Admitted",
        "Referred",
        "Under observation",
      ];
      entries.push({
        id: `DB-${f.code}-${String(i + 1).padStart(3, "0")}`,
        facilityId: f.id,
        timeMin: int(8 * 60, 11 * 60 + 30),
        patientName: isMale
          ? `${PATIENT_FIRST_M[int(0, PATIENT_FIRST_M.length - 1)]} ${PATIENT_LAST[int(0, PATIENT_LAST.length - 1)]}`
          : `${PATIENT_FIRST_F[int(0, PATIENT_FIRST_F.length - 1)]} ${PATIENT_LAST[int(0, PATIENT_LAST.length - 1)]}`,
        age,
        gender: isMale ? "M" : "F",
        cnic: `1720${int(1, 9)}-${int(1000000, 9999999)}-${int(1, 9)}`,
        complaint: COMPLAINTS[idx]!,
        diagnosis: DIAGNOSES[idx]!,
        medicine: MEDICINES[idx]!,
        doctor: `${DOCTOR_FIRST[int(0, DOCTOR_FIRST.length - 1)]} ${DOCTOR_LAST[int(0, DOCTOR_LAST.length - 1)]}`,
        followUp: r() > 0.6 ? addDays(TODAY, int(3, 14)) : null,
        status: statuses[int(0, statuses.length - 1)]!,
      });
    }
  }
  return entries;
})();

export const daybookByFacility: Record<string, DaybookEntry[]> = (() => {
  const map: Record<string, DaybookEntry[]> = {};
  for (const e of daybookEntries) {
    (map[e.facilityId] ??= []).push(e);
  }
  return map;
})();

// ---------- Doctor profiles (health staff extended) ----------
export interface DoctorProfile {
  staffId: string;
  facilityId: string;
  name: string;
  qualification: string;
  specialisation: string;
  yearsOfService: number;
  patientsSeenToday: number;
  patientsThisMonth: number;
  department: string;
}

/**
 * A doctor's degree, field and posting have to agree with each other: a BDS is
 * a dentist and sits in the dental room, an MS Surgery is in theatre. Drawing
 * the three independently produced records no clinician would accept.
 */
const MEDICAL_FIELDS: {
  specialisation: string;
  qualifications: string[];
  departments: string[];
  womenOnly?: boolean;
}[] = [
  {
    specialisation: "General Medicine",
    qualifications: ["MBBS", "MBBS, FCPS Medicine", "MBBS, MCPS"],
    departments: ["OPD", "Ward A", "Ward B"],
  },
  {
    specialisation: "General Surgery",
    qualifications: ["MBBS, MS Surgery", "MBBS, FCPS Surgery"],
    departments: ["Surgery", "Ward B"],
  },
  {
    specialisation: "Gynae & Obstetrics",
    qualifications: ["MBBS, Diploma Gynae", "MBBS, FCPS Gynae"],
    departments: ["Labour Room", "Ward A"],
    womenOnly: true,
  },
  {
    specialisation: "Paediatrics",
    qualifications: ["MBBS, DCH", "MBBS, FCPS Paediatrics"],
    departments: ["Paediatric Ward", "OPD"],
  },
  {
    specialisation: "Orthopaedics",
    qualifications: ["MBBS, MS Orthopaedics", "MBBS, D-Ortho"],
    departments: ["Surgery", "OPD"],
  },
  { specialisation: "ENT", qualifications: ["MBBS, DLO", "MBBS, FCPS ENT"], departments: ["OPD"] },
  {
    specialisation: "Emergency Medicine",
    qualifications: ["MBBS", "MBBS, MCPS"],
    departments: ["Emergency"],
  },
  {
    specialisation: "Anaesthesia",
    qualifications: ["MBBS, DA", "MBBS, FCPS Anaesthesia"],
    departments: ["Surgery", "ICU"],
  },
  { specialisation: "Dermatology", qualifications: ["MBBS, DDerm"], departments: ["OPD"] },
  { specialisation: "Ophthalmology", qualifications: ["MBBS, DOMS"], departments: ["OPD"] },
  { specialisation: "Dentistry", qualifications: ["BDS", "BDS, FCPS"], departments: ["Dental"] },
];

export const doctorProfiles: DoctorProfile[] = (() => {
  const r = mulberry32(2311 * 23);
  const int = (a: number, b: number) => a + Math.floor(r() * (b - a + 1));
  const profiles: DoctorProfile[] = [];
  for (const f of healthFacilities) {
    const docs = (staffByFacility[f.id] ?? []).filter(
      (s) => s.designation === "Medical Officer" || s.designation === "Women Medical Officer",
    );
    // Smaller facilities have no theatre or ICU, so only the general fields apply.
    const fields = MEDICAL_FIELDS.filter((x) => {
      if (f.healthType === "DHQ") return true;
      if (f.healthType === "WCH")
        return !["Dentistry", "Orthopaedics", "Anaesthesia"].includes(x.specialisation);
      return [
        "General Medicine",
        "Paediatrics",
        "Emergency Medicine",
        "Gynae & Obstetrics",
      ].includes(x.specialisation);
    });
    for (const d of docs) {
      // A Women Medical Officer may hold any field; only she may hold Gynae.
      const eligible =
        d.designation === "Women Medical Officer" ? fields : fields.filter((x) => !x.womenOnly);
      const field = eligible[int(0, eligible.length - 1)] ?? MEDICAL_FIELDS[0]!;
      const years = int(2, 25);
      const seenToday = int(8, 32);
      profiles.push({
        staffId: d.id,
        facilityId: f.id,
        name: d.name,
        qualification: field.qualifications[int(0, field.qualifications.length - 1)]!,
        specialisation: field.specialisation,
        yearsOfService: years,
        patientsSeenToday: seenToday,
        // Roughly 24 working days, kept in step with today's figure.
        patientsThisMonth: seenToday * int(19, 25),
        department: field.departments[int(0, field.departments.length - 1)]!,
      });
    }
  }
  return profiles;
})();

export const doctorsByFacility: Record<string, DoctorProfile[]> = (() => {
  const map: Record<string, DoctorProfile[]> = {};
  for (const p of doctorProfiles) (map[p.facilityId] ??= []).push(p);
  return map;
})();

// ---------- Student directory (school detail) ----------
export interface StudentRecord {
  id: string;
  facilityId: string;
  name: string;
  fatherName: string;
  age: number;
  gender: "M" | "F";
  className: string;
  rollNo: number;
  subjects: string[];
  daysAttended: number;
  totalDays: number;
  attendanceMethod: "Biometric" | "Manual";
}

const STUDENT_FIRST_M = [
  "Muhammad",
  "Ahmad",
  "Ali",
  "Usman",
  "Bilal",
  "Hamza",
  "Hassan",
  "Zain",
  "Abdullah",
  "Saad",
  "Fahad",
  "Talha",
  "Owais",
  "Rehan",
  "Arslan",
];
const STUDENT_FIRST_F = [
  "Fatima",
  "Ayesha",
  "Zainab",
  "Maryam",
  "Hina",
  "Sana",
  "Amna",
  "Iqra",
  "Noor",
  "Laiba",
  "Mahnoor",
  "Rimsha",
  "Aliza",
  "Sidra",
  "Arooj",
];
const FATHER_NAMES = [
  "Gul Zaman",
  "Shah Nawaz",
  "Noor Muhammad",
  "Fazal Rahim",
  "Sher Muhammad",
  "Habib Ullah",
  "Zar Wali",
  "Noor Khan",
  "Said Akbar",
  "Manzoor Ahmad",
  "Bakht Zada",
  "Yar Muhammad",
];

const PRIMARY_SUBJECTS = ["Urdu", "English", "Maths", "Islamiat", "Gen. Science"];
const MIDDLE_SUBJECTS = [
  "Urdu",
  "English",
  "Maths",
  "Islamiat",
  "Gen. Science",
  "Social Studies",
  "Computer",
];
const HIGH_SUBJECTS = [
  "Urdu",
  "English",
  "Maths",
  "Physics",
  "Chemistry",
  "Biology",
  "Islamiat",
  "Pak Studies",
  "Computer",
];

export const studentRecords: StudentRecord[] = (() => {
  const r = mulberry32(2311 * 29);
  const int = (a: number, b: number) => a + Math.floor(r() * (b - a + 1));
  const records: StudentRecord[] = [];
  for (const f of facilities.filter((f) => f.kind === "school")) {
    const day = schoolDays[f.id];
    if (!day) continue;
    for (const cls of day.classes) {
      const totalInClass = cls.enrolledBoys + cls.enrolledGirls;
      // A short demo sample per class; the real enrolment is the class total.
      const sampleSize = Math.min(totalInClass, int(4, 8));
      const isBoys = f.gender === "Boys";
      const subjects =
        cls.className.startsWith("9") || cls.className.startsWith("10")
          ? HIGH_SUBJECTS
          : cls.className.startsWith("6") ||
              cls.className.startsWith("7") ||
              cls.className.startsWith("8")
            ? MIDDLE_SUBJECTS
            : PRIMARY_SUBJECTS;
      for (let i = 0; i < sampleSize; i++) {
        const isMale = isBoys || (f.gender === "Girls" ? false : r() > 0.45);
        const totalDays = int(100, 120);
        records.push({
          id: `STU-${f.code}-${cls.className.replace(/\s/g, "")}-${String(i + 1).padStart(2, "0")}`,
          facilityId: f.id,
          name: isMale
            ? `${STUDENT_FIRST_M[int(0, STUDENT_FIRST_M.length - 1)]} ${PATIENT_LAST[int(0, PATIENT_LAST.length - 1)]}`
            : `${STUDENT_FIRST_F[int(0, STUDENT_FIRST_F.length - 1)]} ${PATIENT_LAST[int(0, PATIENT_LAST.length - 1)]}`,
          fatherName: FATHER_NAMES[int(0, FATHER_NAMES.length - 1)]!,
          age: int(5, 18),
          gender: isMale ? "M" : "F",
          className: cls.className,
          rollNo: i + 1,
          subjects,
          daysAttended: int(Math.floor(totalDays * 0.65), totalDays),
          totalDays,
          attendanceMethod: r() > 0.3 ? "Biometric" : "Manual",
        });
      }
    }
  }
  return records;
})();

export const studentsByFacility: Record<string, StudentRecord[]> = (() => {
  const map: Record<string, StudentRecord[]> = {};
  for (const s of studentRecords) (map[s.facilityId] ??= []).push(s);
  return map;
})();

// ---------- Biometric attendance log ----------
export interface BiometricLog {
  staffId: string;
  facilityId: string;
  name: string;
  designation: string;
  method: "Fingerprint" | "NFC card" | "Manual override";
  checkIn: number;
  checkOut: number | null;
  status: "On time" | "Late" | "Very late" | "Absent";
  date: string;
}

export const biometricLogs: BiometricLog[] = (() => {
  const r = mulberry32(2311 * 31);
  const int = (a: number, b: number) => a + Math.floor(r() * (b - a + 1));
  const EXPECTED_IN = 8 * 60;
  const logs: BiometricLog[] = [];
  for (const f of facilities) {
    const staffList = staffByFacility[f.id] ?? [];
    for (const s of staffList) {
      // The gate only has a record for someone who actually turned up, so
      // anyone absent, on leave or on duty elsewhere has no scan today.
      const mark = todayStatus(s);
      if (mark === "Absent" || mark === "Approved leave" || mark === "Official duty") continue;
      if (mark === "Leave" || mark === "Off-duty" || mark === "On-call") continue;

      // Health rosters carry an explicit Late mark, so the scan must match it.
      // School registers only record Present, so the gate is the sole record of
      // when a teacher actually arrived — which is the point of installing it.
      const arrivalMin =
        mark === "Late"
          ? EXPECTED_IN + int(12, 52)
          : f.kind === "school" && r() < 0.17
            ? EXPECTED_IN + int(12, 48)
            : EXPECTED_IN + int(-12, 9);
      const minutesLate = arrivalMin - EXPECTED_IN;
      const method: BiometricLog["method"] =
        r() > 0.2 ? "Fingerprint" : r() > 0.5 ? "NFC card" : "Manual override";
      logs.push({
        staffId: s.id,
        facilityId: f.id,
        name: s.name,
        designation: s.designation,
        method,
        checkIn: arrivalMin,
        checkOut: r() > 0.3 ? arrivalMin + int(300, 480) : null,
        status: minutesLate > 30 ? "Very late" : minutesLate > 10 ? "Late" : "On time",
        date: TODAY,
      });
    }
  }
  return logs;
})();

export const biometricByFacility: Record<string, BiometricLog[]> = (() => {
  const map: Record<string, BiometricLog[]> = {};
  for (const l of biometricLogs) (map[l.facilityId] ??= []).push(l);
  return map;
})();

// ---------- Weekly attendance register (last 7 working days per school) ----------
export interface DailyAttendanceRow {
  date: string;
  day: string;
  enrolled: number;
  present: number;
  absent: number;
  percentage: number;
  staffTotal: number;
  staffPresent: number;
  staffAbsent: number;
  lateArrivals: number;
  remarks: string;
}

export const weeklyAttendance: Record<string, DailyAttendanceRow[]> = (() => {
  const r = mulberry32(2311 * 37);
  const int = (a: number, b: number) => a + Math.floor(r() * (b - a + 1));
  const map: Record<string, DailyAttendanceRow[]> = {};
  for (const f of facilities.filter((f) => f.kind === "school" && f.operational)) {
    const day = schoolDays[f.id];
    if (!day) continue;
    const enrolled = day.classes.reduce((a, c) => a + c.enrolledBoys + c.enrolledGirls, 0);
    const staffCount = (staffByFacility[f.id] ?? []).length;
    const rows: DailyAttendanceRow[] = [];
    for (let d = 6; d >= 0; d--) {
      const date = addDays(TODAY, -d);
      const wd = weekday(date);
      if (wd === 0 || wd === 6) continue; // schools are closed Saturday and Sunday
      const present = enrolled ? int(Math.floor(enrolled * 0.72), Math.floor(enrolled * 0.95)) : 0;
      const staffP = int(Math.floor(staffCount * 0.78), staffCount);
      const lateArr = int(0, Math.floor(staffCount * 0.15));
      const remarks =
        d === 0
          ? "Today — in progress"
          : enrolled === 0
            ? "No students enrolled"
            : lateArr > 2
              ? "Multiple late arrivals noted"
              : present / enrolled < 0.78
                ? "Low attendance — weather/event"
                : "Normal day";
      rows.push({
        date,
        day: WEEKDAYS[wd]!,
        enrolled,
        present,
        absent: enrolled - present,
        percentage: enrolled ? +((present / enrolled) * 100).toFixed(1) : 0,
        staffTotal: staffCount,
        staffPresent: staffP,
        staffAbsent: staffCount - staffP,
        lateArrivals: lateArr,
        remarks,
      });
    }
    map[f.id] = rows;
  }
  return map;
})();

// ---------- Doctor daily treatment log (per doctor, today's cases) ----------
export interface TreatmentLogEntry {
  id: string;
  doctorStaffId: string;
  facilityId: string;
  timeMin: number;
  patientName: string;
  age: number;
  gender: "M" | "F";
  complaint: string;
  examination: string;
  diagnosis: string;
  treatment: string;
  medicine: string;
  labTests: string | null;
  outcome: "Discharged" | "Admitted" | "Referred" | "Under observation" | "Follow-up advised";
  billingPkr: number;
  waived: boolean;
  followUpDate: string | null;
}

const EXAMINATIONS = [
  "BP 130/85, Temp 101°F, Pulse 92",
  "BP 160/100, Temp 98.6°F, Pulse 78",
  "BP 110/70, Temp 103°F, Pulse 110",
  "BP 120/80, Temp 98°F, Pulse 72",
  "Tenderness RIF, guarding +",
  "Chest clear, SpO2 94%",
  "Swelling R ankle, crepitus +",
  "Throat congested, tonsils enlarged",
  "BP 90/60, dehydrated, weak pulse",
  "Wound 4cm, bleeding controlled",
  "Abdomen soft, mild tenderness",
  "Rash on arms bilateral, no fever",
  "Eye redness bilateral, discharge +",
  "Ear drum intact, fluid behind TM",
  "Foetal heart sound normal, 140 bpm",
  "Pupils equal reactive, GCS 15",
];
const LAB_TESTS = [
  "CBC, ESR",
  "Blood sugar (R), HbA1c",
  "Urine R/E",
  "X-Ray chest PA",
  "X-Ray limb AP/Lat",
  "LFTs",
  "RFTs, Electrolytes",
  "Ultrasound abdomen",
  "Blood C/S",
  "ECG 12-lead",
  null,
  null,
  null,
  null,
];
const TREATMENTS = [
  "IV fluids + antipyretics",
  "Oral medication + rest advised",
  "Wound dressing + tetanus booster",
  "Nebulisation × 3 + steroids",
  "Plaster application + analgesics",
  "IV antibiotics + monitoring",
  "Blood transfusion arranged",
  "Surgical referral made",
  "Observation for 6 hours",
  "Counselling + medication",
  "Normal delivery conducted",
  "Minor surgery under LA",
  "Incision & drainage",
  "Catheterisation + fluids",
  "Eye wash + topical drops",
  "Oral rehydration + zinc",
];

export const treatmentLogs: TreatmentLogEntry[] = (() => {
  const r = mulberry32(2311 * 41);
  const int = (a: number, b: number) => a + Math.floor(r() * (b - a + 1));
  const entries: TreatmentLogEntry[] = [];
  for (const dp of doctorProfiles) {
    // One row per patient the profile says the doctor saw, so the two agree.
    const count = dp.patientsSeenToday;
    for (let i = 0; i < count; i++) {
      const isMale = r() > 0.45;
      const idx = int(0, COMPLAINTS.length - 1);
      const outcomes: TreatmentLogEntry["outcome"][] = [
        "Discharged",
        "Discharged",
        "Discharged",
        "Follow-up advised",
        "Admitted",
        "Referred",
        "Under observation",
      ];
      const waived = r() < 0.35;
      entries.push({
        id: `TL-${dp.staffId}-${String(i + 1).padStart(3, "0")}`,
        doctorStaffId: dp.staffId,
        facilityId: dp.facilityId,
        timeMin: int(8 * 60, 11 * 60 + 30),
        patientName: isMale
          ? `${PATIENT_FIRST_M[int(0, PATIENT_FIRST_M.length - 1)]} ${PATIENT_LAST[int(0, PATIENT_LAST.length - 1)]}`
          : `${PATIENT_FIRST_F[int(0, PATIENT_FIRST_F.length - 1)]} ${PATIENT_LAST[int(0, PATIENT_LAST.length - 1)]}`,
        age: int(1, 80),
        gender: isMale ? "M" : "F",
        complaint: COMPLAINTS[idx]!,
        examination: EXAMINATIONS[int(0, EXAMINATIONS.length - 1)]!,
        diagnosis: DIAGNOSES[idx]!,
        treatment: TREATMENTS[int(0, TREATMENTS.length - 1)]!,
        medicine: MEDICINES[idx]!,
        labTests: LAB_TESTS[int(0, LAB_TESTS.length - 1)] ?? null,
        outcome: outcomes[int(0, outcomes.length - 1)]!,
        billingPkr: waived ? 0 : int(1, 8) * 100,
        waived,
        followUpDate: r() > 0.5 ? addDays(TODAY, int(3, 21)) : null,
      });
    }
  }
  return entries;
})();

export const treatmentLogsByDoctor: Record<string, TreatmentLogEntry[]> = (() => {
  const map: Record<string, TreatmentLogEntry[]> = {};
  for (const t of treatmentLogs) (map[t.doctorStaffId] ??= []).push(t);
  return map;
})();

export const treatmentLogsByFacility: Record<string, TreatmentLogEntry[]> = (() => {
  const map: Record<string, TreatmentLogEntry[]> = {};
  for (const t of treatmentLogs) (map[t.facilityId] ??= []).push(t);
  return map;
})();

// ---------- Facility billing / revenue (health) ----------
export interface FacilityBilling {
  facilityId: string;
  date: string;
  opdFees: number;
  labCharges: number;
  bedCharges: number;
  surgeryFees: number;
  medicineCharges: number;
  totalCollected: number;
  totalWaived: number;
  patientsCharged: number;
  patientsWaived: number;
}

export const facilityBillingToday: Record<string, FacilityBilling> = (() => {
  const r = mulberry32(2311 * 43);
  const int = (a: number, b: number) => a + Math.floor(r() * (b - a + 1));
  const map: Record<string, FacilityBilling> = {};
  for (const f of healthFacilities) {
    const logs = treatmentLogsByFacility[f.id] ?? [];
    const charged = logs.filter((l) => !l.waived);
    const waived = logs.filter((l) => l.waived);
    const opd =
      f.healthType === "DHQ"
        ? int(15000, 35000)
        : f.healthType === "WCH"
          ? int(6000, 15000)
          : int(1000, 5000);
    const lab =
      f.healthType === "DHQ"
        ? int(8000, 20000)
        : f.healthType === "WCH"
          ? int(3000, 10000)
          : int(500, 3000);
    const bed =
      f.healthType === "DHQ"
        ? int(5000, 15000)
        : f.healthType === "WCH"
          ? int(2000, 8000)
          : int(0, 2000);
    const surg =
      f.healthType === "DHQ" ? int(10000, 40000) : f.healthType === "WCH" ? int(2000, 15000) : 0;
    const med =
      f.healthType === "DHQ"
        ? int(12000, 30000)
        : f.healthType === "WCH"
          ? int(5000, 15000)
          : int(1000, 5000);
    map[f.id] = {
      facilityId: f.id,
      date: TODAY,
      opdFees: opd,
      labCharges: lab,
      bedCharges: bed,
      surgeryFees: surg,
      medicineCharges: med,
      totalCollected: opd + lab + bed + surg + med,
      totalWaived: int(2000, 15000),
      patientsCharged: charged.length,
      patientsWaived: waived.length,
    };
  }
  return map;
})();

// ---------- Weekly billing trend (last 7 days per health facility) ----------
export interface DailyBillingRow {
  date: string;
  day: string;
  opdFees: number;
  labCharges: number;
  bedCharges: number;
  surgeryFees: number;
  medicineCharges: number;
  total: number;
  waivedAmount: number;
  patientsTotal: number;
}

export const weeklyBilling: Record<string, DailyBillingRow[]> = (() => {
  const r = mulberry32(2311 * 47);
  const int = (a: number, b: number) => a + Math.floor(r() * (b - a + 1));
  const map: Record<string, DailyBillingRow[]> = {};
  for (const f of healthFacilities) {
    const base = facilityBillingToday[f.id]!;
    const rows: DailyBillingRow[] = [];
    for (let d = 6; d >= 0; d--) {
      const date = addDays(TODAY, -d);
      const wd = weekday(date);
      const scale = wd === 5 ? 0.3 : wd === 0 ? 0.5 : 0.75 + r() * 0.5;
      const opd = Math.round(base.opdFees * scale);
      const lab = Math.round(base.labCharges * scale);
      const bed = Math.round(base.bedCharges * scale);
      const surg = Math.round(base.surgeryFees * scale * (r() > 0.3 ? 1 : 0));
      const med = Math.round(base.medicineCharges * scale);
      rows.push({
        date,
        day: WEEKDAYS[wd]!,
        opdFees: opd,
        labCharges: lab,
        bedCharges: bed,
        surgeryFees: surg,
        medicineCharges: med,
        total: opd + lab + bed + surg + med,
        waivedAmount: Math.round(base.totalWaived * scale),
        patientsTotal: int(
          Math.floor(base.patientsCharged * scale * 0.8),
          Math.ceil(base.patientsCharged * scale * 1.2),
        ),
      });
    }
    map[f.id] = rows;
  }
  return map;
})();

// ---------- Daily student attendance week view (per class per school) ----------
export interface ClassDailyAttendance {
  className: string;
  date: string;
  day: string;
  enrolledBoys: number;
  enrolledGirls: number;
  presentBoys: number;
  presentGirls: number;
  absentBoys: number;
  absentGirls: number;
  percentage: number;
}

export const classDailyAttendance: Record<string, ClassDailyAttendance[]> = (() => {
  const r = mulberry32(2311 * 53);
  const int = (a: number, b: number) => a + Math.floor(r() * (b - a + 1));
  const map: Record<string, ClassDailyAttendance[]> = {};
  for (const f of facilities.filter((f) => f.kind === "school" && f.operational)) {
    const day = schoolDays[f.id];
    if (!day) continue;
    const rows: ClassDailyAttendance[] = [];
    for (let d = 6; d >= 0; d--) {
      const date = addDays(TODAY, -d);
      const wd = weekday(date);
      if (wd === 0 || wd === 6) continue; // schools are closed Saturday and Sunday
      for (const cls of day.classes) {
        const pBoys = int(Math.floor(cls.enrolledBoys * 0.7), cls.enrolledBoys);
        const pGirls = int(Math.floor(cls.enrolledGirls * 0.7), cls.enrolledGirls);
        const total = cls.enrolledBoys + cls.enrolledGirls;
        rows.push({
          className: cls.className,
          date,
          day: WEEKDAYS[wd]!,
          enrolledBoys: cls.enrolledBoys,
          enrolledGirls: cls.enrolledGirls,
          presentBoys: pBoys,
          presentGirls: pGirls,
          absentBoys: cls.enrolledBoys - pBoys,
          absentGirls: cls.enrolledGirls - pGirls,
          percentage: total > 0 ? +(((pBoys + pGirls) / total) * 100).toFixed(1) : 0,
        });
      }
    }
    map[f.id] = rows;
  }
  return map;
})();
