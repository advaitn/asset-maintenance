import { auth } from "@/lib/auth";
import {
  getTaskById,
  getTaskHistoryPage,
  getTaskMaterialsPage,
  getPendingMaterialRequestsForTask,
} from "@/lib/queries";
import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  Calendar,
  CalendarClock,
  CheckCircle2,
  CircleCheck,
  Clock,
  Factory,
  FileText,
  Globe,
  Hash,
  Info,
  MapPin,
  MonitorSmartphone,
  Package,
  Play,
  RotateCw,
  ScrollText,
  UserCog,
  UserPlus,
  UserRound,
  XCircle,
} from "lucide-react";
import { pickUpTask, completeTask, confirmTask, resumeWork } from "@/lib/actions";
import { AppActionForm } from "@/components/app-action-form";
import { BreadcrumbTrail } from "@/components/breadcrumb-trail";
import { CardHeading } from "@/components/card-heading";
import {
  enumBadgeClass,
  materialRequestStatusLabel,
  taskPriorityLabel,
  taskQueueBreadcrumbLabel,
  taskStatusLabel,
} from "@/lib/labels";
import { MaterialRequestActions } from "./material-request-actions";
import { TaskDetailTableFilters } from "@/components/task-detail-table-filters";
import { DetailTablePaginationBar } from "@/components/table-pagination";
import { TaskStatusProgress } from "@/components/task-status-progress";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const session = await auth();
  if (!session?.user) return { title: "Task" };
  const user = session.user as { id: string; role: string };
  const role = user.role as "Worker" | "Manager" | "Technician";
  const { id } = await params;
  const taskId = Number(id);
  if (!Number.isFinite(taskId)) return { title: "Task" };
  const task = await getTaskById(taskId, user.id, role);
  if (!task) return { title: "Task" };
  return {
    title: task.taskCode,
    description: `${task.title} — ${task.asset.name}`,
  };
}

