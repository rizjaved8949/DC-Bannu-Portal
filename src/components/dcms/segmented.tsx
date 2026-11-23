import { cn } from "@/lib/utils";

/** Segmented control: a row of buttons, one selected. Keyboard-reachable, 4px radius. */
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
    <div role="group" aria-label={label} className={cn("inline-flex flex-wrap rounded-sm border border-line bg-surface p-0.5", className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "inline-flex items-center gap-1.5 whitespace-nowrap rounded-[3px] font-semibold transition-colors duration-150",
              size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
              active ? "bg-kurram text-white" : "text-ink-muted hover:bg-subtle hover:text-ink",
            )}
          >
            {o.label}
            {o.count != null && (
              <span className={cn("rounded-sm px-1 text-2xs tabular-nums", active ? "bg-white/20" : "bg-neutral-tint text-neutral")}>{o.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
