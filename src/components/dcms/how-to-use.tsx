import { ChevronDown, Compass, X } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

const STORAGE_KEY = "dcms-guide-dismissed";

const STEPS = [
  {
    title: "Pick who you are",
    body: "Use the name menu at the top right to switch between the Deputy Commissioner, the Education Officer, the Health Officer and the Assistant Commissioner. Every page then shows only that officer's facilities.",
  },
  {
    title: "Start on the Overview",
    body: "The Overview is the daily command view: who has reported, staff and student attendance, patients seen, beds, and money spent. Red items at the top are the ones that need action today.",
  },
  {
    title: "Open any school or hospital",
    body: "Click a name anywhere to open its record. Each record has tabs across the top — patients, doctors, billing, students, attendance history and the institution file — so nothing is buried in a long scroll.",
  },
  {
    title: "Export for meetings",
    body: "Every list has Export CSV and Export PDF in the filter bar. The PDF prints clean for briefings and file notes.",
  },
];

/**
 * First-run orientation for officers who have not seen the system before.
 * Collapsed state persists per browser so it stops appearing once dismissed.
 */
export function HowToUse() {
  const [dismissed, setDismissed] = useState(true);
  const [open, setOpen] = useState(false);

  // Read persisted state after mount so server and browser render the same markup.
  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  const dismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* private browsing: guide simply reappears next visit */
    }
  };

  if (dismissed) {
    return (
      <button
        type="button"
        onClick={() => {
          setDismissed(false);
          setOpen(true);
          try {
            window.localStorage.removeItem(STORAGE_KEY);
          } catch {
            /* ignore */
          }
        }}
        className="no-print inline-flex items-center gap-1.5 text-xs font-semibold text-kurram hover:underline"
      >
        <Compass className="size-3.5" />
        How to use this system
      </button>
    );
  }

  return (
    <section className="no-print panel overflow-hidden border-l-[3px] border-l-kurram">
      <div className="flex flex-wrap items-center gap-3 px-5 py-3.5">
        <Compass className="size-[18px] shrink-0 text-kurram" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-ink">New here? Four things to know</h2>
          <p className="text-xs text-ink-muted">
            A one-minute orientation to the district monitoring system.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="inline-flex items-center gap-1 rounded-sm border border-line px-2.5 py-1 text-xs font-semibold text-ink hover:bg-subtle"
        >
          {open ? "Hide" : "Show me"}
          <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss the orientation guide"
          className="rounded-sm p-1 text-ink-muted hover:bg-subtle hover:text-ink"
        >
          <X className="size-4" />
        </button>
      </div>
      {open && (
        <ol className="grid gap-px border-t border-line bg-line sm:grid-cols-2 xl:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="bg-surface px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-kurram-soft text-2xs font-bold text-kurram">
                  {i + 1}
                </span>
                <span className="text-xs font-semibold text-ink">{s.title}</span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
