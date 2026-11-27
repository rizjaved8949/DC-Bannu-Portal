import { Link } from "@tanstack/react-router";
import { Building2, GraduationCap, HeartPulse, UsersRound } from "lucide-react";
import { staffByFacility, type Facility } from "@/data/mock";
import { useApp } from "@/lib/app-state";

export function DistrictRegister({ facilities }: { facilities: Facility[] }) {
  const { schoolDayFor, role } = useApp();
  const schools = facilities.filter((f) => f.kind === "school");
  const hospitals = facilities.filter((f) => f.kind === "health");
  const staff = facilities.reduce((sum, f) => sum + (staffByFacility[f.id]?.length ?? 0), 0);
  const students = schools.reduce(
    (sum, f) =>
      sum +
      (schoolDayFor(f.id)?.classes.reduce(
        (total, c) => total + c.enrolledBoys + c.enrolledGirls,
        0,
      ) ?? 0),
    0,
  );
  return (
    <section className="district-register" aria-label="District institution register">
      <div className="register-intro">
        <div className="mb-3 flex items-center gap-2 text-sm">
          <Building2 className="size-4" />
          District register
        </div>
        <div className="flex items-baseline gap-3">
          <strong className="num text-[42px] leading-none">{facilities.length}</strong>
          <span className="text-sm text-topbar-muted">registered institutions</span>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-topbar-muted">
          One record for every registered school and public health facility, including those yet to
          report.
        </p>
      </div>
      {role.department !== "Health" && (
        <Link to="/schools" data-dept="edu" className="register-stat">
          <GraduationCap className="size-5 text-edu" />
          <div>
            <p className="num text-[30px] font-bold leading-tight">{schools.length}</p>
            <p className="font-semibold">Government schools</p>
            <p className="mt-1 text-xs text-ink-muted">
              {students.toLocaleString("en")} students enrolled
            </p>
          </div>
        </Link>
      )}
      {role.department !== "Education" && (
        <Link to="/health" data-dept="health" className="register-stat">
          <HeartPulse className="size-5 text-health" />
          <div>
            <p className="num text-[30px] font-bold leading-tight">{hospitals.length}</p>
            <p className="font-semibold">Public health facilities</p>
            <p className="mt-1 text-xs text-ink-muted">Shifts, services and bed capacity</p>
          </div>
        </Link>
      )}
      <Link to="/staff" className="register-stat">
        <UsersRound className="size-5 text-dept" />
        <div>
          <p className="num text-[30px] font-bold leading-tight">{staff.toLocaleString("en")}</p>
          <p className="font-semibold">Staff on the register</p>
          <p className="mt-1 text-xs text-ink-muted">Posting, attendance and vacancies</p>
        </div>
      </Link>
    </section>
  );
}
