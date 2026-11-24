import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppStateProvider, useApp, type ComplaintInput } from "@/lib/app-state";
import { WORKSPACE_STORAGE_KEY } from "@/lib/workspace-storage";
import { schoolDays, shiftsByFacility, staffByFacility, codedSmsBudget } from "@/data/mock";

const schoolId = "SCH112";
const employee = staffByFacility[schoolId]![0]!;
function day() {
  const record = structuredClone(schoolDays[schoolId]!);
  record.staffStatus[employee.id] = "Absent";
  return record;
}
const complaint: ComplaintInput = {
  facilityIds: ["SCH103", "HF207"],
  title: "پانی کی فراہمی کا مسئلہ",
  description:
    "Inspect the drinking water supply at both institutions and confirm repairs with the school and hospital heads.",
  category: "Sanitation",
  priority: "High",
  owner: "District coordination cell",
};
describe("SMS fallback and automatic admin intake", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });
  it("updates the admin school record automatically after SMS receipt without a manual acknowledgement", () => {
    const { result } = renderHook(useApp, { wrapper: AppStateProvider });
    act(() =>
      result.current.submitReport({ facilityId: schoolId, connection: "sms", schoolDay: day() }),
    );
    expect(result.current.statusFor(schoolId)).toBe("sent");
    expect(result.current.staffStatusFor(employee)).toBe("Not reported");
    act(() => vi.advanceTimersByTime(1800));
    expect(result.current.statusFor(schoolId)).toBe("received");
    expect(result.current.staffStatusFor(employee)).toBe("Absent");
    expect(result.current.smsEntries[0]?.status).toBe("received");
    expect(result.current.reportFor(schoolId)?.segments.received).toBe(
      result.current.reportFor(schoolId)?.segments.total,
    );
  });
  it("carries full hospital handover text and equipment data in multipart SMS", () => {
    const { result } = renderHook(useApp, { wrapper: AppStateProvider });
    const shift = structuredClone(shiftsByFacility["HF203"]!.M);
    shift.handover.faults = [
      "آکسیجن کی فراہمی بند ہے",
      "Generator requires inspection | restore backup",
    ];
    shift.handover.stockOuts = ["IV cannula 22G"];
    shift.opd = 143;
    shift.bedsAvailable = 2;
    act(() =>
      result.current.submitReport({
        facilityId: "HF203",
        connection: "sms",
        shift,
        equipmentOk: false,
      }),
    );
    const payload = result.current.smsEntries[0]!.payload;
    expect(payload).toContain("|E:0|");
    expect(JSON.parse(decodeURIComponent(payload.split("|N:")[1]!))).toEqual(shift.handover);
    expect(result.current.smsEntries[0]!.segments).toBe(codedSmsBudget(payload).segments);
    expect(result.current.smsEntries[0]!.segments).toBeGreaterThan(1);
    act(() => result.current.setRole("deo"));
    act(() => vi.advanceTimersByTime(1800));
    expect(result.current.shiftFor("HF203", "M")?.handover).toEqual(shift.handover);
    expect(result.current.facilityFor("HF203")?.equipment.ok).toBe(false);
    expect(result.current.shiftFor("HF203", "M")?.opd).toBe(143);
  });
  it("creates a multi-institution admin complaint only after the complete SMS is validated", () => {
    const { result } = renderHook(useApp, { wrapper: AppStateProvider });
    let id = "";
    act(() => {
      id = result.current.createComplaint(complaint, "sms");
    });
    expect(result.current.complaints.some((c) => c.id === id)).toBe(false);
    expect(result.current.smsEntries[0]?.status).toBe("sent");
    act(() => vi.advanceTimersByTime(1800));
    expect(result.current.complaints.find((c) => c.id === id)).toMatchObject(complaint);
    expect(result.current.complaints.find((c) => c.id === id)?.timeline.at(-1)?.text).toContain(
      "SMS",
    );
    act(() => vi.advanceTimersByTime(10000));
    expect(result.current.complaints.filter((c) => c.id === id)).toHaveLength(1);
  });
  it("retains no-signal text entries through refresh, then sends them when SMS service returns", () => {
    const first = renderHook(useApp, { wrapper: AppStateProvider });
    let id = "";
    act(() => {
      id = first.result.current.createComplaint(complaint, "none");
    });
    act(() => vi.advanceTimersByTime(10000));
    expect(first.result.current.complaints.some((c) => c.id === id)).toBe(false);
    expect(first.result.current.smsEntries[0]?.status).toBe("saved");
    first.unmount();
    const restored = renderHook(useApp, { wrapper: AppStateProvider });
    expect(restored.result.current.smsEntries[0]?.status).toBe("saved");
    act(() => restored.result.current.sendSavedEntries("SCH103", "sms"));
    expect(restored.result.current.complaints.some((c) => c.id === id)).toBe(false);
    act(() => vi.advanceTimersByTime(1800));
    expect(restored.result.current.complaints.find((c) => c.id === id)?.title).toBe(
      complaint.title,
    );
  });
  it("keeps invalid SMS segments out of the admin complaint register", () => {
    const first = renderHook(useApp, { wrapper: AppStateProvider });
    let id = "";
    act(() => {
      id = first.result.current.createComplaint(complaint, "sms");
    });
    const stored = JSON.parse(window.localStorage.getItem(WORKSPACE_STORAGE_KEY)!);
    stored.smsEntries[0].segments += 1;
    first.unmount();
    window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(stored));
    const restored = renderHook(useApp, { wrapper: AppStateProvider });
    act(() => vi.advanceTimersByTime(1800));
    expect(restored.result.current.complaints.some((c) => c.id === id)).toBe(false);
    expect(restored.result.current.smsEntries[0]?.status).toBe("rejected");
    act(() => restored.result.current.retrySmsEntry(restored.result.current.smsEntries[0]!.id));
    act(() => vi.advanceTimersByTime(1800));
    expect(restored.result.current.complaints.find((c) => c.id === id)?.title).toBe(
      complaint.title,
    );
  });
  it("syncs an admin receipt from another view in the same browser", () => {
    const { result } = renderHook(useApp, { wrapper: AppStateProvider });
    act(() => result.current.createComplaint(complaint, "sms"));
    act(() => vi.advanceTimersByTime(1800));
    const received = window.localStorage.getItem(WORKSPACE_STORAGE_KEY)!;
    act(() => result.current.resetWorkspace());
    expect(result.current.smsEntries).toHaveLength(0);
    act(() =>
      window.dispatchEvent(
        new StorageEvent("storage", { key: WORKSPACE_STORAGE_KEY, newValue: received }),
      ),
    );
    expect(result.current.smsEntries[0]?.status).toBe("received");
    expect(result.current.complaints.at(-1)?.title).toBe(complaint.title);
  });
});
