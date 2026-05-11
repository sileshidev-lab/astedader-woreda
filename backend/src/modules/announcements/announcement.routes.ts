import { Router } from "express";
import { prisma } from "../../prisma/client";
import { authMiddleware } from "../../middleware/auth.middleware";
import { requirePrivilege } from "../../middleware/requirePrivilege";
import {
  createAnnouncementSchema,
  reviewReportSchema,
  updateAnnouncementSchema,
} from "./announcement.schemas";
import { notifyHibret } from "../notifications/notification.service";

const router = Router();

router.use(authMiddleware);

function param(value: unknown) {
  return String(value);
}

function parsePositiveInt(value: unknown, fallback: number, min = 1, max = 200) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(parsed)));
}

async function getAnnouncementOr404(announcementId: string, res: any) {
  const announcement = await prisma.announcement.findUnique({
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

router.get("/", requirePrivilege("announcement.read"), async (req, res) => {
  const page = parsePositiveInt(req.query.page, 1);
  const pageSize = parsePositiveInt(req.query.pageSize, 20);
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const type = typeof req.query.type === "string" ? req.query.type.trim() : "";
  const status = typeof req.query.status === "string" ? req.query.status.trim() : "";
  const dateFrom = typeof req.query.dateFrom === "string" ? req.query.dateFrom.trim() : "";
  const dateTo = typeof req.query.dateTo === "string" ? req.query.dateTo.trim() : "";

  const where: any = {};

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
    if (dateFrom) where.createdAt.gte = new Date(`${dateFrom}T00:00:00`);
    if (dateTo) where.createdAt.lte = new Date(`${dateTo}T23:59:59`);
  }

  const total = await prisma.announcement.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const skip = (safePage - 1) * pageSize;

  const announcements = await prisma.announcement.findMany({
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
    prisma.announcement.groupBy({
      by: ["status"],
      where,
      _count: true,
    }),
    prisma.announcementTarget.count({
      where: {
        announcement: where,
      },
    }),
    prisma.hibretReport.count({
      where: {
        submittedAt: { not: null },
        announcement: where,
      },
    }),
  ]);

  const statusMap = new Map(statusBreakdown.map((item: any) => [item.status, item._count]));
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

router.post("/", requirePrivilege("announcement.create"), async (req, res) => {
  const parsed = createAnnouncementSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid announcement data",
      errors: parsed.error.flatten(),
    });
  }

  const data = parsed.data;

  const announcement = await prisma.announcement.create({
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


router.post(
  "/:announcementId/attachments",
  requirePrivilege("announcement.update"),
  async (req, res) => {
    const announcementId = param(req.params.announcementId);
    const fileIds: string[] = Array.isArray(req.body.fileIds) ? req.body.fileIds.map(String) : [];

    if (!fileIds.length) {
      return res.status(400).json({ message: "fileIds is required" });
    }

    const announcement = await prisma.announcement.findUnique({
      where: { id: announcementId },
    });

    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    await prisma.announcementAttachment.createMany({
      data: fileIds.map((fileId) => ({
        announcementId,
        fileId,
      })),
      skipDuplicates: true,
    });

    const updatedAnnouncement = await prisma.announcement.findUnique({
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
  }
);

router.get("/:announcementId", requirePrivilege("announcement.read"), async (req, res) => {
  const announcementId = param(req.params.announcementId);

  const announcement = await prisma.announcement.findUnique({
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

router.patch("/:announcementId", requirePrivilege("announcement.update"), async (req, res) => {
  const announcementId = param(req.params.announcementId);
  const parsed = updateAnnouncementSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid announcement data",
      errors: parsed.error.flatten(),
    });
  }

  const existing = await prisma.announcement.findUnique({
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

  const announcement = await prisma.$transaction(async (tx) => {
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
        deadline:
          data.deadline === undefined
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

router.post("/:announcementId/publish", requirePrivilege("announcement.publish"), async (req, res) => {
  const announcementId = param(req.params.announcementId);

  const existing = await getAnnouncementOr404(announcementId, res);
  if (!existing) return;

  if (existing.status !== "draft") {
    return res.status(409).json({ message: "Only draft directives can be published." });
  }

  const announcement = await prisma.announcement.update({
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

  await Promise.allSettled(
    announcement.targets.map((target) =>
      notifyHibret(
        target.hibretId,
        "New Woreda directive published",
        announcement.title,
        "announcement_published",
        `/hibret/announcements/${announcement.id}`,
        req.user?.id
      )
    )
  );

  return res.json({ announcement });
});

router.post("/:announcementId/close", requirePrivilege("announcement.close"), async (req, res) => {
  const announcementId = param(req.params.announcementId);

  const existing = await getAnnouncementOr404(announcementId, res);
  if (!existing) return;

  if (existing.status === "draft") {
    return res.status(409).json({ message: "Draft directives cannot be closed before publishing." });
  }

  if (existing.status === "closed") {
    return res.status(409).json({ message: "Directive is already closed." });
  }

  const announcement = await prisma.announcement.update({
    where: { id: announcementId },
    data: {
      status: "closed",
      closedAt: new Date(),
    },
  });

  return res.json({ announcement });
});

router.get(
  "/:announcementId/hibrets/:hibretId/report",
  requirePrivilege("announcement.review"),
  async (req, res) => {
    const announcementId = param(req.params.announcementId);
    const hibretId = param(req.params.hibretId);

    const report = await prisma.hibretReport.findUnique({
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
  }
);

router.post(
  "/:announcementId/hibrets/:hibretId/report/review",
  requirePrivilege("announcement.review"),
  async (req, res) => {
    const announcementId = param(req.params.announcementId);
    const hibretId = param(req.params.hibretId);

    const parsed = reviewReportSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid review data",
        errors: parsed.error.flatten(),
      });
    }

    const report = await prisma.hibretReport.findUnique({
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

    const updatedReport = await prisma.$transaction(async (tx) => {
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
      notifyHibret(
        hibretId,
        "Woreda reviewed your report",
        updatedReport.title,
        "report_reviewed",
        `/hibret/reports/${updatedReport.id}`,
        req.user?.id
      ),
    ]);

    return res.json({ report: updatedReport });
  }
);

export default router;
