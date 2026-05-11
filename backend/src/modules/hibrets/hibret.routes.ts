import { Router } from "express";
import { prisma } from "../../prisma/client";
import { authMiddleware } from "../../middleware/auth.middleware";
import { requirePrivilege } from "../../middleware/requirePrivilege";
import { createHibretSchema, updateHibretSchema } from "./hibret.schemas";

const router = Router();

router.use(authMiddleware);

function param(value: unknown) {
  return String(value);
}

function fullName(member: {
  firstName: string;
  fatherName: string;
  grandfatherName?: string | null;
}) {
  return [member.firstName, member.fatherName, member.grandfatherName]
    .filter(Boolean)
    .join(" ");
}

function mapReport(report: any) {
  return {
    id: report.id,
    announcementId: report.announcementId,
    hibretId: report.hibretId,
    title: report.title,
    summary: report.summary,
    status: report.status,
    submittedAt: report.submittedAt,
    reviewedAt: report.reviewedAt,
    reviewDecision: report.reviewDecision,
    reviewComment: report.reviewComment,
    attachmentCount: report.attachments?.length ?? 0,
    announcement: report.announcement
      ? {
          id: report.announcement.id,
          title: report.announcement.title,
          type: report.announcement.type,
          status: report.announcement.status,
          deadline: report.announcement.deadline,
          attendanceRequired: report.announcement.attendanceRequired,
        }
      : null,
  };
}

router.get("/", requirePrivilege("hibret.read"), async (_req, res) => {
  const hibrets = await prisma.hibret.findMany({
    orderBy: { name: "asc" },
    include: {
      users: true,
      members: true,
      families: true,
      announcementTargets: {
        include: {
          announcement: true,
        },
      },
      reports: {
        include: {
          announcement: true,
          attachments: true,
        },
      },
    },
  });

  return res.json({
    hibrets: hibrets.map((hibret) => {
      const submittedReports = hibret.reports.filter((report) =>
        Boolean(report.submittedAt)
      );

      const reviewedReports = hibret.reports.filter((report) =>
        Boolean(report.reviewDecision)
      );

      const submittedAnnouncementIds = new Set(
        submittedReports.map((report) => report.announcementId)
      );

      const pendingReports = hibret.announcementTargets.filter(
        (target) => !submittedAnnouncementIds.has(target.announcementId)
      ).length;

      const recentDirectiveTargets = [...hibret.announcementTargets]
        .sort(
          (a, b) =>
            new Date(b.announcement.createdAt).getTime() -
            new Date(a.announcement.createdAt).getTime()
        )
        .slice(0, 3);

      return {
        id: hibret.id,
        name: hibret.name,
        description: hibret.description,
        status: hibret.status,
        familyCount: hibret.families.length,
        memberCount: hibret.members.length,
        adminCount: hibret.users.length,
        targetedDirectives: hibret.announcementTargets.length,
        submittedReports: submittedReports.length,
        pendingReports,
        reviewedReports: reviewedReports.length,
        latestSubmittedAt:
          submittedReports
            .map((report) => report.submittedAt)
            .filter(Boolean)
            .sort((a, b) => new Date(String(b)).getTime() - new Date(String(a)).getTime())[0] ??
          null,
        recentDirectives: recentDirectiveTargets.map((target) => ({
          id: target.announcement.id,
          title: target.announcement.title,
          type: target.announcement.type,
          status: target.announcement.status,
          deadline: target.announcement.deadline,
          attendanceRequired: target.announcement.attendanceRequired,
        })),
        createdAt: hibret.createdAt,
        updatedAt: hibret.updatedAt,
      };
    }),
  });
});

router.post("/", requirePrivilege("hibret.create"), async (req, res) => {
  const parsed = createHibretSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid Hibret data",
      errors: parsed.error.flatten(),
    });
  }

  const hibret = await prisma.hibret.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      status: parsed.data.status ?? "active",
    },
  });

  return res.status(201).json({ hibret });
});

