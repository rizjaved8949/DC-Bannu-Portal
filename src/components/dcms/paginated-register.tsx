import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Rows3 } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Presentation-only paging. Search, sorting, counts and exports retain the complete dataset. */
export function PaginatedRegister<T>({
  items,
  label,
  resetKey,
  children,
}: {
  items: readonly T[];
  label: string;
  resetKey: string;
  children: (visible: readonly T[]) => ReactNode;
}) {
  const id = useId();
  const [size, setSize] = useState(10);
  const [position, setPosition] = useState({ scope: resetKey, page: 0 });
  const [printing, setPrinting] = useState(false);
  const viewport = useRef<HTMLDivElement>(null);
  // Commit the new browsing scope so clearing a filter cannot revive an old page.
  if (position.scope !== resetKey) {
    setPosition({ scope: resetKey, page: 0 });
  }
  const pages = Math.max(1, Math.ceil(items.length / size));
  const page = position.scope === resetKey ? Math.min(position.page, pages - 1) : 0;
  const start = page * size;
  const end = Math.min(start + size, items.length);
  const visible = printing ? items : items.slice(start, end);

  useEffect(() => {
    const before = () => flushSync(() => setPrinting(true));
    const after = () => setPrinting(false);
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, []);

  useEffect(() => {
    viewport.current?.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [page, size, resetKey]);

  const go = (next: number) =>
    setPosition({ scope: resetKey, page: Math.max(0, Math.min(next, pages - 1)) });
  const pageNumbers = [...new Set([0, page - 1, page, page + 1, pages - 1])]
    .filter((n) => n >= 0 && n < pages)
    .sort((a, b) => a - b);

  return (
    <div className="paginated-register">
      <div className="register-controls no-print">
        <div className="register-result-count" role="status" aria-live="polite" aria-atomic="true">
          <span className="register-control-icon" aria-hidden>
            <Rows3 className="size-4" />
          </span>
          <span>
            <strong>
              {items.length ? start + 1 : 0}–{end}
            </strong>{" "}
            of <strong>{items.length.toLocaleString("en")}</strong> {label}
          </span>
        </div>
        <label className="register-page-size" htmlFor={`${id}-size`}>
          Rows per page
          <select
            id={`${id}-size`}
            value={size}
            onChange={(event) => {
              setSize(Number(event.target.value));
              go(0);
            }}
          >
            {[5, 10, 25, 50].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div
        className="register-scroll"
        ref={viewport}
        role="region"
        aria-label={`${label} results`}
        tabIndex={0}
      >
        <div className="register-page" key={`${resetKey}-${page}-${size}`}>
          {children(visible)}
        </div>
      </div>
      <div className="register-pagination no-print">
        <label className="register-page-jump" htmlFor={`${id}-page`}>
          Page
          <select
            id={`${id}-page`}
            aria-label={`Go to page in ${label}`}
            value={page}
            onChange={(event) => go(Number(event.target.value))}
          >
            {Array.from({ length: pages }, (_, index) => (
              <option key={index} value={index}>
                {index + 1}
              </option>
            ))}
          </select>
          <span>of {pages}</span>
        </label>
        <nav aria-label={`${label} pagination`} className="register-page-buttons">
          <Button
            variant="outline"
            size="icon"
            aria-label={`First page of ${label}`}
            disabled={page === 0}
            onClick={() => go(0)}
          >
            <ChevronsLeft />
          </Button>
          <Button
            variant="outline"
            size="sm"
            aria-label={`Previous page of ${label}`}
            disabled={page === 0}
            onClick={() => go(page - 1)}
          >
            <ChevronLeft />
            <span>Previous</span>
          </Button>
          <div className="register-page-numbers">
            {pageNumbers.map((number, index) => (
              <span key={number} className="contents">
                {index > 0 && number - pageNumbers[index - 1]! > 1 && (
                  <span className="page-ellipsis" aria-hidden>
                    …
                  </span>
                )}
                <button
                  className="register-page-number"
                  aria-label={`Page ${number + 1} of ${label}`}
                  aria-current={page === number ? "page" : undefined}
                  onClick={() => go(number)}
                >
                  {number + 1}
                </button>
              </span>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            aria-label={`Next page of ${label}`}
            disabled={page === pages - 1}
            onClick={() => go(page + 1)}
          >
            <span>Next</span>
            <ChevronRight />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label={`Last page of ${label}`}
            disabled={page === pages - 1}
            onClick={() => go(pages - 1)}
          >
            <ChevronsRight />
          </Button>
        </nav>
      </div>
      <div className="register-browse-progress no-print" aria-hidden>
        <span style={{ width: `${((page + 1) / pages) * 100}%` }} />
      </div>
    </div>
  );
}
