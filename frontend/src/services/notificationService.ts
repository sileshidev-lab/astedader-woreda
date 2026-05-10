import { apiClient } from "./apiClient";

export type AppNotification = {
  id: string;
  title: string;
  message?: string | null;
  type: string;
  link?: string | null;
  createdAt: string;
  isUnread: boolean;
};

export async function getNotifications() {
  const response = await apiClient.get<{ notifications: AppNotification[] }>("/notifications");
  return response.data.notifications;
}

export async function markNotificationRead(notificationId: string) {
  const response = await apiClient.patch(`/notifications/${notificationId}/read`);
  return response.data;
}

export async function markAllNotificationsRead() {
  const response = await apiClient.patch("/notifications/read-all");
  return response.data;
}
