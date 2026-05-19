import { apiClient } from "../../lib/api/client";
import type { DashboardSummary } from "./types";

export async function getDashboardSummary() {
  const response =
    await apiClient.get<DashboardSummary>("/api/dashboard/summary");

  return response.data;
}
