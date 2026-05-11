"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewReportSchema = exports.attachReportFilesSchema = exports.saveReportSchema = void 0;
const zod_1 = require("zod");
exports.saveReportSchema = zod_1.z.object({
    title: zod_1.z.string().min(2),
    summary: zod_1.z.string().optional().nullable(),
    body: zod_1.z.string().min(2),
});
exports.attachReportFilesSchema = zod_1.z.object({
    fileIds: zod_1.z.array(zod_1.z.string().min(1)).min(1),
});
exports.reviewReportSchema = zod_1.z.object({
    decision: zod_1.z.enum(["approved", "rejected", "changes_requested"]),
    comment: zod_1.z.string().optional().nullable(),
});