export default async function TaskDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    matPage?: string;
    matFrom?: string;
    matTo?: string;
    matPageSize?: string;
    histPage?: string;
    histFrom?: string;
    histTo?: string;
    histPageSize?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/");
  const user = session.user as { id: string; role: string };
  const role = user.role as "Worker" | "Manager" | "Technician";
  const { id } = await params;
  const taskId = Number(id);
  const sp = await searchParams;

  const task = await getTaskById(taskId, user.id, role);
  if (!task) notFound();

  const [materials, history, pendingMaterials] = await Promise.all([
    getTaskMaterialsPage(taskId, user.id, role, {
      page: sp.matPage,
      pageSize: sp.matPageSize,
      dateFrom: sp.matFrom,
      dateTo: sp.matTo,
    }),
    getTaskHistoryPage(taskId, user.id, role, {
      page: sp.histPage,
      pageSize: sp.histPageSize,
      dateFrom: sp.histFrom,
      dateTo: sp.histTo,
    }),
    user.role === "Manager" ? getPendingMaterialRequestsForTask(taskId, user.id, role) : Promise.resolve([]),
  ]);

  if (!materials || !history) notFound();

  const isManager = user.role === "Manager";
  const isTech = user.role === "Technician";

  const matPreserve: Record<string, string | undefined> = {
    histPage: sp.histPage,
    histFrom: sp.histFrom,
    histTo: sp.histTo,
    ...(sp.histPageSize && sp.histPageSize !== "10" ? { histPageSize: sp.histPageSize } : {}),
    matFrom: sp.matFrom,
    matTo: sp.matTo,
    ...(sp.matPageSize && sp.matPageSize !== "10" ? { matPageSize: sp.matPageSize } : {}),
  };

  const histPreserve: Record<string, string | undefined> = {
    matPage: sp.matPage,
    matFrom: sp.matFrom,
    matTo: sp.matTo,
    ...(sp.matPageSize && sp.matPageSize !== "10" ? { matPageSize: sp.matPageSize } : {}),
    histFrom: sp.histFrom,
    histTo: sp.histTo,
    ...(sp.histPageSize && sp.histPageSize !== "10" ? { histPageSize: sp.histPageSize } : {}),
  };

  const matFiltersPreserve: Record<string, string | undefined> = {
    histPage: sp.histPage,
    histFrom: sp.histFrom,
    histTo: sp.histTo,
    ...(sp.histPageSize && sp.histPageSize !== "10" ? { histPageSize: sp.histPageSize } : {}),
    ...(sp.matPageSize && sp.matPageSize !== "10" ? { matPageSize: sp.matPageSize } : {}),
  };

  const histFiltersPreserve: Record<string, string | undefined> = {
    matPage: sp.matPage,
    matFrom: sp.matFrom,
    matTo: sp.matTo,
    ...(sp.matPageSize && sp.matPageSize !== "10" ? { matPageSize: sp.matPageSize } : {}),
    ...(sp.histPageSize && sp.histPageSize !== "10" ? { histPageSize: sp.histPageSize } : {}),
  };

  return (
    <>
      <BreadcrumbTrail
        items={[
          { href: "/dashboard", label: "Dashboard" },
          ...(role === "Manager" ?
            []
          : [{ href: "/my-tasks", label: taskQueueBreadcrumbLabel(role) }]),
          { label: task.taskCode },
        ]}
      />

      <div className="page-header">
        <div className="code">{task.taskCode}</div>
        <h1>{task.title}</h1>
        <div className="meta">
          <span className={enumBadgeClass(task.status)} title={task.status}>
            {taskStatusLabel(task.status)}
          </span>
          <span className={enumBadgeClass(task.priority)} title={task.priority}>
            {taskPriorityLabel(task.priority)}
          </span>
          <span className="page-meta-item">
            <Factory size={15} strokeWidth={2} aria-hidden />
            Asset: <strong>{task.asset.name}</strong>
          </span>
          <span className="page-meta-item">
            <MapPin size={15} strokeWidth={2} aria-hidden />
            {task.asset.location}
          </span>
          <span className="page-meta-item">
            <Building2 size={15} strokeWidth={2} aria-hidden />
            {task.asset.department.name}
          </span>
          {task.reworkCount >= 3 && (
            <span className="badge badge-critical badge-icon-inline">
              <AlertTriangle size={14} strokeWidth={2} aria-hidden />
              Rework ×{task.reworkCount}
            </span>
          )}
        </div>
        <div className="page-header-progress">
          <TaskStatusProgress status={task.status} variant="full" />
        </div>
      </div>

      {task.description && (
        <div className="card">
          <CardHeading icon={FileText}>Description</CardHeading>
          <p>{task.description}</p>
        </div>
      )}

      <div className="card">
        <CardHeading icon={UserCog}>Assignment</CardHeading>
        <p className="meta-line">
          <UserRound className="meta-line-icon" size={17} strokeWidth={2} aria-hidden />
          <span>
            Reported by: <strong>{task.reportedBy.fullName}</strong>
          </span>
        </p>
        <p className="meta-line">
          <UserCog className="meta-line-icon" size={17} strokeWidth={2} aria-hidden />
          <span>
            Assigned to: <strong>{task.assignedTo?.fullName ?? "Unassigned"}</strong>
          </span>
        </p>

        <div className="actions">
          {isManager && task.status === "Reported" && (
            <Link href={`/tasks/${task.id}/assign`} className="btn btn-primary btn-with-icon">
              <UserPlus size={16} strokeWidth={2} aria-hidden />
              Assign technician
            </Link>
          )}
          {isTech && task.status === "Assigned" && (
            <AppActionForm action={pickUpTask} loadingText="Updating task…">
              <input type="hidden" name="taskId" value={task.id} />
              <button type="submit" className="btn btn-primary btn-with-icon">
                <Play size={16} strokeWidth={2} aria-hidden />
                Pick up task
              </button>
            </AppActionForm>
          )}
          {isTech && task.status === "InProgress" && (
            <>
              <Link href={`/tasks/${task.id}/request-material`} className="btn btn-outline btn-with-icon">
                <Package size={16} strokeWidth={2} aria-hidden />
                Request material
              </Link>
              <AppActionForm action={completeTask} loadingText="Saving…">
                <input type="hidden" name="taskId" value={task.id} />
                <button type="submit" className="btn btn-success btn-with-icon">
                  <CheckCircle2 size={16} strokeWidth={2} aria-hidden />
                  Mark complete
                </button>
              </AppActionForm>
            </>
          )}
          {isTech && task.status === "MaterialApproved" && (
            <AppActionForm action={resumeWork} loadingText="Updating task…">
              <input type="hidden" name="taskId" value={task.id} />
              <button type="submit" className="btn btn-primary btn-with-icon">
                <RotateCw size={16} strokeWidth={2} aria-hidden />
                Resume work
              </button>
            </AppActionForm>
          )}
          {isManager && task.status === "Completed" && (
            <>
              <AppActionForm action={confirmTask} loadingText="Confirming…">
                <input type="hidden" name="taskId" value={task.id} />
                <button type="submit" className="btn btn-success btn-with-icon">
                  <CircleCheck size={16} strokeWidth={2} aria-hidden />
                  Confirm &amp; close
                </button>
              </AppActionForm>
              <Link href={`/tasks/${task.id}/reject`} className="btn btn-danger btn-with-icon">
                <XCircle size={16} strokeWidth={2} aria-hidden />
                Reject completion
              </Link>
            </>
          )}
        </div>
      </div>

      {task.rejectionReason && (
        <div className="notice alert alert-flex">
          <AlertTriangle className="notice-icon" size={18} strokeWidth={2} aria-hidden />
          <span>
            <strong>Last completion rejection:</strong> {task.rejectionReason}
          </span>
        </div>
      )}

      {isManager && pendingMaterials.length > 0 && (
        <div className="card">
          <CardHeading icon={Clock}>
            Pending material requests ({pendingMaterials.length})
          </CardHeading>
          <p className="text-muted" style={{ marginBottom: 12, fontSize: 13 }}>
            Approve or reject here; the table below is paginated and may not show every pending row on
            one page.
          </p>
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Qty</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingMaterials.map((mr) => (
                <tr key={mr.id}>
                  <td>{mr.description}</td>
                  <td>{mr.quantity}</td>
                  <td>
                    <span className={enumBadgeClass(mr.requestStatus)} title={mr.requestStatus}>
                      {materialRequestStatusLabel(mr.requestStatus)}
                    </span>
                  </td>
                  <td>
                    <MaterialRequestActions matId={mr.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card">
        <CardHeading icon={Package}>Material requests</CardHeading>
        <p className="text-muted" style={{ marginBottom: 8, fontSize: 12 }}>
          Filter by requested date (UTC). {materials.total} row{materials.total === 1 ? "" : "s"} in
          current filter.
        </p>
        <TaskDetailTableFilters
          basePath={`/tasks/${task.id}`}
          fromKey="matFrom"
          toKey="matTo"
          pageKey="matPage"
          currentFrom={sp.matFrom}
          currentTo={sp.matTo}
          preserve={matFiltersPreserve}
          idPrefix="mat"
        />
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Qty</th>
              <th>Status</th>
              <th>Requested</th>
              <th>Manager notes</th>
            </tr>
          </thead>
          <tbody>
            {materials.rows.length === 0 && (
              <tr>
                <td colSpan={5} className="empty">
                  No material requests in this range.
                </td>
              </tr>
            )}
            {materials.rows.map((mr) => (
              <tr key={mr.id}>
                <td>{mr.description}</td>
                <td>{mr.quantity}</td>
                <td>
                  <span className={enumBadgeClass(mr.requestStatus)} title={mr.requestStatus}>
                    {materialRequestStatusLabel(mr.requestStatus)}
                  </span>
                </td>
                <td>{mr.requestedDate.toLocaleDateString()}</td>
                <td>{mr.managerNotes || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <DetailTablePaginationBar
          basePath={`/tasks/${task.id}`}
          pageKey="matPage"
          pageSizeKey="matPageSize"
          page={materials.page}
          pageSize={materials.pageSize}
          total={materials.total}
          preserve={matPreserve}
        />
      </div>

      <div className="card">
        <CardHeading icon={ScrollText}>Task history</CardHeading>
        <p className="text-muted" style={{ marginBottom: 8, fontSize: 12 }}>
          Filter by timestamp (UTC). {history.total} entr{history.total === 1 ? "y" : "ies"} in current
          filter.
        </p>
        <TaskDetailTableFilters
          basePath={`/tasks/${task.id}`}
          fromKey="histFrom"
          toKey="histTo"
          pageKey="histPage"
          currentFrom={sp.histFrom}
          currentTo={sp.histTo}
          preserve={histFiltersPreserve}
          idPrefix="hist"
        />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>From</th>
                <th>To</th>
                <th>Changed by</th>
                <th>Comment</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {history.rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty">
                    No history in this range.
                  </td>
                </tr>
              )}
              {history.rows.map((h) => (
                <tr key={h.id}>
                  <td>{h.timestamp.toLocaleString()}</td>
                  <td>{taskStatusLabel(h.oldStatus)}</td>
                  <td>{taskStatusLabel(h.newStatus)}</td>
                  <td>{h.changedBy.fullName}</td>
                  <td>{h.comment || "—"}</td>
                  <td style={{ fontFamily: "monospace", fontSize: 11 }}>{h.clientIp || "—"}</td>
                </tr>
            ))}
          </tbody>
          </table>
        </div>
        <DetailTablePaginationBar
          basePath={`/tasks/${task.id}`}
          pageKey="histPage"
          pageSizeKey="histPageSize"
          page={history.page}
          pageSize={history.pageSize}
          total={history.total}
          preserve={histPreserve}
        />
      </div>

      <details className="meta-footer" open>
        <summary>
          <Info className="summary-icon" size={16} strokeWidth={2} aria-hidden />
          Metadata
        </summary>
        <div className="meta-grid">
          <div className="meta-item">
            <div className="meta-item-label">
              <Calendar size={14} strokeWidth={2} aria-hidden />
              Created
            </div>
            <div className="meta-item-value">
              {task.createdDate.toLocaleString()}
              <span className="meta-item-by"> by {task.createdBy.fullName}</span>
            </div>
          </div>
          <div className="meta-item">
            <div className="meta-item-label">
              <CalendarClock size={14} strokeWidth={2} aria-hidden />
              Last modified
            </div>
            <div className="meta-item-value">
              {task.lastModifiedDate.toLocaleString()}
              <span className="meta-item-by"> by {task.lastModifiedBy.fullName}</span>
            </div>
          </div>
          <div className="meta-item">
            <div className="meta-item-label">
              <Hash size={14} strokeWidth={2} aria-hidden />
              Version
            </div>
            <div className="meta-item-value">{task.versionNumber}</div>
          </div>
          <div className="meta-item">
            <div className="meta-item-label">
              <Globe size={14} strokeWidth={2} aria-hidden />
              Last IP
            </div>
            <div className="meta-item-value meta-item-value--mono">
              {task.lastModifiedClientIp || "—"}
            </div>
          </div>
          <div className="meta-item meta-item--full">
            <div className="meta-item-label">
              <MonitorSmartphone size={14} strokeWidth={2} aria-hidden />
              User-agent
            </div>
            <div className="meta-item-value meta-item-value--mono meta-item-value--wrap">
              {task.lastModifiedUserAgent || "—"}
            </div>
          </div>
          {task.completedDate && (
            <div className="meta-item">
              <div className="meta-item-label">
                <CircleCheck size={14} strokeWidth={2} aria-hidden />
                Completed
              </div>
              <div className="meta-item-value">{task.completedDate.toLocaleString()}</div>
            </div>
          )}
        </div>
      </details>
    </>
  );
}
