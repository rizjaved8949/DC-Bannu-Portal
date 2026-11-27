import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { FilterBar } from "@/components/dcms/filter-bar";
import { PageHeader } from "@/components/dcms/page-header";
import { Code, EmptyState, Panel } from "@/components/dcms/section";
import { Segmented } from "@/components/dcms/segmented";
import { Pill, SEVERITY_TONE, StatusBadge } from "@/components/dcms/status";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  daysBetween,
  facilityById,
  hhmm,
  NOW_MIN,
  OFFICERS,
  REVIEW_TYPES,
  TODAY,
  type ReportStatus,
  type ReviewItem,
  type ReviewStatus,
  type ReviewType,
  type Severity,
} from "@/data/mock";
import { downloadCsv } from "@/lib/csv";
import { inRoleScope, useApp } from "@/lib/app-state";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/review")({
  validateSearch: (s: Record<string, unknown>): { item?: string } =>
    typeof s["item"] === "string" ? { item: s["item"] } : {},
  head: () => ({
    meta: [
      { title: "Review queue · DCMS Bannu" },
      {
        name: "description",
        content: "Missing or unusual reports flagged for review, with evidence and next steps.",
      },
      { property: "og:title", content: "Review queue · DCMS Bannu" },
      {
        property: "og:description",
        content: "Missing or unusual reports flagged for review, with evidence and next steps.",
      },
    ],
  }),
  component: ReviewPage,
});

const SEVERITY_ORDER: Severity[] = ["Critical", "High", "Medium", "Low"];
type StatusFilter = "open" | "all" | "closed";

function ageOf(it: ReviewItem, clockMin: number) {
  const days = daysBetween(it.createdDate, TODAY);
  if (days === 0) {
    const m = Math.max(0, clockMin - it.createdMin);
    if (m < 60) return `${m} min`;
    return `${Math.floor(m / 60)} h ${m % 60} min`;
  }
  if (days === 1) return "1 day";
  return `${days} days`;
}

