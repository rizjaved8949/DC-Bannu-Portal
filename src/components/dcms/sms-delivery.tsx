import { Link } from "@tanstack/react-router";
import { CheckCircle2, Clock3, MessageSquareText, TriangleAlert, WifiOff } from "lucide-react";
import { facilityById, hhmm, type SmsEntry } from "@/data/mock";
import { inRoleScope, useApp } from "@/lib/app-state";
import { Pill } from "./status";
import { Panel } from "./section";
import { Button } from "@/components/ui/button";

export function SmsStatus({ entry }: { entry: SmsEntry }) {
  return (
    <Pill
      tone={
        entry.status === "received"
          ? "verified"
          : entry.status === "rejected"
            ? "problem"
            : entry.status === "saved"
              ? "neutral"
              : "pending"
      }
      icon={
        entry.status === "received" ? (
          <CheckCircle2 />
        ) : entry.status === "rejected" ? (
          <TriangleAlert />
        ) : entry.status === "saved" ? (
          <WifiOff />
        ) : (
          <Clock3 />
        )
      }
    >
      {entry.status === "received"
        ? "Admin updated"
        : entry.status === "saved"
          ? "Saved on device"
          : entry.status === "rejected"
            ? "Needs resend"
            : "SMS in transit"}
    </Pill>
  );
}
export function SmsEntryLink({ entry }: { entry: SmsEntry }) {
  return entry.kind === "report" ? (
    <Link
      className="text-sm font-semibold text-kurram underline"
      to="/inbox"
      search={{ report: entry.referenceId }}
    >
      Open admin report
    </Link>
  ) : (
    <Link
      className="text-sm font-semibold text-kurram underline"
      to="/complaints"
      search={{ complaint: entry.referenceId }}
    >
      Open admin complaint
    </Link>
  );
}
export function FieldSmsEntries({
  facilityId,
  conn,
  pendingOnly = false,
}: {
  facilityId: string;
  conn: "online" | "sms" | "none";
  pendingOnly?: boolean;
}) {
  const { smsEntries, sendSavedEntries, retrySmsEntry, role } = useApp();
  const entries = smsEntries
    .filter(
      (e) =>
        e.kind === "complaint" &&
        e.facilityIds.includes(facilityId) &&
        e.facilityIds.every((id) => inRoleScope(role, facilityById[id]!)) &&
        (!pendingOnly || e.status !== "received"),
    )
    .slice(-6)
    .reverse();
  if (!entries.length) return null;
  return (
    <section className="space-y-3">
      <h3 className="font-semibold">Complaint SMS outbox</h3>
      {entries.map((e) => (
        <div key={e.id} className="space-y-2 rounded-md border border-line bg-surface p-3">
          <SmsStatus entry={e} />
          <p className="break-all font-mono text-xs">{e.referenceId}</p>
          <p className="text-xs text-ink-muted">
            {e.segments} SMS segment(s) · no Wi-Fi or mobile data required
          </p>
          {e.status === "saved" && (
            <Button
              size="sm"
              disabled={conn === "none"}
              onClick={() => sendSavedEntries(facilityId, "sms")}
            >
              Send saved entry by SMS
            </Button>
          )}
          {e.status === "sent" && (
            <p className="text-sm text-ink-muted">
              The admin complaint register updates after SMS receipt and validation.
            </p>
          )}
          {e.status === "received" && <SmsEntryLink entry={e} />}
          {e.status === "rejected" && (
            <Button size="sm" disabled={conn === "none"} onClick={() => retrySmsEntry(e.id)}>
              Resend SMS
            </Button>
          )}
          {e.reason && <p className="text-sm text-problem">{e.reason}</p>}
        </div>
      ))}
    </section>
  );
}
export function SmsAdminIntake() {
  const { smsEntries, role, filters } = useApp();
  const visibleIds = new Set(
    Object.values(facilityById)
      .filter(
        (f) =>
          inRoleScope(role, f) &&
          (filters.department === "All" || f.department === filters.department) &&
          (filters.tehsil === "All" || f.tehsil === filters.tehsil),
      )
      .map((f) => f.id),
  );
  const entries = smsEntries.filter(
    (entry) => entry.status !== "saved" && entry.facilityIds.some((id) => visibleIds.has(id)),
  );
  return (
    <Panel
      title={
        <span className="inline-flex items-center gap-2">
          <MessageSquareText className="size-4 text-kurram" />
          SMS reporting intake
        </span>
      }
      aside={`${entries.filter((e) => e.status === "received").length} received · ${entries.filter((e) => e.status === "sent").length} in transit`}
      bodyClassName="space-y-3 p-4"
    >
      <p className="text-sm text-ink-muted">
        No Wi-Fi or mobile internet at the institution? Entries travel by cellular SMS. Validated
        receipts update reports, institution records and complaints here automatically.
      </p>
      {entries.length > 0 && (
        <ul className="divide-y divide-line">
          {entries
            .slice(-5)
            .reverse()
            .map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="break-all text-sm font-semibold">{entry.referenceId}</p>
                  <p className="mt-1 text-xs text-ink-muted">
                    {entry.facilityIds
                      .filter((id) => visibleIds.has(id))
                      .map((id) => facilityById[id]!.name)
                      .join("; ")}
                  </p>
                  <p className="mt-1 text-xs text-ink-muted">
                    {entry.kind === "complaint" ? "Complaint" : "Institution report"} ·{" "}
                    {entry.segments} segment(s) ·{" "}
                    {entry.receivedMin == null
                      ? "Awaiting SMS receipt"
                      : `Received ${hhmm(entry.receivedMin)}`}
                  </p>
                  {entry.status === "received" && (
                    <div className="mt-2">
                      <SmsEntryLink entry={entry} />
                    </div>
                  )}
                  {entry.reason && <p className="mt-1 text-sm text-problem">{entry.reason}</p>}
                </div>
                <SmsStatus entry={entry} />
              </li>
            ))}
        </ul>
      )}
    </Panel>
  );
}
