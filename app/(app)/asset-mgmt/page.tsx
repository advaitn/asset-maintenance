import { auth } from "@/lib/auth";
import { getAssetsPaginated } from "@/lib/queries";
import { deactivateAsset, reactivateAsset } from "@/lib/actions";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PackagePlus } from "lucide-react";
import { assetTypeLabel } from "@/lib/labels";
import { AppActionForm } from "@/components/app-action-form";
import { AssetTableFilters } from "@/components/asset-table-filters";
import { BreadcrumbTrail } from "@/components/breadcrumb-trail";
import { TablePaginationBar } from "@/components/table-pagination";

export const metadata = { title: "Assets" };

export default async function AssetManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string; q?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/");
  const user = session.user as { id: string; role: string };
  if (user.role !== "Manager") redirect("/dashboard");

  const params = await searchParams;
  const { rows, total, page, pageSize } = await getAssetsPaginated(params);
  const qActive = Boolean(params.q?.trim());

  return (
    <>
      <BreadcrumbTrail
        items={[{ href: "/dashboard", label: "Dashboard" }, { label: "Asset management" }]}
      />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 className="section-title section-title-with-icon" style={{ margin: 0 }}>
          <PackagePlus size={22} strokeWidth={2} aria-hidden />
          Assets
        </h2>
        <Link href="/asset-mgmt/new" className="btn btn-primary btn-with-icon">
          <PackagePlus size={16} strokeWidth={2} aria-hidden />
          New asset
        </Link>
      </div>

      <AssetTableFilters currentQ={params.q} currentPageSize={params.pageSize} />

      {qActive && (
        <p className="filter-active-hint" style={{ marginTop: 0 }}>
          Search matches name or location. Assets have no created-date column; use search and pagination
          only.
        </p>
      )}

      <div className="card card-tight">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Location</th>
              <th>Type</th>
              <th>Department</th>
              <th>Active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="empty">
                  {qActive ? "No assets match your search." : "No assets."}
                </td>
              </tr>
            )}
            {rows.map((a) => (
              <tr key={a.id}>
                <td>{a.name}</td>
                <td>{a.location}</td>
                <td>{assetTypeLabel(a.assetType)}</td>
                <td>{a.department.name}</td>
                <td>{a.isActive ? "Yes" : "No"}</td>
                <td>
                  {a.isActive ?
                    <AppActionForm action={deactivateAsset} loadingText="Updating…" className="inline-form">
                      <input type="hidden" name="assetId" value={a.id} />
                      <button type="submit" className="btn btn-danger btn-sm">
                        Deactivate
                      </button>
                    </AppActionForm>
                  : <AppActionForm action={reactivateAsset} loadingText="Updating…" className="inline-form">
                      <input type="hidden" name="assetId" value={a.id} />
                      <button type="submit" className="btn btn-success btn-sm">
                        Reactivate
                      </button>
                    </AppActionForm>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TablePaginationBar
        basePath="/asset-mgmt"
        page={page}
        pageSize={pageSize}
        total={total}
        preserve={{
          ...(params.q?.trim() ? { q: params.q.trim() } : {}),
          ...(params.pageSize && params.pageSize !== "10" ? { pageSize: params.pageSize } : {}),
        }}
      />
    </>
  );
}
