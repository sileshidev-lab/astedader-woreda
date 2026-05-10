import { apiClient } from "./apiClient";
import { isDevMockDataEnabled } from "./runtimeConfig";
import { getMockAnnouncementById, getMockAnnouncements, getMockAttendance } from "./devMockData";
import type { Announcement } from "../types/announcement";
import type { PaginationMeta } from "./announcementService";

export type HibretReport = {
  id: string;
  announcementId: string;
  hibretId: string;
  title: string;
  summary?: string | null;
  body: string;
  status: "draft" | "submitted" | "approved" | "rejected" | "changes_requested";
  submittedAt?: string | null;
  reviewedAt?: string | null;
  reviewedById?: string | null;
  reviewDecision?: "approved" | "rejected" | "changes_requested" | null;
  reviewComment?: string | null;
  createdAt: string;
  updatedAt: string;
  announcement: Announcement;
  hibret: {
    id: string;
    name: string;
    description?: string | null;
    status?: string | null;
  };
  attachments: Array<{
    id: string;
    reportId: string;
    fileId: string;
    createdAt: string;
    file: {
      id: string;
      originalName: string;
      storedName: string;
      mimeType: string;
      sizeBytes: number;
      category?: string | null;
      createdAt: string;
    };
  }>;
  reviews: Array<{
    id: string;
    reportId: string;
    reviewerUserId?: string | null;
    decision: "approved" | "rejected" | "changes_requested";
    comment?: string | null;
    createdAt: string;
  }>;
};

export type AttendanceStatus = "present" | "absent" | "excused";

export type HibretAttendanceMember = {
  memberId: string;
  memberCode?: string | null;
  fanId?: string | null;
  ppId?: string | null;
  name: string;
  gender: string;
  phone?: string | null;
  status: AttendanceStatus | null;
  note?: string | null;
  recordedAt?: string | null;
};

export type HibretAttendance = {
  announcement: {
    id: string;
    title: string;
    attendanceRequired: boolean;
    status: string;
  };
  hibret: {
    id: string;
    name: string;
  };
  summary: {
    total: number;
    marked: number;
    unmarked: number;
    present: number;
    absent: number;
    excused: number;
    attendanceRate: number;
    completionRate: number;
  };
  members: HibretAttendanceMember[];
};

export type HibretAnnouncementsSummary = {
  assigned: number;
  submitted: number;
  pending: number;
  approved: number;
};

export async function getHibretAnnouncements(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: string;
  status?: string;
} = {}) {
  try {
    const response = await apiClient.get<{
      announcements: Announcement[];
      pagination: PaginationMeta;
      summary: HibretAnnouncementsSummary;
    }>("/hibret/announcements", { params });

    return response.data;
  } catch (error) {
    if (isDevMockDataEnabled()) {
      return getMockAnnouncements(params);
    }
    throw error;
  }
}

export async function getHibretAnnouncement(announcementId: string) {
  try {
    const response = await apiClient.get<{ announcement: Announcement }>(
      `/hibret/announcements/${announcementId}`
    );

    return response.data.announcement;
  } catch (error) {
    if (isDevMockDataEnabled()) {
      return getMockAnnouncementById(announcementId);
    }
    throw error;
  }
}

export async function getHibretReports() {
  const response = await apiClient.get<{ reports: HibretReport[] }>(
    "/hibret/reports"
  );

  return response.data.reports;
}

export async function getHibretReport(reportId: string) {
  const response = await apiClient.get<{ report: HibretReport }>(
    `/hibret/reports/${reportId}`
  );

  return response.data.report;
}

export async function saveHibretReport(
  announcementId: string,
  payload: {
    title: string;
    summary?: string | null;
    body: string;
  }
) {
  const response = await apiClient.post<{ report: HibretReport }>(
    `/hibret/announcements/${announcementId}/report`,
    payload
  );

  return response.data.report;
}

export async function updateHibretReport(
  reportId: string,
  payload: {
    title: string;
    summary?: string | null;
    body: string;
  }
) {
  const response = await apiClient.patch<{ report: HibretReport }>(
    `/hibret/reports/${reportId}`,
    payload
  );

  return response.data.report;
}

export async function submitHibretReport(reportId: string) {
  const response = await apiClient.post<{ report: HibretReport }>(
    `/hibret/reports/${reportId}/submit`,
    {}
  );

  return response.data.report;
}

export async function attachHibretReportFiles(reportId: string, fileIds: string[]) {
  const response = await apiClient.post<{ report: HibretReport }>(
    `/hibret/reports/${reportId}/attachments`,
    { fileIds }
  );

  return response.data.report;
}

export async function uploadReportFile(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiClient.post<{
    file: {
      id: string;
      originalName: string;
      storedName: string;
      mimeType: string;
      sizeBytes: number;
      path?: string;
      category?: string | null;
      uploadedById?: string | null;
      createdAt: string;
    };
  }>("/files/upload/report", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data.file;
}

export async function getHibretAttendance(announcementId: string) {
  try {
    const response = await apiClient.get<{ attendance: HibretAttendance }>(
      `/hibret/announcements/${announcementId}/attendance`
    );

    return response.data.attendance;
  } catch (error) {
    if (isDevMockDataEnabled()) {
      return getMockAttendance();
    }
    throw error;
  }
}

export async function saveHibretAttendance(
  announcementId: string,
  records: Array<{
    memberId: string;
    status: AttendanceStatus;
    note?: string | null;
  }>
) {
  const response = await apiClient.post<{ attendance: HibretAttendance }>(
    `/hibret/announcements/${announcementId}/attendance`,
    { records }
  );

  return response.data.attendance;
}
