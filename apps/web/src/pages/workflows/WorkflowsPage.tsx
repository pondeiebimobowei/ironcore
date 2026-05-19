import { useMemo, useState } from "react";
import { WorkflowTemplateCard } from "../../components/workflows";
import { defaultWorkflowTemplates } from "../../features/workflows/defaults";
import type {
  WorkflowStatus,
  WorkflowTemplate,
} from "../../features/workflows/types";

export function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<WorkflowTemplate[]>(
    defaultWorkflowTemplates,
  );

  const counts = useMemo(
    () => ({
      active: workflows.filter((workflow) => workflow.status === "ACTIVE")
        .length,
      paused: workflows.filter((workflow) => workflow.status === "PAUSED")
        .length,
      steps: workflows.reduce(
        (total, workflow) => total + workflow.steps.length,
        0,
      ),
    }),
    [workflows],
  );

  const handleStatusChange = (
    workflowId: string,
    status: WorkflowStatus,
  ) => {
    setWorkflows((current) =>
      current.map((workflow) =>
        workflow.id === workflowId ? { ...workflow, status } : workflow,
      ),
    );
  };

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <h1>Workflows</h1>
          <p>Default recovery message sequences for the MVP.</p>
        </div>
      </header>
      <section className="dashboard-grid compact">
        <div className="metric">
          <span>Active workflows</span>
          <strong>{counts.active}</strong>
        </div>
        <div className="metric">
          <span>Paused workflows</span>
          <strong>{counts.paused}</strong>
        </div>
        <div className="metric">
          <span>Sequence steps</span>
          <strong>{counts.steps}</strong>
        </div>
      </section>
      {workflows.length === 0 ? (
        <section className="empty-state">
          <strong>No workflow templates</strong>
          <span>Default recovery sequences will appear here once configured.</span>
        </section>
      ) : (
        <section className="workflow-grid">
          {workflows.map((workflow) => (
            <WorkflowTemplateCard
              key={workflow.id}
              workflow={workflow}
              onStatusChange={handleStatusChange}
            />
          ))}
        </section>
      )}
    </main>
  );
}
