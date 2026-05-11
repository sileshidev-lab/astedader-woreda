"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewReportSchema = exports.updateAnnouncementSchema = exports.createAnnouncementSchema = void 0;
const zod_1 = require("zod");
exports.createAnnouncementSchema = zod_1.z.object({
    title: zod_1.z.string().min(2),
    type: zod_1.z.enum(["meeting", "conference", "trend_report", "other"]),
    instructions: zod_1.z.string().min(2),
    deadline: zod_1.z.string().datetime().optional().nullable(),
    attendanceRequired: zod_1.z.boolean().optional(),
    targetHibretIds: zod_1.z.array(zod_1.z.string()).min(1),
});
exports.updateAnnouncementSchema = zod_1.z.object({
    title: zod_1.z.string().min(2).optional(),
    type: zod_1.z.enum(["meeting", "conference", "trend_report", "other"]).optional(),
    instructions: zod_1.z.string().min(2).optional(),
    deadline: zod_1.z.string().datetime().optional().nullable(),
    attendanceRequired: zod_1.z.boolean().optional(),
    targetHibretIds: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.reviewReportSchema = zod_1.z.object({
    decision: zod_1.z.enum(["approved", "rejected", "changes_requested"]),
    comment: zod_1.z.string().optional(),
});
