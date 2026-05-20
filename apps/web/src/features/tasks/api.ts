import { apiClient } from "../../lib/api/client";
import type { Task, TaskStatus, TaskType } from "./types";

type UpdateTaskInput = {
  status?: TaskStatus;
  assignedToId?: string;
  dueDate?: string;
};

export type CreateTaskInput = {
  memberId: string;
  type: TaskType;
  assignedToId?: string;
  dueDate?: string;
};

export async function listTasks(status?: TaskStatus) {
  const response = await apiClient.get<Task[]>("/api/tasks", {
    params: status ? { status } : undefined,
  });

  return response.data;
}

export async function listOpenTasks() {
  return listTasks("OPEN");
}

export async function updateTask(taskId: string, input: UpdateTaskInput) {
  const response = await apiClient.patch<Task>(`/api/tasks/${taskId}`, input);

  return response.data;
}

export async function createTask(input: CreateTaskInput) {
  const response = await apiClient.post<Task>("/api/tasks", input);

  return response.data;
}

export async function completeTask(taskId: string) {
  return updateTask(taskId, { status: "COMPLETED" });
}
