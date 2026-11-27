import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronRight, House } from "lucide-react";
import { staffById } from "@/data/mock";
import { inRoleScope, useApp } from "@/lib/app-state";
import { sectionForPath } from "./navigation";

/** Links to real parent pages; names stay within the current role's scope. */
export function WorkspaceBreadcrumbs() {
  const location = useRouterState({ select: (state) => state.location });
  const { role, facilityFor, complaints } = useApp();
  const section = sectionForPath(location.pathname);
  const id = location.pathname.split("/").filter(Boolean)[1];
  const search = location.search as Record<string, unknown>;
  let record: string | undefined;
  if (id && (section?.to === "/schools" || section?.to === "/health")) {
    const facility = facilityFor(id);
    record = facility && inRoleScope(role, facility) ? facility.name : "Record unavailable";
  } else if (id && section?.to === "/staff") {
    const staff = staffById[id];
    const facility = staff && facilityFor(staff.facilityId);
    record = staff && facility && inRoleScope(role, facility) ? staff.name : "Record unavailable";
  } else if (section?.to === "/staff" && search["tab"]) {
    record = search["tab"] === "posts" ? "Posts and vacancies" : "Absence and leave exceptions";
  } else if (section?.to === "/inbox" && typeof search["report"] === "string") {
    record = search["report"];
  } else if (section?.to === "/review" && typeof search["item"] === "string") {
    record = search["item"];
  } else if (section?.to === "/complaints" && typeof search["complaint"] === "string") {
    const complaint = complaints.find(
      (item) =>
        item.id === search["complaint"] &&
        item.facilityIds.some((id) => {
          const facility = facilityFor(id);
          return facility && inRoleScope(role, facility);
        }),
    );
    record = complaint?.title ?? "Complaint record";
  }
  return (
    <nav aria-label="Breadcrumb" className="workspace-breadcrumb">
      <Link
        to="/"
        search={{}}
        className="breadcrumb-home"
        aria-label="Go to overview"
        title="Overview"
      >
        <House className="size-4" />
      </Link>
      <ChevronRight className="size-3.5 shrink-0" aria-hidden />
      {record && section ? (
        <>
          <Link to={section.to} search={{}} resetScroll={false} className="breadcrumb-parent">
            {section.label}
          </Link>
          <ChevronRight className="size-3.5 shrink-0" aria-hidden />
          <span className="breadcrumb-current" aria-current="page" title={record}>
            {record}
          </span>
        </>
      ) : (
        <span className="breadcrumb-current" aria-current="page">
          {section?.label ?? "Page"}
        </span>
      )}
    </nav>
  );
}