function ReviewPage() {
  const {
    reviewItems,
    updateReviewItem,
    role,
    filters,
    statusFor,
    clockMin,
    reportFor,
    setReportStatus,
  } = useApp();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
  const [type, setType] = useState<"All" | ReviewType>("All");
  const [severity, setSeverity] = useState<"All" | Severity>("All");

  const scoped = useMemo(
    () =>
      reviewItems.filter((it) => {
        const f = facilityById[it.facilityId];
        if (!f || !inRoleScope(role, f)) return false;
        if (filters.department !== "All" && f.department !== filters.department) return false;
        if (filters.tehsil !== "All" && f.tehsil !== filters.tehsil) return false;
        return true;
      }),
    [reviewItems, role, filters],
  );
  const list = useMemo(
    () =>
      scoped
        .filter((it) =>
          statusFilter === "all"
            ? true
            : statusFilter === "closed"
              ? it.status === "Closed"
              : it.status !== "Closed",
        )
        .filter((it) => (type === "All" ? true : it.type === type))
        .filter((it) => (severity === "All" ? true : it.severity === severity))
        .sort(
          (a, b) =>
            SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity) ||
            a.createdDate.localeCompare(b.createdDate) ||
            a.createdMin - b.createdMin,
        ),
    [scoped, statusFilter, type, severity],
  );

  const selectedId = search.item ?? list[0]?.id;
  const selected = scoped.find((it) => it.id === selectedId);
  useEffect(() => {
    if (search.item && selected && selected.status === "Closed" && statusFilter === "open")
      setStatusFilter("all");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.item]);
  const select = (id: string) => navigate({ search: { item: id }, replace: true });

  const exportCsv = () =>
    downloadCsv(
      "dcms-bannu-review-queue-2026-11-23.csv",
      list.map((it) => ({
        ID: it.id,
        Severity: it.severity,
        Type: it.type,
        Facility: facilityById[it.facilityId]?.name ?? "",
        Created: `${it.createdDate} ${hhmm(it.createdMin)}`,
        Owner: it.owner,
        Status: it.status,
        Detected: it.detected,
      })),
    );

  return (
    <div>
      <PageHeader
        title="Review queue"
        urdu="جانچ طلب امور"
        description="Missing or unusual reports are flagged for review. They are not treated as staff misconduct."
      />
      <div className="mt-4">
        <FilterBar
          onExportCsv={exportCsv}
          extra={
            <>
              <Segmented
                size="sm"
                label="Review status"
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  {
                    value: "open",
                    label: "Open and in review",
                    count: scoped.filter((i) => i.status !== "Closed").length,
                  },
                  {
                    value: "closed",
                    label: "Closed",
                    count: scoped.filter((i) => i.status === "Closed").length,
                  },
                  { value: "all", label: "All" },
                ]}
              />
              <label className="flex items-center gap-2 text-xs text-ink-muted">
                Type
                <Select value={type} onValueChange={(v) => setType(v as "All" | ReviewType)}>
                  <SelectTrigger className="h-8 w-[190px]" aria-label="Review type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All types</SelectItem>
                    {REVIEW_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="flex items-center gap-2 text-xs text-ink-muted">
                Severity
                <Select value={severity} onValueChange={(v) => setSeverity(v as "All" | Severity)}>
                  <SelectTrigger className="h-8 w-[120px]" aria-label="Severity">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All</SelectItem>
                    {SEVERITY_ORDER.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
            </>
          }
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <Panel className="xl:col-span-2" title="Items" aside={`${list.length} shown`}>
          {list.length === 0 ? (
            <EmptyState
              title="No review items match these filters."
              hint="Switch to All, or clear the type and severity filters."
            />
          ) : (
            <ul
              className="max-h-[calc(100vh-280px)] divide-y divide-line overflow-y-auto"
              aria-label="Review items"
            >
              {list.map((it) => {
                const f = facilityById[it.facilityId]!;
                const active = it.id === selectedId;
                return (
                  <li key={it.id}>
                    <button
                      type="button"
                      onClick={() => select(it.id)}
                      aria-current={active ? "true" : undefined}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-2.5 text-left hover:bg-subtle",
                        active && "bg-dept-tint hover:bg-dept-tint",
                      )}
                    >
                      <Pill
                        tone={SEVERITY_TONE[it.severity] ?? "neutral"}
                        className="mt-0.5 w-[72px] justify-center"
                      >
                        {it.severity}
                      </Pill>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-ink">{it.type}</span>
                        <span className="block truncate text-xs text-ink-muted">{f.name}</span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-2xs text-ink-muted">
                          <span className="tabular-nums">{ageOf(it, clockMin)} ago</span>
                          <span>·</span>
                          <span>{it.owner}</span>
                          <span>·</span>
                          <span
                            className={cn(
                              it.status === "Closed"
                                ? "text-neutral"
                                : it.status === "In review"
                                  ? "text-sent"
                                  : "text-pending",
                            )}
                          >
                            {it.status}
                          </span>
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <div className="xl:col-span-3">
          {selected ? (
            <ReviewDetail
              key={selected.id}
              item={selected}
              reportStatus={statusFor(selected.facilityId)}
              reportId={reportFor(selected.facilityId)?.id}
              onUpdate={updateReviewItem}
              onVerifyReport={(rid) => setReportStatus(rid, "verified")}
              clockMin={clockMin}
            />
          ) : (
            <Panel>
              <EmptyState
                title="Select an item to see what was detected."
                hint="Items are ordered by severity, then by age."
              />
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

type Action = "verify" | "correction" | "assign" | "close";

function ReviewDetail({
  item: it,
  reportStatus,
  reportId,
  onUpdate,
  onVerifyReport,
  clockMin,
}: {
  item: ReviewItem;
  reportStatus: ReportStatus;
  reportId: string | undefined;
  onUpdate: (id: string, patch: Partial<ReviewItem>, event?: { text: string; by?: string }) => void;
  onVerifyReport: (reportId: string) => void;
  clockMin: number;
}) {
  const f = facilityById[it.facilityId]!;
  const [action, setAction] = useState<Action | null>(null);
  const [officer, setOfficer] = useState<string>("");
  const [note, setNote] = useState("");
  const closed = it.status === "Closed";
  const reset = () => {
    setAction(null);
    setOfficer("");
    setNote("");
  };

  const act = (
    patch: Partial<ReviewItem>,
    eventText: string,
    toastTitle: string,
    status?: ReviewStatus,
  ) => {
    onUpdate(it.id, { ...patch, ...(status ? { status } : {}) }, { text: eventText });
    toast(toastTitle, { description: `${it.id}, ${f.name}` });
    reset();
  };

  return (
    <Panel
      title={
        <span className="flex items-center gap-2">
          <Pill tone={SEVERITY_TONE[it.severity] ?? "neutral"}>{it.severity}</Pill>
          {it.type}
        </span>
      }
      aside={
        <span className="flex items-center gap-2">
          <Code className="text-xs">{it.id}</Code>
          <Pill
            tone={
              it.status === "Closed" ? "neutral" : it.status === "In review" ? "sent" : "pending"
            }
          >
            {it.status}
          </Pill>
        </span>
      }
    >
      <div className="space-y-5 px-4 py-4 text-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <Link
              to={f.kind === "school" ? "/schools/$id" : "/health/$id"}
              params={{ id: f.id }}
              className="text-md font-semibold text-ink hover:text-dept hover:underline"
            >
              {f.name}
            </Link>
            <div className="text-xs text-ink-muted">
              <Code className="text-xs">{f.code}</Code> · {f.tehsil} · {f.typeLabel}
            </div>
          </div>
          <div className="text-xs text-ink-muted">
            Raised {it.createdDate === TODAY ? "today" : `on ${it.createdDate.slice(8)} Nov`} at{" "}
            {hhmm(it.createdMin)} · Owner {it.owner}
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="text-xs font-semibold text-ink-muted">What was detected</h3>
            <p className="mt-1 text-ink">{it.detected}</p>
            <h3 className="mt-3 text-xs font-semibold text-ink-muted">Why it matters</h3>
            <p className="mt-1 text-ink-muted">{it.why}</p>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-ink-muted">Evidence</h3>
            <dl className="mt-1 divide-y divide-line rounded-sm border border-line">
              {it.evidence.map((e) => (
                <div
                  key={e.label}
                  className="flex items-baseline justify-between gap-3 px-3 py-1.5"
                >
                  <dt className="text-xs text-ink-muted">{e.label}</dt>
                  <dd
                    className={cn(
                      "text-right tabular-nums",
                      /^(RPT|SH-|RV0|A1\||H1\|)/.test(e.value) && "code break-all",
                    )}
                  >
                    {e.value}
                  </dd>
                </div>
              ))}
              <div className="flex items-baseline justify-between gap-3 px-3 py-1.5">
                <dt className="text-xs text-ink-muted">Today's report</dt>
                <dd>
                  <StatusBadge status={reportStatus} short />
                </dd>
              </div>
            </dl>
          </div>
        </section>

        <section>
          <h3 className="text-xs font-semibold text-ink-muted">Action timeline</h3>
          <ol className="relative ml-2 mt-2 border-l border-line pl-5">
            {it.timeline.map((ev, i) => (
              <li key={`${ev.at}-${i}`} className="relative pb-2.5 last:pb-0">
                <span
                  aria-hidden
                  className="absolute -left-[26.5px] top-1 size-3 rounded-full border-2 border-dept bg-surface"
                />
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span>
                    {ev.text}
                    {ev.by && <span className="text-xs text-ink-muted"> · {ev.by}</span>}
                  </span>
                  <span className="text-xs tabular-nums text-ink-muted">{ev.at}</span>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-md border border-line bg-subtle p-3">
          <h3 className="text-xs font-semibold text-ink-muted">Next step</h3>
          {closed ? (
            <p className="mt-1 text-ink-muted">
              This item is closed. Reopen it if the facility's next report shows the same pattern.
            </p>
          ) : action === null ? (
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => {
                  if (reportId && (reportStatus === "received" || reportStatus === "pending"))
                    onVerifyReport(reportId);
                  act(
                    {},
                    "Verified: figures checked against the facility record",
                    "Verified",
                    "Closed",
                  );
                }}
              >
                Verify
              </Button>
              <Button size="sm" variant="outline" onClick={() => setAction("correction")}>
                Request correction
              </Button>
              <Button size="sm" variant="outline" onClick={() => setAction("assign")}>
                Assign inspector
              </Button>
              <Button size="sm" variant="outline" onClick={() => setAction("close")}>
                Close with note
              </Button>
            </div>
          ) : action === "correction" ? (
            <div className="mt-2 space-y-2">
              <Label htmlFor="rv-correction">What should the facility correct?</Label>
              <Textarea
                id="rv-correction"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="For example: re-count Class 2 and resend today's report"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={note.trim().length < 4}
                  onClick={() =>
                    act(
                      {},
                      `Correction requested: ${note.trim()}`,
                      "Correction requested",
                      "In review",
                    )
                  }
                >
                  Request correction
                </Button>
                <Button size="sm" variant="outline" onClick={reset}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : action === "assign" ? (
            <div className="mt-2 space-y-2">
              <Label htmlFor="rv-officer">Officer</Label>
              <Select value={officer} onValueChange={setOfficer}>
                <SelectTrigger id="rv-officer" className="h-9 w-full sm:w-80" aria-label="Officer">
                  <SelectValue placeholder="Choose an officer" />
                </SelectTrigger>
                <SelectContent>
                  {OFFICERS.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Label htmlFor="rv-reason">Reason (required)</Label>
              <Textarea
                id="rv-reason"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Why a visit is needed"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={!officer || note.trim().length < 4}
                  onClick={() =>
                    act(
                      { owner: officer.split(",")[0] ?? officer },
                      `Inspector assigned: ${officer}. ${note.trim()}`,
                      "Inspector assigned",
                      "In review",
                    )
                  }
                >
                  Assign inspector
                </Button>
                <Button size="sm" variant="outline" onClick={reset}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-2 space-y-2">
              <Label htmlFor="rv-close">Closing note</Label>
              <Textarea
                id="rv-close"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What was found and why no further action is needed"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={note.trim().length < 4}
                  onClick={() => act({}, `Closed: ${note.trim()}`, "Closed", "Closed")}
                >
                  Close with note
                </Button>
                <Button size="sm" variant="outline" onClick={reset}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
          <p className="mt-2 text-2xs text-ink-muted">
            Actions are recorded on the timeline at {hhmm(Math.max(clockMin, NOW_MIN))}. Nothing
            here is a finding against a person.
          </p>
        </section>
      </div>
    </Panel>
  );
}
