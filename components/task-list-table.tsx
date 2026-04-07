import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowDownWideNarrow,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Factory,
  Hash,
  ListTodo,
  UserRound,
} from "lucide-react";
import { enumBadgeClass, taskPriorityLabel, taskStatusLabel } from "@/lib/labels";
import type { TaskListRow } from "@/lib/queries";
import { TaskStatusProgress } from "@/components/task-status-progress";
import {
  buildTaskListSortHref,
  type TaskListSortColumn,
} from "@/lib/task-list-sort";

function SortableTh({
  basePath,
  preserve,
  pageSize,
  column,
  activeColumn,
  activeDir,
  label,
  icon,
}: {
  basePath: string;
  preserve: Record<string, string | undefined>;
  pageSize: number;
  column: TaskListSortColumn;
  activeColumn: TaskListSortColumn;
  activeDir: "asc" | "desc";
  label: string;
  icon?: ReactNode;
}) {
  const href = buildTaskListSortHref(
    basePath,
    preserve,
    pageSize,
    column,
    activeColumn,
    activeDir
  );
  const active = activeColumn === column;
  const ariaSort =
    active ? (activeDir === "asc" ? "ascending" : "descending") : "none";

  return (
    <th aria-sort={ariaSort}>
      <Link
        href={href}
        className={`table-sort-link${active ? " is-active" : ""}`}
        prefetch={false}
      >
        <span className={icon != null ? "table-th-with-icon" : undefined}>
          {icon}
          {label}
        </span>
        {active ?
          activeDir === "asc" ?
            <ChevronUp size={14} strokeWidth={2} className="sort-chevron" aria-hidden />
          : <ChevronDown size={14} strokeWidth={2} className="sort-chevron" aria-hidden />
        : null}
      </Link>
    </th>
  );
}

export function TaskListTable({
  tasks,
  emptyMessage,
  basePath,
  preserveQuery,
  pageSize,
  sortColumn,
  sortDir,
}: {
  tasks: TaskListRow[];
  emptyMessage: string;
  basePath: string;
  preserveQuery: Record<string, string | undefined>;
  pageSize: number;
  sortColumn: TaskListSortColumn;
  sortDir: "asc" | "desc";
}) {
  return (
    <div className="card card-tight">
      <table className="task-list-table">
        <thead>
          <tr>
            <SortableTh
              basePath={basePath}
              preserve={preserveQuery}
              pageSize={pageSize}
              column="taskCode"
              activeColumn={sortColumn}
              activeDir={sortDir}
              label="Code"
              icon={<Hash size={13} strokeWidth={2} aria-hidden />}
            />
            <SortableTh
              basePath={basePath}
              preserve={preserveQuery}
              pageSize={pageSize}
              column="title"
              activeColumn={sortColumn}
              activeDir={sortDir}
              label="Title"
              icon={<ListTodo size={13} strokeWidth={2} aria-hidden />}
            />
            <SortableTh
              basePath={basePath}
              preserve={preserveQuery}
              pageSize={pageSize}
              column="asset"
              activeColumn={sortColumn}
              activeDir={sortDir}
              label="Asset"
              icon={<Factory size={13} strokeWidth={2} aria-hidden />}
            />
            <SortableTh
              basePath={basePath}
              preserve={preserveQuery}
              pageSize={pageSize}
              column="status"
              activeColumn={sortColumn}
              activeDir={sortDir}
              label="Status"
            />
            <SortableTh
              basePath={basePath}
              preserve={preserveQuery}
              pageSize={pageSize}
              column="priority"
              activeColumn={sortColumn}
              activeDir={sortDir}
              label="Priority"
              icon={<ArrowDownWideNarrow size={13} strokeWidth={2} aria-hidden />}
            />
            <SortableTh
              basePath={basePath}
              preserve={preserveQuery}
              pageSize={pageSize}
              column="assignedTo"
              activeColumn={sortColumn}
              activeDir={sortDir}
              label="Assigned to"
              icon={<UserRound size={13} strokeWidth={2} aria-hidden />}
            />
            <SortableTh
              basePath={basePath}
              preserve={preserveQuery}
              pageSize={pageSize}
              column="updated"
              activeColumn={sortColumn}
              activeDir={sortDir}
              label="Updated"
              icon={<CalendarDays size={13} strokeWidth={2} aria-hidden />}
            />
          </tr>
        </thead>
        <tbody>
          {tasks.length === 0 && (
            <tr>
              <td colSpan={7} className="empty">
                {emptyMessage}
              </td>
            </tr>
          )}
          {tasks.map((t) => (
            <tr key={t.id} className={t.reworkCount >= 3 ? "escalated" : ""}>
              <td>
                <Link href={`/tasks/${t.id}`} style={{ color: "var(--link)" }}>
                  {t.taskCode}
                </Link>
              </td>
              <td>{t.title}</td>
              <td>{t.asset.name}</td>
              <td>
                <div className="task-status-cell">
                  <TaskStatusProgress status={t.status} variant="compact" />
                  <span className={enumBadgeClass(t.status)} title={t.status}>
                    {taskStatusLabel(t.status)}
                  </span>
                </div>
              </td>
              <td>
                <span className={enumBadgeClass(t.priority)} title={t.priority}>
                  {taskPriorityLabel(t.priority)}
                </span>
              </td>
              <td>
                <span className="table-th-with-icon" style={{ fontWeight: 400 }}>
                  <UserRound size={14} strokeWidth={2} aria-hidden />
                  {t.assignedTo?.fullName ?? "—"}
                </span>
              </td>
              <td>{t.lastModifiedDate.toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
