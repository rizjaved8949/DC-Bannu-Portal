import { PaginatedRegister } from "@/components/dcms/paginated-register";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Info, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { ChannelLabel } from "@/components/dcms/channel";
import { FilterBar } from "@/components/dcms/filter-bar";
import { KpiTile } from "@/components/dcms/kpi-tile";
import { PageHeader } from "@/components/dcms/page-header";
import { Code, EmptyState, Panel } from "@/components/dcms/section";
import { Segmented } from "@/components/dcms/segmented";
import { SortTh } from "@/components/dcms/sort-header";
import { StatusBadge, StatusGlyph } from "@/components/dcms/status";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  facilityById,
  codedSmsBudget,
  formatDate,
  hhmm,
  REPORT_STATUS_ORDER,
  SHIFT_NAMES,
  staffByFacility,
  STATUS_LABEL,
  type Channel,
  type Report,
  type ReportStatus,
} from "@/data/mock";
import { downloadCsv } from "@/lib/csv";
import { inRoleScope, useApp } from "@/lib/app-state";
import { useSort } from "@/lib/use-sort";
import { cn } from "@/lib/utils";
import { SmsAdminIntake } from "@/components/dcms/sms-delivery";

export const Route = createFileRoute("/inbox")({
  validateSearch: (s: Record<string, unknown>): { report?: string } =>
    typeof s["report"] === "string" ? { report: s["report"] } : {},
  head: () => ({
    meta: [
      { title: "Reports inbox · DCMS Bannu" },
      {
        name: "description",
        content: "Today's app and SMS reports with validation checks and lifecycle.",
      },
      { property: "og:title", content: "Reports inbox · DCMS Bannu" },
      {
        property: "og:description",
        content: "Today's app and SMS reports with validation checks and lifecycle.",
      },
    ],
  }),
  component: InboxPage,
});

type Col = "received" | "facility" | "channel" | "id" | "roster" | "segments" | "status";

