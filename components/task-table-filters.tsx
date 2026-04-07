"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { RotateCcw, Search } from "lucide-react";
import { PRIORITY_FILTER_OPTIONS, TASK_STATUS_FILTER_OPTIONS } from "@/lib/labels";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/lib/pagination";
import { parseTaskListSort } from "@/lib/task-list-sort";

type Props = {
  /** Route to push query params to, e.g. `/dashboard` or `/my-tasks` */
  basePath: string;
  currentStatus?: string;
  currentPriority?: string;
  currentQ?: string;
  currentDateFrom?: string;
  currentDateTo?: string;
  currentPageSize?: string;
  currentSort?: string;
  currentDir?: string;
};

export function TaskTableFilters({
  basePath,
  currentStatus,
  currentPriority,
  currentQ,
  currentDateFrom,
  currentDateTo,
  currentPageSize,
  currentSort,
  currentDir,
}: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus || "All");
  const [priority, setPriority] = useState(currentPriority || "All");
  const [q, setQ] = useState(currentQ || "");
  const [dateFrom, setDateFrom] = useState(currentDateFrom ?? "");
  const [dateTo, setDateTo] = useState(currentDateTo ?? "");
  const [pageSize, setPageSize] = useState(
    currentPageSize && Number(currentPageSize) > 0 ? currentPageSize : String(DEFAULT_PAGE_SIZE)
  );

  useEffect(() => {
    setStatus(currentStatus || "All");
    setPriority(currentPriority || "All");
    setQ(currentQ || "");
    setDateFrom(currentDateFrom ?? "");
    setDateTo(currentDateTo ?? "");
    setPageSize(
      currentPageSize && Number(currentPageSize) > 0 ? currentPageSize : String(DEFAULT_PAGE_SIZE)
    );
  }, [currentStatus, currentPriority, currentQ, currentDateFrom, currentDateTo, currentPageSize]);

  const apply = useCallback(() => {
    const params = new URLSearchParams();
    if (status && status !== "All") params.set("status", status);
    if (priority && priority !== "All") params.set("priority", priority);
    const trimmed = q.trim();
    if (trimmed) params.set("q", trimmed);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    const ps = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(pageSize) || DEFAULT_PAGE_SIZE));
    if (ps !== DEFAULT_PAGE_SIZE) params.set("pageSize", String(ps));
    const sortParsed = parseTaskListSort(currentSort, currentDir);
    if (sortParsed) {
      params.set("sort", sortParsed.column);
      params.set("dir", sortParsed.dir);
    }
    params.set("page", "1");
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }, [
    basePath,
    currentDir,
    currentSort,
    dateFrom,
    dateTo,
    pageSize,
    priority,
    q,
    router,
    status,
  ]);

  const reset = useCallback(() => {
    setStatus("All");
    setPriority("All");
    setQ("");
    setDateFrom("");
    setDateTo("");
    setPageSize(String(DEFAULT_PAGE_SIZE));
    router.push(basePath);
  }, [basePath, router]);

  return (
    <div className="filter-panel">
      <div className="filter-bar filter-bar-wrap">
        <div className="filter-field">
          <label htmlFor="filter-status">Status</label>
          <select
            id="filter-status"
            aria-label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {TASK_STATUS_FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-field">
          <label htmlFor="filter-priority">Priority</label>
          <select
            id="filter-priority"
            aria-label="Priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            {PRIORITY_FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-field">
          <label htmlFor="filter-modified-from">Updated from</label>
          <input
            id="filter-modified-from"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div className="filter-field">
          <label htmlFor="filter-modified-to">Updated to</label>
          <input
            id="filter-modified-to"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
        <div className="filter-field filter-field-grow">
          <label htmlFor="filter-keywords">Keywords</label>
          <input
            id="filter-keywords"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                apply();
              }
            }}
            placeholder="Task code, title, asset, assignee…"
            autoComplete="off"
          />
        </div>
        <div className="filter-field">
          <label htmlFor="filter-page-size">Per page</label>
          <select
            id="filter-page-size"
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
