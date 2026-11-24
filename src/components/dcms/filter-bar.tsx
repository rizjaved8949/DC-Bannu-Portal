import { Download, Printer, SlidersHorizontal, RotateCcw, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApp, type Filters } from "@/lib/app-state";
import { TEHSILS, formatDate, TODAY } from "@/data/mock";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-2 text-xs text-ink-muted">
      <span className="whitespace-nowrap">{label}</span>
      {children}
    </label>
  );
}

/**
 * Sticky filter bar for data pages. Role scope locks department / tehsil.
 * `onExportCsv` should download the page's current filtered table.
 */
export function FilterBar({
  showShift,
  showDepartment = true,
  onExportCsv,
  extra,
}: {
  showShift?: boolean;
  showDepartment?: boolean;
  onExportCsv?: () => void;
  extra?: React.ReactNode;
}) {
  const { filters, setFilter, role, resetFilters } = useApp();
  const hasFilters =
    filters.department !== (role.department ?? "All") ||
    filters.tehsil !== (role.tehsil ?? "All") ||
    filters.dateRange !== "today" ||
    filters.shift !== "All";
  return (
    <div className="filter-toolbar no-print sticky top-0 z-30 mb-5 rounded-lg border border-line bg-surface px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <SlidersHorizontal className="hidden size-4 text-ink-muted xl:block" aria-hidden />
        {showDepartment && (
          <Field label="Department">
            <Select
              value={filters.department}
              onValueChange={(v) => setFilter("department", v as Filters["department"])}
              disabled={!!role.department}
            >
              <SelectTrigger className="h-8 w-[132px]" aria-label="Department">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                <SelectItem value="Education">Education</SelectItem>
                <SelectItem value="Health">Health</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        )}
        <Field label="Tehsil">
          <Select
            value={filters.tehsil}
            onValueChange={(v) => setFilter("tehsil", v as Filters["tehsil"])}
            disabled={!!role.tehsil}
          >
            <SelectTrigger className="h-8 w-[132px]" aria-label="Tehsil">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              {TEHSILS.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <div
          className="inline-flex h-8 items-center gap-2 rounded-sm border border-line bg-subtle px-3 text-xs text-ink-muted"
          title="Current reporting day"
        >
          <CalendarDays className="size-3.5" />
          <span>Reporting day</span>
          <span className="font-semibold text-ink">{formatDate(TODAY)}</span>
        </div>
        {showShift && (
          <Field label="Shift">
            <Select
              value={filters.shift}
              onValueChange={(v) => setFilter("shift", v as Filters["shift"])}
            >
              <SelectTrigger className="h-8 w-[120px]" aria-label="Shift">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["All", "Morning", "Evening", "Night"].map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
        {extra}
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            <RotateCcw />
            Reset filters
          </Button>
        )}
        <div className="ml-auto flex items-center gap-2">
          {onExportCsv && (
            <Button variant="outline" size="sm" onClick={onExportCsv}>
              <Download />
              Export CSV
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer />
            Export PDF
          </Button>
        </div>
      </div>
    </div>
  );
}
