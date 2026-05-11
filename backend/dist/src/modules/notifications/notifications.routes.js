"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("../../prisma/client");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authMiddleware);
function notificationWhere(req) {
    const userId = String(req.user?.id || "");
    const role = String(req.user?.role || "");
    const hibretId = req.user?.hibretId ? String(req.user.hibretId) : null;
    return {
        OR: [
            { recipientUserId: userId },
            { recipientRole: role },
            ...(hibretId ? [{ recipientHibretId: hibretId }] : []),
            {
                recipientUserId: null,
                recipientRole: null,
                recipientHibretId: null,
            },
        ],
    };
}
router.get("/", async (req, res) => {
    const userId = String(req.user?.id || "");
    const notifications = await client_1.prisma.notification.findMany({
        where: notificationWhere(req),
        orderBy: { createdAt: "desc" },
        take: 50,
    });
    return res.json({
        notifications: notifications.map((item) => ({
            ...item,
            isUnread: !item.readByUserIds.includes(userId),
        })),
    });
});
router.patch("/read-all", async (req, res) => {
    const userId = String(req.user?.id || "");
    const notifications = await client_1.prisma.notification.findMany({
        where: notificationWhere(req),
    });
    await Promise.all(notifications
        .filter((item) => !item.readByUserIds.includes(userId))
        .map((item) => client_1.prisma.notification.update({
        where: { id: item.id },
        data: {
            readByUserIds: Array.from(new Set([...item.readByUserIds, userId])),
        },
    })));
    return res.json({ message: "Notifications marked as read." });
});
router.patch("/:notificationId/read", async (req, res) => {
    const userId = String(req.user?.id || "");
    const notificationId = String(req.params.notificationId);
    const notification = await client_1.prisma.notification.findUnique({
        where: { id: notificationId },
    });
    if (!notification) {
        return res.status(404).json({ message: "Notification not found." });
    }
    const readByUserIds = Array.from(new Set([...notification.readByUserIds, userId]));
    const updated = await client_1.prisma.notification.update({
        where: { id: notificationId },
        data: { readByUserIds },
    });
    return res.json({ notification: updated });
});
exports.default = router;