function InboxPage() {
  const { reports, role, filters, setReportStatus, resetFilters, reportFor } = useApp();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [channel, setChannel] = useState<"All" | Channel>("All");
  const [status, setStatus] = useState<"All" | ReportStatus>("All");

  const rows = useMemo(
    () =>
      reports
        .filter((r) => {
          const f = facilityById[r.facilityId];
          if (!f || !inRoleScope(role, f)) return false;
          if (filters.department !== "All" && f.department !== filters.department) return false;
          if (filters.tehsil !== "All" && f.tehsil !== filters.tehsil) return false;
          if (channel !== "All" && r.channel !== channel) return false;
          if (status !== "All" && r.status !== status) return false;
          return true;
        })
        .map((r) => ({ r, f: facilityById[r.facilityId]! })),
    [reports, role, filters, channel, status],
  );

  const { sorted, key, dir, toggle } = useSort<(typeof rows)[number], Col>(
    rows,
    {
      received: (x) => x.r.receivedAt ?? x.r.sentAt ?? -1,
      facility: (x) => x.f.name,
      channel: (x) => x.r.channel,
      id: (x) => x.r.id,
      roster: (x) => x.r.rosterVersion,
      segments: (x) => x.r.segments.received / x.r.segments.total,
      status: (x) => REPORT_STATUS_ORDER.indexOf(x.r.status),
    },
    "received",
    "desc",
  );

  const selected = search.report
    ? reports.find(
        (r) =>
          r.id === search.report &&
          !!facilityById[r.facilityId] &&
          inRoleScope(role, facilityById[r.facilityId]!),
      )
    : undefined;
  const open = (id: string | null) =>
    navigate({ search: id ? { report: id } : {}, replace: true, resetScroll: false });

  const sms = rows.filter((x) => x.r.channel === "sms").length;
  const awaiting = rows.filter(
    (x) => x.r.status === "sent" && reportFor(x.r.facilityId)?.id === x.r.id,
  ).length;
  const rejected = rows.filter(
    (x) => x.r.status === "rejected" && reportFor(x.r.facilityId)?.id === x.r.id,
  ).length;
  const pending = rows.filter((x) => x.r.status === "received" || x.r.status === "pending").length;

  const exportCsv = () =>
    downloadCsv(
      "dcms-bannu-inbox-2026-11-23.csv",
      sorted.map((x) => ({
        Received: x.r.receivedAt != null ? hhmm(x.r.receivedAt) : "",
        Facility: x.f.name,
        Code: x.f.code,
        Channel: x.r.channel === "sms" ? "SMS" : "App",
        "Report ID": x.r.id,
        "Roster version": x.r.rosterVersion,
        Segments: `${x.r.segments.received} of ${x.r.segments.total}`,
        Status: STATUS_LABEL[x.r.status],
        "Raw SMS": x.r.smsPayload ?? "",
      })),
    );

  return (
    <div>
      <PageHeader
        title="Reports inbox"
        description="Every report that reached the district today, by app or SMS, with its checks and lifecycle. Click a row to inspect it."
      />
      <div className="mt-4">
        <SmsAdminIntake />
      </div>
      <div className="mt-4">
        <FilterBar
          onExportCsv={exportCsv}
          extra={
            <>
              <Segmented
                size="sm"
                label="Channel"
                value={channel}
                onChange={setChannel}
                options={[
                  { value: "All", label: "All channels" },
                  { value: "app", label: "App" },
                  { value: "sms", label: "SMS" },
                ]}
              />
              <Segmented
                size="sm"
                label="Status"
                value={status}
                onChange={setStatus}
                options={[
                  { value: "All", label: "All statuses" },
                  { value: "sent", label: "Sent" },
                  { value: "received", label: "Received" },
                  { value: "pending", label: "Pending" },
                  { value: "verified", label: "Verified" },
                  { value: "rejected", label: "Rejected" },
                ]}
              />
            </>
          }
        />
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile
          label="Reports today"
          value={rows.length}
          sub={`${sms} by SMS, ${rows.length - sms} by app`}
          tone="sent"
          freshness="App and SMS reporting register"
        />
        <KpiTile
          label="Awaiting acknowledgement"
          value={awaiting}
          sub="sent by the phone, not yet accepted"
          tone={awaiting ? "pending" : "neutral"}
          freshness="SMS delivery is not acceptance"
        />
        <KpiTile
          label="To verify"
          value={pending}
          sub="accepted, not yet checked by an officer"
          tone="pending"
          freshness="Verify from the drawer"
        />
        <KpiTile
          label="Rejected"
          value={rejected}
          sub="need a resend from the facility"
          tone={rejected ? "problem" : "neutral"}
          freshness="Roster, sender or segment problems"
        />
      </div>

      <div className="mb-4 flex items-start gap-2 rounded-md border border-sent/30 bg-sent-tint px-3 py-2 text-sm text-sent">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        <p>
          SMS delivery is not acceptance. Only a server acknowledgement marks a report as received.
        </p>
      </div>

      <Panel title="Today's reports" aside={`${sorted.length} matching reports`}>
        {sorted.length === 0 ? (
          <EmptyState
            title="No reports match these filters."
            hint="Clear the channel or status filter, or widen the tehsil."
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  resetFilters();
                  setChannel("All");
                  setStatus("All");
                }}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <PaginatedRegister
            items={sorted}
            label="reports"
            resetKey={JSON.stringify([role.id, filters, channel, status, key, dir])}
          >
            {(pageRows) => (
              <table className="ledger">
                <thead>
                  <tr>
                    <SortTh id="received" active={key} dir={dir} onSort={toggle} num>
                      Received
                    </SortTh>
                    <SortTh id="facility" active={key} dir={dir} onSort={toggle}>
                      Facility
                    </SortTh>
                    <SortTh id="channel" active={key} dir={dir} onSort={toggle}>
                      Channel
                    </SortTh>
                    <SortTh id="id" active={key} dir={dir} onSort={toggle}>
                      Report ID
                    </SortTh>
                    <SortTh id="roster" active={key} dir={dir} onSort={toggle}>
                      Roster
                    </SortTh>
                    <SortTh id="segments" active={key} dir={dir} onSort={toggle}>
                      Segments
                    </SortTh>
                    <SortTh id="status" active={key} dir={dir} onSort={toggle}>
                      Status
                    </SortTh>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map(({ r, f }) => (
                    <tr
                      key={r.id}
                      tabIndex={0}
                      role="button"
                      aria-label={`Open report ${r.id}`}
                      onClick={() => open(r.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          open(r.id);
                        }
                      }}
                      className={cn(
                        "cursor-pointer",
                        selected?.id === r.id && "bg-dept-tint hover:bg-dept-tint",
                      )}
                    >
                      <td data-label="Received" className="num">
                        {r.receivedAt != null ? (
                          hhmm(r.receivedAt)
                        ) : (
                          <span className="text-ink-muted">Sent {hhmm(r.sentAt)}</span>
                        )}
                      </td>
                      <td data-label="Facility">
                        <span className="font-semibold text-ink">{f.name}</span>
                        <span className="block text-xs text-ink-muted">
                          {f.tehsil} · <Code className="text-xs text-ink-muted">{f.code}</Code>
                        </span>
                      </td>
                      <td data-label="Channel">
                        <ChannelLabel channel={r.channel} />
                      </td>
                      <td data-label="Report ID">
                        <Code>{r.id}</Code>
                      </td>
                      <td data-label="Roster">
                        <Code className={cn(r.rosterVersion !== f.rosterVersion && "text-problem")}>
                          {r.rosterVersion}
                        </Code>
                      </td>
                      <td
                        data-label="Segments"
                        className={cn(
                          r.segments.received < r.segments.total && "font-semibold text-problem",
                        )}
                      >
                        {r.segments.received} of {r.segments.total}
                      </td>
                      <td data-label="Status">
                        <StatusBadge status={r.status} short />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </PaginatedRegister>
        )}
      </Panel>

      <ReportDrawer
        key={selected?.id ?? "closed"}
        report={selected}
        onClose={() => open(null)}
        onStatus={setReportStatus}
      />
    </div>
  );
}

const SESSION_WORD: Record<string, string> = { M: "Morning", E: "Evening", N: "Night" };

function parsePayload(
  r: Report,
  payload: string,
): { field: string; value: string; meaning: string }[] {
  const f = facilityById[r.facilityId];
  const staff = staffByFacility[r.facilityId] ?? [];
  const nameOf = (code: string) => staff.find((s) => s.code === code)?.name ?? "Unknown code";
  const parts = payload.split("|");
  const out: { field: string; value: string; meaning: string }[] = [];
  parts.forEach((p, i) => {
    if (i === 0)
      out.push({
        field: "Report type",
        value: p,
        meaning: p === "A1" ? "School day attendance" : "Health shift report",
      });
    else if (i === 1)
      out.push({
        field: "Facility",
        value: p,
        meaning: facilityById[p]?.name ?? "Not in registry",
      });
    else if (i === 2)
      out.push({
        field: "Date",
        value: p,
        meaning: formatDate(`${p.slice(0, 4)}-${p.slice(4, 6)}-${p.slice(6, 8)}`, true),
      });
    else if (i === 3)
      out.push({
        field: r.type === "A1" ? "Session" : "Shift",
        value: p,
        meaning: `${SESSION_WORD[p] ?? p}${r.type === "A1" ? " session" : " shift"}`,
      });
    else if (i === 4)
      out.push({
        field: "Roster version",
        value: p,
        meaning:
          p === f?.rosterVersion
            ? "Matches the current roster"
            : `Current roster is ${f?.rosterVersion}`,
      });
    else if (i === 5)
      out.push({
        field: "Report sequence",
        value: p,
        meaning: `Report number ${Number(p.slice(1))} from this phone today`,
      });
    else if (p.startsWith("A:")) {
      const codes = p.slice(2).split(",").filter(Boolean);
      out.push({
        field: "Absent staff codes",
        value: p.slice(2),
        meaning: codes.map(nameOf).join(", "),
      });
    } else if (p.startsWith("L:")) {
      const codes = p.slice(2).split(",").filter(Boolean);
      out.push({ field: "Leave codes", value: p.slice(2), meaning: codes.map(nameOf).join(", ") });
    } else if (p.startsWith("D:")) {
      out.push({
        field: "Official duty codes",
        value: p.slice(2),
        meaning: p.slice(2).split(",").map(nameOf).join(", "),
      });
    } else if (p.startsWith("S:")) {
      out.push({
        field: "Class attendance",
        value: p.slice(2),
        meaning: p
          .slice(2)
          .split(",")
          .map((entry) => {
            const [grade, totals] = entry.split("=");
            return `${grade === "K" ? "Katchi" : "Class " + grade}: ${totals?.replace("/", " boys / ")} girls`;
          })
          .join("; "),
      });
    } else if (p.startsWith("B:")) {
      out.push({
        field: "Bed availability",
        value: p.slice(2),
        meaning: `${p.slice(2).replace("/", " available of ")} total beds`,
      });
    } else if (p.startsWith("P:")) {
      out.push({
        field: "OPD count",
        value: p.slice(2),
        meaning: "Outpatient visits recorded for this shift",
      });
    } else if (p.startsWith("V:")) {
      out.push({
        field: "Service availability",
        value: p.slice(2),
        meaning: p
          .slice(2)
          .split(",")
          .map((entry) => {
            const [index, value] = entry.split("=");
            return `${["Lab", "X-ray", "Ultrasound", "Ambulance", "Oxygen", "Delivery room"][Number(index)] ?? "Service"}: ${value === "1" ? "available" : "unavailable"}`;
          })
          .join("; "),
      });
    } else if (p.startsWith("E:")) {
      out.push({
        field: "Equipment",
        value: p.slice(2),
        meaning: p.slice(2) === "1" ? "Working" : "Fault reported",
      });
    } else if (p.startsWith("N:")) {
      try {
        const note = JSON.parse(decodeURIComponent(p.slice(2))) as Record<string, unknown>;
        const lines = ["faults", "stockOuts", "interruptions"].map(
          (key) =>
            `${key === "stockOuts" ? "Stock-outs" : key === "faults" ? "Faults" : "Interruptions"}: ${Array.isArray(note[key]) ? note[key].join(", ") || "None" : "None"}`,
        );
        out.push({
          field: "Shift handover notes",
          value: "Complete SMS text record",
          meaning: lines.join("; "),
        });
      } catch {
        out.push({
          field: "Shift handover notes",
          value: "Invalid",
          meaning: "The encoded handover text could not be parsed.",
        });
      }
    } else if (p.startsWith("X:")) {
      out.push({
        field: "Shift attendance exceptions",
        value: p.slice(2),
        meaning: p
          .slice(2)
          .split(",")
          .map((entry) => {
            const [code, mark] = entry.split("=");
            return `${nameOf(code ?? "")}: ${{ T: "Late", R: "Replacement", C: "On-call", O: "Off-duty" }[mark ?? ""] ?? mark}`;
          })
          .join("; "),
      });
    } else if (p.startsWith("C:"))
      out.push({
        field: "Full-roster confirmation",
        value: p.slice(2),
        meaning:
          p.slice(2) === "1" ? "Everyone not listed is present" : "Roster not fully confirmed",
      });
    else out.push({ field: `Field ${i + 1}`, value: p, meaning: "Unrecognised" });
  });
  return out;
}

function ReportDrawer({
  report: r,
  onClose,
  onStatus,
}: {
  report: Report | undefined;
  onClose: () => void;
  onStatus: (id: string, s: ReportStatus, reason?: string) => void;
}) {
  const { requestResend } = useApp();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const f = r ? facilityById[r.facilityId] : undefined;
  const reset = () => {
    setRejecting(false);
    setReason("");
  };

  const checks =
    r && f
      ? [
          {
            label: "Registered sender",
            pass: r.sender.registered,
            detail: r.sender.registered
              ? `Number ${r.sender.masked} is registered to ${f.name}`
              : `Number ${r.sender.masked} is not registered to any facility`,
          },
          {
            label: "Roster version matches",
            pass: r.rosterVersion === f.rosterVersion,
            detail:
              r.rosterVersion === f.rosterVersion
                ? `${r.rosterVersion} is current`
                : `${r.rosterVersion} received, ${f.rosterVersion} is current`,
          },
          {
            label: "Totals plausible",
            pass: r.totalsPlausible,
            detail: r.totalsPlausible
              ? "Present never exceeds enrolled or rostered"
              : "A class reports more present than enrolled",
          },
          {
            label: "All segments received",
            pass: r.segments.received === r.segments.total,
            detail: `${r.segments.received} of ${r.segments.total} segments`,
          },
        ]
      : [];
  const canAct = r && (r.status === "received" || r.status === "pending" || r.status === "sent");

  return (
    <Sheet
      open={!!r}
      onOpenChange={(o) => {
        if (!o) {
          reset();
          onClose();
        }
      }}
    >
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        {r && f && (
          <>
            <SheetHeader className="pr-8 text-left">
              <SheetTitle className="flex items-center gap-2 text-lg">
                <StatusGlyph status={r.status} size={16} />
                {f.name}
              </SheetTitle>
              <SheetDescription asChild>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
                  <Code className="text-xs">{r.id}</Code>
                  <ChannelLabel channel={r.channel} />
                  <StatusBadge status={r.status} />
                  <Link
                    to={f.kind === "school" ? "/schools/$id" : "/health/$id"}
                    params={{ id: f.id }}
                    className="text-dept hover:underline"
                  >
                    Facility page
                  </Link>
                </div>
              </SheetDescription>
            </SheetHeader>

            <div className="mt-5 space-y-5 text-sm">
              {r.rejectionReason && (
                <div className="rounded-md border border-problem/30 bg-problem-tint px-3 py-2 text-problem">
                  <span className="font-semibold">Rejected:</span> {r.rejectionReason}
                </div>
              )}

              <section>
                <h3 className="mb-1.5 text-xs font-semibold text-ink-muted">
                  {r.channel === "sms" ? "Raw SMS payload" : "Payload summary"}
                </h3>
                {r.smsPayload ? (
                  <pre className="code overflow-x-auto whitespace-pre-wrap break-all rounded-sm border border-line bg-subtle px-3 py-2 text-[13px] leading-relaxed text-ink">
                    {r.smsPayload}
                  </pre>
                ) : (
                  <p className="rounded-sm border border-line bg-subtle px-3 py-2 text-xs text-ink-muted">
                    Uploaded over mobile data as a structured record. The same fields are shown
                    below as they would appear in a coded SMS.
                  </p>
                )}
                {r.smsPayload && (
                  <p className="mt-1 text-2xs text-ink-muted tabular-nums">
                    {codedSmsBudget(r.smsPayload).units} SMS units · {r.segments.total} message(s)
                  </p>
                )}
              </section>

              <section>
                <h3 className="mb-1.5 text-xs font-semibold text-ink-muted">Parsed fields</h3>
                <table className="ledger">
                  <thead>
                    <tr>
                      <th scope="col">Field</th>
                      <th scope="col">Value</th>
                      <th scope="col">Meaning</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsePayload(
                      r,
                      r.smsPayload ??
                        [
                          r.type,
                          f.code,
                          "20261123",
                          r.session,
                          r.rosterVersion,
                          `R${String(r.sequence).padStart(3, "0")}`,
                          "C:1",
                        ].join("|"),
                    ).map((p) => (
                      <tr key={p.field}>
                        <td data-label="Field" className="text-ink-muted">
                          {p.field}
                        </td>
                        <td data-label="Value">
                          <Code>{p.value}</Code>
                        </td>
                        <td data-label="Meaning">{p.meaning}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              <section>
                <h3 className="mb-1.5 text-xs font-semibold text-ink-muted">Validation checks</h3>
                <ul className="divide-y divide-line rounded-sm border border-line">
                  {checks.map((c) => (
                    <li key={c.label} className="flex items-start gap-2 px-3 py-2">
                      {c.pass ? (
                        <Check className="mt-0.5 size-4 shrink-0 text-verified" aria-label="Pass" />
                      ) : (
                        <X className="mt-0.5 size-4 shrink-0 text-problem" aria-label="Fail" />
                      )}
                      <div className="min-w-0">
                        <div className={cn("font-semibold", c.pass ? "text-ink" : "text-problem")}>
                          {c.label}: {c.pass ? "pass" : "fail"}
                        </div>
                        <div className="text-xs text-ink-muted">{c.detail}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <h3 className="mb-1.5 text-xs font-semibold text-ink-muted">Lifecycle</h3>
                <ol className="relative ml-2 border-l border-line pl-5">
                  {r.lifecycle.map((step) => (
                    <li key={step.label} className="relative pb-3 last:pb-0">
                      <span
                        aria-hidden
                        className={cn(
                          "absolute -left-[26.5px] top-1 size-3 rounded-full border-2 bg-surface",
                          step.at != null ? "border-verified bg-verified" : "border-line",
                        )}
                      />
                      <div className="flex items-baseline justify-between gap-3">
                        <span className={cn(step.at == null && "text-ink-muted")}>
                          {step.label}
                        </span>
                        <span
                          className={cn(
                            "tabular-nums",
                            step.at == null ? "text-ink-muted" : "font-semibold text-ink",
                          )}
                        >
                          {hhmm(step.at)}
                        </span>
                      </div>
                    </li>
                  ))}
                  {r.verifiedAt != null && (
                    <li className="relative">
                      <span
                        aria-hidden
                        className="absolute -left-[26.5px] top-1 size-3 rounded-full border-2 border-verified bg-verified"
                      />
                      <div className="flex items-baseline justify-between gap-3">
                        <span>Verified by officer</span>
                        <span className="font-semibold tabular-nums">{hhmm(r.verifiedAt)}</span>
                      </div>
                    </li>
                  )}
                </ol>
                <p className="mt-2 text-xs text-ink-muted">
                  {SHIFT_NAMES[r.session]} {r.type === "A1" ? "session" : "shift"}. SMS delivery is
                  not acceptance; only the server acknowledgement marks a report as received.
                </p>
              </section>

              <section className="border-t border-line pt-4">
                {rejecting ? (
                  <div className="space-y-2">
                    <Label htmlFor="reject-reason">Reason for rejection (required)</Label>
                    <Textarea
                      id="reject-reason"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="For example: roster RV03 is out of date, resend with RV04"
                      rows={3}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="problem"
                        disabled={reason.trim().length < 4}
                        onClick={() => {
                          onStatus(r.id, "rejected", reason.trim());
                          toast("Report rejected", { description: `${r.id}: ${reason.trim()}` });
                          reset();
                        }}
                      >
                        Reject report
                      </Button>
                      <Button variant="outline" onClick={reset}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={!canAct}
                      onClick={() => {
                        onStatus(r.id, "verified");
                        toast("Report accepted", { description: `${r.id} marked verified.` });
                      }}
                    >
                      Accept report
                    </Button>
                    <Button
                      variant="problem"
                      disabled={!canAct && r.status !== "verified"}
                      onClick={() => setRejecting(true)}
                    >
                      Reject report
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        requestResend(r.id);
                        toast("Resend requested", {
                          description: `${f.name} asked to resend ${r.type === "A1" ? "today's report" : "the shift report"} with roster ${f.rosterVersion}.`,
                        });
                      }}
                    >
                      Ask facility to resend
                    </Button>
                  </div>
                )}
                {!canAct && r.status === "verified" && (
                  <p className="mt-2 text-xs text-ink-muted">
                    Already verified at {hhmm(r.verifiedAt)}. Reject only if a later check
                    contradicts it.
                  </p>
                )}
                {!canAct && r.status === "rejected" && (
                  <p className="mt-2 text-xs text-ink-muted">
                    Rejected reports cannot be accepted. Ask the facility to resend.
                  </p>
                )}
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
