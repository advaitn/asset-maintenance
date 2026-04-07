export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 50;

export function parsePage(v: string | undefined, fallback = 1): number {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.floor(n);
}

export function parsePageSize(v: string | undefined): number {
  const n = parsePage(v, DEFAULT_PAGE_SIZE);
  return Math.min(Math.max(1, n), MAX_PAGE_SIZE);
}

/** `yyyy-mm-dd` → UTC start of day */
export function parseDateStartUtc(v: string | undefined): Date | undefined {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return undefined;
  const d = new Date(`${v}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** `yyyy-mm-dd` → UTC end of day */
export function parseDateEndUtc(v: string | undefined): Date | undefined {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return undefined;
  const d = new Date(`${v}T23:59:59.999Z`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}