router.get("/:hibretId", requirePrivilege("hibret.read"), async (req, res) => {
  const hibretId = param(req.params.hibretId);

  const hibret = await prisma.hibret.findUnique({
    where: { id: hibretId },
    include: {
      users: {
        orderBy: {
          email: "asc",
        },
      },
      families: {
        include: {
          members: true,
        },
        orderBy: {
          name: "asc",
        },
      },
      members: {
        include: {
          family: true,
          user: true,
        },
        orderBy: [{ firstName: "asc" }, { fatherName: "asc" }],
      },
      announcementTargets: {
        include: {
          announcement: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      reports: {
        include: {
          announcement: true,
          attachments: true,
          reviews: {
            orderBy: {
              createdAt: "desc",
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
      },
    },
  });

  if (!hibret) {
    return res.status(404).json({ message: "Hibret not found" });
  }

  const reportByAnnouncementId = new Map(
    hibret.reports.map((report) => [report.announcementId, report])
  );

  const submittedReports = hibret.reports.filter((report) =>
    Boolean(report.submittedAt)
  );

  const reviewedReports = hibret.reports.filter((report) =>
    Boolean(report.reviewDecision)
  );

  const submittedAnnouncementIds = new Set(
    submittedReports.map((report) => report.announcementId)
  );

  const pendingReports = hibret.announcementTargets.filter(
    (target) => !submittedAnnouncementIds.has(target.announcementId)
  ).length;

  const detail = {
    id: hibret.id,
    name: hibret.name,
    description: hibret.description,
    status: hibret.status,
    createdAt: hibret.createdAt,
    updatedAt: hibret.updatedAt,

    counts: {
      members: hibret.members.length,
      admins: hibret.users.length,
      families: hibret.families.length,
      targetedDirectives: hibret.announcementTargets.length,
      submittedReports: submittedReports.length,
      pendingReports,
      reviewedReports: reviewedReports.length,
    },

    admins: hibret.users.map((user) => ({
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    })),

    members: hibret.members.map((member) => ({
      id: member.id,
      memberCode: member.memberCode,
      fanId: member.fanId,
      ppId: member.ppId,
      name: fullName(member),
      firstName: member.firstName,
      fatherName: member.fatherName,
      grandfatherName: member.grandfatherName,
      gender: member.gender,
      phone: member.phone,
      email: member.email,
      membershipStatus: member.membershipStatus,
      partyRole: member.partyRole,
      educationLevel: member.educationLevel,
      workplace: member.workplace,
      familyId: member.familyId,
      familyName: member.family?.name ?? null,
      accountStatus: member.user?.status ?? null,
      registrationType: member.registrationType,
      membershipYear: member.membershipYear,
      fieldOfStudy: member.fieldOfStudy,
      workType: member.workType,
      zone: member.zone,
      kebele: member.kebele,
      ethnicity: member.ethnicity,
      healthStatus: member.healthStatus,
      createdAt: member.createdAt,
    })),

    directives: hibret.announcementTargets.map((target) => {
      const report = reportByAnnouncementId.get(target.announcementId);

      return {
        id: target.announcement.id,
        title: target.announcement.title,
        type: target.announcement.type,
        status: target.announcement.status,
        deadline: target.announcement.deadline,
        attendanceRequired: target.announcement.attendanceRequired,
        assignedAt: target.createdAt,
        report: report ? mapReport(report) : null,
      };
    }),

    reports: hibret.reports.map(mapReport),

    families: hibret.families.map((family) => ({
      id: family.id,
      name: family.name,
      contactName: family.contactName,
      phone: family.phone,
      status: family.status,
      memberCount: family.members.length,
      createdAt: family.createdAt,
      updatedAt: family.updatedAt,
      members: family.members
        .sort((a, b) => fullName(a).localeCompare(fullName(b)))
        .map((member) => ({
          id: member.id,
          name: fullName(member),
          memberCode: member.memberCode,
          fanId: member.fanId,
          ppId: member.ppId,
          gender: member.gender,
          phone: member.phone,
          email: member.email,
          membershipStatus: member.membershipStatus,
          accountStatus: null,
        })),
    })),
  };

  return res.json({ hibret: detail });
});




router.patch("/:hibretId/accounts/status", requirePrivilege("member_account.update"), async (req, res) => {
  const hibretId = param(req.params.hibretId);
  const userIds = Array.isArray(req.body.userIds) ? req.body.userIds.map(String) : [];
  const status = String(req.body.status || "").trim();

  if (userIds.length === 0) {
    return res.status(400).json({ message: "Select at least one account." });
  }

  if (!["ACTIVE", "DISABLED", "PENDING_SETUP"].includes(status)) {
    return res.status(400).json({ message: "Invalid account status." });
  }

  const users = await prisma.user.findMany({
    where: {
      id: {
        in: userIds,
      },
      hibretId,
    },
  });

  if (users.length !== userIds.length) {
    return res.status(400).json({ message: "All selected accounts must belong to this Hibret." });
  }

  await prisma.user.updateMany({
    where: {
      id: {
        in: userIds,
      },
      hibretId,
    },
    data: {
      status: status as any,
    },
  });

  return res.json({
    message: "Selected account statuses updated.",
    updated: users.length,
  });
});


router.patch("/:hibretId/accounts/:userId/status", requirePrivilege("member_account.update"), async (req, res) => {
  const hibretId = param(req.params.hibretId);
  const userId = param(req.params.userId);
  const status = String(req.body.status || "").trim();

  if (!["ACTIVE", "DISABLED", "PENDING_SETUP"].includes(status)) {
    return res.status(400).json({ message: "Invalid account status." });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || user.hibretId !== hibretId) {
    return res.status(404).json({ message: "Account not found under this Hibret." });
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { status: status as any },
  });

  return res.json({
    message: "Account status updated.",
    account: {
      id: updated.id,
      email: updated.email,
      role: updated.role,
      status: updated.status,
      lastLoginAt: updated.lastLoginAt,
      createdAt: updated.createdAt,
    },
  });
});

router.post("/:hibretId/families", requirePrivilege("family.create"), async (req, res) => {
  const hibretId = param(req.params.hibretId);
  const name = String(req.body.name || "").trim();
  const contactName = req.body.contactName ? String(req.body.contactName).trim() : null;
  const phone = req.body.phone ? String(req.body.phone).trim() : null;
  const status = req.body.status ? String(req.body.status).trim() : "active";

  if (!name) {
    return res.status(400).json({ message: "Family name is required." });
  }

  const hibret = await prisma.hibret.findUnique({ where: { id: hibretId } });

  if (!hibret) {
    return res.status(404).json({ message: "Hibret not found." });
  }

  const existing = await prisma.family.findFirst({
    where: {
      hibretId,
      name: {
        equals: name,
        mode: "insensitive",
      },
    },
  });

  if (existing) {
    return res.status(409).json({ message: "A family with this name already exists under this Hibret." });
  }

  const family = await prisma.family.create({
    data: {
      hibretId,
      name,
      contactName,
      phone,
      status,
    },
    include: {
      members: true,
    },
  });

  return res.status(201).json({
    family: {
      id: family.id,
      name: family.name,
      contactName: family.contactName,
      phone: family.phone,
      status: family.status,
      memberCount: family.members.length,
      createdAt: family.createdAt,
      updatedAt: family.updatedAt,
      members: [],
    },
  });
});

router.patch("/:hibretId/families/:familyId", requirePrivilege("family.update"), async (req, res) => {
  const hibretId = param(req.params.hibretId);
  const familyId = param(req.params.familyId);

  const family = await prisma.family.findUnique({
    where: { id: familyId },
  });

  if (!family || family.hibretId !== hibretId) {
    return res.status(404).json({ message: "Family not found under this Hibret." });
  }

  const name = req.body.name === undefined ? undefined : String(req.body.name || "").trim();
  const contactName = req.body.contactName === undefined ? undefined : (req.body.contactName ? String(req.body.contactName).trim() : null);
  const phone = req.body.phone === undefined ? undefined : (req.body.phone ? String(req.body.phone).trim() : null);
  const status = req.body.status === undefined ? undefined : String(req.body.status || "active").trim();

  if (name !== undefined && !name) {
    return res.status(400).json({ message: "Family name is required." });
  }

  if (name && name.toLowerCase() !== family.name.toLowerCase()) {
    const existing = await prisma.family.findFirst({
      where: {
        hibretId,
        name: {
          equals: name,
          mode: "insensitive",
        },
        NOT: {
          id: familyId,
        },
      },
    });

    if (existing) {
      return res.status(409).json({ message: "A family with this name already exists under this Hibret." });
    }
  }

  const updated = await prisma.family.update({
    where: { id: familyId },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(contactName !== undefined ? { contactName } : {}),
      ...(phone !== undefined ? { phone } : {}),
      ...(status !== undefined ? { status } : {}),
    },
    include: {
      members: true,
    },
  });

  return res.json({
    family: {
      id: updated.id,
      name: updated.name,
      contactName: updated.contactName,
      phone: updated.phone,
      status: updated.status,
      memberCount: updated.members.length,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      members: updated.members.map((member) => ({
        id: member.id,
        name: fullName(member),
        memberCode: member.memberCode,
        fanId: member.fanId,
        ppId: member.ppId,
        gender: member.gender,
        phone: member.phone,
        email: member.email,
        membershipStatus: member.membershipStatus,
      })),
    },
  });
});

router.delete("/:hibretId/families/:familyId", requirePrivilege("family.delete"), async (req, res) => {
  const hibretId = param(req.params.hibretId);
  const familyId = param(req.params.familyId);

  const family = await prisma.family.findUnique({
    where: { id: familyId },
    include: {
      members: true,
    },
  });

  if (!family || family.hibretId !== hibretId) {
    return res.status(404).json({ message: "Family not found under this Hibret." });
  }

  if (family.members.length > 0) {
    const updated = await prisma.family.update({
      where: { id: familyId },
      data: {
        status: "inactive",
      },
    });

    return res.json({
      message: "Family has members, so it was marked inactive instead of deleted.",
      family: updated,
    });
  }

  await prisma.family.delete({
    where: { id: familyId },
  });

  return res.json({ message: "Family deleted." });
});

router.post("/:hibretId/families/:familyId/members", requirePrivilege("family.update"), async (req, res) => {
  const hibretId = param(req.params.hibretId);
  const familyId = param(req.params.familyId);
  const memberIds = Array.isArray(req.body.memberIds) ? req.body.memberIds.map(String) : [];

  if (memberIds.length === 0) {
    return res.status(400).json({ message: "Select at least one member." });
  }

  const family = await prisma.family.findUnique({
    where: { id: familyId },
  });

  if (!family || family.hibretId !== hibretId) {
    return res.status(404).json({ message: "Family not found under this Hibret." });
  }

  const members = await prisma.member.findMany({
    where: {
      id: {
        in: memberIds,
      },
      hibretId,
    },
  });

  if (members.length !== memberIds.length) {
    return res.status(400).json({ message: "All selected members must belong to this Hibret." });
  }

  await prisma.member.updateMany({
    where: {
      id: {
        in: memberIds,
      },
      hibretId,
    },
    data: {
      familyId,
    },
  });

  return res.json({
    message: "Members assigned to family.",
    assigned: members.length,
  });
});

router.post("/:hibretId/families/unassign-members", requirePrivilege("family.update"), async (req, res) => {
  const hibretId = param(req.params.hibretId);
  const memberIds = Array.isArray(req.body.memberIds) ? req.body.memberIds.map(String) : [];

  if (memberIds.length === 0) {
    return res.status(400).json({ message: "Select at least one member." });
  }

  const members = await prisma.member.findMany({
    where: {
      id: {
        in: memberIds,
      },
      hibretId,
    },
  });

  if (members.length !== memberIds.length) {
    return res.status(400).json({ message: "All selected members must belong to this Hibret." });
  }

  await prisma.member.updateMany({
    where: {
      id: {
        in: memberIds,
      },
      hibretId,
    },
    data: {
      familyId: null,
    },
  });

  return res.json({
    message: "Members removed from family.",
    unassigned: members.length,
  });
});


router.patch("/:hibretId", requirePrivilege("hibret.update"), async (req, res) => {
  const hibretId = param(req.params.hibretId);
  const parsed = updateHibretSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid Hibret data",
      errors: parsed.error.flatten(),
    });
  }

  const hibret = await prisma.hibret.update({
    where: { id: hibretId },
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      status: parsed.data.status,
    },
  });

  return res.json({ hibret });
});

export default router;
