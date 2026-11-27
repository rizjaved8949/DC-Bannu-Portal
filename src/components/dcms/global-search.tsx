import { Link } from "@tanstack/react-router";
import { GraduationCap, HeartPulse, Search, UserRound } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { staffByFacility } from "@/data/mock";
import { useScopedFacilities } from "@/lib/app-state";
import { StatusBadge } from "./status";
import { useApp } from "@/lib/app-state";

/** All entry points open the same dialog and share one keyboard shortcut. */
export function SearchTrigger({
  compact = false,
  onOpen,
}: {
  compact?: boolean;
  onOpen?: (() => void) | undefined;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        onOpen?.();
        window.dispatchEvent(new Event("dcms:open-search"));
      }}
      className="global-search-trigger"
      aria-label="Search facilities and staff"
    >
      <Search className="size-4" />
      {!compact && (
        <>
          <span className="search-label">Search directory…</span>
          <kbd>Ctrl K</kbd>
        </>
      )}
    </button>
  );
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const opener = useRef<Element | null>(null);
  const facilities = useScopedFacilities({ applyFilters: false });
  const { statusFor } = useApp();
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (!open) opener.current = document.activeElement;
        setOpen((value) => !value);
      }
    };
    const onOpen = () => {
      opener.current = document.activeElement;
      setQuery("");
      setOpen(true);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("dcms:open-search", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("dcms:open-search", onOpen);
    };
  }, [open]);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return {
      facilities: facilities
        .filter((f) => `${f.name} ${f.code} ${f.tehsil}`.toLowerCase().includes(q))
        .slice(0, 5),
      staff:
        q.length > 1
          ? facilities
              .flatMap((f) => (staffByFacility[f.id] ?? []).map((s) => ({ s, f })))
              .filter(({ s, f }) =>
                `${s.name} ${s.code} ${s.designation} ${f.name}`.toLowerCase().includes(q),
              )
              .slice(0, 5)
          : [],
    };
  }, [query, facilities]);
  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="gap-0 overflow-hidden p-0 sm:max-w-[620px]"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (opener.current instanceof HTMLElement && document.contains(opener.current)) {
              opener.current.focus();
            } else {
              document.querySelector<HTMLButtonElement>('[aria-label="Open navigation"]')?.focus();
            }
          }}
        >
          <div className="border-b border-line px-6 pb-4 pt-5">
            <DialogTitle className="text-lg">Find a facility or staff member</DialogTitle>
            <DialogDescription className="mt-1">
              Search by name, code, designation or tehsil. Results respect your role.
            </DialogDescription>
            <div className="relative mt-4">
              <Search className="absolute left-3 top-3 size-4 text-ink-muted" />
              <Input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search the district directory"
                aria-label="Search district directory"
                className="h-10 pl-10"
              />
            </div>
          </div>
          <div className="max-h-[55vh] overflow-y-auto p-3">
            <p className="px-3 py-2 text-xs font-semibold text-ink-muted">
              {query ? "Matching facilities" : "Facilities in your scope"}
            </p>
            {results.facilities.map((f) => (
              <Link
                key={f.id}
                to={f.kind === "school" ? "/schools/$id" : "/health/$id"}
                params={{ id: f.id }}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-sm px-3 py-3 hover:bg-subtle focus-visible:bg-subtle"
              >
                <span
                  data-dept={f.kind === "school" ? "edu" : "health"}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-dept-tint text-dept"
                >
                  {f.kind === "school" ? (
                    <GraduationCap className="size-4" />
                  ) : (
                    <HeartPulse className="size-4" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{f.name}</span>
                  <span className="text-xs text-ink-muted">
                    {f.code} · {f.tehsil}
                  </span>
                </span>
                <span className="hidden sm:block">
                  <StatusBadge status={statusFor(f.id)} short />
                </span>
              </Link>
            ))}
            {results.staff.length > 0 && (
              <p className="px-3 pb-2 pt-4 text-xs font-semibold text-ink-muted">Matching staff</p>
            )}
            {results.staff.map(({ s, f }) => (
              <Link
                key={s.id}
                to="/staff/$id"
                params={{ id: s.id }}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-sm px-3 py-3 hover:bg-subtle focus-visible:bg-subtle"
              >
                <UserRound className="size-5 shrink-0 text-dept" />
                <span>
                  <span className="block font-semibold">{s.name}</span>
                  <span className="text-xs text-ink-muted">
                    {s.designation} · {f.name}
                  </span>
                </span>
              </Link>
            ))}
            {!results.facilities.length && !results.staff.length && (
              <div className="empty-state px-6 py-10 text-center">
                <span className="empty-state-art" aria-hidden>
                  <Search className="size-6" />
                </span>
                <p className="font-semibold text-ink">No matches just yet</p>
                <p className="mt-2 text-sm text-ink-muted">
                  Try another name, facility code or tehsil within your scope.
                </p>
                <button
                  className="mt-4 rounded-md border border-line px-3 py-2 text-sm font-semibold text-dept hover:bg-subtle"
                  onClick={() => setQuery("")}
                >
                  Clear search
                </button>
              </div>
            )}
          </div>
          <div className="border-t border-line bg-subtle px-6 py-3 text-xs text-ink-muted">
            Tab to move through results · Enter to open · Esc to close
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
