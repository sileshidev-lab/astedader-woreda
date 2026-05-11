"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveAttendanceSchema = exports.attendanceRecordInputSchema = void 0;
const zod_1 = require("zod");
exports.attendanceRecordInputSchema = zod_1.z.object({
    memberId: zod_1.z.string().min(1),
    status: zod_1.z.enum(["present", "absent", "excused"]),
    note: zod_1.z.string().optional().nullable(),
});
exports.saveAttendanceSchema = zod_1.z.object({
    records: zod_1.z.array(exports.attendanceRecordInputSchema).min(1),
});
