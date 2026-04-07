/** User-facing copy for enum values (badges, filters, history). */

export const taskStatusLabel = (status: string): string => {
  const map: Record<string, string> = {
    Reported: "Reported",
    Assigned: "Assigned",
    InProgress: "In progress",
    MaterialRequested: "Material requested",
    MaterialApproved: "Materials approved",
    Completed: "Completed",
    Confirmed: "Confirmed",
    Cancelled: "Cancelled",
    "—": "—",
  };
  return map[status] ?? status;
};

export const taskPriorityLabel = (p: string): string => {
  const map: Record<string, string> = {
    Low: "Low",
    Medium: "Medium",
    High: "High",
    Critical: "Critical",
  };
  return map[p] ?? p;
};

export const materialRequestStatusLabel = (s: string): string => {
  const map: Record<string, string> = {
    Pending: "Pending",
    Approved: "Approved",
    Rejected: "Rejected",
  };
  return map[s] ?? s;
};

export const assetTypeLabel = (t: string): string => {
  const map: Record<string, string> = {
    Pump: "Pump",
    Motor: "Motor",
    Conveyor: "Conveyor",
    Compressor: "Compressor",
    HVAC: "HVAC",
    Electrical: "Electrical",
  };
  return map[t] ?? t;
};

export const userRoleLabel = (role: string): string => {
  const map: Record<string, string> = {
    Worker: "Floor worker",
    Manager: "Manager",
    Technician: "Technician",
  };
  return map[role] ?? role;
};

/** `/my-tasks` lists `reportedBy` for Workers, `assignedTo` for Technicians. */
export function taskQueueNavLabel(role: string): string {
  if (role === "Worker") return "Reported issues";
  if (role === "Technician") return "My work queue";
  return "Tasks";
}

export function taskQueuePageTitle(role: string): string {
  if (role === "Worker") return "Issues you reported";
  if (role === "Technician") return "Tasks assigned to you";
  return "Tasks";
}

export function taskQueueBreadcrumbLabel(role: string): string {
  if (role === "Worker") return "Reported issues";
  if (role === "Technician") return "My work queue";
  return "Tasks";
}

export function technicianCompletedPageTitle(): string {
  return "Completed work";
}

export function technicianCompletedNavLabel(): string {
  return "Completed work";
}

export function technicianQueueScopeHint(): string {
  return "Active assignments only — Confirmed and cancelled jobs are not shown. Open Completed work in the nav for finished items.";
}

export function technicianCompletedScopeHint(): string {
  return "Tasks you marked complete (including awaiting manager confirmation) and manager-confirmed closures.";
}

/** CSS class suffix matches prototype: badge-{lowercased enum} */
export function enumBadgeClass(value: string): string {
  return `badge badge-${value.toLowerCase().replace(/\s+/g, "")}`;
}

export const TASK_STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "All", label: "All statuses" },
  { value: "Reported", label: "Reported" },
  { value: "Assigned", label: "Assigned" },
  { value: "InProgress", label: "In progress" },
  { value: "MaterialRequested", label: "Material requested" },
  { value: "MaterialApproved", label: "Materials approved" },
  { value: "Completed", label: "Completed" },
  { value: "Confirmed", label: "Confirmed" },
  { value: "Cancelled", label: "Cancelled" },
];

export const PRIORITY_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "All", label: "All priorities" },
  { value: "Low", label: "Low" },
  { value: "Medium", label: "Medium" },
  { value: "High", label: "High" },
  { value: "Critical", label: "Critical" },
];

export const ASSET_TYPE_FORM_OPTIONS: { value: string; label: string }[] = [
  { value: "Pump", label: "Pump" },
  { value: "Motor", label: "Motor" },
  { value: "Conveyor", label: "Conveyor" },
  { value: "Compressor", label: "Compressor" },
  { value: "HVAC", label: "HVAC" },
  { value: "Electrical", label: "Electrical" },
];

export const PRIORITY_FORM_VALUES = ["Low", "Medium", "High", "Critical"] as const;
