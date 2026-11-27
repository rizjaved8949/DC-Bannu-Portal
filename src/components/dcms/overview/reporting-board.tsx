import { Link } from "@tanstack/react-router";
import { ChevronDown, FileSearch, MapPinned } from "lucide-react";
import { isReported, TEHSILS, type Facility } from "@/data/mock";
import { useApp } from "@/lib/app-state";
import { pct } from "@/lib/metrics";
import { PaginatedRegister } from "../paginated-register";
import { StatusBadge } from "../status";

/** Named, paginated details replace the symbol-only facility matrix. */
export function ReportingBoard({ facilities }: { facilities: Facility[] }) {
  const { statusFor, role, filters } = useApp();
  const resetKey = JSON.stringify([role.id, filters]);
  const areas = TEHSILS.filter((area) =>
    facilities.some((facility) => facility.tehsil === area),
  ).map((area) => {
    const expected = facilities.filter(
      (facility) => facility.tehsil === area && facility.operational,
    );
    const reported = expected.filter((facility) => isReported(statusFor(facility.id))).length;
    return { name: area, expected: expected.length, reported };
  });
  return (
    <div className="reporting-detail-options">
      <details className="reporting-detail">
        <summary>
          <span className="reporting-detail-icon" aria-hidden>
            <MapPinned />
          </span>
          <span>
            <strong>Compare reporting by area</strong>
            <small>{areas.length} areas · labelled totals and progress</small>
          </span>
          <ChevronDown className="size-4" aria-hidden />
        </summary>
        <p className="reporting-detail-help">
          Each row shows how many operational facilities in that area have reported, and how many
          are still outstanding.
        </p>
        <PaginatedRegister items={areas} label="areas" resetKey={resetKey}>
          {(rows) => (
            <table className="ledger reporting-area-table">
              <thead>
                <tr>
                  <th scope="col">Tehsil / area</th>
                  <th scope="col">Reported / expected</th>
                  <th scope="col">Progress</th>
                  <th scope="col" className="num">
                    Still outstanding
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((area) => (
                  <tr key={area.name}>
                    <td data-label="Tehsil / area" className="font-semibold">
                      {area.name}
                    </td>
                    <td data-label="Reported / expected" className="num">
                      {area.reported} of {area.expected}
                    </td>
                    <td data-label="Progress">
                      <span className="reporting-area-progress">
                        <span className="reporting-area-track" aria-hidden>
                          <span style={{ width: `${pct(area.reported, area.expected, 0)}%` }} />
                        </span>
                        <span className="num">
                          {area.expected
                            ? `${pct(area.reported, area.expected, 0)}%`
                            : "Not expected today"}
                        </span>
                      </span>
                    </td>
                    <td data-label="Still outstanding" className="num">
                      {area.expected - area.reported}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </PaginatedRegister>
      </details>
      <details className="reporting-detail">
        <summary>
          <span className="reporting-detail-icon" aria-hidden>
            <FileSearch />
          </span>
          <span>
            <strong>Find an individual facility</strong>
            <small>{facilities.length} named records · open a school or health facility</small>
          </span>
          <ChevronDown className="size-4" aria-hidden />
        </summary>
        <PaginatedRegister items={facilities} label="facility reports" resetKey={resetKey}>
          {(rows) => (
            <table className="ledger">
              <thead>
                <tr>
                  <th scope="col">Facility</th>
                  <th scope="col">Tehsil / area</th>
                  <th scope="col">Report today</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((facility) => (
                  <tr key={facility.id}>
                    <td data-label="Facility">
                      <Link
                        to={facility.kind === "school" ? "/schools/$id" : "/health/$id"}
                        params={{ id: facility.id }}
                        className="font-semibold text-dept hover:underline"
                      >
                        {facility.name}
                      </Link>
                      <small className="block text-ink-muted">
                        {facility.kind === "school" ? "School" : "Health facility"} ·{" "}
                        {facility.code}
                      </small>
                    </td>
                    <td data-label="Tehsil / area">{facility.tehsil}</td>
                    <td data-label="Report today">
                      {facility.operational ? (
                        <StatusBadge status={statusFor(facility.id)} />
                      ) : (
                        <span className="text-xs text-ink-muted">Not expected today</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </PaginatedRegister>
      </details>
    </div>
  );
}
