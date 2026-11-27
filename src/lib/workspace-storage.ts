import { z } from "zod";
import {
  facilityById,
  TODAY,
  TEHSILS,
  type Report,
  type Tehsil,
  type ReviewItem,
  type SchoolDay,
  type Shift,
  type Complaint,
  type SmsEntry,
  complaints as baseComplaints,
  COMPLAINT_CATEGORIES,
  COMPLAINT_STATUSES,
} from "@/data/mock";

// v4: schools switched to the real North Waziristan register (new facility ids).
export const WORKSPACE_STORAGE_KEY = "dcms-bannu-workspace-v4";
const facilityId = z.string().refine((id) => !!facilityById[id]);
const minute = z.number().int().min(0).max(1439);
const status = z.enum(["draft", "sent", "received", "pending", "verified", "rejected", "none"]);
const report = z.object({
  id: z.string(),
  facilityId,
  type: z.enum(["A1", "H1"]),
  session: z.enum(["M", "E", "N"]),
  channel: z.enum(["app", "sms"]),
  rosterVersion: z.string(),
  sequence: z.number().int().positive(),
  segments: z.object({
    received: z.number().int().nonnegative(),
    total: z.number().int().positive(),
  }),
  status,
  observedAt: minute.nullable(),
  sentAt: minute.nullable(),
  receivedAt: minute.nullable(),
  verifiedAt: minute.nullable(),
  smsPayload: z.string().nullable(),
  sender: z.object({ registered: z.boolean(), masked: z.string() }),
  totalsPlausible: z.boolean(),
  rejectionReason: z.string().optional(),
  lifecycle: z.array(z.object({ label: z.string(), at: minute.nullable() })),
});
const reviewEvent = z.object({ at: z.string(), text: z.string(), by: z.string().optional() });
const review = z.object({
  id: z.string(),
  facilityId,
  type: z.enum([
    "No report by 10:00",
    "Implausible totals",
    "Below minimum staffing",
    "Roster version mismatch",
    "Stale record",
    "Critical facility issue",
    "Inspector finding",
  ]),
  severity: z.enum(["Critical", "High", "Medium", "Low"]),
  createdDate: z.string(),
  createdMin: minute,
  owner: z.string(),
  status: z.enum(["Open", "In review", "Closed"]),
  detected: z.string(),
  why: z.string(),
  evidence: z.array(z.object({ label: z.string(), value: z.string() })),
  timeline: z.array(reviewEvent),
});
const count = z.number().int().nonnegative().max(100000);
const schoolDay = z.object({
  facilityId,
  staffStatus: z.record(
    z.string(),
    z.enum(["Present", "Absent", "Approved leave", "Official duty"]),
  ),
  classes: z.array(
    z.object({
      className: z.string(),
      enrolledBoys: count,
      enrolledGirls: count,
      presentBoys: count,
      presentGirls: count,
    }),
  ),
});
const shift = z.object({
  id: z.string(),
  facilityId,
  key: z.enum(["M", "E", "N"]),
  date: z.string(),
  startMin: z.number(),
  endMin: z.number(),
  rangeLabel: z.string(),
  phase: z.enum(["completed", "in progress", "upcoming"]),
  required: z.record(z.string(), count),
  assignments: z.array(
    z.object({
      staffId: z.string(),
      role: z.string(),
      status: z.enum(["Present", "Absent", "Leave", "Late", "Replacement", "On-call", "Off-duty"]),
      replacesStaffId: z.string().optional(),
      note: z.string().optional(),
    }),
  ),
  opd: count.nullable(),
  bedsAvailable: count,
  bedsTotal: count,
  services: z.record(z.string(), z.boolean()),
  handover: z.object({
    faults: z.array(z.string()),
    stockOuts: z.array(z.string()),
    interruptions: z.array(z.string()),
    acknowledgedAt: z.number().nullable(),
    acknowledgedBy: z.string().nullable(),
  }),
});
export interface SubmissionData {
  schoolDay?: SchoolDay;
  shift?: Shift;
  equipmentOk?: boolean;
}
export interface StoredWorkspace {
  smsEntries: SmsEntry[];
  complaints: Complaint[];
  version: 3;
  referenceDate: string;
  roleId: "dc" | "deo" | "dho" | "ac-domel";
  filters: {
    department: "All" | "Education" | "Health";
    tehsil: "All" | Tehsil;
    dateRange: "today" | "yesterday" | "7d" | "month";
    shift: "All" | "Morning" | "Evening" | "Night";
  };
  extraReports: Report[];
  overrides: Record<string, { status: Report["status"]; reason?: string; verifiedAt?: number }>;
  submissions: Record<string, SubmissionData>;
  arrivals: string[];
  feedPaused: boolean;
  clockMin: number;
  reviewItems: ReviewItem[];
  poolIndex: number;
}
export const complaintSchema = z.object({
  id: z.string(),
  facilityIds: z.array(facilityId).min(1),
  title: z.string(),
  description: z.string(),
  category: z.enum(COMPLAINT_CATEGORIES),
  priority: z.enum(["Critical", "High", "Medium", "Low"]),
  status: z.enum(COMPLAINT_STATUSES),
  owner: z.string(),
  createdBy: z.string(),
  createdDate: z.string(),
  createdMin: minute,
  timeline: z.array(z.object({ at: z.string(), by: z.string(), text: z.string() })),
});
const workspace = z.object({
  smsEntries: z
    .array(
      z.object({
        id: z.string(),
        kind: z.enum(["report", "complaint"]),
        referenceId: z.string(),
        facilityIds: z.array(facilityId).min(1),
        payload: z.string(),
        status: z.enum(["saved", "sent", "received", "rejected"]),
        createdMin: minute,
        receivedMin: minute.nullable(),
        segments: z.number().int().positive(),
        reason: z.string().optional(),
      }),
    )
    .max(1500)
    .default([]),
  complaints: z.array(complaintSchema).max(1000).default(baseComplaints),
  version: z.literal(3),
  referenceDate: z.literal(TODAY),
  roleId: z.enum(["dc", "deo", "dho", "ac-domel"]),
  filters: z.object({
    department: z.enum(["All", "Education", "Health"]),
    tehsil: z.enum(["All", ...TEHSILS]),
    dateRange: z.enum(["today", "yesterday", "7d", "month"]),
    shift: z.enum(["All", "Morning", "Evening", "Night"]),
  }),
  extraReports: z.array(report).max(500),
  overrides: z.record(
    z.string(),
    z.object({ status, reason: z.string().optional(), verifiedAt: minute.optional() }),
  ),
  submissions: z.record(
    z.string(),
    z.object({
      schoolDay: schoolDay.optional(),
      shift: shift.optional(),
      equipmentOk: z.boolean().optional(),
    }),
  ),
  arrivals: z.array(z.string()).max(100),
  feedPaused: z.boolean(),
  clockMin: minute,
  reviewItems: z.array(review).max(1000),
  poolIndex: z.number().int().nonnegative(),
});
export function restoreWorkspace(raw: string | null): StoredWorkspace | null {
  if (!raw) return null;
  try {
    const result = workspace.safeParse(JSON.parse(raw));
    return result.success ? (result.data as StoredWorkspace) : null;
  } catch {
    return null;
  }
}
