import { apiClient } from "../../lib/api/client";
import type {
  CreateWorkflowDefinitionInput,
  WorkflowDefinition,
  WorkflowDefinitionStatus,
} from "./types";

export async function listWorkflows() {
  const response = await apiClient.get<WorkflowDefinition[]>("/api/workflows");

  return response.data;
}

export async function createWorkflow(input: CreateWorkflowDefinitionInput) {
  const response = await apiClient.post<WorkflowDefinition>(
    "/api/workflows",
    input,
  );

  return response.data;
}

export async function updateWorkflowStatus(
  workflowId: string,
  status: WorkflowDefinitionStatus,
) {
  const response = await apiClient.patch<WorkflowDefinition>(
    `/api/workflows/${workflowId}`,
    { status },
  );

  return response.data;
}
