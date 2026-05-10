import { apiClient } from "./apiClient";
import { getApiBaseUrl } from "./runtimeConfig";
import type {
  Announcement,
  CreateAnnouncementInput,
  HibretOption,
} from "../types/announcement";

export type PaginationMeta = {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type WoredaAnnouncementsSummary = {
  total: number;
  draft: number;
  published: number;
  closed: number;
  pendingReports: number;
  submissionRate: number;
};

export async function getAnnouncements(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
} = {}) {
  const response = await apiClient.get<{
    announcements: Announcement[];
    pagination: PaginationMeta;
    summary: WoredaAnnouncementsSummary;
  }>("/announcements", { params });
  return response.data;
}

export async function getAnnouncement(announcementId: string) {
  const response = await apiClient.get<{ announcement: Announcement }>(
    `/announcements/${announcementId}`
  );
  return response.data.announcement;
}

export async function createAnnouncement(input: CreateAnnouncementInput) {
  const response = await apiClient.post<{ announcement: Announcement }>(
    "/announcements",
    input
  );
  return response.data.announcement;
}

export async function getHibrets() {
  const response = await apiClient.get<{ hibrets: HibretOption[] }>("/hibrets");
  return response.data.hibrets;
}


export async function publishAnnouncement(announcementId: string) {
  const response = await apiClient.post<{ announcement: Announcement }>(
    `/announcements/${announcementId}/publish`
  );
  return response.data.announcement;
}

export async function closeAnnouncement(announcementId: string) {
  const response = await apiClient.post<{ announcement: Announcement }>(
    `/announcements/${announcementId}/close`
  );
  return response.data.announcement;
}


export async function uploadAnnouncementFile(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiClient.post<{ file: { id: string } }>(
    "/files/upload/announcement",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data.file;
}

export async function attachFilesToAnnouncement(
  announcementId: string,
  fileIds: string[]
) {
  const response = await apiClient.post<{ announcement: Announcement }>(
    `/announcements/${announcementId}/attachments`,
    { fileIds }
  );

  return response.data.announcement;
}

export function getFileDownloadUrl(fileId: string) {
  const baseUrl = getApiBaseUrl();
  const token = localStorage.getItem("astedader_woreda_token");
  const query = token ? `?token=${encodeURIComponent(token)}` : "";
  return `${baseUrl}/files/${fileId}/download${query}`;
}


export function getFileViewUrl(fileId: string) {
  const baseUrl = getApiBaseUrl();
  const token = localStorage.getItem("astedader_woreda_token");
  const query = token ? `?token=${encodeURIComponent(token)}&inline=true` : "?inline=true";
  return `${baseUrl}/files/${fileId}/download${query}`;
}


export function getAuthenticatedExportUrl(path: string) {
  const baseUrl = getApiBaseUrl();
  const token = localStorage.getItem("astedader_woreda_token");
  const separator = path.includes("?") ? "&" : "?";
  const query = token ? `${separator}token=${encodeURIComponent(token)}` : "";
  return `${baseUrl}${path}${query}`;
}

export function downloadAuthenticatedExport(path: string) {
  window.open(getAuthenticatedExportUrl(path), "_blank", "noopener,noreferrer");
}


export function getFilePreviewUrl(fileId: string) {
  const baseUrl = getApiBaseUrl();
  const token = localStorage.getItem("astedader_woreda_token");
  const query = token ? `?token=${encodeURIComponent(token)}` : "";
  return `${baseUrl}/files/${fileId}/preview${query}`;
}
