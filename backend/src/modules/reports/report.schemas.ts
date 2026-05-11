import { z } from "zod";

export const saveReportSchema = z.object({
  title: z.string().min(2),
  summary: z.string().optional().nullable(),
  body: z.string().min(2),
});

export const attachReportFilesSchema = z.object({
  fileIds: z.array(z.string().min(1)).min(1),
});

export const reviewReportSchema = z.object({
  decision: z.enum(["approved", "rejected", "changes_requested"]),
  comment: z.string().optional().nullable(),
});
