"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CalendarRange, X } from "lucide-react";

type Props = {
  basePath: string;
  /** Query keys for this block, e.g. matFrom, matTo */
  fromKey: string;
  toKey: string;
  pageKey: string;
  currentFrom?: string;
  currentTo?: string;
  /** All other query params to keep (e.g. the other section’s filters). */
  preserve: Record<string, string | undefined>;
  idPrefix: string;
};

export function TaskDetailTableFilters({
  basePath,
  fromKey,
  toKey,
  pageKey,
  currentFrom,
  currentTo,
  preserve,
  idPrefix,
}: Props) {
  const router = useRouter();
  const [from, setFrom] = useState(currentFrom ?? "");
  const [to, setTo] = useState(currentTo ?? "");

  useEffect(() => {
    setFrom(currentFrom ?? "");
    setTo(currentTo ?? "");
  }, [currentFrom, currentTo]);

  const apply = useCallback(() => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(preserve)) {
      if (v !== undefined && v !== "") params.set(k, v);
    }
    if (from) params.set(fromKey, from);
    if (to) params.set(toKey, to);
    params.set(pageKey, "1");
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }, [basePath, from, fromKey, pageKey, preserve, router, to, toKey]);

  const reset = useCallback(() => {
    setFrom("");
    setTo("");
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(preserve)) {
      if (v !== undefined && v !== "") params.set(k, v);
    }
    params.set(pageKey, "1");
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }, [basePath, pageKey, preserve, router]);

  return (
    <div className="filter-panel filter-panel-inline">
      <div className="filter-bar filter-bar-wrap">
        <div className="filter-field">
          <label htmlFor={`${idPrefix}-from`}>From (UTC date)</label>
          <input
            id={`${idPrefix}-from`}
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="filter-field">
          <label htmlFor={`${idPrefix}-to`}>To (UTC date)</label>
          <input
            id={`${idPrefix}-to`}
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <div className="filter-actions">
          <button type="button" className="btn btn-primary" onClick={apply}>
            <CalendarRange size={15} strokeWidth={2} aria-hidden />
            Apply
          </button>
          <button type="button" className="btn btn-outline" onClick={reset}>
            <X size={15} strokeWidth={2} aria-hidden />
            Clear dates
          </button>
        </div>
      </div>
    </div>
  );
}
