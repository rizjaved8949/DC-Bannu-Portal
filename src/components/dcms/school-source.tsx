import { CircleSlash, Radio } from "lucide-react";
import type { ReactNode } from "react";

import type { Facility } from "@/data/mock";
import { Pill, type Tone } from "./status";

/** Register status as written in the source files, with glyph + word + colour. */
export function SchoolRegisterStatus({ f }: { f: Facility }) {
  const s = f.source?.status ?? "Functional";
  const tone: Tone = s === "Functional" ? "verified" : s === "Closed" ? "neutral" : "problem";
  return (
    <Pill tone={tone} icon={s === "Functional" ? undefined : <CircleSlash className="size-3" />}>
      {s}
    </Pill>
  );
}

/** Marks a panel or figure as a demonstration of the live feed, not source data. */
export function DemoNote({ children }: { children?: ReactNode }) {
  return (
    <p className="flex items-start gap-2 border-b border-line bg-subtle px-4 py-2 text-xs text-ink-muted">
      <Radio className="mt-0.5 size-3.5 shrink-0 text-sent" aria-hidden />
      <span>
        <span className="font-semibold text-ink">Simulated data.</span>{" "}
        {children ??
          "Simulated to show how daily reports will appear once schools report. The school register figures are real; these daily values are not."}
      </span>
    </p>
  );
}
