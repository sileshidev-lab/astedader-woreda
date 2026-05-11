import { Router } from "express";
import { prisma } from "../../prisma/client";
import { authMiddleware } from "../../middleware/auth.middleware";
import { requirePrivilege } from "../../middleware/requirePrivilege";

const router = Router();

router.use(authMiddleware);

function parsePositiveInt(value: unknown, fallback: number, min = 1, max = 200) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(parsed)));
}

router.get("/", requirePrivilege("activity.read"), async (req, res) => {
  const page = parsePositiveInt(req.query.page, 1);
  const pageSize = parsePositiveInt(req.query.pageSize, 25, 1, 100);
  const search = String(req.query.search || "").trim();
  const actorRole = String(req.query.actorRole || "").trim();
  const operation = String(req.query.operation || "").trim();
  const targetType = String(req.query.targetType || "").trim();

  const where: any = {};

  if (actorRole) where.actorRole = actorRole;
  if (operation) where.operation = { contains: operation, mode: "insensitive" };
  if (targetType) where.targetType = { contains: targetType, mode: "insensitive" };

  if (search) {
    where.OR = [
      { actorEmail: { contains: search, mode: "insensitive" } },
      { actorRole: { contains: search, mode: "insensitive" } },
      { operation: { contains: search, mode: "insensitive" } },
      { targetType: { contains: search, mode: "insensitive" } },
      { targetName: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const [total, activity] = await Promise.all([
    prisma.activityLog.count({ where }),
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return res.json({
    activity,
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      hasNextPage: page * pageSize < total,
      hasPreviousPage: page > 1,
    },
  });
});

router.get("/summary", requirePrivilege("activity.read"), async (_req, res) => {
  const [total, today, recent] = await Promise.all([
    prisma.activityLog.count(),
    prisma.activityLog.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
    prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return res.json({
    summary: {
      total,
      today,
    },
    recent,
  });
});

export default router;
