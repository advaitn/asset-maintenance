import { auth } from "@/lib/auth";
import { getTaskListPage } from "@/lib/queries";
import { redirect } from "next/navigation";
import { taskQueuePageTitle, technicianQueueScopeHint } from "@/lib/labels";
import { TaskListTable } from "@/components/task-list-table";
import { TaskTableFilters } from "@/components/task-table-filters";
import { TablePaginationBar } from "@/components/table-pagination";
import { taskListPaginationPreserve } from "@/lib/task-list-sort";

export const metadata = { title: "Tasks" };

export default async function MyTasksPage({
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
  const role = user.role as "Worker" | "Manager" | "Technician";

  const params = await searchParams;
  const { rows, filteredTotal, baseTotal, page, pageSize, sortColumn, sortDir } =
    await getTaskListPage(
      user.id,
      role,
      role === "Technician" ? { ...params, technicianTaskScope: "active" } : params
    );
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
    role === "Worker" ?
      filtersActive ?
        "No reported issues match these filters."
      : "You have not reported any issues yet. Use Report new issue to log a problem."
    : filtersActive ?
      "No tasks match these filters."
    : "No tasks are assigned to you right now.";

  const scopeHint =
    role === "Worker" ?
      "Only issues you reported are shown."
    : role === "Technician" ?
      technicianQueueScopeHint()
    : role === "Manager" ?
      "All tasks in the system."
    : "Only tasks assigned to you are shown.";

  return (
    <>
      <div className="page-header" style={{ border: "none", paddingTop: 0, marginBottom: 8 }}>
        <h1 style={{ marginBottom: 6 }}>{taskQueuePageTitle(role)}</h1>
        <p className="text-muted" style={{ marginBottom: 0 }}>
          {scopeHint}
        </p>
      </div>

      <TaskTableFilters
        basePath="/my-tasks"
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
          {baseTotal} total in this list).
        </p>
      )}

      <TaskListTable
        tasks={rows}
        emptyMessage={emptyMessage}
        basePath="/my-tasks"
        preserveQuery={tablePreserve}
        pageSize={pageSize}
        sortColumn={sortColumn}
        sortDir={sortDir}
      />

      <TablePaginationBar
        basePath="/my-tasks"
        page={page}
        pageSize={pageSize}
        total={filteredTotal}
        preserve={tablePreserve}
      />
    </>
  );
}
