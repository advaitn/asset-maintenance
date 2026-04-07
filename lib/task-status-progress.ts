/** Ordered workflow for UI progress (material sub-states map to “work”). */
export const TASK_PIPELINE_STEPS = [
  { key: "reported", label: "Reported", statuses: ["Reported"] as const },
  { key: "assigned", label: "Assigned", statuses: ["Assigned"] as const },
  {
    key: "work",
    label: "In progress",
    statuses: ["InProgress", "MaterialRequested", "MaterialApproved"] as const,
  },
  { key: "completed", label: "Completed", statuses: ["Completed"] as const },
  { key: "confirmed", label: "Confirmed", statuses: ["Confirmed"] as const },
] as const;

export type TaskPipelineStepIndex = 0 | 1 | 2 | 3 | 4;

export function getTaskPipelineStepIndex(status: string): TaskPipelineStepIndex | "cancelled" | null {
  if (status === "Cancelled") return "cancelled";
  for (let i = 0; i < TASK_PIPELINE_STEPS.length; i++) {
    const step = TASK_PIPELINE_STEPS[i]!;
    if ((step.statuses as readonly string[]).includes(status)) return i as TaskPipelineStepIndex;
  }
  return null;
}

export function taskPipelineSummary(status: string): string {
  const idx = getTaskPipelineStepIndex(status);
  if (idx === "cancelled") return "Cancelled — outside normal workflow.";
  if (idx === null) return "";
  const step = TASK_PIPELINE_STEPS[idx]!;
  return `Workflow step ${idx + 1} of ${TASK_PIPELINE_STEPS.length}: ${step.label}.`;
}
