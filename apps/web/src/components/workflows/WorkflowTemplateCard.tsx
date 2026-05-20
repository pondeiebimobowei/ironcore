import type {
  WorkflowStatus,
  WorkflowTemplate,
} from "../../features/workflows/types";
import { WorkflowStatusToggle } from "./WorkflowStatusToggle";
import { WorkflowStepList } from "./WorkflowStepList";

type WorkflowTemplateCardProps = {
  workflow: WorkflowTemplate;
  isUpdating?: boolean;
  onStatusChange: (workflowId: string, status: WorkflowStatus) => void;
};

export function WorkflowTemplateCard({
  workflow,
  isUpdating = false,
  onStatusChange,
}: WorkflowTemplateCardProps) {
  return (
    <article className="workflow-card">
      <header className="workflow-card-header">
        <div>
          <span className={`status status-${workflow.status.toLowerCase()}`}>
            {workflow.status}
          </span>
          <h2>{workflow.name}</h2>
          <p>{workflow.description}</p>
        </div>
        <WorkflowStatusToggle
          status={workflow.status}
          isUpdating={isUpdating}
          onChange={(status) => onStatusChange(workflow.id, status)}
        />
      </header>
      <WorkflowStepList steps={workflow.steps} />
    </article>
  );
}
