import { apiClient } from "./apiClient";

export type AdminAccountStatus = "ACTIVE" | "DISABLED" | "PENDING_SETUP";
export type AdminRole = "WOREDA_ADMIN" | "HIBRET_ADMIN";

export type AdminListItem = {
  id: string;
  email: string;
  role: AdminRole;
  status: AdminAccountStatus;
  privileges: string[];
  hibretId?: string | null;
  hibretName?: string | null;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminSummary = {
  total: number;
  woredaAdmins: number;
  hibretAdmins: number;
  active: number;
  pendingSetup: number;
  disabled: number;
};

export type AdminFormOptions = {
  hibrets: Array<{
    id: string;
    name: string;
    status?: string | null;
  }>;
  privileges: string[];
};

export type AdminPayload = {
  email: string;
  role: AdminRole;
  hibretId?: string | null;
  privileges: string[];
};

export async function getAdmins() {
  const response = await apiClient.get<{
    summary: AdminSummary;
    admins: AdminListItem[];
  }>("/admins");

  return response.data;
}

export async function getAdminFormOptions() {
  const response = await apiClient.get<{ options: AdminFormOptions }>(
    "/admins/form-options"
  );

  return response.data.options;
}

export async function createAdmin(payload: AdminPayload) {
  const response = await apiClient.post<{
    message: string;
    admin: AdminListItem;
    setupUrl?: string | null;
    previewUrl?: string | null;
  }>("/admins", payload);

  return response.data;
}

export async function getAdmin(adminId: string) {
  const response = await apiClient.get<{
    admin: AdminListItem & {
      activity: Array<{
        id: string;
        operation: string;
        targetType?: string | null;
        targetName?: string | null;
        description?: string | null;
        createdAt: string;
      }>;
    };
  }>(`/admins/${adminId}`);

  return response.data.admin;
}

export async function updateAdmin(adminId: string, payload: AdminPayload) {
  const response = await apiClient.patch<{
    message: string;
    admin: AdminListItem;
  }>(`/admins/${adminId}`, payload);

  return response.data;
}

export async function updateAdminStatus(adminId: string, status: AdminAccountStatus) {
  const response = await apiClient.patch<{
    message: string;
    admin: AdminListItem;
  }>(`/admins/${adminId}/status`, { status });

  return response.data;
}

export async function resendAdminSetup(adminId: string) {
  const response = await apiClient.post<{
    message: string;
    admin: AdminListItem;
    setupUrl?: string | null;
    previewUrl?: string | null;
  }>(`/admins/${adminId}/resend-setup`);

  return response.data;
}
