import { auth } from "@/lib/auth";
import { getActiveAssets } from "@/lib/queries";
import { createTask } from "@/lib/actions";
import { redirect } from "next/navigation";
import { ClipboardPlus } from "lucide-react";
import { PRIORITY_FORM_VALUES, taskPriorityLabel } from "@/lib/labels";
import { AppActionForm } from "@/components/app-action-form";
import { BreadcrumbTrail } from "@/components/breadcrumb-trail";
import { CardHeading } from "@/components/card-heading";

export const metadata = { title: "Report issue" };

export default async function ReportIssuePage() {
  const session = await auth();
  if (!session?.user) redirect("/");
  const user = session.user as { id: string; role: string };
  if (user.role !== "Worker") redirect("/dashboard");

  const assets = await getActiveAssets();

  return (
    <>
      <BreadcrumbTrail
        items={[{ href: "/dashboard", label: "Dashboard" }, { label: "Report issue" }]}
      />
      <div className="card">
        <CardHeading icon={ClipboardPlus}>Report new issue</CardHeading>
        <AppActionForm action={createTask} loadingText="Submitting report…">
          <div className="form-row">
            <div className="form-group">
              <label>Title *</label>
              <input type="text" name="title" required />
            </div>
            <div className="form-group">
              <label>Priority</label>
              <select name="priority" defaultValue="Medium">
                {PRIORITY_FORM_VALUES.map((p) => (
                  <option key={p} value={p}>{taskPriorityLabel(p)}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Asset *</label>
              <select name="assetId" required>
                <option value="">Select asset…</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} — {a.location} ({a.department.name})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Description</label>
              <textarea name="description" rows={3} />
            </div>
          </div>
          <div className="actions form-actions-with-icon">
            <button type="submit" className="btn btn-primary btn-with-icon">
              <ClipboardPlus size={17} strokeWidth={2} aria-hidden />
              Submit report
            </button>
          </div>
        </AppActionForm>
      </div>
    </>
  );
}
