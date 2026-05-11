import { z } from "zod";

export const attendanceRecordInputSchema = z.object({
  memberId: z.string().min(1),
  status: z.enum(["present", "absent", "excused"]),
  note: z.string().optional().nullable(),
});

export const saveAttendanceSchema = z.object({
  records: z.array(attendanceRecordInputSchema).min(1),
});
