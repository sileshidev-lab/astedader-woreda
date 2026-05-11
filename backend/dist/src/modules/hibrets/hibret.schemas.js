"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateHibretSchema = exports.createHibretSchema = void 0;
const zod_1 = require("zod");
exports.createHibretSchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    description: zod_1.z.string().optional().nullable(),
    status: zod_1.z.string().optional(),
});
exports.updateHibretSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).optional(),
    description: zod_1.z.string().optional().nullable(),
    status: zod_1.z.string().optional(),
});
