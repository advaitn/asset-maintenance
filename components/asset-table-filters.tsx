"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { RotateCcw, Search } from "lucide-react";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/lib/pagination";

export function AssetTableFilters({
  currentQ,
  currentPageSize,
}: {
  currentQ?: string;
  currentPageSize?: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState(currentQ ?? "");
  const [pageSize, setPageSize] = useState(
    currentPageSize && Number(currentPageSize) > 0 ? currentPageSize : String(DEFAULT_PAGE_SIZE)
  );

  useEffect(() => {
    setQ(currentQ ?? "");
    setPageSize(
      currentPageSize && Number(currentPageSize) > 0 ? currentPageSize : String(DEFAULT_PAGE_SIZE)
    );
  }, [currentQ, currentPageSize]);

  const apply = useCallback(() => {
    const params = new URLSearchParams();
    const trimmed = q.trim();
    if (trimmed) params.set("q", trimmed);
    const ps = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(pageSize) || DEFAULT_PAGE_SIZE));
    if (ps !== DEFAULT_PAGE_SIZE) params.set("pageSize", String(ps));
    params.set("page", "1");
    const qs = params.toString();
    router.push(qs ? `/asset-mgmt?${qs}` : "/asset-mgmt");
  }, [pageSize, q, router]);

  const reset = useCallback(() => {
    setQ("");
    setPageSize(String(DEFAULT_PAGE_SIZE));
    router.push("/asset-mgmt");
  }, [router]);

  return (
    <div className="filter-panel">
      <div className="filter-bar filter-bar-wrap">
        <div className="filter-field filter-field-grow">
          <label htmlFor="asset-filter-q">Search</label>
          <input
            id="asset-filter-q"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                apply();
              }
            }}
            placeholder="Name or location…"
            autoComplete="off"
          />
        </div>
        <div className="filter-field">
          <label htmlFor="asset-filter-page-size">Per page</label>
          <select
            id="asset-filter-page-size"
            value={pageSize}
            onChange={(e) => setPageSize(e.target.value)}
            aria-label="Rows per page"
          >
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
          </select>
        </div>
        <div className="filter-actions">
          <button type="button" className="btn btn-primary" onClick={apply}>
            <Search size={15} strokeWidth={2} aria-hidden />
            Search
          </button>
          <button type="button" className="btn btn-outline" onClick={reset}>
            <RotateCcw size={15} strokeWidth={2} aria-hidden />
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
