import { apiClient, AUTH_TOKEN_KEY } from "./apiClient";
import { getApiBaseUrl } from "./runtimeConfig";

export type UploadedFile = {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  category?: string | null;
  createdAt?: string;
};

function tokenForLink() {
  return localStorage.getItem(AUTH_TOKEN_KEY) || "";
}

export function filePreviewUrl(fileId: string) {
  const baseUrl = getApiBaseUrl();
  const token = tokenForLink();
  return `${baseUrl}/files/${encodeURIComponent(fileId)}/preview?token=${encodeURIComponent(token)}`;
}

export function fileDownloadUrl(fileId: string, opts?: { inline?: boolean }) {
  const baseUrl = getApiBaseUrl();
  const token = tokenForLink();
  const inline = opts?.inline ? "&inline=true" : "";
  return `${baseUrl}/files/${encodeURIComponent(fileId)}/download?token=${encodeURIComponent(token)}${inline}`;
}

async function upload(path: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiClient.post<{ file: UploadedFile }>(path, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return response.data.file;
}

export function uploadAnnouncementFile(file: File) {
  return upload("/files/upload/announcement", file);
}

export function uploadBroadcastFile(file: File) {
  return upload("/files/upload/broadcast", file);
}

export function uploadResourceFile(file: File) {
  return upload("/files/upload/resource", file);
}

export function uploadReportFile(file: File) {
  return upload("/files/upload/report", file);
}

export function uploadMemberPhoto(file: File) {
  return upload("/files/upload/member", file);
}
