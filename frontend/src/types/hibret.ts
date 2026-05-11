import type { HibretReport } from "./report";

export type HibretSummary = {
  id: string;
  name: string;
  description?: string | null;
  status?: string | null;
  familyCount: number;
  memberCount: number;
  adminCount: number;
  targetedDirectives: number;
  submittedReports: number;
  pendingReports: number;
  reviewedReports: number;
  latestSubmittedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type HibretDetail = {
  id: string;
  name: string;
  description?: string | null;
  status?: string | null;
  counts: Record<string, number>;
  reports: HibretReport[];
};

