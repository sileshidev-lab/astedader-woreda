"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("../../prisma/client");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const requirePrivilege_1 = require("../../middleware/requirePrivilege");
const announcement_schemas_1 = require("./announcement.schemas");
const notification_service_1 = require("../notifications/notification.service");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authMiddleware);
function param(value) {
    return String(value);
}
function parsePositiveInt(value, fallback, min = 1, max = 200) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed))
        return fallback;
    return Math.max(min, Math.min(max, Math.trunc(parsed)));
}
async function getAnnouncementOr404(announcementId, res) {
    const announcement = await client_1.prisma.announcement.findUnique({
        where: { id: announcementId },
        include: {
            targets: true,
        },
    });
    if (!announcement) {
        res.status(404).json({ message: "Announcement not found" });
        return null;
    }
    return announcement;
}
router.get("/", (0, requirePrivilege_1.requirePrivilege)("announcement.read"), async (req, res) => {
    const page = parsePositiveInt(req.query.page, 1);
    const pageSize = parsePositiveInt(req.query.pageSize, 20);
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const type = typeof req.query.type === "string" ? req.query.type.trim() : "";
    const status = typeof req.query.status === "string" ? req.query.status.trim() : "";
    const dateFrom = typeof req.query.dateFrom === "string" ? req.query.dateFrom.trim() : "";
    const dateTo = typeof req.query.dateTo === "string" ? req.query.dateTo.trim() : "";
    const where = {};
    if (search) {
        where.title = { contains: search, mode: "insensitive" };
    }
    if (type && type !== "all") {
        where.type = type;
    }
    if (status && status !== "all") {
        where.status = status;
    }
    if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom)
            where.createdAt.gte = new Date(`${dateFrom}T00:00:00`);
        if (dateTo)
            where.createdAt.lte = new Date(`${dateTo}T23:59:59`);
    }
    const total = await client_1.prisma.announcement.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const skip = (safePage - 1) * pageSize;
    const announcements = await client_1.prisma.announcement.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
            targets: {
                include: {
                    hibret: true,
                },
            },
            reports: true,
            attachments: {
                include: {
                    file: true,
                },
            },
        },
    });
    const [statusBreakdown, targetTotal, submittedReports] = await Promise.all([
        client_1.prisma.announcement.groupBy({
            by: ["status"],
            where,
            _count: true,
        }),
        client_1.prisma.announcementTarget.count({
            where: {
                announcement: where,
            },
        }),
        client_1.prisma.hibretReport.count({
            where: {
                submittedAt: { not: null },
                announcement: where,
            },
        }),
    ]);
    const statusMap = new Map(statusBreakdown.map((item) => [item.status, item._count]));
    const pendingReports = Math.max(targetTotal - submittedReports, 0);
    const submissionRate = targetTotal === 0 ? 0 : Math.round((submittedReports / targetTotal) * 100);
    return res.json({
        announcements,
        pagination: {
            total,
            page: safePage,
            pageSize,
            totalPages,
            hasNextPage: safePage < totalPages,
            hasPreviousPage: safePage > 1,
        },
        summary: {
            total,
            draft: statusMap.get("draft") || 0,
            published: statusMap.get("published") || 0,
            closed: statusMap.get("closed") || 0,
            pendingReports,
            submissionRate,
        },
    });
});
router.post("/", (0, requirePrivilege_1.requirePrivilege)("announcement.create"), async (req, res) => {
    const parsed = announcement_schemas_1.createAnnouncementSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            message: "Invalid announcement data",
            errors: parsed.error.flatten(),
        });
    }
    const data = parsed.data;
    const announcement = await client_1.prisma.announcement.create({
        data: {
            title: data.title,
            type: data.type,
            instructions: data.instructions,
            deadline: data.deadline ? new Date(data.deadline) : null,
            attendanceRequired: data.attendanceRequired ?? false,
            createdByUserId: req.user?.id,
            targets: {
                create: data.targetHibretIds.map((hibretId) => ({
                    hibretId,
                })),
            },
        },
        include: {
            targets: {
                include: {
                    hibret: true,
                },
            },
        },
    });
    return res.status(201).json({ announcement });
});
router.post("/:announcementId/attachments", (0, requirePrivilege_1.requirePrivilege)("announcement.update"), async (req, res) => {
    const announcementId = param(req.params.announcementId);
    const fileIds = Array.isArray(req.body.fileIds) ? req.body.fileIds.map(String) : [];
    if (!fileIds.length) {
        return res.status(400).json({ message: "fileIds is required" });
    }
    const announcement = await client_1.prisma.announcement.findUnique({
        where: { id: announcementId },
    });
    if (!announcement) {
        return res.status(404).json({ message: "Announcement not found" });
    }
    await client_1.prisma.announcementAttachment.createMany({
        data: fileIds.map((fileId) => ({
            announcementId,
            fileId,
        })),
        skipDuplicates: true,
    });
    const updatedAnnouncement = await client_1.prisma.announcement.findUnique({
        where: { id: announcementId },
        include: {
            targets: {
                include: {
                    hibret: true,
                },
            },
            reports: true,
            attachments: {
                include: {
                    file: true,
                },
            },
        },
    });
    return res.json({ announcement: updatedAnnouncement });
});
router.get("/:announcementId", (0, requirePrivilege_1.requirePrivilege)("announcement.read"), async (req, res) => {
    const announcementId = param(req.params.announcementId);
    const announcement = await client_1.prisma.announcement.findUnique({
        where: { id: announcementId },
        include: {
            targets: {
                include: {
                    hibret: true,
                },
                orderBy: {
                    createdAt: "asc",
                },
            },
            reports: {
                include: {
                    hibret: true,
                },
            },
            attachments: {
                include: {
                    file: true,
                },
            },
        },
    });
    if (!announcement) {
        return res.status(404).json({ message: "Announcement not found" });
    }
    return res.json({ announcement });
});
router.patch("/:announcementId", (0, requirePrivilege_1.requirePrivilege)("announcement.update"), async (req, res) => {
    const announcementId = param(req.params.announcementId);
    const parsed = announcement_schemas_1.updateAnnouncementSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            message: "Invalid announcement data",
            errors: parsed.error.flatten(),
        });
    }
    const existing = await client_1.prisma.announcement.findUnique({
        where: { id: announcementId },
    });
    if (!existing) {
        return res.status(404).json({ message: "Announcement not found" });
    }
    if (existing.status !== "draft") {
        return res.status(400).json({
            message: "Only draft announcements can be edited",
        });
    }
    const data = parsed.data;
    const announcement = await client_1.prisma.$transaction(async (tx) => {
        if (data.targetHibretIds) {
            await tx.announcementTarget.deleteMany({
                where: { announcementId },
            });
        }
        return tx.announcement.update({
            where: { id: announcementId },
            data: {
                title: data.title,
                type: data.type,
                instructions: data.instructions,
                deadline: data.deadline === undefined
                    ? undefined
                    : data.deadline
                        ? new Date(data.deadline)
                        : null,
                attendanceRequired: data.attendanceRequired,
                targets: data.targetHibretIds
                    ? {
                        create: data.targetHibretIds.map((hibretId) => ({ hibretId })),
                    }
                    : undefined,
            },
            include: {
                targets: {
                    include: {
                        hibret: true,
                    },
                },
            },
        });
    });
    return res.json({ announcement });
});
router.post("/:announcementId/publish", (0, requirePrivilege_1.requirePrivilege)("announcement.publish"), async (req, res) => {
    const announcementId = param(req.params.announcementId);
    const existing = await getAnnouncementOr404(announcementId, res);
    if (!existing)
        return;
    if (existing.status !== "draft") {
        return res.status(409).json({ message: "Only draft directives can be published." });
    }
    const announcement = await client_1.prisma.announcement.update({
        where: { id: announcementId },
        data: {
            status: "published",
            publishedAt: new Date(),
            closedAt: null,
        },
        include: {
            targets: true,
        },
    });
    await Promise.allSettled(announcement.targets.map((target) => (0, notification_service_1.notifyHibret)(target.hibretId, "New Woreda directive published", announcement.title, "announcement_published", `/hibret/announcements/${announcement.id}`, req.user?.id)));
    return res.json({ announcement });
});
router.post("/:announcementId/close", (0, requirePrivilege_1.requirePrivilege)("announcement.close"), async (req, res) => {
    const announcementId = param(req.params.announcementId);
    const existing = await getAnnouncementOr404(announcementId, res);
    if (!existing)
        return;
    if (existing.status === "draft") {
        return res.status(409).json({ message: "Draft directives cannot be closed before publishing." });
    }
    if (existing.status === "closed") {
        return res.status(409).json({ message: "Directive is already closed." });
    }
    const announcement = await client_1.prisma.announcement.update({
        where: { id: announcementId },
        data: {
            status: "closed",
            closedAt: new Date(),
        },
    });
    return res.json({ announcement });
});
router.get("/:announcementId/hibrets/:hibretId/report", (0, requirePrivilege_1.requirePrivilege)("announcement.review"), async (req, res) => {
    const announcementId = param(req.params.announcementId);
    const hibretId = param(req.params.hibretId);
    const report = await client_1.prisma.hibretReport.findUnique({
        where: {
            announcementId_hibretId: {
                announcementId,
                hibretId,
            },
        },
        include: {
            announcement: true,
            hibret: true,
            attachments: {
                include: {
                    file: true,
                },
            },
            reviews: {
                orderBy: {
                    createdAt: "desc",
                },
            },
        },
    });
    if (!report) {
        return res.status(404).json({ message: "Report not found" });
    }
    return res.json({ report });
});
router.post("/:announcementId/hibrets/:hibretId/report/review", (0, requirePrivilege_1.requirePrivilege)("announcement.review"), async (req, res) => {
    const announcementId = param(req.params.announcementId);
    const hibretId = param(req.params.hibretId);
    const parsed = announcement_schemas_1.reviewReportSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            message: "Invalid review data",
            errors: parsed.error.flatten(),
        });
    }
    const report = await client_1.prisma.hibretReport.findUnique({
        where: {
            announcementId_hibretId: {
                announcementId,
                hibretId,
            },
        },
    });
    if (!report) {
        return res.status(404).json({ message: "Report not found" });
    }
    const updatedReport = await client_1.prisma.$transaction(async (tx) => {
        await tx.reportReview.create({
            data: {
                reportId: report.id,
                reviewerUserId: req.user?.id,
                decision: parsed.data.decision,
                comment: parsed.data.comment,
            },
        });
        return tx.hibretReport.update({
            where: { id: report.id },
            data: {
                status: parsed.data.decision,
                reviewDecision: parsed.data.decision,
                reviewComment: parsed.data.comment,
                reviewedAt: new Date(),
                reviewedById: req.user?.id,
            },
            include: {
                announcement: true,
                hibret: true,
                reviews: {
                    orderBy: {
                        createdAt: "desc",
                    },
                },
            },
        });
    });
    await Promise.allSettled([
        (0, notification_service_1.notifyHibret)(hibretId, "Woreda reviewed your report", updatedReport.title, "report_reviewed", `/hibret/reports/${updatedReport.id}`, req.user?.id),
    ]);
    return res.json({ report: updatedReport });
});
exports.default = router;
