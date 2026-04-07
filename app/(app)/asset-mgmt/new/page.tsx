import { auth } from "@/lib/auth";
import { getDepartments } from "@/lib/queries";
import { createAsset } from "@/lib/actions";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PackagePlus } from "lucide-react";
import { ASSET_TYPE_FORM_OPTIONS } from "@/lib/labels";
import { AppActionForm } from "@/components/app-action-form";
import { BreadcrumbTrail } from "@/components/breadcrumb-trail";

export const metadata = { title: "New asset" };

export default async function NewAssetPage() {
  const session = await auth();
  if (!session?.user) redirect("/");
  const user = session.user as { id: string; role: string };
  if (user.role !== "Manager") redirect("/dashboard");

  const departments = await getDepartments();

  return (
    <>
      <BreadcrumbTrail
        items={[
          { href: "/dashboard", label: "Dashboard" },
          { href: "/asset-mgmt", label: "Assets" },
          { label: "New asset" },
        ]}
      />
      <div className="card">
        <h2 className="card-heading">
          <PackagePlus className="card-heading-icon" size={18} strokeWidth={2} aria-hidden />
          Create new asset
        </h2>
        <AppActionForm action={createAsset} loadingText="Creating asset…">
          <div className="form-row">
            <div className="form-group">
              <label>Name *</label>
              <input type="text" name="name" required />
            </div>
            <div className="form-group">
              <label>Location</label>
              <input type="text" name="location" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Type *</label>
              <select name="assetType" required>
                <option value="">Select type…</option>
                {ASSET_TYPE_FORM_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Department *</label>
              <select name="departmentId" required>
                <option value="">Select department...</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="actions form-actions-with-icon">
            <button type="submit" className="btn btn-primary btn-with-icon">
              <PackagePlus size={16} strokeWidth={2} aria-hidden />
              Create asset
            </button>
            <Link href="/asset-mgmt" className="btn btn-outline">
              Cancel
            </Link>
          </div>
        </AppActionForm>
      </div>
    </>
  );
}
