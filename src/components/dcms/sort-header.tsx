import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { SortDir } from "@/lib/use-sort";

/** <th> with a sort button. Pass `num` to right-align figures. */
export function SortTh<K extends string>({
  id,
  active,
  dir,
  onSort,
  children,
  num,
}: {
  id: K;
  active: K;
  dir: SortDir;
  onSort: (k: K) => void;
  children: ReactNode;
  num?: boolean;
}) {
  const isActive = id === active;
  const Icon = !isActive ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th scope="col" className={cn(num && "num")} aria-sort={isActive ? (dir === "asc" ? "ascending" : "descending") : "none"}>
      <button
        type="button"
        onClick={() => onSort(id)}
        className={cn("inline-flex items-center gap-1 rounded-sm hover:text-ink", isActive && "text-ink", num && "flex-row-reverse")}
      >
        {children}
        <Icon className={cn("size-3.5", !isActive && "opacity-50")} />
      </button>
    </th>
  );
}
