import type { Prisma } from "@prisma/client";

export const TASK_LIST_SORT_COLUMNS = [
  "taskCode",
  "title",
  "asset",
  "status",
  "priority",
  "assignedTo",
  "updated",
] as const;

export type TaskListSortColumn = (typeof TASK_LIST_SORT_COLUMNS)[number];

function isSortColumn(v: string): v is TaskListSortColumn {
  return (TASK_LIST_SORT_COLUMNS as readonly string[]).includes(v);
}

export function parseTaskListSort(
  sort: string | undefined,
  dir: string | undefined
): { column: TaskListSortColumn; dir: "asc" | "desc" } | null {
  if (!sort || !isSortColumn(sort)) return null;
  return { column: sort, dir: dir === "asc" ? "asc" : "desc" };
}

/** Default table order when no `sort` query param. */
export const DEFAULT_TASK_LIST_SORT = {
  column: "updated" as const,
  dir: "desc" as const,
};

export function resolveTaskListSort(filters: { sort?: string; dir?: string }): {
  column: TaskListSortColumn;
  dir: "asc" | "desc";
  orderBy: Prisma.MaintenanceTaskOrderByWithRelationInput[];
} {
  const parsed = parseTaskListSort(filters.sort, filters.dir);
  if (!parsed) {
    return {
      ...DEFAULT_TASK_LIST_SORT,
      orderBy: [{ lastModifiedDate: "desc" }, { id: "desc" }],
    };
  }
  const { column, dir } = parsed;
  const tie = { id: dir } as const;
  switch (column) {
    case "taskCode":
      return { column, dir, orderBy: [{ taskCode: dir }, tie] };
    case "title":
      return { column, dir, orderBy: [{ title: dir }, tie] };
    case "asset":
      return { column, dir, orderBy: [{ asset: { name: dir } }, tie] };
    case "status":
      return { column, dir, orderBy: [{ status: dir }, tie] };
    case "priority":
      return { column, dir, orderBy: [{ priority: dir }, tie] };
    case "assignedTo":
      return { column, dir, orderBy: [{ assignedTo: { fullName: dir } }, tie] };
    case "updated":
      return { column, dir, orderBy: [{ lastModifiedDate: dir }, tie] };
  }
}

export function nextTaskListSortParams(
  column: TaskListSortColumn,
  activeColumn: TaskListSortColumn,
  activeDir: "asc" | "desc"
): { sort: string; dir: "asc" | "desc" } {
  if (activeColumn === column) {
    return { sort: column, dir: activeDir === "asc" ? "desc" : "asc" };
  }
  const dir = column === "updated" ? "desc" : "asc";
  return { sort: column, dir };
}

export function buildTaskListSortHref(
  basePath: string,
  preserve: Record<string, string | undefined>,
  pageSize: number,
  column: TaskListSortColumn,
  activeColumn: TaskListSortColumn,
  activeDir: "asc" | "desc"
): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(preserve)) {
    if (v !== undefined && v !== "") params.set(k, v);
  }
  const next = nextTaskListSortParams(column, activeColumn, activeDir);
  params.set("sort", next.sort);
  params.set("dir", next.dir);
  params.set("page", "1");
  params.set("pageSize", String(pageSize));
  return `${basePath}?${params.toString()}`;
}

/** Query keys to keep when paginating / sorting task tables. */
export function taskListPaginationPreserve(p: {
  status?: string;
  priority?: string;
  q?: string;
  dateFrom?: string;
  dateTo?: string;
  pageSize?: string;
  sort?: string;
  dir?: string;
}): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  if (p.status && p.status !== "All") out.status = p.status;
  if (p.priority && p.priority !== "All") out.priority = p.priority;
  const q = p.q?.trim();
  if (q) out.q = q;
  if (p.dateFrom) out.dateFrom = p.dateFrom;
  if (p.dateTo) out.dateTo = p.dateTo;
  if (p.pageSize && p.pageSize !== "10") out.pageSize = p.pageSize;
  const parsed = parseTaskListSort(p.sort, p.dir);
  if (parsed) {
    out.sort = parsed.column;
    out.dir = parsed.dir;
  }
  return out;
}
