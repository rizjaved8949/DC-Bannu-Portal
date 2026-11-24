import { facilityById, type Complaint, type Facility } from "@/data/mock";

export interface ComplaintFilters {
  area: string;
  locality: string;
  kind: string;
  facilityId: string;
  status: string;
  priority: string;
  category: string;
  query: string;
}
export const EMPTY_COMPLAINT_FILTERS: ComplaintFilters = {
  area: "All",
  locality: "All",
  kind: "All",
  facilityId: "All",
  status: "All",
  priority: "All",
  category: "All",
  query: "",
};
export function matchingComplaintFacilities(
  facilities: Facility[],
  filters: Pick<ComplaintFilters, "area" | "locality" | "kind" | "facilityId">,
) {
  return facilities.filter(
    (f) =>
      (filters.area === "All" || f.tehsil === filters.area) &&
      (filters.locality === "All" || f.village === filters.locality) &&
      (filters.kind === "All" || f.kind === filters.kind) &&
      (filters.facilityId === "All" || f.id === filters.facilityId),
  );
}
export function filterComplaints(
  complaints: Complaint[],
  scopedFacilities: Facility[],
  filters: ComplaintFilters,
) {
  const matching = new Set(matchingComplaintFacilities(scopedFacilities, filters).map((f) => f.id));
  const scoped = new Set(scopedFacilities.map((f) => f.id));
  const query = filters.query.trim().toLowerCase();
  return complaints
    .filter(
      (c) =>
        c.facilityIds.some((id) => matching.has(id)) &&
        (filters.status === "All" || c.status === filters.status) &&
        (filters.priority === "All" || c.priority === filters.priority) &&
        (filters.category === "All" || c.category === filters.category) &&
        (!query ||
          [
            c.id,
            c.title,
            c.description,
            c.owner,
            ...c.facilityIds
              .filter((id) => scoped.has(id))
              .map((id) => `${facilityById[id]!.name} ${id}`),
          ].some((text) => text.toLowerCase().includes(query))),
    )
    .sort(
      (a, b) =>
        b.createdDate.localeCompare(a.createdDate) ||
        b.createdMin - a.createdMin ||
        b.id.localeCompare(a.id),
    );
}
