"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("../../prisma/client");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const report_schemas_1 = require("./report.schemas");
const notification_service_1 = require("../notifications/notification.service");
const router = (0, express_1.Router)();
function isWoredaAdmin(role) {
    return role === "WOREDA_ADMIN";
}
function isHibretAdmin(role) {
    return role === "HIBRET_ADMIN";
}
function canUsePrivilege(privileges, privilege) {
    return Boolean(privileges?.includes("*") || privileges?.includes(privilege));
}
function parsePositiveInt(value, fallback, min = 1, max = 200) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed))
        return fallback;
    return Math.max(min, Math.min(max, Math.trunc(parsed)));
}
function includeFullReport() {
    return {
        announcement: {
            include: {
                attachments: {
                    include: {
                        file: true,
                    },
                },
            },
        },
        hibret: true,
        attachments: {
            include: {
                file: true,
            },
            orderBy: {
                createdAt: "desc",
            },
        },
        reviews: {
            orderBy: {
                createdAt: "desc",
            },
        },
    };
}
router.get("/hibret/announcements", auth_middleware_1.authMiddleware, async (req, res) => {
    if (!isHibretAdmin(req.user?.role) || !req.user?.hibretId) {
        return res.status(403).json({ message: "Permission denied" });
    }
    if (!canUsePrivilege(req.user.privileges, "announcement.read")) {
        return res.status(403).json({ message: "Permission denied" });
    }
    const page = parsePositiveInt(req.query.page, 1);
    const pageSize = parsePositiveInt(req.query.pageSize, 20);
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const type = typeof req.query.type === "string" ? req.query.type.trim() : "";
    const status = typeof req.query.status === "string" ? req.query.status.trim() : "";
    const announcementWhere = {
        status: {
            in: ["published", "closed"],
        },
    };
    if (search) {
        announcementWhere.OR = [
            { title: { contains: search, mode: "insensitive" } },
            { instructions: { contains: search, mode: "insensitive" } },
        ];
    }
    if (type && type !== "all") {
        announcementWhere.type = type;
    }
    if (status && status !== "all") {
        announcementWhere.status = status;
    }
    const baseWhere = {
        hibretId: req.user.hibretId,
        announcement: announcementWhere,
    };
    const total = await client_1.prisma.announcementTarget.count({ where: baseWhere });
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const skip = (safePage - 1) * pageSize;
    const targets = await client_1.prisma.announcementTarget.findMany({
        where: baseWhere,
        skip,
        take: pageSize,
        include: {
            announcement: {
                include: {
                    attachments: {
                        include: {
                            file: true,
                        },
                    },
                    reports: {
                        where: {
                            hibretId: req.user.hibretId,
                        },
                        include: {
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
                    },
                    targets: true,
                },
            },
        },
        orderBy: {
            announcement: {
                createdAt: "desc",
            },
        },
    });
    const [reportsStarted, submitted, approved] = await Promise.all([
        client_1.prisma.hibretReport.count({
            where: {
                hibretId: req.user.hibretId,
                announcement: announcementWhere,
            },
        }),
        client_1.prisma.hibretReport.count({
            where: {
                hibretId: req.user.hibretId,
                status: {
                    in: ["submitted", "approved", "rejected", "changes_requested"],
                },
                announcement: announcementWhere,
            },
        }),
        client_1.prisma.hibretReport.count({
            where: {
                hibretId: req.user.hibretId,
                OR: [
                    { status: "approved" },
                    { reviewDecision: "approved" },
                ],
                announcement: announcementWhere,
            },
        }),
    ]);
    return res.json({
        announcements: targets.map((target) => target.announcement),
        pagination: {
            total,
            page: safePage,
            pageSize,
            totalPages,
            hasNextPage: safePage < totalPages,
            hasPreviousPage: safePage > 1,
        },
        summary: {
            assigned: total,
            submitted,
            pending: Math.max(total - reportsStarted, 0),
            approved,
        },
    });
});
router.get("/hibret/announcements/:announcementId", auth_middleware_1.authMiddleware, async (req, res) => {
    if (!isHibretAdmin(req.user?.role) || !req.user?.hibretId) {
        return res.status(403).json({ message: "Permission denied" });
    }
    if (!canUsePrivilege(req.user.privileges, "announcement.read")) {
        return res.status(403).json({ message: "Permission denied" });
    }
    const announcementId = String(req.params.announcementId);
    const target = await client_1.prisma.announcementTarget.findFirst({
        where: {
            announcementId,
            hibretId: req.user.hibretId,
            announcement: {
                status: {
                    in: ["published", "closed"],
                },
            },
        },
        include: {
            announcement: {
                include: {
                    attachments: {
                        include: {
                            file: true,
                        },
                    },
                    reports: {
                        where: {
                            hibretId: req.user.hibretId,
                        },
                        include: {
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
                    },
                    targets: true,
                },
            },
        },
    });
    if (!target) {
        return res.status(404).json({ message: "Announcement not found" });
    }
    return res.json({ announcement: target.announcement });
});
router.get("/hibret/reports", auth_middleware_1.authMiddleware, async (req, res) => {
    if (!isHibretAdmin(req.user?.role) || !req.user?.hibretId) {
        return res.status(403).json({ message: "Permission denied" });
    }
    if (!canUsePrivilege(req.user.privileges, "report.read")) {
        return res.status(403).json({ message: "Permission denied" });
    }
    const reports = await client_1.prisma.hibretReport.findMany({
        where: {
            hibretId: req.user.hibretId,
        },
        include: includeFullReport(),
        orderBy: {
            updatedAt: "desc",
        },
    });
    return res.json({ reports });
});
router.get("/hibret/reports/:reportId", auth_middleware_1.authMiddleware, async (req, res) => {
    if (!isHibretAdmin(req.user?.role) || !req.user?.hibretId) {
        return res.status(403).json({ message: "Permission denied" });
    }
    if (!canUsePrivilege(req.user.privileges, "report.read")) {
        return res.status(403).json({ message: "Permission denied" });
    }
    const report = await client_1.prisma.hibretReport.findFirst({
        where: {
            id: String(req.params.reportId),
            hibretId: req.user.hibretId,
        },
        include: includeFullReport(),
    });
    if (!report) {
        return res.status(404).json({ message: "Report not found" });
    }
    return res.json({ report });
});
router.post("/hibret/announcements/:announcementId/report", auth_middleware_1.authMiddleware, async (req, res) => {
    if (!isHibretAdmin(req.user?.role) || !req.user?.hibretId) {
        return res.status(403).json({ message: "Permission denied" });
    }
    if (!canUsePrivilege(req.user.privileges, "report.create")) {
        return res.status(403).json({ message: "Permission denied" });
    }
    const parsed = report_schemas_1.saveReportSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            message: "Invalid report data",
            errors: parsed.error.flatten(),
        });
    }
    const announcementId = String(req.params.announcementId);
    const target = await client_1.prisma.announcementTarget.findFirst({
        where: {
            announcementId,
            hibretId: req.user.hibretId,
            announcement: {
                status: "published",
            },
        },
    });
    if (!target) {
        return res.status(404).json({ message: "Published announcement not found for this Hibret" });
    }
    const existing = await client_1.prisma.hibretReport.findUnique({
        where: {
            announcementId_hibretId: {
                announcementId,
                hibretId: req.user.hibretId,
            },
        },
    });
    if (existing && !["draft", "changes_requested"].includes(existing.status)) {
        return res.status(409).json({
            message: "Report cannot be edited after submission unless changes are requested",
        });
    }
    const report = await client_1.prisma.hibretReport.upsert({
        where: {
            announcementId_hibretId: {
                announcementId,
                hibretId: req.user.hibretId,
            },
        },
        create: {
            announcementId,
            hibretId: req.user.hibretId,
            title: parsed.data.title,
            summary: parsed.data.summary,
            body: parsed.data.body,
            status: "draft",
        },
        update: {
            title: parsed.data.title,
            summary: parsed.data.summary,
            body: parsed.data.body,
            status: existing?.status === "changes_requested" ? "changes_requested" : "draft",
        },
        include: includeFullReport(),
    });
    return res.status(201).json({ report });
});
router.patch("/hibret/reports/:reportId", auth_middleware_1.authMiddleware, async (req, res) => {
    if (!isHibretAdmin(req.user?.role) || !req.user?.hibretId) {
        return res.status(403).json({ message: "Permission denied" });
    }
    if (!canUsePrivilege(req.user.privileges, "report.update")) {
        return res.status(403).json({ message: "Permission denied" });
    }
    const parsed = report_schemas_1.saveReportSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            message: "Invalid report data",
            errors: parsed.error.flatten(),
        });
    }
    const report = await client_1.prisma.hibretReport.findFirst({
        where: {
            id: String(req.params.reportId),
            hibretId: req.user.hibretId,
        },
    });
    if (!report) {
        return res.status(404).json({ message: "Report not found" });
    }
    if (!["draft", "changes_requested"].includes(report.status)) {
        return res.status(409).json({
            message: "Only draft or changes requested reports can be edited",
        });
    }
    const updatedReport = await client_1.prisma.hibretReport.update({
        where: {
            id: report.id,
        },
        data: {
            title: parsed.data.title,
            summary: parsed.data.summary,
            body: parsed.data.body,
        },
        include: includeFullReport(),
    });
    return res.json({ report: updatedReport });
});
router.post("/hibret/reports/:reportId/attachments", auth_middleware_1.authMiddleware, async (req, res) => {
    if (!isHibretAdmin(req.user?.role) || !req.user?.hibretId) {
        return res.status(403).json({ message: "Permission denied" });
    }
    if (!canUsePrivilege(req.user.privileges, "media.upload")) {
        return res.status(403).json({ message: "Permission denied" });
    }
    const parsed = report_schemas_1.attachReportFilesSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            message: "Invalid attachment data",
            errors: parsed.error.flatten(),
        });
    }
    const report = await client_1.prisma.hibretReport.findFirst({
        where: {
            id: String(req.params.reportId),
            hibretId: req.user.hibretId,
        },
    });
    if (!report) {
        return res.status(404).json({ message: "Report not found" });
    }
    if (!["draft", "changes_requested"].includes(report.status)) {
        return res.status(409).json({
            message: "Attachments can only be added before submission or after changes are requested",
        });
    }
    await client_1.prisma.reportAttachment.createMany({
        data: parsed.data.fileIds.map((fileId) => ({
            reportId: report.id,
            fileId,
        })),
        skipDuplicates: true,
    });
    const updatedReport = await client_1.prisma.hibretReport.findUnique({
        where: {
            id: report.id,
        },
        include: includeFullReport(),
    });
    return res.status(201).json({ report: updatedReport });
});
router.post("/hibret/reports/:reportId/submit", auth_middleware_1.authMiddleware, async (req, res) => {
    if (!isHibretAdmin(req.user?.role) || !req.user?.hibretId) {
        return res.status(403).json({ message: "Permission denied" });
    }
    if (!canUsePrivilege(req.user.privileges, "report.submit")) {
        return res.status(403).json({ message: "Permission denied" });
    }
    const report = await client_1.prisma.hibretReport.findFirst({
        where: {
            id: String(req.params.reportId),
            hibretId: req.user.hibretId,
        },
    });
    if (!report) {
        return res.status(404).json({ message: "Report not found" });
    }
    if (!["draft", "changes_requested"].includes(report.status)) {
        return res.status(409).json({
            message: "Only draft or changes requested reports can be submitted",
        });
    }
    const announcement = await client_1.prisma.announcement.findUnique({
        where: {
            id: report.announcementId,
        },
    });
    if (announcement?.attendanceRequired) {
        const [memberCount, attendanceCount] = await Promise.all([
            client_1.prisma.member.count({
                where: {
                    hibretId: req.user.hibretId,
                },
            }),
            client_1.prisma.attendanceRecord.count({
                where: {
                    announcementId: report.announcementId,
                    hibretId: req.user.hibretId,
                },
            }),
        ]);
        if (memberCount > 0 && attendanceCount < memberCount) {
            return res.status(409).json({
                message: "Attendance must be completed for all Hibret members before submitting this report",
                memberCount,
                attendanceCount,
            });
        }
    }
    const submittedReport = await client_1.prisma.hibretReport.update({
        where: {
            id: report.id,
        },
        data: {
            status: "submitted",
            submittedAt: new Date(),
            reviewDecision: null,
            reviewComment: null,
            reviewedAt: null,
            reviewedById: null,
        },
        include: includeFullReport(),
    });
    try {
        await (0, notification_service_1.notifyWoredaAdmins)("New Hibret report submitted", submittedReport.title, "report_submitted", `/woreda/announcements/${submittedReport.announcementId}/hibrets/${submittedReport.hibretId}/report`, req.user?.id);
    }
    catch (error) {
        console.error("Unable to create report notification", error);
    }
    return res.json({ report: submittedReport });
});
router.get("/woreda/reports", auth_middleware_1.authMiddleware, async (req, res) => {
    if (!isWoredaAdmin(req.user?.role)) {
        return res.status(403).json({ message: "Permission denied" });
    }
    if (!canUsePrivilege(req.user.privileges, "report.read")) {
        return res.status(403).json({ message: "Permission denied" });
    }
    const reports = await client_1.prisma.hibretReport.findMany({
        include: includeFullReport(),
        orderBy: {
            updatedAt: "desc",
        },
    });
    return res.json({ reports });
});
router.get("/woreda/announcements/:announcementId/hibrets/:hibretId/report", auth_middleware_1.authMiddleware, async (req, res) => {
    if (!isWoredaAdmin(req.user?.role)) {
        return res.status(403).json({ message: "Permission denied" });
    }
    if (!canUsePrivilege(req.user.privileges, "report.read")) {
        return res.status(403).json({ message: "Permission denied" });
    }
    const report = await client_1.prisma.hibretReport.findUnique({
        where: {
            announcementId_hibretId: {
                announcementId: String(req.params.announcementId),
                hibretId: String(req.params.hibretId),
            },
        },
        include: includeFullReport(),
    });
    if (!report) {
        return res.status(404).json({ message: "Report not found" });
    }
    return res.json({ report });
});
router.post("/woreda/reports/:reportId/review", auth_middleware_1.authMiddleware, async (req, res) => {
    if (!isWoredaAdmin(req.user?.role)) {
        return res.status(403).json({ message: "Permission denied" });
    }
    if (!canUsePrivilege(req.user.privileges, "announcement.review")) {
        return res.status(403).json({ message: "Permission denied" });
    }
    const parsed = report_schemas_1.reviewReportSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            message: "Invalid review data",
            errors: parsed.error.flatten(),
        });
    }
    const report = await client_1.prisma.hibretReport.findUnique({
        where: {
            id: String(req.params.reportId),
        },
    });
    if (!report) {
        return res.status(404).json({ message: "Report not found" });
    }
    if (report.status !== "submitted") {
        return res.status(409).json({
            message: "Only submitted reports can be reviewed",
        });
    }
    const status = parsed.data.decision === "approved"
        ? "approved"
        : parsed.data.decision === "rejected"
            ? "rejected"
            : "changes_requested";
    const reviewedReport = await client_1.prisma.$transaction(async (tx) => {
        await tx.reportReview.create({
            data: {
                reportId: report.id,
                reviewerUserId: req.user?.id,
                decision: parsed.data.decision,
                comment: parsed.data.comment,
            },
        });
        return tx.hibretReport.update({
            where: {
                id: report.id,
            },
            data: {
                status,
                reviewedAt: new Date(),
                reviewedById: req.user?.id,
                reviewDecision: parsed.data.decision,
                reviewComment: parsed.data.comment,
            },
            include: includeFullReport(),
        });
    });
    return res.json({ report: reviewedReport });
});
exports.default = router;
