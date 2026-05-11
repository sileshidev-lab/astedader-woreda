"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("../../prisma/client");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const requirePrivilege_1 = require("../../middleware/requirePrivilege");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authMiddleware);
function canUsePrivilege(privileges, privilege) {
    return Boolean(privileges?.includes("*") || privileges?.includes(privilege));
}
function canManage(req) {
    return req.user?.role === "WOREDA_ADMIN" && canUsePrivilege(req.user?.privileges, "broadcast.update");
}
function visibleWhere(req) {
    if (req.user?.role === "WOREDA_ADMIN")
        return {};
    return {
        status: "published",
        targetRoles: {
            has: req.user?.role,
        },
    };
}
async function getBroadcastOr404(id, res) {
    const item = await client_1.prisma.broadcast.findUnique({
        where: { id },
    });
    if (!item) {
        res.status(404).json({ message: "Broadcast not found." });
        return null;
    }
    return item;
}
function mapBroadcast(broadcast) {
    return {
        id: broadcast.id,
        title: broadcast.title,
        summary: broadcast.summary,
        bodyHtml: broadcast.bodyHtml,
        status: broadcast.status,
        coverFileId: broadcast.coverFileId,
        targetRoles: broadcast.targetRoles,
        attachmentCount: broadcast.attachments?.length ?? 0,
        attachments: (broadcast.attachments ?? []).map((attachment) => ({
            id: attachment.id,
            file: attachment.file,
        })),
        publishedAt: broadcast.publishedAt,
        archivedAt: broadcast.archivedAt,
        createdAt: broadcast.createdAt,
        updatedAt: broadcast.updatedAt,
    };
}
router.get("/", (0, requirePrivilege_1.requirePrivilege)("broadcast.read"), async (req, res) => {
    const broadcasts = await client_1.prisma.broadcast.findMany({
        where: visibleWhere(req),
        include: {
            attachments: {
                include: {
                    file: true,
                },
            },
        },
        orderBy: {
            createdAt: "desc",
        },
    });
    return res.json({
        broadcasts: broadcasts.map(mapBroadcast),
        summary: {
            total: broadcasts.length,
            published: broadcasts.filter((item) => item.status === "published").length,
            drafts: broadcasts.filter((item) => item.status === "draft").length,
            archived: broadcasts.filter((item) => item.status === "archived").length,
        },
    });
});
router.post("/", (0, requirePrivilege_1.requirePrivilege)("broadcast.create"), async (req, res) => {
    const title = String(req.body.title || "").trim();
    const summary = req.body.summary ? String(req.body.summary).trim() : null;
    const bodyHtml = String(req.body.bodyHtml || "").trim();
    const coverFileId = req.body.coverFileId ? String(req.body.coverFileId) : null;
    const targetRoles = Array.isArray(req.body.targetRoles) ? req.body.targetRoles.map(String) : ["HIBRET_ADMIN", "MEMBER"];
    const fileIds = Array.isArray(req.body.fileIds) ? req.body.fileIds.map(String) : [];
    if (!title || !bodyHtml) {
        return res.status(400).json({ message: "Title and content are required." });
    }
    const broadcast = await client_1.prisma.broadcast.create({
        data: {
            title,
            summary,
            bodyHtml,
            coverFileId,
            targetRoles,
            createdByUserId: req.user?.id,
            attachments: {
                create: fileIds.map((fileId) => ({ fileId })),
            },
        },
        include: {
            attachments: {
                include: {
                    file: true,
                },
            },
        },
    });
    return res.status(201).json({ broadcast: mapBroadcast(broadcast) });
});
router.get("/:broadcastId", (0, requirePrivilege_1.requirePrivilege)("broadcast.read"), async (req, res) => {
    const broadcast = await client_1.prisma.broadcast.findFirst({
        where: {
            id: String(req.params.broadcastId),
            ...visibleWhere(req),
        },
        include: {
            attachments: {
                include: {
                    file: true,
                },
            },
        },
    });
    if (!broadcast) {
        return res.status(404).json({ message: "Broadcast not found." });
    }
    return res.json({ broadcast: mapBroadcast(broadcast) });
});
router.patch("/:broadcastId", (0, requirePrivilege_1.requirePrivilege)("broadcast.update"), async (req, res) => {
    const broadcastId = String(req.params.broadcastId);
    const existing = await client_1.prisma.broadcast.findUnique({ where: { id: broadcastId } });
    if (!existing) {
        return res.status(404).json({ message: "Broadcast not found." });
    }
    const title = req.body.title === undefined ? undefined : String(req.body.title || "").trim();
    const summary = req.body.summary === undefined ? undefined : (req.body.summary ? String(req.body.summary).trim() : null);
    const bodyHtml = req.body.bodyHtml === undefined ? undefined : String(req.body.bodyHtml || "").trim();
    const coverFileId = req.body.coverFileId === undefined ? undefined : (req.body.coverFileId ? String(req.body.coverFileId) : null);
    const targetRoles = req.body.targetRoles === undefined ? undefined : Array.isArray(req.body.targetRoles) ? req.body.targetRoles.map(String) : [];
    const fileIds = req.body.fileIds === undefined ? undefined : Array.isArray(req.body.fileIds) ? req.body.fileIds.map(String) : [];
    if (title !== undefined && !title) {
        return res.status(400).json({ message: "Title is required." });
    }
    if (bodyHtml !== undefined && !bodyHtml) {
        return res.status(400).json({ message: "Content is required." });
    }
    const broadcast = await client_1.prisma.$transaction(async (tx) => {
        if (fileIds) {
            await tx.broadcastAttachment.deleteMany({ where: { broadcastId } });
        }
        return tx.broadcast.update({
            where: { id: broadcastId },
            data: {
                ...(title !== undefined ? { title } : {}),
                ...(summary !== undefined ? { summary } : {}),
                ...(bodyHtml !== undefined ? { bodyHtml } : {}),
                ...(coverFileId !== undefined ? { coverFileId } : {}),
                ...(targetRoles !== undefined ? { targetRoles } : {}),
                ...(fileIds !== undefined ? { attachments: { create: fileIds.map((fileId) => ({ fileId })) } } : {}),
            },
            include: {
                attachments: {
                    include: {
                        file: true,
                    },
                },
            },
        });
    });
    return res.json({ broadcast: mapBroadcast(broadcast) });
});
router.post("/:broadcastId/publish", (0, requirePrivilege_1.requirePrivilege)("broadcast.publish"), async (req, res) => {
    const existing = await getBroadcastOr404(String(req.params.broadcastId), res);
    if (!existing)
        return;
    const broadcast = await client_1.prisma.broadcast.update({
        where: { id: String(req.params.broadcastId) },
        data: {
            status: "published",
            publishedAt: new Date(),
            archivedAt: null,
        },
        include: {
            attachments: {
                include: {
                    file: true,
                },
            },
        },
    });
    return res.json({ broadcast: mapBroadcast(broadcast) });
});
router.post("/:broadcastId/archive", (0, requirePrivilege_1.requirePrivilege)("broadcast.archive"), async (req, res) => {
    const existing = await getBroadcastOr404(String(req.params.broadcastId), res);
    if (!existing)
        return;
    const broadcast = await client_1.prisma.broadcast.update({
        where: { id: String(req.params.broadcastId) },
        data: {
            status: "archived",
            archivedAt: new Date(),
        },
        include: {
            attachments: {
                include: {
                    file: true,
                },
            },
        },
    });
    return res.json({ broadcast: mapBroadcast(broadcast) });
});
router.delete("/:broadcastId", (0, requirePrivilege_1.requirePrivilege)("broadcast.delete"), async (req, res) => {
    if (!canManage(req)) {
        return res.status(403).json({ message: "Permission denied" });
    }
    await client_1.prisma.broadcast.delete({
        where: { id: String(req.params.broadcastId) },
    });
    return res.json({ message: "Broadcast deleted." });
});
exports.default = router;
