import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppStateProvider, useApp, useScopedFacilities } from "@/lib/app-state";
import { facilities, NOW_MIN, SIMULATION_POOL } from "@/data/mock";

function useWorkspace() {
  return { app: useApp(), scope: useScopedFacilities() };
}

describe("District workspace", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("keeps department and tehsil restrictions when filters are reset", () => {
    const { result } = renderHook(useWorkspace, { wrapper: AppStateProvider });
    expect(result.current.scope).toHaveLength(facilities.length);
    act(() => result.current.app.setRole("deo"));
    expect(result.current.scope.length).toBeGreaterThan(0);
    expect(result.current.scope.every((f) => f.department === "Education")).toBe(true);
    act(() => result.current.app.setFilter("tehsil", "Kakki"));
    expect(result.current.scope.every((f) => f.tehsil === "Kakki")).toBe(true);
    act(() => result.current.app.resetFilters());
    expect(result.current.scope.every((f) => f.department === "Education")).toBe(true);
    act(() => result.current.app.setRole("ac-domel"));
    act(() => result.current.app.resetFilters());
    expect(result.current.scope.length).toBeGreaterThan(0);
    expect(result.current.scope.every((f) => f.tehsil === "Domel")).toBe(true);
  });

  it("applies report verification to all consumers and records the verification time", () => {
    const { result } = renderHook(useWorkspace, { wrapper: AppStateProvider });
    const report = result.current.app.reports.find((r) => r.status === "received")!;
    act(() => result.current.app.setReportStatus(report.id, "verified"));
    expect(result.current.app.statusFor(report.facilityId)).toBe("verified");
    expect(result.current.app.reportFor(report.facilityId)?.verifiedAt).toBe(NOW_MIN);
    expect(result.current.app.reports.find((r) => r.id === report.id)?.status).toBe("verified");
  });

  it("pauses simulated arrivals and resumes with a single new facility report", () => {
    const { result } = renderHook(useWorkspace, { wrapper: AppStateProvider });
    act(() => result.current.app.setFeedPaused(true));
    act(() => vi.advanceTimersByTime(16_000));
    expect(result.current.app.arrivals).toHaveLength(0);
    act(() => result.current.app.setFeedPaused(false));
    act(() => vi.advanceTimersByTime(8_000));
    expect(result.current.app.arrivals).toHaveLength(1);
    expect(result.current.app.reportFor(SIMULATION_POOL[0]!)?.status).toBe("received");
    expect(result.current.app.clockMin).toBe(NOW_MIN + 1);
    expect(
      result.current.app.reports.filter((r) => r.facilityId === SIMULATION_POOL[0]),
    ).toHaveLength(1);
  });

  it("retains review decisions and adds an attributed event to the timeline", () => {
    const { result } = renderHook(useWorkspace, { wrapper: AppStateProvider });
    const item = result.current.app.reviewItems.find((r) => r.status !== "Closed")!;
    act(() =>
      result.current.app.updateReviewItem(
        item.id,
        { status: "Closed" },
        { text: "Closed with a supervisor note", by: "DHO office" },
      ),
    );
    const updated = result.current.app.reviewItems.find((r) => r.id === item.id)!;
    expect(updated.status).toBe("Closed");
    expect(updated.timeline).toHaveLength(item.timeline.length + 1);
    expect(updated.timeline.at(-1)).toMatchObject({
      text: "Closed with a supervisor note",
      by: "DHO office",
    });
  });
});
