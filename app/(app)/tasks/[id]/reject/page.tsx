import { auth } from "@/lib/auth";
import { getTaskById } from "@/lib/queries";
import { rejectCompletion } from "@/lib/actions";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { XCircle } from "lucide-react";
import { AppActionForm } from "@/components/app-action-form";
import { BreadcrumbTrail } from "@/components/breadcrumb-trail";
import { TaskStatusProgress } from "@/components/task-status-progress";

export const metadata = { title: "Reject completion" };

export default async function RejectPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/");
  const user = session.user as { id: string; role: string };
  if (user.role !== "Manager") redirect("/dashboard");

  const { id } = await params;
  const taskId = Number(id);
  const task = await getTaskById(taskId, user.id, user.role as "Manager");
  if (!task || task.status !== "Completed") notFound();

  return (
    <>
      <BreadcrumbTrail
        items={[
          { href: "/dashboard", label: "Dashboard" },
          { href: `/tasks/${task.id}`, label: task.taskCode },
          { label: "Reject" },
        ]}
      />
      <div className="card">
        <h2 className="card-heading">
          <XCircle className="card-heading-icon" size={18} strokeWidth={2} aria-hidden />
          Reject completion — {task.taskCode}
        </h2>
        <p className="text-muted">{task.title}</p>
        <div className="card-progress-hint">
          <TaskStatusProgress status={task.status} variant="compact" />
        </div>
        <p className="text-muted">Current rework count: {task.reworkCount}</p>
        <AppActionForm action={rejectCompletion} loadingText="Saving…">
          <input type="hidden" name="taskId" value={task.id} />
          <div className="form-row">
            <div className="form-group">
              <label>Rejection Reason *</label>
              <textarea name="reason" required rows={3} placeholder="Explain why the work is not acceptable..." />
            </div>
          </div>
          <div className="actions form-actions-with-icon">
            <button type="submit" className="btn btn-danger btn-with-icon">
              <XCircle size={16} strokeWidth={2} aria-hidden />
              Send back for rework
            </button>
            <Link href={`/tasks/${task.id}`} className="btn btn-outline">
              Cancel
            </Link>
          </div>
        </AppActionForm>
      </div>
    </>
  );
}
