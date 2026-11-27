import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SectionTab<T extends string> {
  value: T;
  label: string;
  icon: LucideIcon;
  count?: number;
}

/**
 * Sticky sub-navigation for record pages. Keeps every section one click away
 * instead of a long scroll, so nothing on a facility record stays hidden.
 */
export function SectionTabs<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: SectionTab<T>[];
  label: string;
}) {
  return (
    <div className="record-section-tabs no-print sticky top-[76px] z-30 border-y border-line bg-surface px-2">
      <div
        role="tablist"
        aria-label={label}
        onKeyDown={(event) => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
          event.preventDefault();
          const index = options.findIndex((option) => option.value === value);
          const next =
            event.key === "Home"
              ? 0
              : event.key === "End"
                ? options.length - 1
                : (index + (event.key === "ArrowRight" ? 1 : -1) + options.length) % options.length;
          const option = options[next];
          if (option) {
            onChange(option.value);
            event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
          }
        }}
        className="flex items-stretch gap-1 overflow-x-auto [scrollbar-width:none]"
      >
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              role="tab"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(o.value)}
              className={cn(
                "flex shrink-0 items-center gap-2 whitespace-nowrap px-3.5 py-3 text-sm transition-colors",
                active
                  ? "tab-active font-semibold text-ink"
                  : "text-ink-muted hover:bg-subtle hover:text-ink",
              )}
            >
              <o.icon className="size-[17px]" strokeWidth={1.7} />
              {o.label}
              {o.count != null && (
                <span
                  className={cn(
                    "rounded-sm px-1.5 text-2xs font-semibold tabular-nums",
                    active ? "bg-dept-tint text-dept" : "bg-subtle text-ink-muted",
                  )}
                >
                  {o.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
