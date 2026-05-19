import type { WorkflowTemplateStep } from "../../features/workflows/types";
import { MockMessagePreview } from "./MockMessagePreview";

function formatDayOffset(dayOffset: number) {
  if (dayOffset === 0) {
    return "Day 0";
  }

  return dayOffset > 0 ? `Day +${dayOffset}` : `Day ${dayOffset}`;
}

export function WorkflowStepList({
  steps,
}: {
  steps: WorkflowTemplateStep[];
}) {
  return (
    <ol className="workflow-step-list">
      {steps.map((step) => (
        <li key={step.id}>
          <div className="workflow-step-header">
            <strong>{formatDayOffset(step.dayOffset)}</strong>
            <span>{step.createsTask ? "Message + task" : "Message"}</span>
          </div>
          <MockMessagePreview message={step.messageTemplate} />
        </li>
      ))}
    </ol>
  );
}
