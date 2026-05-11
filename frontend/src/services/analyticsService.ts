import { apiClient } from "./apiClient";

export async function getWoredaDashboard() {
  const response = await apiClient.get("/woreda/dashboard");
  return response.data as any;
}

export async function getMemberAnalytics(params?: Record<string, any>) {
  const response = await apiClient.get("/members/analytics", { params });
  return response.data as any;
}

