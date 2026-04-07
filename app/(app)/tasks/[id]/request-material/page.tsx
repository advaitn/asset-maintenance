"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import { PackagePlus } from "lucide-react";
import { toast } from "sonner";
import { submitMaterialRequests } from "@/lib/actions";
import { BreadcrumbTrail } from "@/components/breadcrumb-trail";

export default function RequestMaterialPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = Number(params.id);
  const [items, setItems] = useState([{ description: "", quantity: "1" }]);
  const [pending, startTransition] = useTransition();

  function addRow() {
    setItems([...items, { description: "", quantity: "1" }]);
  }

  function updateItem(idx: number, field: "description" | "quantity", value: string) {
    const next = [...items];
    next[idx] = { ...next[idx], [field]: value };
    setItems(next);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    const valid = items.filter((i) => i.description.trim());
    if (valid.length === 0) {
      toast.error("Add at least one line with a description.");
      return;
    }

    const fd = new FormData();
    fd.set("taskId", String(taskId));
    fd.set("items", JSON.stringify(valid));

    startTransition(async () => {
      const loadingId = toast.loading("Submitting requests…");
      try {
        const result = await submitMaterialRequests(fd);
        toast.dismiss(loadingId);
        if (result.ok) {
          if (result.message) toast.success(result.message);
          if (result.redirectTo) router.push(result.redirectTo);
          router.refresh();
        } else {
          toast.error(result.error);
        }
      } catch {
        toast.dismiss(loadingId);
        toast.error("Something went wrong. Please try again.");
      }
    });
  }

  return (
    <>
      <BreadcrumbTrail
        items={[
          { href: "/dashboard", label: "Dashboard" },
          { href: `/tasks/${taskId}`, label: "Task" },
          { label: "Request material" },
        ]}
      />
      <div className="card">
        <h2 className="card-heading">
          <PackagePlus className="card-heading-icon" size={18} strokeWidth={2} aria-hidden />
          Request material
        </h2>
        <form onSubmit={handleSubmit} aria-busy={pending}>
          {items.map((item, i) => (
            <div className="form-row" key={i}>
              <div className="form-group" style={{ flex: 3 }}>
                <label>Description *</label>
                <input
                  type="text"
                  value={item.description}
                  onChange={(e) => updateItem(i, "description", e.target.value)}
                  required
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Quantity</label>
                <input
                  type="text"
                  value={item.quantity}
                  onChange={(e) => updateItem(i, "quantity", e.target.value)}
                />
              </div>
            </div>
          ))}
          <div className="actions">
            <button type="button" className="btn btn-outline" onClick={addRow} disabled={pending}>+ Add line</button>
            <button type="submit" className="btn btn-primary btn-with-icon" disabled={pending}>
              <PackagePlus size={17} strokeWidth={2} aria-hidden />
              {pending ? "Submitting…" : "Submit requests"}
            </button>
            <Link href={`/tasks/${taskId}`} className="btn btn-outline">Cancel</Link>
          </div>
        </form>
      </div>
    </>
  );
}
