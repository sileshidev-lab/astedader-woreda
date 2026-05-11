"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("../../prisma/client");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const router = (0, express_1.Router)();
function isWoredaAdmin(role) {
    return role === "WOREDA_ADMIN";
}
function canUsePrivilege(privileges, privilege) {
    return Boolean(privileges?.includes("*") || privileges?.includes(privilege));
}
function requireGalleryAccess(req, res) {
    if (!isWoredaAdmin(req.user?.role)) {
        res.status(403).json({ message: "Permission denied" });
        return false;
    }
    if (!canUsePrivilege(req.user?.privileges, "gallery.read") &&
        !canUsePrivilege(req.user?.privileges, "report.read") &&
        !canUsePrivilege(req.user?.privileges, "announcement.read")) {
        res.status(403).json({ message: "Permission denied" });
        return false;
    }
    return true;
}
function isMedia(mimeType) {
    return mimeType.startsWith("image/") || mimeType.startsWith("video/");
}
function mapReportToAlbum(report) {
    const attachments = report.attachments ?? [];
    const media = attachments.filter((attachment) => isMedia(attachment.file.mimeType || ""));
    const documents = attachments.filter((attachment) => !isMedia(attachment.file.mimeType || ""));
    const coverAttachment = media[0] || attachments[0] || null;
    return {
        reportId: report.id,
        announcementId: report.announcementId,
        hibretId: report.hibretId,
        directiveTitle: report.announcement.title,
        directiveType: report.announcement.type,
        directiveStatus: report.announcement.status,
        attendanceRequired: report.announcement.attendanceRequired,
        deadline: report.announcement.deadline,
        reportTitle: report.title,
        reportStatus: report.status,
        reviewDecision: report.reviewDecision,
        submittedAt: report.submittedAt,
        reviewedAt: report.reviewedAt,
        hibretName: report.hibret.name,
        mediaCount: media.length,
        documentCount: documents.length,
        attachmentCount: attachments.length,
        coverFile: coverAttachment
            ? {
                id: coverAttachment.file.id,
                originalName: coverAttachment.file.originalName,
                mimeType: coverAttachment.file.mimeType,
                sizeBytes: coverAttachment.file.sizeBytes,
            }
            : null,
        attachments: attachments.map((attachment) => ({
            id: attachment.id,
            createdAt: attachment.createdAt,
            file: {
                id: attachment.file.id,
                originalName: attachment.file.originalName,
                mimeType: attachment.file.mimeType,
                sizeBytes: attachment.file.sizeBytes,
                category: attachment.file.category,
                createdAt: attachment.file.createdAt,
            },
        })),
    };
}
router.get("/gallery/report-albums", auth_middleware_1.authMiddleware, async (req, res) => {
    if (!requireGalleryAccess(req, res))
        return;
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const hibretId = typeof req.query.hibretId === "string" ? req.query.hibretId : "";
    const reviewStatus = typeof req.query.reviewStatus === "string" ? req.query.reviewStatus : "";
    const mediaType = typeof req.query.mediaType === "string" ? req.query.mediaType : "";
    const reports = await client_1.prisma.hibretReport.findMany({
        where: {
            submittedAt: {
                not: null,
            },
            attachments: {
                some: {},
            },
            ...(hibretId
                ? {
                    hibretId,
                }
                : {}),
            ...(reviewStatus
                ? {
                    reviewDecision: reviewStatus === "pending" ? null : reviewStatus,
                }
                : {}),
            ...(search
                ? {
                    OR: [
                        {
                            title: {
                                contains: search,
                                mode: "insensitive",
                            },
                        },
                        {
                            announcement: {
                                title: {
                                    contains: search,
                                    mode: "insensitive",
                                },
                            },
                        },
                        {
                            hibret: {
                                name: {
                                    contains: search,
                                    mode: "insensitive",
                                },
                            },
                        },
                    ],
                }
                : {}),
        },
        include: {
            announcement: true,
            hibret: true,
            attachments: {
                include: {
                    file: true,
                },
                orderBy: {
                    createdAt: "desc",
                },
            },
        },
        orderBy: {
            submittedAt: "desc",
        },
    });
    const albums = reports
        .map(mapReportToAlbum)
        .filter((album) => {
        if (mediaType === "media")
            return album.mediaCount > 0;
        if (mediaType === "documents")
            return album.documentCount > 0;
        return true;
    });
    const hibrets = await client_1.prisma.hibret.findMany({
        where: {
            reports: {
                some: {
                    submittedAt: {
                        not: null,
                    },
                    attachments: {
                        some: {},
                    },
                },
            },
        },
        select: {
            id: true,
            name: true,
        },
        orderBy: {
            name: "asc",
        },
    });
    const summary = {
        albums: albums.length,
        mediaFiles: albums.reduce((total, album) => total + album.mediaCount, 0),
        documentFiles: albums.reduce((total, album) => total + album.documentCount, 0),
        approvedAlbums: albums.filter((album) => album.reviewDecision === "approved").length,
        pendingReviewAlbums: albums.filter((album) => !album.reviewDecision).length,
    };
    return res.json({
        albums,
        hibrets,
        summary,
    });
});
router.get("/gallery/report-albums/:reportId", auth_middleware_1.authMiddleware, async (req, res) => {
    if (!requireGalleryAccess(req, res))
        return;
    const report = await client_1.prisma.hibretReport.findUnique({
        where: {
            id: String(req.params.reportId),
        },
        include: {
            announcement: true,
            hibret: true,
            attachments: {
                include: {
                    file: true,
                },
                orderBy: {
                    createdAt: "desc",
                },
            },
        },
    });
    if (!report || !report.submittedAt) {
        return res.status(404).json({ message: "Gallery album not found" });
    }
    return res.json({
        album: mapReportToAlbum(report),
    });
});
exports.default = router;
