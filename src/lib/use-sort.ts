import { useMemo, useState } from "react";

export type SortDir = "asc" | "desc";

/** Simple client-side sort keyed by column id. */
export function useSort<T, K extends string>(rows: T[], accessors: Record<K, (row: T) => string | number>, initial: K, initialDir: SortDir = "asc") {
  const [key, setKey] = useState<K>(initial);
  const [dir, setDir] = useState<SortDir>(initialDir);
  const sorted = useMemo(() => {
    const get = accessors[key];
    const out = [...rows].sort((a, b) => {
      const x = get(a);
      const y = get(b);
      if (typeof x === "number" && typeof y === "number") return x - y;
      return String(x).localeCompare(String(y), "en", { numeric: true });
    });
    return dir === "asc" ? out : out.reverse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, key, dir]);
  const toggle = (k: K) => {
    if (k === key) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setKey(k);
      setDir("asc");
    }
  };
  return { sorted, key, dir, toggle };
}
