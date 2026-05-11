import { apiClient } from "./apiClient";

export type ReviewDecision = "approved" | "rejected" | "changes_requested";

export async function getHibretAnnouncements(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: string;
  status?: string;
}) {
  const response = await apiClient.get("/hibret/announcements", { params });
  return response.data as {
    announcements: any[];
    pagination: any;
    summary: any;
  };
}

export async function getHibretAnnouncement(announcementId: string) {
  const response = await apiClient.get(`/hibret/announcements/${announcementId}`);
  return response.data as { announcement: any };
}

export async function saveHibretReport(announcementId: string, payload: { title: string; summary?: string | null; body: string }) {
  const response = await apiClient.post(`/hibret/announcements/${announcementId}/report`, payload);
  return response.data as { report: any };
}

export async function updateHibretReport(reportId: string, payload: { title: string; summary?: string | null; body: string }) {
  const response = await apiClient.patch(`/hibret/reports/${reportId}`, payload);
  return response.data as { report: any };
}

export async function attachHibretReportFiles(reportId: string, fileIds: string[]) {
  const response = await apiClient.post(`/hibret/reports/${reportId}/attachments`, { fileIds });
  return response.data as { report: any };
}

export async function submitHibretReport(reportId: string) {
  const response = await apiClient.post(`/hibret/reports/${reportId}/submit`);
  return response.data as { report: any };
}

export async function listHibretReports() {
  const response = await apiClient.get(`/hibret/reports`);
  return response.data as { reports: any[] };
}

export async function getHibretReport(reportId: string) {
  const response = await apiClient.get(`/hibret/reports/${reportId}`);
  return response.data as { report: any };
}

export async function listWoredaReports() {
  const response = await apiClient.get(`/woreda/reports`);
  return response.data as { reports: any[] };
}

export async function getWoredaReportByAnnouncement(announcementId: string, hibretId: string) {
  const response = await apiClient.get(`/woreda/announcements/${announcementId}/hibrets/${hibretId}/report`);
  return response.data as { report: any };
}

export async function reviewReport(reportId: string, payload: { decision: ReviewDecision; comment?: string | null }) {
  const response = await apiClient.post(`/woreda/reports/${reportId}/review`, payload);
  return response.data as { report: any };
}

export async function getAttendanceForHibret(announcementId: string) {
  const response = await apiClient.get(`/hibret/announcements/${announcementId}/attendance`);
  return response.data as { attendance: any };
}

export async function saveAttendanceForHibret(
  announcementId: string,
  payload: { records: Array<{ memberId: string; status: "present" | "absent" | "excused"; note?: string | null }> }
) {
  const response = await apiClient.post(`/hibret/announcements/${announcementId}/attendance`, payload);
  return response.data as { attendance: any };
}

