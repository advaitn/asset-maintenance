import { auth } from "@/lib/auth";
import { getDashboardStats, getTaskListPage } from "@/lib/queries";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  CircleCheck,
  ClipboardList,
  Hammer,
  Inbox,
  Package,
} from "lucide-react";
import { TaskListTable } from "@/components/task-list-table";
import { TaskTableFilters } from "@/components/task-table-filters";
import { TablePaginationBar } from "@/components/table-pagination";
import { taskListPaginationPreserve } from "@/lib/task-list-sort";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage({
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
  const stats = await getDashboardStats(user.id, role);
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

  return (
    <>
      <div className="stats">
        <div className="stat">
          <ClipboardList className="stat-ico" size={22} strokeWidth={1.75} aria-hidden />
          <div className="stat-body">
            <div className="num">{stats.total}</div>
            <div className="label">{role === "Technician" ? "Active queue" : "Total tasks"}</div>
          </div>
        </div>
        <div className="stat">
          <Inbox className="stat-ico" size={22} strokeWidth={1.75} aria-hidden />
          <div className="stat-body">
            <div className="num">{stats.reported}</div>
            <div className="label">Reported</div>
          </div>
        </div>
        <div className="stat">
          <Hammer className="stat-ico" size={22} strokeWidth={1.75} aria-hidden />
          <div className="stat-body">
            <div className="num">{stats.inProgress}</div>
            <div className="label">In progress</div>
          </div>
        </div>
        <div className="stat">
          <Package className="stat-ico" size={22} strokeWidth={1.75} aria-hidden />
          <div className="stat-body">
            <div className="num">{stats.matReq}</div>
            <div className="label">Awaiting materials</div>
          </div>
        </div>
        <div className="stat">
          <CircleCheck className="stat-ico" size={22} strokeWidth={1.75} aria-hidden />
          <div className="stat-body">
            <div className="num">{stats.completed}</div>
            <div className="label">Awaiting confirmation</div>
          </div>
        </div>
        {stats.escalated > 0 && (
          <div className="stat stat-warn">
            <AlertTriangle className="stat-ico" size={22} strokeWidth={1.75} aria-hidden />
            <div className="stat-body">
              <div className="num text-danger">{stats.escalated}</div>
              <div className="label">Escalated (3+ reworks)</div>
            </div>
          </div>
        )}
      </div>

      {stats.escalated > 0 && (
        <div className="notice alert alert-flex">
          <AlertTriangle className="notice-icon" size={18} strokeWidth={2} aria-hidden />
          <span>
            {stats.escalated} task(s) have been sent back 3+ times — consider escalation or reassignment.
          </span>
        </div>
      )}

      {role === "Technician" && (
        <p className="filter-active-hint" style={{ marginTop: 0 }}>
          Finished jobs (Completed + Confirmed) are listed under{" "}
          <Link href="/my-tasks/completed">Completed work</Link>, not in this table or KPIs.
        </p>
      )}

      <TaskTableFilters
        basePath="/dashboard"
        currentStatus={params.status}
        currentPriority={params.priority}
        currentQ={params.q}
        currentDateFrom={params.dateFrom}
        currentDateTo={params.dateTo}
        currentPageSize={params.pageSize}
        currentSort={params.sort}
        currentDir={params.dir}
      />
      {filtersActive && (
        <p className="filter-active-hint">
          {filteredTotal === 0 ?
            "No tasks match these filters."
          : `Showing ${start}–${end} of ${filteredTotal} matching task${filteredTotal === 1 ? "" : "s"} (of ${baseTotal} in your scope).`}
          {role === "Technician" ?
            "KPIs match your active queue; table filters apply to the rows below."
          : "KPIs above reflect your full scope, not the table filters."}
        </p>
      )}

      <TaskListTable
        tasks={rows}
        emptyMessage={filtersActive ? "No tasks match these filters." : "No tasks found."}
        basePath="/dashboard"
        preserveQuery={tablePreserve}
        pageSize={pageSize}
        sortColumn={sortColumn}
        sortDir={sortDir}
      />

      <TablePaginationBar
        basePath="/dashboard"
        page={page}
        pageSize={pageSize}
        total={filteredTotal}
        preserve={tablePreserve}
      />
    </>
  );
}
