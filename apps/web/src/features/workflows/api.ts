import { apiClient } from "../../lib/api/client";
import type { WorkflowStatus, WorkflowTemplate } from "./types";

export async function listWorkflows() {
  const response = await apiClient.get<WorkflowTemplate[]>("/api/workflows");

  return response.data;
}

export async function updateWorkflowStatus(
  workflowId: string,
  status: WorkflowStatus,
) {
  const response = await apiClient.patch<WorkflowTemplate>(
    `/api/workflows/${workflowId}`,
    { status },
  );

  return response.data;
}
