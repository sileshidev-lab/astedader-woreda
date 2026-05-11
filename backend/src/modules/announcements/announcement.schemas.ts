import { z } from "zod";

export const createAnnouncementSchema = z.object({
  title: z.string().min(2),
  type: z.enum(["meeting", "conference", "trend_report", "other"]),
  instructions: z.string().min(2),
  deadline: z.string().datetime().optional().nullable(),
  attendanceRequired: z.boolean().optional(),
  targetHibretIds: z.array(z.string()).min(1),
});

export const updateAnnouncementSchema = z.object({
  title: z.string().min(2).optional(),
  type: z.enum(["meeting", "conference", "trend_report", "other"]).optional(),
  instructions: z.string().min(2).optional(),
  deadline: z.string().datetime().optional().nullable(),
  attendanceRequired: z.boolean().optional(),
  targetHibretIds: z.array(z.string()).optional(),
});

export const reviewReportSchema = z.object({
  decision: z.enum(["approved", "rejected", "changes_requested"]),
  comment: z.string().optional(),
});
