import { describe, expect, it } from "vitest";
import {
  attendanceTrendFor,
  facilities,
  staffByFacility,
  staffHistory,
  TODAY,
  todayStatus,
} from "@/data/mock";

const school = facilities.find((f) => f.kind === "school")!;
const employee = staffByFacility[school.id]![0]!;

describe("Attendance records", () => {
  it("keeps missing attendance distinct from an off day", () => {
    expect(todayStatus(employee, "none")).toBe("Not reported");
    expect(staffHistory(employee.id, 62, "none").at(-1)).toEqual({
      date: TODAY,
      mark: "Not reported",
    });
  });

  it("uses the latest accepted report when deriving staff attendance", () => {
    expect(todayStatus(employee, "verified")).not.toBe("Not reported");
    expect(staffHistory(employee.id, 62, "verified").at(-1)?.mark).not.toBe("Not reported");
  });

  it("shows the same daily history in different period views", () => {
    expect(staffHistory(employee.id, 30)).toEqual(staffHistory(employee.id, 62).slice(-30));
  });

  it("does not populate a filtered-out department's attendance trend", () => {
    const trend = attendanceTrendFor([school]);
    expect(trend).toHaveLength(14);
    expect(trend.every((d) => d.health === null)).toBe(true);
    expect(trend.some((d) => d.schools !== null)).toBe(true);
    expect(attendanceTrendFor([]).every((d) => d.health === null && d.schools === null)).toBe(true);
  });
});
