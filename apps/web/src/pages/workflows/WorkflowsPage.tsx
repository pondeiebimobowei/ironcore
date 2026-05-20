import { useCallback, useEffect, useMemo, useState } from "react";
import { WorkflowTemplateCard } from "../../components/workflows";
import {
  listWorkflows,
  updateWorkflowStatus,
} from "../../features/workflows/api";
import { defaultWorkflowTemplates } from "../../features/workflows/defaults";
import type {
  WorkflowStatus,
  WorkflowTemplate,
} from "../../features/workflows/types";

export function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<WorkflowTemplate[]>(
    defaultWorkflowTemplates,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [updatingWorkflowId, setUpdatingWorkflowId] = useState<string | null>(
    null,
  );

  const loadWorkflows = useCallback(async () => {
    try {
      setLoadError("");
      setWorkflows(await listWorkflows());
    } catch {
      setLoadError("Could not load workflow settings.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadWorkflows();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadWorkflows]);

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

  const handleStatusChange = async (
    workflowId: string,
    status: WorkflowStatus,
  ) => {
    const previousWorkflows = workflows;

    setWorkflows((current) =>
      current.map((workflow) =>
        workflow.id === workflowId ? { ...workflow, status } : workflow,
      ),
    );
    setUpdatingWorkflowId(workflowId);
    setActionError("");

    try {
      const updatedWorkflow = await updateWorkflowStatus(workflowId, status);
      setWorkflows((current) =>
        current.map((workflow) =>
          workflow.id === workflowId ? updatedWorkflow : workflow,
        ),
      );
    } catch {
      setWorkflows(previousWorkflows);
      setActionError("Could not update the workflow status.");
    } finally {
      setUpdatingWorkflowId(null);
    }
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
      {isLoading ? (
        <section className="dashboard-state">
          <strong>Loading workflows</strong>
          <span>Fetching active recovery message sequences.</span>
        </section>
      ) : loadError ? (
        <section className="dashboard-state dashboard-state-error">
          <strong>{loadError}</strong>
          <span>Refresh the page or try again after the API is available.</span>
        </section>
      ) : workflows.length === 0 ? (
        <section className="empty-state">
          <strong>No workflow templates</strong>
          <span>Default recovery sequences will appear here once configured.</span>
        </section>
      ) : (
        <>
          {actionError ? (
            <section className="dashboard-state dashboard-state-error compact-state">
              <strong>{actionError}</strong>
              <span>The previous workflow setting was restored.</span>
            </section>
          ) : null}
          <section className="workflow-grid">
            {workflows.map((workflow) => (
              <WorkflowTemplateCard
                key={workflow.id}
                workflow={workflow}
                isUpdating={updatingWorkflowId === workflow.id}
                onStatusChange={handleStatusChange}
              />
            ))}
          </section>
        </>
      )}
    </main>
  );
}
