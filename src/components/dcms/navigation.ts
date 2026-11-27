import {
  LayoutDashboard,
  GraduationCap,
  HeartPulse,
  UsersRound,
  MapPinned,
  Inbox,
  ClipboardCheck,
  MessageSquareWarning,
  Smartphone,
} from "lucide-react";

export const PRIMARY_NAV = [
  { to: "/", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/schools", label: "Schools", icon: GraduationCap, department: "Education", dept: "edu" },
  {
    to: "/health",
    label: "Health facilities",
    icon: HeartPulse,
    department: "Health",
    dept: "health",
  },
  { to: "/staff", label: "Staff", icon: UsersRound },
  { to: "/map", label: "Facilities & map", icon: MapPinned },
  { to: "/inbox", label: "Reports inbox", icon: Inbox },
  { to: "/review", label: "Review queue", icon: ClipboardCheck },
  { to: "/complaints", label: "Complaints", icon: MessageSquareWarning },
  { to: "/field-app", label: "Field app", icon: Smartphone },
] as const;

export const SCHOOL_SECTIONS = [
  "register",
  "today",
  "attendance",
  "students",
  "staff",
  "record",
] as const;
export const HEALTH_SECTIONS = [
  "shift",
  "patients",
  "doctors",
  "billing",
  "attendance",
  "record",
] as const;
export type SchoolSection = (typeof SCHOOL_SECTIONS)[number];
export type HealthSection = (typeof HEALTH_SECTIONS)[number];

export function schoolRecordSearch(search: Record<string, unknown>): { section?: SchoolSection } {
  return SCHOOL_SECTIONS.includes(search["section"] as SchoolSection)
    ? { section: search["section"] as SchoolSection }
    : {};
}
export function healthRecordSearch(search: Record<string, unknown>): {
  section?: HealthSection;
  shift?: "M" | "E" | "N";
} {
  return {
    ...(HEALTH_SECTIONS.includes(search["section"] as HealthSection)
      ? { section: search["section"] as HealthSection }
      : {}),
    ...(["M", "E", "N"].includes(search["shift"] as string)
      ? { shift: search["shift"] as "M" | "E" | "N" }
      : {}),
  };
}

export function sectionForPath(pathname: string) {
  return PRIMARY_NAV.find((item) =>
    item.to === "/" ? pathname === "/" : pathname === item.to || pathname.startsWith(item.to + "/"),
  );
}
