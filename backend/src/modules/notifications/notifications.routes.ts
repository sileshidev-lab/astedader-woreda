import { Router } from "express";
import { prisma } from "../../prisma/client";
import { authMiddleware } from "../../middleware/auth.middleware";

const router = Router();

router.use(authMiddleware);

function notificationWhere(req: any) {
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

router.get("/", async (req: any, res) => {
  const userId = String(req.user?.id || "");

  const notifications = await prisma.notification.findMany({
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

router.patch("/read-all", async (req: any, res) => {
  const userId = String(req.user?.id || "");

  const notifications = await prisma.notification.findMany({
    where: notificationWhere(req),
  });

  await Promise.all(
    notifications
      .filter((item) => !item.readByUserIds.includes(userId))
      .map((item) =>
        prisma.notification.update({
          where: { id: item.id },
          data: {
            readByUserIds: Array.from(new Set([...item.readByUserIds, userId])),
          },
        })
      )
  );

  return res.json({ message: "Notifications marked as read." });
});

router.patch("/:notificationId/read", async (req: any, res) => {
  const userId = String(req.user?.id || "");
  const notificationId = String(req.params.notificationId);

  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification) {
    return res.status(404).json({ message: "Notification not found." });
  }

  const readByUserIds = Array.from(new Set([...notification.readByUserIds, userId]));

  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: { readByUserIds },
  });

  return res.json({ notification: updated });
});

export default router;
