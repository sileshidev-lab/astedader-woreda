import { apiClient } from "./apiClient";

export type GalleryFile = {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  category?: string | null;
  createdAt?: string;
};

export type GalleryAttachment = {
  id: string;
  createdAt: string;
  file: GalleryFile;
};

export type GalleryAlbum = {
  reportId: string;
  announcementId: string;
  hibretId: string;

  directiveTitle: string;
  directiveType: string;
  directiveStatus: string;
  attendanceRequired: boolean;
  deadline?: string | null;

  reportTitle: string;
  reportStatus: string;
  reviewDecision?: "approved" | "rejected" | "changes_requested" | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;

  hibretName: string;

  mediaCount: number;
  documentCount: number;
  attachmentCount: number;

  coverFile?: GalleryFile | null;
  attachments: GalleryAttachment[];
};

export type GalleryHibretOption = {
  id: string;
  name: string;
};

export type GallerySummary = {
  albums: number;
  mediaFiles: number;
  documentFiles: number;
  approvedAlbums: number;
  pendingReviewAlbums: number;
};

export type GalleryAlbumResponse = {
  albums: GalleryAlbum[];
  hibrets: GalleryHibretOption[];
  summary: GallerySummary;
};

export async function getGalleryReportAlbums(params?: {
  search?: string;
  hibretId?: string;
  reviewStatus?: string;
  mediaType?: string;
}) {
  const response = await apiClient.get<GalleryAlbumResponse>(
    "/gallery/report-albums",
    {
      params,
    }
  );

  return response.data;
}

export async function getGalleryReportAlbum(reportId: string) {
  const response = await apiClient.get<{ album: GalleryAlbum }>(
    `/gallery/report-albums/${reportId}`
  );

  return response.data.album;
}
