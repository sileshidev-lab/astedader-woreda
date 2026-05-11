export type FileRecord = {
  id: string;
  originalName: string;
  storedName?: string;
  mimeType: string;
  sizeBytes: number;
  category?: string | null;
  createdAt?: string;
};

