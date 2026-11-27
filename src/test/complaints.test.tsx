import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AppStateProvider, useApp, type ComplaintInput } from "@/lib/app-state";
import { EMPTY_COMPLAINT_FILTERS, filterComplaints } from "@/lib/complaints";
import { WORKSPACE_STORAGE_KEY, restoreWorkspace } from "@/lib/workspace-storage";
import { complaints, facilities, facilityById, DEMO_SCHOOLS } from "@/data/mock";

const input: ComplaintInput = {
  facilityIds: [DEMO_SCHOOLS.complaintA, DEMO_SCHOOLS.complaintB, "HF207", DEMO_SCHOOLS.complaintA],
  title: "Inspect water supply at Bannu institutions",
  description:
    "Inspect the listed institutions, restore drinking water and record confirmation from their heads.",
  category: "Sanitation",
  priority: "High",
  owner: "District coordination cell",
};
describe("Institution complaints", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);
  it("registers one complaint across schools and hospitals, deduplicates institutions and persists it", () => {
    const hook = renderHook(useApp, { wrapper: AppStateProvider });
    let id = "";
    act(() => {
      id = hook.result.current.createComplaint(input);
    });
    expect(hook.result.current.complaints.find((c) => c.id === id)?.facilityIds).toEqual([
      DEMO_SCHOOLS.complaintA,
      DEMO_SCHOOLS.complaintB,
      "HF207",
    ]);
    hook.unmount();
    const restored = renderHook(useApp, { wrapper: AppStateProvider });
    expect(restored.result.current.complaints.find((c) => c.id === id)?.title).toBe(input.title);
    act(() =>
      restored.result.current.updateComplaint(id, {
        status: "Resolved",
        owner: "DHO & DEO offices",
        note: "Repairs complete. Institution heads confirmed restored water supply.",
      }),
    );
    expect(restored.result.current.complaints.find((c) => c.id === id)?.timeline).toHaveLength(2);
    expect(
      restoreWorkspace(window.localStorage.getItem(WORKSPACE_STORAGE_KEY))?.complaints.find(
        (c) => c.id === id,
      )?.status,
    ).toBe("Resolved");
  });
  it("requires valid institutions and substantive complaint and resolution details", () => {
    const { result } = renderHook(useApp, { wrapper: AppStateProvider });
    for (const patch of [
      { facilityIds: [] },
      { facilityIds: ["missing"] },
      { title: "a" },
      { description: "short" },
    ]) {
      expect(() => act(() => result.current.createComplaint({ ...input, ...patch }))).toThrow();
    }
    expect(() =>
      act(() =>
        result.current.updateComplaint("CMP-1002", {
          status: "Resolved",
          owner: "DHO office",
          note: "",
        }),
      ),
    ).toThrow();
    expect(result.current.complaints.find((c) => c.id === "CMP-1002")?.status).toBe("Open");
  });
  it("enforces department and area scope for creation and joint complaint updates", () => {
    const { result } = renderHook(useApp, { wrapper: AppStateProvider });
    act(() => result.current.setRole("deo"));
    expect(() => act(() => result.current.createComplaint(input))).toThrow();
    expect(() =>
      act(() =>
        result.current.updateComplaint("CMP-1001", {
          status: "Resolved",
          owner: "DEO office",
          note: "School repairs completed.",
        }),
      ),
    ).toThrow();
    act(() =>
      result.current.createComplaint({
        ...input,
        facilityIds: [DEMO_SCHOOLS.complaintA, DEMO_SCHOOLS.complaintB],
      }),
    );
    act(() => result.current.setRole("ac-domel"));
    expect(() =>
      act(() =>
        result.current.createComplaint({ ...input, facilityIds: [DEMO_SCHOOLS.complaintA] }),
      ),
    ).toThrow();
    act(() =>
      result.current.createComplaint({ ...input, facilityIds: [DEMO_SCHOOLS.fieldExample] }),
    );
  });
  it("combines area, type, institution, status, priority and search filters against the same target", () => {
    const base = {
      ...EMPTY_COMPLAINT_FILTERS,
      area: "Bannu",
      kind: "health",
      facilityId: "HF207",
      status: "In progress",
      priority: "High",
      category: "Sanitation",
      query: "water",
    };
    expect(filterComplaints(complaints, facilities, base).map((c) => c.id)).toEqual(["CMP-1001"]);
    expect(filterComplaints(complaints, facilities, { ...base, area: "Domel" })).toEqual([]);
    const crossArea = { ...complaints[0]!, facilityIds: [DEMO_SCHOOLS.fieldExample, "HF207"] };
    expect(
      filterComplaints([crossArea], facilities, {
        ...EMPTY_COMPLAINT_FILTERS,
        area: "Domel",
        kind: "health",
      }),
    ).toEqual([]);
    const schools = facilities.filter((f) => f.kind === "school");
    expect(
      filterComplaints(complaints, schools, {
        ...EMPTY_COMPLAINT_FILTERS,
        query: facilityById["HF207"]!.name,
      }),
    ).toEqual([]);
    expect(
      filterComplaints(complaints, facilities, {
        ...EMPTY_COMPLAINT_FILTERS,
        locality: "Kakki",
        status: "Open",
      }).map((c) => c.id),
    ).toEqual(["CMP-1002"]);
  });
  it("upgrades saved workspaces without losing prior report or review edits", () => {
    const { result } = renderHook(useApp, { wrapper: AppStateProvider });
    act(() => result.current.setRole("dho"));
    const saved = JSON.parse(window.localStorage.getItem(WORKSPACE_STORAGE_KEY)!);
    delete saved.complaints;
    const restored = restoreWorkspace(JSON.stringify(saved));
    expect(restored?.roleId).toBe("dho");
    expect(restored?.complaints).toEqual(complaints);
    act(() => result.current.resetWorkspace());
    expect(result.current.complaints).toEqual(complaints);
  });
});
