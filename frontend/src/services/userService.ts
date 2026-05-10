import { apiClient } from "./apiClient";

export type ManagedUser = {
  id: string;
  email: string;
  role: string;
  status: "ACTIVE" | "DISABLED" | "PENDING_SETUP";
  hibretId?: string | null;
  hibretName?: string | null;
  memberId?: string | null;
  memberName?: string | null;
  lastLoginAt?: string | null;
  createdAt: string;
};

export async function getManagedUsers(query: { search?: string; status?: string; role?: string } = {}) {
  const response = await apiClient.get<{
    summary: { total: number; active: number; pending: number; disabled: number };
    users: ManagedUser[];
  }>("/users", { params: query });

  return response.data;
}

export async function updateManagedUserStatus(
  userId: string,
  status: "ACTIVE" | "DISABLED" | "PENDING_SETUP"
) {
  const response = await apiClient.patch<{ user: ManagedUser }>(`/users/${userId}/status`, { status });
  return response.data.user;
}

export async function bulkUpdateManagedUsers(
  userIds: string[],
  status: "ACTIVE" | "DISABLED" | "PENDING_SETUP"
) {
  const response = await apiClient.patch<{ updated: number; message: string }>("/users/bulk/status", {
    userIds,
    status,
  });
  return response.data;
}
