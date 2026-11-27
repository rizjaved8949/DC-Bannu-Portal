import { PaginatedRegister } from "@/components/dcms/paginated-register";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, CircleAlert, Clock3, Download } from "lucide-react";
import { toast } from "sonner";
import {
  COMPLAINT_CATEGORIES,
  COMPLAINT_STATUSES,
  facilityById,
  formatDate,
  hhmm,
  type Complaint,
} from "@/data/mock";
import { useApp, useScopedFacilities } from "@/lib/app-state";
import {
  EMPTY_COMPLAINT_FILTERS,
  filterComplaints,
  matchingComplaintFacilities,
  type ComplaintFilters,
} from "@/lib/complaints";
import { downloadCsv } from "@/lib/csv";
import { PageHeader } from "@/components/dcms/page-header";
import { ComplaintForm, COMPLAINT_SELECT } from "@/components/dcms/complaint-form";
import { KpiTile } from "@/components/dcms/kpi-tile";
import { Code, EmptyState, Panel } from "@/components/dcms/section";
import { Pill, SEVERITY_TONE } from "@/components/dcms/status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

export const Route = createFileRoute("/complaints")({
  validateSearch: (
    s: Record<string, unknown>,
  ): { complaint?: string | undefined; facility?: string | undefined } => ({
    ...(typeof s["complaint"] === "string" ? { complaint: s["complaint"] } : {}),
    ...(typeof s["facility"] === "string" ? { facility: s["facility"] } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Complaints · NWDCMS" },
      {
        name: "description",
        content:
          "Register and track complaints for schools and health facilities across the district.",
      },
    ],
  }),
  component: ComplaintsPage,
});
function ComplaintBadge({ status }: { status: Complaint["status"] }) {
  return (
    <Pill
      tone={status === "Resolved" ? "verified" : status === "In progress" ? "sent" : "pending"}
      icon={
        status === "Resolved" ? (
          <CheckCircle2 />
        ) : status === "In progress" ? (
          <Clock3 />
        ) : (
          <CircleAlert />
        )
      }
    >
      {status}
    </Pill>
  );
}
function ComplaintsPage() {
  const { role } = useApp();
  return <ComplaintWorkspace key={role.id} />;
}
function ComplaintWorkspace() {
  const { complaints } = useApp();
  const scope = useScopedFacilities({ applyFilters: false });
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [filters, setFilters] = useState<ComplaintFilters>(EMPTY_COMPLAINT_FILTERS);
  const ids = new Set(scope.map((f) => f.id));
  const facilityFilter = search.facility && ids.has(search.facility) ? search.facility : "All";
  const effective = { ...filters, facilityId: facilityFilter };
  const scoped = complaints.filter((c) => c.facilityIds.some((id) => ids.has(id)));
  const list = filterComplaints(scoped, scope, effective);
  const selected = scoped.find((c) => c.id === search.complaint);
  const areas = [...new Set(scope.map((f) => f.tehsil))];
  const localities = [
    ...new Set(
      scope
        .filter((f) => filters.area === "All" || f.tehsil === filters.area)
        .map((f) => f.village),
    ),
  ].sort();
  const facilities = matchingComplaintFacilities(scope, { ...filters, facilityId: "All" });
  const set = (key: keyof ComplaintFilters, value: string) => {
    setFilters((f) => ({ ...f, [key]: value, ...(key === "area" ? { locality: "All" } : {}) }));
    if (["area", "locality", "kind"].includes(key) && search.facility)
      navigate({ search: { complaint: search.complaint }, replace: true, resetScroll: false });
  };
  const exportRows = () =>
    downloadCsv(
      "nwdcms-complaints.csv",
      list.map((c) => ({
        ID: c.id,
        Title: c.title,
        Category: c.category,
        Priority: c.priority,
        Status: c.status,
        Owner: c.owner,
        Institutions: c.facilityIds
          .filter((id) => ids.has(id))
          .map((id) => facilityById[id]!.name)
          .join("; "),
        Details: c.description,
        Created: c.createdDate,
      })),
    );
  const control = (
    label: string,
    key: keyof ComplaintFilters,
    options: readonly string[],
    all: string,
  ) => (
    <label className="min-w-0 space-y-1 text-sm">
      {label}
      <select
        aria-label={label}
        className={COMPLAINT_SELECT}
        value={filters[key]}
        onChange={(e) => set(key, e.target.value)}
      >
        <option value="All">{all}</option>
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </label>
  );
  return (
    <div className="space-y-5">
      <PageHeader
        title="Complaints"
        description="Raise and track institution complaints, including joint action across schools and health facilities in an area."
      >
        <ComplaintForm />
      </PageHeader>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile
          label="Open complaints"
          value={scoped.filter((c) => c.status === "Open").length}
          sub="Awaiting action"
        />
        <KpiTile
          label="In progress"
          value={scoped.filter((c) => c.status === "In progress").length}
          sub="Assigned and being followed up"
        />
        <KpiTile
          label="Resolved"
          value={scoped.filter((c) => c.status === "Resolved").length}
          sub="Resolution recorded"
        />
        <KpiTile
          label="Institutions affected"
          value={
            new Set(
              scoped
                .filter((c) => c.status !== "Resolved")
                .flatMap((c) => c.facilityIds.filter((id) => ids.has(id))),
            ).size
          }
          sub="Across open and active complaints"
        />
      </div>
      <Panel
        title="Find complaints"
        aside={`${list.length} of ${scoped.length} complaints in your role scope`}
        bodyClassName="space-y-3 p-4"
      >
        <Input
          aria-label="Search complaints"
          placeholder="Search complaint ID, title, institution or assigned owner…"
          value={filters.query}
          onChange={(e) => set("query", e.target.value)}
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {control("Tehsil / area", "area", areas, "All areas")}
          {control("Locality", "locality", localities, "All localities")}
          <label className="space-y-1 text-sm">
            Institution type
            <select
              aria-label="Institution type"
              className={COMPLAINT_SELECT}
              value={filters.kind}
              onChange={(e) => set("kind", e.target.value)}
            >
              <option value="All">Schools & hospitals</option>
              <option value="school">Schools</option>
              <option value="health">Hospitals & health facilities</option>
            </select>
          </label>
          <label className="min-w-0 space-y-1 text-sm">
            Institution
            <select
              aria-label="Institution"
              className={COMPLAINT_SELECT}
              value={facilityFilter}
              onChange={(e) =>
                navigate({
                  search: {
                    facility: e.target.value === "All" ? undefined : e.target.value,
                    complaint: search.complaint,
                  },
                  replace: true,
                  resetScroll: false,
                })
              }
            >
              <option value="All">All matching institutions</option>
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>
          {control("Status", "status", COMPLAINT_STATUSES, "All statuses")}
          {control("Priority", "priority", ["Critical", "High", "Medium", "Low"], "All priorities")}
          {control("Category", "category", COMPLAINT_CATEGORIES, "All categories")}
          <div className="flex items-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setFilters(EMPTY_COMPLAINT_FILTERS);
                navigate({ search: {}, replace: true, resetScroll: false });
              }}
            >
              Reset filters
            </Button>
            <Button variant="outline" onClick={exportRows} disabled={!list.length}>
              <Download />
              CSV
            </Button>
          </div>
        </div>
      </Panel>
      <Panel title="Complaint register" aside="One record can cover multiple institutions">
        {list.length ? (
          <PaginatedRegister items={list} label="complaints" resetKey={JSON.stringify(effective)}>
            {(pageRows) => (
              <table className="ledger">
                <thead>
                  <tr>
                    <th scope="col">Complaint</th>
                    <th scope="col">Affected institutions</th>
                    <th scope="col">Priority</th>
                    <th scope="col">Assigned to</th>
                    <th scope="col">Status</th>
                    <th scope="col">Registered</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((c) => {
                    const targets = scope.filter((f) => c.facilityIds.includes(f.id));
                    return (
                      <tr key={c.id}>
                        <td data-label="Complaint">
                          <Link
                            className="font-semibold text-dept hover:underline"
                            to="/complaints"
                            search={{ ...search, complaint: c.id }}
                          >
                            {c.title}
                          </Link>
                          <span className="mt-1 block text-xs text-ink-muted">
                            <Code>{c.id}</Code> · {c.category}
                          </span>
                        </td>
                        <td data-label="Affected institutions">
                          <span className="font-semibold num">{targets.length}</span> in your scope
                          <span className="block text-xs text-ink-muted">
                            {[...new Set(targets.map((f) => f.tehsil))].join(", ")}
                          </span>
                          <span className="block max-w-xs text-xs text-ink-muted">
                            {targets.map((f) => f.name).join("; ")}
                          </span>
                        </td>
                        <td data-label="Priority">
                          <Pill tone={SEVERITY_TONE[c.priority]!}>{c.priority}</Pill>
                        </td>
                        <td data-label="Assigned to">{c.owner}</td>
                        <td data-label="Status">
                          <ComplaintBadge status={c.status} />
                        </td>
                        <td data-label="Registered" className="num">
                          {formatDate(c.createdDate)}
                          <span className="block text-xs text-ink-muted">{hhmm(c.createdMin)}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </PaginatedRegister>
        ) : (
          <EmptyState
            title="No complaints match these filters"
            hint="Change the area, institution or status filters, or register a new complaint."
          />
        )}
      </Panel>
      {search.complaint && !selected && (
        <p className="panel p-4 text-sm text-ink-muted">
          This complaint is unavailable in your role scope.
        </p>
      )}
      <Sheet
        open={!!selected}
        onOpenChange={(open) => {
          if (!open)
            navigate({ search: { facility: search.facility }, replace: true, resetScroll: false });
        }}
      >
        <SheetContent className="overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{selected?.title ?? "Complaint record"}</SheetTitle>
            <SheetDescription>
              {selected?.id} · Complaint record and action history
            </SheetDescription>
          </SheetHeader>
          {selected && (
            <ComplaintDetail
              key={`${selected.id}-${scope.map((f) => f.id).join()}`}
              complaint={selected}
              scopeIds={ids}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
function ComplaintDetail({
  complaint: c,
  scopeIds,
}: {
  complaint: Complaint;
  scopeIds: Set<string>;
}) {
  const { updateComplaint } = useApp();
  const [status, setStatus] = useState(c.status);
  const [owner, setOwner] = useState(c.owner);
  const [note, setNote] = useState("");
  const canEdit = c.facilityIds.every((id) => scopeIds.has(id));
  const targets = c.facilityIds.filter((id) => scopeIds.has(id)).map((id) => facilityById[id]!);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      updateComplaint(c.id, { status, owner, note });
      setNote("");
      toast.success("Complaint updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Check the update.");
    }
  };
  return (
    <div className="space-y-5 p-5 pt-2">
      <div className="flex flex-wrap gap-2">
        <ComplaintBadge status={c.status} />
        <Pill tone={SEVERITY_TONE[c.priority]!}>{c.priority}</Pill>
        <span className="text-sm text-ink-muted">{c.category}</span>
      </div>
      <p className="whitespace-pre-wrap break-words text-sm">{c.description}</p>
      <dl className="grid grid-cols-2 gap-3 rounded-md border border-line bg-subtle p-3 text-sm">
        <div>
          <dt className="text-ink-muted">Registered by</dt>
          <dd className="font-semibold">{c.createdBy}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Assigned owner</dt>
          <dd className="break-words font-semibold">{c.owner}</dd>
        </div>
      </dl>
      <section>
        <h3 className="mb-2 text-sm font-semibold">
          Affected institutions · {targets.length} in your scope
        </h3>
        <ul className="divide-y divide-line rounded-md border border-line">
          {targets.map((f) => (
            <li key={f.id} className="p-3 text-sm">
              <Link
                to={f.kind === "school" ? "/schools/$id" : "/health/$id"}
                params={{ id: f.id }}
                className="font-semibold text-dept hover:underline"
              >
                {f.name}
              </Link>
              <p className="text-xs text-ink-muted">
                {f.code} · {f.village} · {f.tehsil} ·{" "}
                {f.kind === "school" ? "School" : "Health facility"}
              </p>
            </li>
          ))}
        </ul>
      </section>
      {canEdit ? (
        <form className="space-y-3 rounded-md border border-line p-4" onSubmit={submit}>
          <h3 className="font-semibold">Record action or resolution</h3>
          <label className="block space-y-1 text-sm">
            Update status
            <select
              aria-label="Update status"
              className={COMPLAINT_SELECT}
              value={status}
              onChange={(e) => setStatus(e.target.value as Complaint["status"])}
            >
              {COMPLAINT_STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <div className="space-y-1">
            <Label htmlFor="update-owner">Assigned owner / office</Label>
            <Input
              id="update-owner"
              maxLength={120}
              required
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="complaint-note">
              {status === "Resolved"
                ? "Resolution and confirmation"
                : "Action taken / progress note"}
            </Label>
            <Textarea
              id="complaint-note"
              required
              minLength={5}
              maxLength={5000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                status === "Resolved"
                  ? "Describe what was fixed and who confirmed it."
                  : "Record the action taken and next step."
              }
            />
          </div>
          <Button type="submit" disabled={note.trim().length < 5 || !owner.trim()}>
            Save update
          </Button>
        </form>
      ) : (
        <p className="rounded-md border border-line bg-subtle p-3 text-sm text-ink-muted">
          This joint complaint includes institutions outside your scope. A district-wide
          administrator must update its status or ownership.
        </p>
      )}
      <section>
        <h3 className="mb-3 text-sm font-semibold">Action history</h3>
        <ol className="space-y-3 border-l border-line pl-4">
          {[...c.timeline].reverse().map((event, index) => (
            <li key={index} className="text-sm">
              <p className="whitespace-pre-wrap break-words">{event.text}</p>
              <p className="mt-1 text-xs text-ink-muted">
                {event.at} · {event.by}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
