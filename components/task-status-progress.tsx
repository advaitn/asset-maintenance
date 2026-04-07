import {
  TASK_PIPELINE_STEPS,
  getTaskPipelineStepIndex,
  taskPipelineSummary,
} from "@/lib/task-status-progress";

export function TaskStatusProgress({
  status,
  variant = "compact",
}: {
  status: string;
  variant?: "compact" | "full";
}) {
  const idx = getTaskPipelineStepIndex(status);

  if (idx === "cancelled") {
    return (
      <div
        className="task-status-progress task-status-progress--cancelled"
        role="img"
        aria-label="Task cancelled — not on the standard workflow"
      >
        <div className="task-status-progress-cancelled-track" />
        <span className="task-status-progress-cancelled-text">Cancelled</span>
      </div>
    );
  }

  if (idx === null) return null;

  const summary = taskPipelineSummary(status);
  const isClosed = status === "Confirmed";

  return (
    <div
      className={`task-status-progress task-status-progress--${variant}`}
      role="group"
      aria-label={summary}
    >
      <ol className="task-status-progress-segments">
        {TASK_PIPELINE_STEPS.map((step, i) => {
          const done = isClosed ? i <= idx : i < idx;
          const current = !isClosed && i === idx;
          return (
            <li
              key={step.key}
              className={
                done ? "is-done"
                : current ? "is-current"
                : "is-todo"
              }
              aria-current={current ? "step" : undefined}
            >
              <span className="task-status-progress-segment-fill" />
              {variant === "full" ?
                <span className="task-status-progress-step-label">{step.label}</span>
              : null}
            </li>
          );
        })}
      </ol>
      {variant === "compact" ?
        <span className="sr-only">{summary}</span>
      : null}
    </div>
  );
}
