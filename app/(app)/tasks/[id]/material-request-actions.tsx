"use client";

import { Check, MoreHorizontal, X } from "lucide-react";
import { approveMaterial, rejectMaterial } from "@/lib/actions";
import { AppActionForm } from "@/components/app-action-form";

function closePopoverById(id: string) {
  const el = document.getElementById(id);
  if (el && "hidePopover" in el && typeof (el as HTMLElement & { hidePopover: () => void }).hidePopover === "function") {
    (el as HTMLElement & { hidePopover: () => void }).hidePopover();
  }
}

export function MaterialRequestActions({ matId }: { matId: number }) {
  const popId = `mat-review-pop-${matId}`;

  return (
    <div className="material-actions-wrap">
      <button
        type="button"
        className="btn btn-outline btn-sm material-popover-trigger"
        popoverTarget={popId}
        aria-haspopup="dialog"
        aria-controls={popId}
      >
        <MoreHorizontal size={16} strokeWidth={2} aria-hidden />
        Review
      </button>

      <div id={popId} className="material-popover" popover="auto">
        <div className="material-popover-inner">
          <div className="material-popover-header">
            <span className="material-popover-title">Approve or reject</span>
            <button
              type="button"
              className="material-popover-close"
              aria-label="Close"
              onClick={() => closePopoverById(popId)}
            >
              <X size={18} strokeWidth={2} aria-hidden />
            </button>
          </div>

          <div className="material-popover-body">
            <AppActionForm
              action={approveMaterial}
              loadingText="Approving…"
              className="material-popover-form"
              onSuccess={() => closePopoverById(popId)}
            >
              <input type="hidden" name="matId" value={matId} />
              <label className="material-inline-label" htmlFor={`mat-approve-${matId}`}>
                Approve notes <span className="optional">(optional)</span>
              </label>
              <input
                id={`mat-approve-${matId}`}
                type="text"
                name="notes"
                placeholder="e.g. PO number, vendor"
                className="material-inline-input"
                autoComplete="off"
              />
              <button type="submit" className="btn btn-success btn-sm btn-with-icon">
                <Check size={14} strokeWidth={2} aria-hidden />
                Approve
              </button>
            </AppActionForm>

            <div className="material-popover-divider" />

            <AppActionForm
              action={rejectMaterial}
              loadingText="Rejecting…"
              className="material-popover-form"
              onSuccess={() => closePopoverById(popId)}
            >
              <input type="hidden" name="matId" value={matId} />
              <label className="material-inline-label" htmlFor={`mat-reject-${matId}`}>
                Rejection reason <span className="required-star">*</span>
              </label>
              <textarea
                id={`mat-reject-${matId}`}
                name="notes"
                required
                rows={3}
                placeholder="Why is this request denied?"
                className="material-inline-textarea"
              />
              <button type="submit" className="btn btn-danger btn-sm btn-with-icon">
                <X size={14} strokeWidth={2} aria-hidden />
                Reject
              </button>
            </AppActionForm>
          </div>
        </div>
      </div>
    </div>
  );
}
