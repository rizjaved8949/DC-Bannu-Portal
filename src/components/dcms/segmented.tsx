import { cn } from "@/lib/utils";

/** Segmented control with a clear selected state and keyboard-reachable buttons. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  size = "md",
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode; count?: number }[];
  label: string;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "segmented-control inline-flex flex-wrap gap-1 rounded-lg border border-line bg-subtle p-1",
        className,
      )}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "inline-flex min-h-8 items-center gap-1.5 whitespace-nowrap rounded-md font-semibold transition-colors duration-150 active:scale-[0.97]",
              size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
              active
                ? "bg-dept text-primary-foreground"
                : "text-ink-muted hover:bg-surface hover:text-ink",
            )}
          >
            {o.label}
            {o.count != null && (
              <span
                className={cn(
                  "rounded-sm px-1 text-2xs tabular-nums",
                  active ? "bg-primary-foreground/20" : "bg-neutral-tint text-neutral",
                )}
              >
                {o.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
