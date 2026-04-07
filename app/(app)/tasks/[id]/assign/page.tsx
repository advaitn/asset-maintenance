import { auth } from "@/lib/auth";
import { getTaskById, getTechnicians } from "@/lib/queries";
import { assignTask } from "@/lib/actions";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { AppActionForm } from "@/components/app-action-form";
import { BreadcrumbTrail } from "@/components/breadcrumb-trail";
import { TaskStatusProgress } from "@/components/task-status-progress";

export const metadata = { title: "Assign technician" };

export default async function AssignPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/");
  const user = session.user as { id: string; role: string };
  if (user.role !== "Manager") redirect("/dashboard");

  const { id } = await params;
  const taskId = Number(id);
  const task = await getTaskById(taskId, user.id, user.role as "Manager");
  if (!task || task.status !== "Reported") notFound();

  const technicians = await getTechnicians();

  return (
    <>
      <BreadcrumbTrail
        items={[
          { href: "/dashboard", label: "Dashboard" },
          { href: `/tasks/${task.id}`, label: task.taskCode },
          { label: "Assign" },
        ]}
      />
      <div className="card">
        <h2 className="card-heading">
          <UserPlus className="card-heading-icon" size={18} strokeWidth={2} aria-hidden />
          Assign technician — {task.taskCode}
        </h2>
        <p className="text-muted">{task.title}</p>
        <div className="card-progress-hint">
          <TaskStatusProgress status={task.status} variant="compact" />
        </div>
        <AppActionForm action={assignTask} loadingText="Assigning…">
          <input type="hidden" name="taskId" value={task.id} />
          <div className="form-row">
            <div className="form-group">
              <label>Technician *</label>
              <select name="techId" required>
                <option value="">Select technician…</option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>{t.fullName}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="actions form-actions-with-icon">
            <button type="submit" className="btn btn-primary btn-with-icon">
              <UserPlus size={16} strokeWidth={2} aria-hidden />
              Assign
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
