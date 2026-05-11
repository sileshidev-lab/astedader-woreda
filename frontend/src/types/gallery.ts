import type { FileRecord } from "./file";

export type GalleryAlbum = {
  reportId: string;
  announcementId: string;
  hibretId: string;
  directiveTitle: string;
  hibretName: string;
  reportTitle: string;
  reportStatus: string;
  reviewDecision?: string | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  mediaCount: number;
  documentCount: number;
  attachmentCount: number;
  coverFile?: Pick<FileRecord, "id" | "originalName" | "mimeType" | "sizeBytes"> | null;
  attachments: Array<{ id: string; createdAt?: string; file: FileRecord }>;
};

