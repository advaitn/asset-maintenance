import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

function buildHref(
  basePath: string,
  page: number,
  pageSize: number,
  preserve: Record<string, string | undefined>
): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(preserve)) {
    if (v !== undefined && v !== "") params.set(k, v);
  }
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

/** Pagination for list pages using `page` and `pageSize` query params. */
export function TablePaginationBar({
  basePath,
  page,
  pageSize,
  total,
  preserve,
}: {
  basePath: string;
  page: number;
  pageSize: number;
  total: number;
  preserve?: Record<string, string | undefined>;
}) {
  const p = preserve ?? {};
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, total);

  const href = (pg: number) => buildHref(basePath, pg, pageSize, p);

  return (
    <div className="table-pagination">
      <span className="table-pagination-meta">
        {total === 0 ? "No results" : `Showing ${start}–${end} of ${total}`}
      </span>
      <nav className="table-pagination-nav" aria-label="Pagination">
        {safePage <= 1 ?
          <span className="table-pagination-link is-disabled">
            <ChevronsLeft size={14} strokeWidth={2} aria-hidden />
            First
          </span>
        : <Link href={href(1)} className="table-pagination-link">
            <ChevronsLeft size={14} strokeWidth={2} aria-hidden />
            First
          </Link>
        }
        {safePage <= 1 ?
          <span className="table-pagination-link is-disabled">
            <ChevronLeft size={14} strokeWidth={2} aria-hidden />
            Previous
          </span>
        : <Link href={href(safePage - 1)} className="table-pagination-link">
            <ChevronLeft size={14} strokeWidth={2} aria-hidden />
            Previous
          </Link>
        }
        <span className="table-pagination-page">
          Page {safePage} of {totalPages}
        </span>
        {safePage >= totalPages ?
          <span className="table-pagination-link is-disabled">
            Next
            <ChevronRight size={14} strokeWidth={2} aria-hidden />
          </span>
        : <Link href={href(safePage + 1)} className="table-pagination-link">
            Next
            <ChevronRight size={14} strokeWidth={2} aria-hidden />
          </Link>
        }
        {safePage >= totalPages ?
          <span className="table-pagination-link is-disabled">
            Last
            <ChevronsRight size={14} strokeWidth={2} aria-hidden />
          </span>
        : <Link href={href(totalPages)} className="table-pagination-link">
            Last
            <ChevronsRight size={14} strokeWidth={2} aria-hidden />
          </Link>
        }
      </nav>
    </div>
  );
}

/** Pagination for task detail sub-resources (`matPage` / `histPage` style keys). */
export function DetailTablePaginationBar({
  basePath,
  pageKey,
  pageSizeKey,
  page,
  pageSize,
  total,
  preserve,
}: {
  basePath: string;
  pageKey: string;
  pageSizeKey: string;
  page: number;
  pageSize: number;
  total: number;
  preserve: Record<string, string | undefined>;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, total);

  const href = (pg: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(preserve)) {
      if (v !== undefined && v !== "") params.set(k, v);
    }
    params.set(pageKey, String(pg));
    params.set(pageSizeKey, String(pageSize));
    const qs = params.toString();
    return `${basePath}?${qs}`;
  };

  return (
    <div className="table-pagination">
      <span className="table-pagination-meta">
        {total === 0 ? "No rows" : `${start}–${end} of ${total}`}
      </span>
      <nav className="table-pagination-nav" aria-label="Pagination">
        {safePage <= 1 ?
          <span className="table-pagination-link is-disabled">
            <ChevronLeft size={14} strokeWidth={2} aria-hidden />
            Prev
          </span>
        : <Link href={href(safePage - 1)} className="table-pagination-link">
            <ChevronLeft size={14} strokeWidth={2} aria-hidden />
            Prev
          </Link>
        }
        <span className="table-pagination-page">
          {safePage}/{totalPages}
        </span>
        {safePage >= totalPages ?
          <span className="table-pagination-link is-disabled">
            Next
            <ChevronRight size={14} strokeWidth={2} aria-hidden />
          </span>
        : <Link href={href(safePage + 1)} className="table-pagination-link">
            Next
            <ChevronRight size={14} strokeWidth={2} aria-hidden />
          </Link>
        }
      </nav>
    </div>
  );
}
