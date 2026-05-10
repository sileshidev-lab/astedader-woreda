import { apiClient } from "./apiClient";
import { getMockBroadcasts, getMockResources } from "./devMockData";
import { isDevMockDataEnabled } from "./runtimeConfig";

export type ContentStatus = "draft" | "published" | "archived";

export type FileInfo = {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  category?: string | null;
  createdAt?: string;
};

export type Broadcast = {
  id: string;
  title: string;
  summary?: string | null;
  bodyHtml: string;
  status: ContentStatus;
  coverFileId?: string | null;
  targetRoles: string[];
  attachmentCount: number;
  attachments: Array<{ id: string; file: FileInfo }>;
  publishedAt?: string | null;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ResourceItem = {
  id: string;
  title: string;
  description?: string | null;
  status: ContentStatus;
  category?: string | null;
  fileId?: string | null;
  targetRoles: string[];
  file?: FileInfo | null;
  publishedAt?: string | null;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function getBroadcasts() {
  try {
    const response = await apiClient.get<{
      broadcasts: Broadcast[];
      summary: { total: number; published: number; drafts: number; archived: number };
    }>("/broadcasts");

    return response.data;
  } catch (error) {
    if (isDevMockDataEnabled()) {
      return getMockBroadcasts();
    }
    throw error;
  }
}

export async function createBroadcast(payload: {
  title: string;
  summary?: string | null;
  bodyHtml: string;
  targetRoles: string[];
  fileIds?: string[];
  coverFileId?: string | null;
}) {
  const response = await apiClient.post<{ broadcast: Broadcast }>("/broadcasts", payload);
  return response.data.broadcast;
}

export async function updateBroadcast(broadcastId: string, payload: {
  title: string;
  summary?: string | null;
  bodyHtml: string;
  targetRoles: string[];
  fileIds?: string[];
  coverFileId?: string | null;
}) {
  const response = await apiClient.patch<{ broadcast: Broadcast }>(`/broadcasts/${broadcastId}`, payload);
  return response.data.broadcast;
}

export async function publishBroadcast(broadcastId: string) {
  const response = await apiClient.post<{ broadcast: Broadcast }>(`/broadcasts/${broadcastId}/publish`);
  return response.data.broadcast;
}

export async function archiveBroadcast(broadcastId: string) {
  const response = await apiClient.post<{ broadcast: Broadcast }>(`/broadcasts/${broadcastId}/archive`);
  return response.data.broadcast;
}

export async function uploadBroadcastFile(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiClient.post<{ file: FileInfo }>("/files/upload/broadcast", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return response.data.file;
}

export async function getResources() {
  try {
    const response = await apiClient.get<{
      resources: ResourceItem[];
      summary: { total: number; published: number; drafts: number; archived: number };
    }>("/resources");

    return response.data;
  } catch (error) {
    if (isDevMockDataEnabled()) {
      return getMockResources();
    }
    throw error;
  }
}

export async function createResource(payload: {
  title: string;
  description?: string | null;
  category?: string | null;
  fileId?: string | null;
  targetRoles: string[];
}) {
  const response = await apiClient.post<{ resource: ResourceItem }>("/resources", payload);
  return response.data.resource;
}

export async function updateResource(resourceId: string, payload: {
  title: string;
  description?: string | null;
  category?: string | null;
  fileId?: string | null;
  targetRoles: string[];
}) {
  const response = await apiClient.patch<{ resource: ResourceItem }>(`/resources/${resourceId}`, payload);
  return response.data.resource;
}

export async function publishResource(resourceId: string) {
  const response = await apiClient.post<{ resource: ResourceItem }>(`/resources/${resourceId}/publish`);
  return response.data.resource;
}

export async function archiveResource(resourceId: string) {
  const response = await apiClient.post<{ resource: ResourceItem }>(`/resources/${resourceId}/archive`);
  return response.data.resource;
}

export async function uploadResourceFile(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiClient.post<{ file: FileInfo }>("/files/upload/resource", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return response.data.file;
}

export async function getBroadcast(broadcastId: string) {
  const response = await apiClient.get<{ broadcast: Broadcast }>(`/broadcasts/${broadcastId}`);
  return response.data.broadcast;
}

export async function deleteBroadcast(broadcastId: string) {
  const response = await apiClient.delete<{ message: string }>(`/broadcasts/${broadcastId}`);
  return response.data;
}

