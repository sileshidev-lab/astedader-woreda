import type { FileRecord } from "./file";

export type ResourceStatus = "draft" | "published" | "archived";

export type Resource = {
  id: string;
  title: string;
  description?: string | null;
  status: ResourceStatus;
  category?: string | null;
  fileId?: string | null;
  targetRoles: string[];
  file?: FileRecord | null;
  publishedAt?: string | null;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

