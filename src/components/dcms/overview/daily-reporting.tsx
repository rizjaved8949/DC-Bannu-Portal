import { Link } from "@tanstack/react-router";
import {
  CheckCheck,
  ChevronDown,
  CircleHelp,
  Clock3,
  FileCheck2,
  Send,
  TriangleAlert,
} from "lucide-react";
import { type Facility } from "@/data/mock";
import { useApp } from "@/lib/app-state";
import { districtSummary, pct } from "@/lib/metrics";
import { ReportingBoard } from "./reporting-board";
import { EmptyState } from "../section";
import { Button } from "@/components/ui/button";

/** Explain the existing reporting metrics using mutually exclusive outcomes. */
export function DailyReporting({ facilities }: { facilities: Facility[] }) {
  const { statusFor, schoolDayFor, shiftFor, resetFilters } = useApp();
  const summary = districtSummary(facilities, statusFor, { schoolDayFor, shiftFor });
  const accepted = summary.reported - summary.rejected;
  const outstanding = summary.total - summary.reported;
  const inactive = facilities.length - summary.total;
  const inProgress = outstanding - summary.noReport;
  const percentage = Number(pct(summary.reported, summary.total, 0));
  if (!summary.total) {
    return (
      <>
        <EmptyState
          title="No reports expected for this selection"
          hint={
            facilities.length
              ? "These facilities are closed or non-functional, so a daily report is not expected. You can still open their records below."
              : "No operational facilities match your current filters. Clear the filters to see your role’s reporting scope."
          }
          action={
            <Button variant="outline" size="sm" onClick={resetFilters}>
              Clear filters
            </Button>
          }
        />
        {facilities.length > 0 && <ReportingBoard facilities={facilities} />}
      </>
    );
  }
  return (
    <div className="daily-reporting">
      <div className="reporting-headline">
        <div
          className="reporting-ring"
          role="img"
          aria-label={`${percentage}% of expected facilities have reported`}
        >
          <svg viewBox="0 0 112 112" aria-hidden>
            <circle className="reporting-ring-track" cx="56" cy="56" r="48" />
            <circle
              className="reporting-ring-value"
              cx="56"
              cy="56"
              r="48"
              pathLength="100"
              strokeDasharray={`${percentage} 100`}
            />
          </svg>
          <span>
            <strong className="num">{percentage}%</strong>
            <small>reported</small>
          </span>
        </div>
        <div className="reporting-headline-copy">
          <span className="reporting-eyebrow">
            <FileCheck2 className="size-3.5" />
            Daily reporting progress
          </span>
          <h3>
            <strong className="num">{summary.reported}</strong> of{" "}
            <strong className="num">{summary.total}</strong> facilities have reported
          </h3>
          <p>
            Reports from these facilities have reached the district. Some still need verification or
            correction.
          </p>
          <span className="reporting-denominator">
            {summary.total} operational facilities expected today
            {inactive > 0 && <> · {inactive} closed or non-functional schools excluded</>}
          </span>
        </div>
      </div>
      <div className="reporting-outcomes" aria-label="What needs to happen next">
        <Link to="/inbox" className="reporting-outcome" data-outcome="accepted">
          <span className="reporting-outcome-icon" aria-hidden>
            <CheckCheck />
          </span>
          <strong className="num">{accepted}</strong>
          <h4>Accepted by the server</h4>
          <p>{summary.pending} of these still need officer verification.</p>
          <span className="reporting-outcome-action">View reports</span>
        </Link>
        <Link to="/inbox" className="reporting-outcome" data-outcome="correction">
          <span className="reporting-outcome-icon" aria-hidden>
            <TriangleAlert />
          </span>
          <strong className="num">{summary.rejected}</strong>
          <h4>Need correction</h4>
          <p>These reached the district but were rejected. The facility needs to resend.</p>
          <span className="reporting-outcome-action">Inspect in inbox</span>
        </Link>
        <Link to="/review" className="reporting-outcome" data-outcome="missing">
          <span className="reporting-outcome-icon" aria-hidden>
            <Clock3 />
          </span>
          <strong className="num">{outstanding}</strong>
          <h4>Not received yet</h4>
          <p>
            No submission: {summary.noReport}. Draft or awaiting acknowledgement: {inProgress}.
          </p>
          <span className="reporting-outcome-action">Review follow-ups</span>
        </Link>
      </div>
      <details className="reporting-explanation">
        <summary>
          <CircleHelp className="size-4" />
          How do these numbers work?
          <ChevronDown className="size-3.5" />
        </summary>
        <div>
          <p>
            <strong>The total:</strong> {summary.total} operational facilities are expected to
            report. Closed and non-functional schools stay in the register but are not expected to
            submit a daily report.
          </p>
          <p>
            <strong>Reported:</strong> {summary.reported} facilities have a report that reached the
            district. This includes {accepted} accepted reports and {summary.rejected} rejected
            reports that need correction. “Reported” does not mean “verified”.
          </p>
          <p>
            <strong>Still outstanding:</strong> {outstanding} facilities have no report received by
            the district yet, including reports saved as drafts or sent without an acknowledgement.
          </p>
          <p>
            <Send className="inline size-3.5" aria-hidden /> SMS and app are delivery channels. They
            do not indicate whether a report has been checked.
          </p>
        </div>
      </details>
      <ReportingBoard facilities={facilities} />
    </div>
  );
}
