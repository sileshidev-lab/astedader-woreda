import { apiClient } from "./apiClient";
import type { AuthUser, LoginResponse, MeResponse } from "../types/auth";

export async function login(email: string, password: string) {
  const response = await apiClient.post<LoginResponse>("/auth/login", { email, password });
  return response.data;
}

export async function completeTwoFactorLogin(twoFactorToken: string, code: string) {
  const response = await apiClient.post<{ token: string; user: AuthUser }>("/auth/login/2fa", {
    twoFactorToken,
    code,
  });
  return response.data;
}

export async function me() {
  const response = await apiClient.get<MeResponse>("/auth/me");
  return response.data.user;
}

export async function forgotPassword(email: string) {
  const response = await apiClient.post<{ message: string; previewUrl?: string | null }>(
    "/auth/forgot-password",
    { email }
  );
  return response.data;
}

export async function getResetTokenInfo(token: string) {
  const response = await apiClient.get<{ account: { email: string } }>(`/auth/reset-token/${encodeURIComponent(token)}`);
  return response.data.account;
}

export async function resetPassword(token: string, password: string) {
  const response = await apiClient.post<{ message: string }>("/auth/reset-password", {
    token,
    password,
  });
  return response.data;
}

export async function getSetupTokenInfo(token: string) {
  const response = await apiClient.get<{
    account: { email: string; role: string; memberName: string | null; hibretName: string | null };
  }>(`/auth/setup-token/${encodeURIComponent(token)}`);
  return response.data.account;
}

export async function setupAccount(token: string, password: string) {
  const response = await apiClient.post<{ token: string; user: AuthUser }>("/auth/setup-account", {
    token,
    password,
  });
  return response.data;
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const response = await apiClient.post<{ message: string }>("/auth/change-password", {
    currentPassword,
    newPassword,
  });
  return response.data;
}

