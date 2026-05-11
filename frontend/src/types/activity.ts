export type ActivityLog = {
  id: string;
  actorUserId?: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  operation: string;
  targetType?: string | null;
  targetName?: string | null;
  description?: string | null;
  metadata?: any;
  createdAt: string;
};

