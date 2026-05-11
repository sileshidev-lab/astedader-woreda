import type { FileRecord } from "./file";

export type ReportStatus = "draft" | "submitted" | "approved" | "rejected" | "changes_requested";
export type ReviewDecision = "approved" | "rejected" | "changes_requested";

export type ReportAttachment = {
  id: string;
  createdAt?: string;
  file: FileRecord;
};

export type ReportReview = {
  id: string;
  decision: ReviewDecision;
  comment?: string | null;
  createdAt: string;
  reviewerUserId?: string | null;
};

export type HibretReport = {
  id: string;
  announcementId: string;
  hibretId: string;
  title: string;
  summary?: string | null;
  body?: string;
  status: ReportStatus;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  reviewDecision?: ReviewDecision | null;
  reviewComment?: string | null;
  attachments?: ReportAttachment[];
  reviews?: ReportReview[];
};

