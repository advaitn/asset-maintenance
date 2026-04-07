import { auth } from "@/lib/auth";
import { getTaskListPage } from "@/lib/queries";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  technicianCompletedPageTitle,
  technicianCompletedScopeHint,
} from "@/lib/labels";
import { TaskListTable } from "@/components/task-list-table";
import { TaskTableFilters } from "@/components/task-table-filters";
import { TablePaginationBar } from "@/components/table-pagination";
import { taskListPaginationPreserve } from "@/lib/task-list-sort";

export const metadata = { title: "Completed work" };

export default async function TechnicianCompletedTasksPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    priority?: string;
    q?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: string;
    pageSize?: string;
    sort?: string;
    dir?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/");
  const user = session.user as { id: string; role: string };
  if (user.role !== "Technician") redirect("/my-tasks");

  const params = await searchParams;
  const { rows, filteredTotal, baseTotal, page, pageSize, sortColumn, sortDir } =
    await getTaskListPage(user.id, "Technician", {
      ...params,
      technicianTaskScope: "completed",
    });
  const tablePreserve = taskListPaginationPreserve(params);

  const filtersActive = Boolean(
    (params.status && params.status !== "All") ||
      (params.priority && params.priority !== "All") ||
      params.q?.trim() ||
      params.dateFrom ||
      params.dateTo
  );

  const start = filteredTotal === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, filteredTotal);

  const emptyMessage =
    filtersActive ?
      "No rows match these filters."
    : "No completed or confirmed assignments yet.";

  return (
    <>
      <div className="page-header" style={{ border: "none", paddingTop: 0, marginBottom: 8 }}>
        <p style={{ marginBottom: 8 }}>
          <Link href="/my-tasks" className="text-muted" style={{ fontSize: 13 }}>
            ← Back to active queue
          </Link>
        </p>
        <h1 style={{ marginBottom: 6 }}>{technicianCompletedPageTitle()}</h1>
        <p className="text-muted" style={{ marginBottom: 0 }}>
          {technicianCompletedScopeHint()}
        </p>
      </div>

      <TaskTableFilters
        basePath="/my-tasks/completed"
        currentStatus={params.status}
        currentPriority={params.priority}
        currentQ={params.q}
        currentDateFrom={params.dateFrom}
        currentDateTo={params.dateTo}
        currentPageSize={params.pageSize}
        currentSort={params.sort}
        currentDir={params.dir}
      />
      {filtersActive && filteredTotal > 0 && (
        <p className="filter-active-hint">
          Showing {start}–{end} of {filteredTotal} matching row{filteredTotal === 1 ? "" : "s"} (of{" "}
          {baseTotal} in this archive).
        </p>
      )}

      <TaskListTable
        tasks={rows}
        emptyMessage={emptyMessage}
        basePath="/my-tasks/completed"
        preserveQuery={tablePreserve}
        pageSize={pageSize}
        sortColumn={sortColumn}
        sortDir={sortDir}
      />

      <TablePaginationBar
        basePath="/my-tasks/completed"
        page={page}
        pageSize={pageSize}
        total={filteredTotal}
        preserve={tablePreserve}
      />
    </>
  );
}
