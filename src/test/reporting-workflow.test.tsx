import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppStateProvider, useApp } from "@/lib/app-state";
import { WORKSPACE_STORAGE_KEY, restoreWorkspace } from "@/lib/workspace-storage";
import {
  facilityById,
  schoolDays,
  staffByFacility,
  shiftsByFacility,
  NOW_MIN,
  DEMO_SCHOOLS,
} from "@/data/mock";
import { schoolStaffCounts, schoolStudentCounts } from "@/lib/metrics";

const school = facilityById[DEMO_SCHOOLS.fieldExample]!;
const employee = staffByFacility[school.id]![0]!;
function schoolSubmission() {
  const day = structuredClone(schoolDays[school.id]!);
  day.staffStatus[employee.id] = "Absent";
  day.classes = day.classes.map((c) => ({
    ...c,
    presentBoys: Math.max(0, c.enrolledBoys - 2),
    presentGirls: Math.max(0, c.enrolledGirls - 1),
  }));
  return day;
}

describe("Connected reporting workflow", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("keeps offline work through a refresh and updates attendance only after acknowledgement", () => {
    const first = renderHook(useApp, { wrapper: AppStateProvider });
    let id = "";
    act(() => {
      id = first.result.current.submitReport({
        facilityId: school.id,
        connection: "none",
        schoolDay: schoolSubmission(),
      }).id;
    });
    expect(first.result.current.pendingOutbox).toHaveLength(1);
    expect(first.result.current.staffStatusFor(employee)).toBe("Not reported");
    first.unmount();
    const next = renderHook(useApp, { wrapper: AppStateProvider });
    expect(next.result.current.pendingOutbox[0]?.id).toBe(id);
    expect(next.result.current.submissionFor(id)?.schoolDay?.staffStatus[employee.id]).toBe(
      "Absent",
    );
    act(() => next.result.current.deliverReport(id, "online"));
    expect(next.result.current.reportFor(school.id)?.channel).toBe("app");
    expect(next.result.current.reportFor(school.id)?.lifecycle[2]?.label).toBe(
      "Uploaded over mobile data",
    );
    expect(next.result.current.reportFor(school.id)?.status).toBe("received");
    expect(next.result.current.pendingOutbox).toHaveLength(0);
    expect(next.result.current.staffStatusFor(employee)).toBe("Absent");
    const day = next.result.current.schoolDayFor(school.id);
    expect(schoolStaffCounts(school, "received", day).present).toBe(
      Object.values(day!.staffStatus).filter((s) => s === "Present").length,
    );
    expect(schoolStudentCounts(school, "received", day).present).toBe(
      day!.classes.reduce((n, c) => n + c.presentBoys + c.presentGirls, 0),
    );
    expect(
      next.result.current.reviewItems
        .filter((r) => r.facilityId === school.id && r.type === "No report by 10:00")
        .every((r) => r.status === "Closed"),
    ).toBe(true);
    act(() => next.result.current.setReportStatus(id, "verified"));
    expect(next.result.current.reportFor(school.id)?.verifiedAt).toBe(NOW_MIN + 2);
    next.unmount();
    const restored = renderHook(useApp, { wrapper: AppStateProvider });
    expect(restored.result.current.reportFor(school.id)?.status).toBe("verified");
  });

  it("distinguishes SMS delivery from acceptance and retains each revision", () => {
    const { result } = renderHook(useApp, { wrapper: AppStateProvider });
    let firstId = "";
    act(() => {
      firstId = result.current.submitReport({
        facilityId: school.id,
        connection: "sms",
        schoolDay: schoolSubmission(),
      }).id;
    });
    expect(result.current.statusFor(school.id)).toBe("sent");
    act(() => result.current.setReportStatus(firstId, "verified"));
    expect(result.current.statusFor(school.id)).toBe("sent");
    act(() => result.current.deliverReport(firstId));
    expect(result.current.statusFor(school.id)).toBe("received");
    let secondId = "";
    act(() => {
      secondId = result.current.submitReport({
        facilityId: school.id,
        connection: "online",
        schoolDay: schoolSubmission(),
      }).id;
    });
    expect(secondId).not.toBe(firstId);
    expect(result.current.reports.filter((r) => r.facilityId === school.id)).toHaveLength(2);
    expect(result.current.reportFor(school.id)?.id).toBe(secondId);
  });

  it("checks the full school roster and rejects implausible totals before saving", () => {
    const { result } = renderHook(useApp, { wrapper: AppStateProvider });
    const incomplete = schoolSubmission();
    delete incomplete.staffStatus[employee.id];
    expect(() =>
      result.current.submitReport({
        facilityId: school.id,
        connection: "online",
        schoolDay: incomplete,
      }),
    ).toThrow(/full staff roster/);
    const invalid = schoolSubmission();
    invalid.classes[0]!.presentBoys = invalid.classes[0]!.enrolledBoys + 1;
    expect(() =>
      result.current.submitReport({
        facilityId: school.id,
        connection: "online",
        schoolDay: invalid,
      }),
    ).toThrow(/class total/);
    expect(result.current.statusFor(school.id)).toBe("none");
  });

  it("updates health staffing, services, equipment and follow-ups from the same shift report", () => {
    const { result } = renderHook(useApp, { wrapper: AppStateProvider });
    const shift = structuredClone(shiftsByFacility["HF203"]!.M);
    shift.bedsAvailable = 2;
    shift.opd = 127;
    shift.services.Oxygen = false;
    shift.assignments = shift.assignments.map((a) => ({ ...a, status: "Absent" }));
    act(() => {
      result.current.submitReport({
        facilityId: "HF203",
        connection: "online",
        shift,
        equipmentOk: false,
      });
    });
    expect(result.current.shiftFor("HF203", "M")?.opd).toBe(127);
    expect(result.current.shiftFor("HF203", "M")?.bedsAvailable).toBe(2);
    expect(result.current.facilityFor("HF203")?.equipment.ok).toBe(false);
    expect(
      result.current.reviewItems.some(
        (r) =>
          r.facilityId === "HF203" && r.type === "Below minimum staffing" && r.status === "Open",
      ),
    ).toBe(true);
    expect(
      result.current.reviewItems.some(
        (r) =>
          r.facilityId === "HF203" && r.severity === "Critical" && r.detected.includes("Oxygen"),
      ),
    ).toBe(true);
  });

  it("attaches overnight reports to their shift start date", () => {
    const { result } = renderHook(useApp, { wrapper: AppStateProvider });
    let id = "";
    act(() => {
      id = result.current.submitReport({
        facilityId: "HF203",
        connection: "sms",
        shift: structuredClone(shiftsByFacility["HF203"]!.N),
      }).id;
    });
    expect(id).toContain("20261122");
    expect(result.current.reports.find((r) => r.id === id)?.smsPayload).toContain("|20261122|N|");
  });

  it("protects role scope and makes resend requests durable without duplicates", () => {
    const { result } = renderHook(useApp, { wrapper: AppStateProvider });
    const report = result.current.reports.find((r) => r.facilityId === DEMO_SCHOOLS.rejectedSms)!;
    act(() => {
      result.current.requestResend(report.id);
      result.current.requestResend(report.id);
    });
    expect(
      result.current.reviewItems.filter((r) => r.detected === `Resend requested for ${report.id}.`),
    ).toHaveLength(1);
    act(() => result.current.setRole("dho-m"));
    expect(() =>
      result.current.submitReport({
        facilityId: school.id,
        connection: "online",
        schoolDay: schoolSubmission(),
      }),
    ).toThrow(/scope/);
    expect(() =>
      result.current.createFollowUp({
        facilityId: school.id,
        title: "Repair roof",
        note: "Inspect the affected classroom",
        owner: "DEO office",
        severity: "Medium",
      }),
    ).toThrow(/follow-up/);
  });

  it("rejects corrupt browser storage and restores the starting records on reset", () => {
    expect(restoreWorkspace("{broken")).toBeNull();
    expect(
      restoreWorkspace(JSON.stringify({ version: 3, roleId: "dc", extraReports: [{ id: "bad" }] })),
    ).toBeNull();
    window.localStorage.setItem(WORKSPACE_STORAGE_KEY, "{broken");
    const { result } = renderHook(useApp, { wrapper: AppStateProvider });
    act(() =>
      result.current.submitReport({
        facilityId: school.id,
        connection: "online",
        schoolDay: schoolSubmission(),
      }),
    );
    expect(result.current.statusFor(school.id)).toBe("received");
    act(() => result.current.resetWorkspace());
    expect(result.current.statusFor(school.id)).toBe("none");
    expect(result.current.clockMin).toBe(NOW_MIN);
    expect(result.current.feedPaused).toBe(true);
  });
});
