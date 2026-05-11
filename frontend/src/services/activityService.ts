import { apiClient } from "./apiClient";

export type ActivityLogItem = {
  id: string;
  actorUserId?: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  operation: string;
  targetType?: string | null;
  targetName?: string | null;
  description?: string | null;
  metadata?: any;
  createdAt: string;
};

export async function getActivity(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  actorRole?: string;
  operation?: string;
  targetType?: string;
}) {
  const response = await apiClient.get<{ activity: ActivityLogItem[]; pagination: any }>("/activity", {
    params,
  });
  return response.data;
}

export async function getActivitySummary() {
  const response = await apiClient.get("/activity/summary");
  return response.data as any;
}
