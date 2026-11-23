import { Link } from "@tanstack/react-router";
import { Inbox, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { facilityById, hhmm, STATUS_LABEL } from "@/data/mock";
import { useApp, useScopedFacilities } from "@/lib/app-state";
import { cn } from "@/lib/utils";
import { ChannelIcon } from "../channel";
import { StatusGlyph } from "../status";

/** Live feed of server-accepted reports, newest first. New arrivals slide in. */
export function IncomingFeed() {
  const { reports, arrivals, feedPaused, setFeedPaused } = useApp();
  const facilities = useScopedFacilities();
  const ids = new Set(facilities.map((f) => f.id));
  const rows = reports
    .filter((r) => r.receivedAt != null)
    .filter((r) => {
      return ids.has(r.facilityId);
    })
    .sort((a, b) => (b.receivedAt ?? 0) - (a.receivedAt ?? 0))
    .slice(0, 5);
  const fresh = new Set(arrivals.slice(0, 1));
  return (
    <section className="panel flex h-full flex-col overflow-hidden" aria-label="Incoming reports">
      <div className="flex items-center justify-between gap-2 border-b border-line px-5 py-4">
        <div>
          <h2 className="flex items-center gap-2 text-md font-semibold text-ink">
            Incoming reports
            <span className="rounded-sm bg-verified-tint px-1.5 py-0.5 text-2xs font-normal text-verified">
              {feedPaused ? "Paused" : "Live"}
            </span>
          </h2>
          <p className="mt-0.5 text-2xs text-ink-muted">Latest district acknowledgements</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setFeedPaused(!feedPaused)}
          aria-pressed={feedPaused}
          aria-label={feedPaused ? "Resume feed" : "Pause feed"}
          title={feedPaused ? "Resume feed" : "Pause feed"}
        >
          {feedPaused ? <Play /> : <Pause />}
        </Button>
      </div>
      <ol className="flex-1 divide-y divide-line overflow-hidden" aria-live="polite">
        {rows.map((r) => {
          const f = facilityById[r.facilityId]!;
          return (
            <li key={r.id} className={cn("px-5 py-3", fresh.has(r.id) && "animate-feed-in")}>
              <div className="flex items-start gap-2.5">
                <StatusGlyph status={r.status} className="mt-1" size={15} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      to={f.kind === "school" ? "/schools/$id" : "/health/$id"}
                      params={{ id: f.id }}
                      className="truncate text-sm font-semibold text-ink hover:text-kurram hover:underline"
                    >
                      {f.name}
                    </Link>
                    <ChannelIcon channel={r.channel} className="size-3.5" />
                  </div>
                  <div className="flex flex-wrap items-baseline gap-x-2 text-xs text-ink-muted">
                    <span className="tabular-nums">
                      Received {hhmm(r.receivedAt)} by {r.channel === "sms" ? "SMS" : "app"}
                    </span>
                    <span>{STATUS_LABEL[r.status]}</span>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      {!rows.length && (
        <p className="px-5 py-10 text-sm text-ink-muted">No received reports in this scope yet.</p>
      )}
      <Link
        to="/inbox"
        className="flex items-center justify-center gap-2 border-t border-line bg-subtle px-4 py-3 text-sm font-semibold text-kurram hover:bg-kurram-soft"
      >
        <Inbox className="size-4" />
        View reports inbox
      </Link>
    </section>
  );
}
