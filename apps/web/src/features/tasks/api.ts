import { apiClient } from "../../lib/api/client";
import type { Task, TaskStatus } from "./types";

export async function listTasks(status?: TaskStatus) {
  const response = await apiClient.get<Task[]>("/api/tasks", {
    params: status ? { status } : undefined,
  });

  return response.data;
}

export async function listOpenTasks() {
  return listTasks("OPEN");
}
