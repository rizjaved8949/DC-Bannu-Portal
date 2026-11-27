import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useMemo } from "react";
import { useApp } from "@/lib/app-state";

import {
  attendanceTrendFor,
  facilityById,
  REVIEW_TYPES,
  SHIFT_NAMES,
  shifts,
  shiftCoverage,
  TEHSILS,
  type Facility,
  type ReportStatus,
  type ReviewItem,
} from "@/data/mock";
import { TONE_VAR } from "../status";

const AXIS = { fontSize: 12, fill: "var(--ink-muted)" } as const;
const GRID = "var(--line)";
const tooltipStyle = {
  contentStyle: {
    border: "1px solid var(--line)",
    borderRadius: 6,
    fontSize: 13,
    boxShadow: "var(--shadow-pop)",
    padding: "6px 10px",
  },
  labelStyle: { color: "var(--ink)", fontWeight: 600 },
  cursor: { fill: "var(--subtle)" },
} as const;

/** Horizontal stacked bars: facilities per tehsil by reporting state. */
export function CoverageByTehsil({
  facilities,
  statusFor,
}: {
  facilities: Facility[];
  statusFor: (id: string) => ReportStatus;
}) {
  const data = TEHSILS.filter((t) => facilities.some((f) => f.tehsil === t)).map((t) => {
    const list = facilities.filter((f) => f.tehsil === t);
    const count = (pred: (s: ReportStatus) => boolean) =>
      list.filter((f) => pred(statusFor(f.id))).length;
    return {
      tehsil: t,
      Verified: count((s) => s === "verified"),
      "Received or pending": count((s) => s === "received" || s === "pending"),
      "Sent or draft": count((s) => s === "sent" || s === "draft"),
      "Rejected or no report": count((s) => s === "rejected" || s === "none"),
    };
  });
  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 34 + 56)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 12, bottom: 0, left: 4 }}
        barSize={16}
      >
        <CartesianGrid horizontal={false} stroke={GRID} />
        <XAxis type="number" tick={AXIS} allowDecimals={false} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="tehsil"
          tick={AXIS}
          width={72}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip {...tooltipStyle} />
        <Legend
          wrapperStyle={{ fontSize: 12, color: "var(--ink-muted)" }}
          iconType="square"
          iconSize={10}
        />
        <Bar isAnimationActive={false} dataKey="Verified" stackId="a" fill={TONE_VAR.verified} />
        <Bar
          isAnimationActive={false}
          dataKey="Received or pending"
          stackId="a"
          fill={TONE_VAR.sent}
        />
        <Bar
          isAnimationActive={false}
          dataKey="Sent or draft"
          stackId="a"
          fill={TONE_VAR.neutral}
        />
        <Bar
          isAnimationActive={false}
          dataKey="Rejected or no report"
          stackId="a"
          fill={TONE_VAR.problem}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Thin lines: staff attendance % over the last 14 days, schools and health. */
export function AttendanceTrend({
  facilities,
  showSchools = true,
  showHealth = true,
}: {
  facilities: Facility[];
  showSchools?: boolean;
  showHealth?: boolean;
}) {
  const { statusFor, staffStatusFor } = useApp();
  const data = useMemo(
    () => attendanceTrendFor(facilities, statusFor, staffStatusFor),
    [facilities, statusFor, staffStatusFor],
  );
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} interval={1} />
        <YAxis domain={[70, 100]} tick={AXIS} axisLine={false} tickLine={false} unit="%" />
        <Tooltip
          {...tooltipStyle}
          formatter={(v) => (v == null ? "School closed" : `${String(v)}%`)}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: "var(--ink-muted)" }} iconType="plainline" />
        {showSchools && (
          <Line
            isAnimationActive={false}
            type="monotone"
            dataKey="schools"
            name="Schools"
            stroke="var(--edu)"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
          />
        )}
        {showHealth && (
          <Line
            isAnimationActive={false}
            type="monotone"
            dataKey="health"
            name="Health facilities"
            stroke="var(--health)"
            strokeWidth={2}
            dot={false}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Horizontal bars: health shifts below minimum, by shift. */
export function ShiftsBelowMinimum({ facilities }: { facilities: Facility[] }) {
  const { shiftFor } = useApp();
  const ids = new Set(facilities.filter((f) => f.kind === "health").map((f) => f.id));
  const data = (["N", "M", "E"] as const).map((k) => {
    const list = shifts
      .filter((s) => s.key === k && ids.has(s.facilityId))
      .map((s) => shiftFor(s.facilityId, k) ?? s);
    const below = list.filter(
      (s) => s.phase !== "upcoming" && shiftCoverage(s).belowMinimum,
    ).length;
    return {
      shift: `${SHIFT_NAMES[k]}${k === "N" ? " (22 Nov)" : k === "E" ? " (upcoming)" : ""}`,
      "Below minimum": below,
      "At or above minimum": list.filter((s) => s.phase !== "upcoming").length - below,
      "Not assessed yet": list.filter((s) => s.phase === "upcoming").length,
    };
  });
  return (
    <ResponsiveContainer width="100%" height={170}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 12, bottom: 0, left: 4 }}
        barSize={16}
      >
        <CartesianGrid horizontal={false} stroke={GRID} />
        <XAxis type="number" tick={AXIS} allowDecimals={false} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="shift"
          tick={AXIS}
          width={128}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip {...tooltipStyle} />
        <Legend
          wrapperStyle={{ fontSize: 12, color: "var(--ink-muted)" }}
          iconType="square"
          iconSize={10}
        />
        <Bar
          isAnimationActive={false}
          dataKey="Below minimum"
          stackId="a"
          fill={TONE_VAR.problem}
        />
        <Bar
          isAnimationActive={false}
          dataKey="At or above minimum"
          stackId="a"
          fill={TONE_VAR.verified}
        />
        <Bar
          isAnimationActive={false}
          dataKey="Not assessed yet"
          stackId="a"
          fill={TONE_VAR.neutral}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Horizontal bars: open review items by type. */
export function ReviewByType({
  items,
  facilities,
}: {
  items: ReviewItem[];
  facilities: Facility[];
}) {
  const ids = new Set(facilities.map((f) => f.id));
  const data = REVIEW_TYPES.map((t) => {
    const list = items.filter(
      (i) => i.type === t && ids.has(i.facilityId) && facilityById[i.facilityId],
    );
    return {
      type: t,
      Open: list.filter((i) => i.status === "Open").length,
      "In review": list.filter((i) => i.status === "In review").length,
    };
  }).filter((d) => d.Open + d["In review"] > 0);
  if (!data.length)
    return (
      <p className="px-4 py-8 text-center text-sm text-ink-muted">
        No open review items in this scope.
      </p>
    );
  return (
    <ResponsiveContainer width="100%" height={Math.max(170, data.length * 30 + 56)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 12, bottom: 0, left: 4 }}
        barSize={14}
      >
        <CartesianGrid horizontal={false} stroke={GRID} />
        <XAxis type="number" tick={AXIS} allowDecimals={false} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="type"
          tick={AXIS}
          width={160}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip {...tooltipStyle} />
        <Legend
          wrapperStyle={{ fontSize: 12, color: "var(--ink-muted)" }}
          iconType="square"
          iconSize={10}
        />
        <Bar isAnimationActive={false} dataKey="Open" stackId="a" fill={TONE_VAR.pending} />
        <Bar isAnimationActive={false} dataKey="In review" stackId="a" fill={TONE_VAR.sent} />
      </BarChart>
    </ResponsiveContainer>
  );
}
