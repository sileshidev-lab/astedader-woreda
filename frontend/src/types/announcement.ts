export type AnnouncementType = "meeting" | "conference" | "trend_report" | "other";
export type AnnouncementStatus = "draft" | "published" | "closed";

export type HibretOption = {
  id: string;
  name: string;
  description?: string | null;
  status?: string | null;
  familyCount: number;
  memberCount: number;
  adminCount: number;
};

export type FileRecord = {
  id: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  sizeBytes: number;
  category?: string | null;
  createdAt: string;
};

export type AnnouncementAttachment = {
  id: string;
  fileId: string;
  file: FileRecord;
};

export type AnnouncementTarget = {
  id: string;
  hibretId: string;
  hibret: {
    id: string;
    name: string;
  };
};

export type HibretReportSummary = {
  id: string;
  announcementId: string;
  hibretId: string;
  status: string;
  submittedAt?: string | null;
  reviewDecision?: string | null;
};

export type Announcement = {
  id: string;
  title: string;
  type: AnnouncementType;
  instructions: string;
  status: AnnouncementStatus;
  deadline?: string | null;
  attendanceRequired: boolean;
  publishedAt?: string | null;
  closedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  targets: AnnouncementTarget[];
  reports: HibretReportSummary[];
  attachments: AnnouncementAttachment[];
};

export type CreateAnnouncementInput = {
  title: string;
  type: AnnouncementType;
  instructions: string;
  deadline?: string | null;
  attendanceRequired: boolean;
  targetHibretIds: string[];
};
