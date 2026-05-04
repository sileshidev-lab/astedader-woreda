import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware.js";
import {
  asyncHandler,
  createError,
  getPagination,
  listResponse,
  sendCsv,
} from "../utils.js";

const router = Router();

router.use(requireAuth);

function isWoreda(user) {
  return user.role === "woreda_admin";
}

function isHibret(user) {
  return user.role === "hibret_admin";
}

function isFamily(user) {
  return user.role === "family_admin";
}

function isMember(user) {
  return user.role === "member";
}

function percent(part, total) {
  if (!total) return null;
  return part / total;
}

async function memberBreakdown(where, field) {
  const rows = await prisma.member.groupBy({
    by: [field],
    where,
    _count: { _all: true },
  });

  return rows.map((row) => ({
    value: row[field] || "unknown",
    count: row._count._all,
  }));
}

async function attendanceRateForHibret(hibretId) {
  const where = hibretId ? { hibretId } : {};
  const total = await prisma.hibretAttendance.count({ where });
  const attended = await prisma.hibretAttendance.count({
    where: { ...where, status: "attended" },
  });

  return {
    total,
    attended,
    notAttended: await prisma.hibretAttendance.count({
      where: { ...where, status: "not_attended" },
    }),
    excused: await prisma.hibretAttendance.count({
      where: { ...where, status: "excused" },
    }),
    rate: percent(attended, total),
  };
}

async function formSubmissionRate(formWhere = {}) {
  const forms = await prisma.form.findMany({
    where: formWhere,
    select: { id: true },
  });

  const formIds = forms.map((form) => form.id);

  if (!formIds.length) {
    return {
      forms: 0,
      submissions: 0,
      submitted: 0,
      rate: null,
    };
  }

  const submissions = await prisma.formSubmission.count({
    where: { formId: { in: formIds } },
  });

  const submitted = await prisma.formSubmission.count({
    where: { formId: { in: formIds }, status: "submitted" },
  });

  return {
    forms: formIds.length,
    submissions,
    submitted,
    rate: percent(submitted, submissions),
  };
}

async function responseSummary(where = {}) {
  const total = await prisma.hibretResponse.count({ where });

  const [draft, submitted, approved, rejected, changesRequested] = await Promise.all([
    prisma.hibretResponse.count({ where: { ...where, status: "draft" } }),
    prisma.hibretResponse.count({ where: { ...where, status: "submitted" } }),
    prisma.hibretResponse.count({ where: { ...where, status: "approved" } }),
    prisma.hibretResponse.count({ where: { ...where, status: "rejected" } }),
    prisma.hibretResponse.count({ where: { ...where, status: "changes_requested" } }),
  ]);

  return {
    total,
    draft,
    submitted,
    approved,
    rejected,
    changesRequested,
  };
}

async function familyResponseSummary(where = {}) {
  const total = await prisma.familyResponse.count({ where });

  const [draft, submitted] = await Promise.all([
    prisma.familyResponse.count({ where: { ...where, status: "draft" } }),
    prisma.familyResponse.count({ where: { ...where, status: "submitted" } }),
  ]);

  return {
    total,
    draft,
    submitted,
    submissionRate: percent(submitted, total),
  };
}

router.get(
  "/woreda/overview",
  asyncHandler(async (req, res) => {
    if (!isWoreda(req.user)) throw createError(403, "Forbidden");

    const [
      totalHibrets,
      totalFamilies,
      totalMembers,
      totalAdmins,
      activeAnnouncements,
      announcementsByStatus,
      announcementsByType,
      responses,
      attendance,
      forms,
      membersByGender,
      membersByMembershipStatus,
      membersByEducationLevel,
      membersByWorkType,
      recentActivity,
    ] = await Promise.all([
      prisma.hibret.count(),
      prisma.family.count(),
      prisma.member.count(),
      prisma.user.count({ where: { role: { in: ["woreda_admin", "hibret_admin", "family_admin"] } } }),
      prisma.announcement.count({ where: { status: "published" } }),
      prisma.announcement.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.announcement.groupBy({ by: ["type"], _count: { _all: true } }),
      responseSummary(),
      attendanceRateForHibret(null),
      formSubmissionRate(),
      memberBreakdown({}, "gender"),
      memberBreakdown({}, "membershipStatus"),
      memberBreakdown({}, "educationLevel"),
      memberBreakdown({}, "workType"),
      prisma.activityLog.findMany({ take: 10, orderBy: { createdAt: "desc" } }),
    ]);

    const membersByHibretRaw = await prisma.member.groupBy({
      by: ["hibretId"],
      _count: { _all: true },
    });

    const familiesByHibretRaw = await prisma.family.groupBy({
      by: ["hibretId"],
      _count: { _all: true },
    });

    res.json({
      data: {
        totals: {
          hibrets: totalHibrets,
          families: totalFamilies,
          members: totalMembers,
          admins: totalAdmins,
          activeAnnouncements,
        },
        hibretResponses: responses,
        attendance,
        forms,
        membersByGender,
        membersByMembershipStatus,
        membersByEducationLevel,
        membersByWorkType,
        membersByHibret: membersByHibretRaw.map((row) => ({
          hibretId: row.hibretId,
          count: row._count._all,
        })),
        familiesByHibret: familiesByHibretRaw.map((row) => ({
          hibretId: row.hibretId,
          count: row._count._all,
        })),
        announcementsByStatus: announcementsByStatus.map((row) => ({
          status: row.status,
          count: row._count._all,
        })),
        announcementsByType: announcementsByType.map((row) => ({
          type: row.type,
          count: row._count._all,
        })),
        recentActivity,
      },
    });
  })
);

router.get(
  "/woreda/hibret/:hibretId",
  asyncHandler(async (req, res) => {
    if (!isWoreda(req.user)) throw createError(403, "Forbidden");

    const hibret = await prisma.hibret.findUnique({
      where: { id: req.params.hibretId },
    });

    if (!hibret) throw createError(404, "Hibret not found");

    const memberWhere = { hibretId: hibret.id };
    const familyAssignments = await prisma.familyAssignment.findMany({
      where: { hibretId: hibret.id },
      select: { id: true },
    });

    const assignmentIds = familyAssignments.map((assignment) => assignment.id);

    const [
      totalFamilies,
      totalMembers,
      totalFamilyAdmins,
      responses,
      attendance,
      familyResponses,
      membersByFamily,
      membersByGender,
      membersByMembershipStatus,
      membersByEducationLevel,
      membersByWorkType,
      forms,
    ] = await Promise.all([
      prisma.family.count({ where: { hibretId: hibret.id } }),
      prisma.member.count({ where: memberWhere }),
      prisma.user.count({ where: { role: "family_admin", hibretId: hibret.id } }),
      responseSummary({ hibretId: hibret.id }),
      attendanceRateForHibret(hibret.id),
      assignmentIds.length
        ? familyResponseSummary({ familyAssignmentId: { in: assignmentIds } })
        : Promise.resolve({ total: 0, draft: 0, submitted: 0, submissionRate: null }),
      prisma.member.groupBy({
        by: ["familyId"],
        where: memberWhere,
        _count: { _all: true },
      }),
      memberBreakdown(memberWhere, "gender"),
      memberBreakdown(memberWhere, "membershipStatus"),
      memberBreakdown(memberWhere, "educationLevel"),
      memberBreakdown(memberWhere, "workType"),
      formSubmissionRate({ OR: [{ sourceType: "woreda" }, { sourceType: "hibret", hibretId: hibret.id }] }),
    ]);

    res.json({
      data: {
        hibret,
        totals: {
          families: totalFamilies,
          members: totalMembers,
          familyAdmins: totalFamilyAdmins,
        },
        hibretResponses: responses,
        familyResponses,
        attendance,
        forms,
        membersByFamily: membersByFamily.map((row) => ({
          familyId: row.familyId || "not_assigned",
          count: row._count._all,
        })),
        membersByGender,
        membersByMembershipStatus,
        membersByEducationLevel,
        membersByWorkType,
      },
    });
  })
);

router.get(
  "/woreda/members",
  asyncHandler(async (req, res) => {
    if (!isWoreda(req.user)) throw createError(403, "Forbidden");

    const { page, limit, skip } = getPagination(req);
    const where = {};

    if (req.query.hibretId) where.hibretId = String(req.query.hibretId);
    if (req.query.familyId) where.familyId = String(req.query.familyId);
    if (req.query.gender) where.gender = String(req.query.gender);
    if (req.query.membershipStatus) where.membershipStatus = String(req.query.membershipStatus);
    if (req.query.registrationType) where.registrationType = String(req.query.registrationType);
    if (req.query.educationLevel) where.educationLevel = String(req.query.educationLevel);
    if (req.query.workType) where.workType = String(req.query.workType);

    if (req.query.search) {
      where.OR = [
        { firstName: { contains: String(req.query.search), mode: "insensitive" } },
        { fatherName: { contains: String(req.query.search), mode: "insensitive" } },
        { grandfatherName: { contains: String(req.query.search), mode: "insensitive" } },
        { fanId: { contains: String(req.query.search), mode: "insensitive" } },
        { ppId: { contains: String(req.query.search), mode: "insensitive" } },
        { memberCode: { contains: String(req.query.search), mode: "insensitive" } },
      ];
    }

    const [rows, total] = await Promise.all([
      prisma.member.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }),
      prisma.member.count({ where }),
    ]);

    res.json(listResponse(rows, page, limit, total));
  })
);

router.post(
  "/woreda/custom",
  asyncHandler(async (req, res) => {
    if (!isWoreda(req.user)) throw createError(403, "Forbidden");

    const dataset = req.body.dataset;
    const groupBy = req.body.groupBy;

    if (dataset === "members") {
      const allowed = [
        "hibretId",
        "familyId",
        "gender",
        "membershipStatus",
        "registrationType",
        "educationLevel",
        "workType",
      ];

      if (!allowed.includes(groupBy)) throw createError(400, "Invalid groupBy for members");

      const rows = await prisma.member.groupBy({
        by: [groupBy],
        _count: { _all: true },
      });

      return res.json({
        data: rows.map((row) => ({
          value: row[groupBy] || "unknown",
          count: row._count._all,
        })),
      });
    }

    if (dataset === "announcements") {
      const allowed = ["status", "type"];
      if (!allowed.includes(groupBy)) throw createError(400, "Invalid groupBy for announcements");

      const rows = await prisma.announcement.groupBy({
        by: [groupBy],
        _count: { _all: true },
      });

      return res.json({
        data: rows.map((row) => ({
          value: row[groupBy] || "unknown",
          count: row._count._all,
        })),
      });
    }

    if (dataset === "hibret_responses") {
      const allowed = ["hibretId", "status"];
      if (!allowed.includes(groupBy)) throw createError(400, "Invalid groupBy for hibret_responses");

      const rows = await prisma.hibretResponse.groupBy({
        by: [groupBy],
        _count: { _all: true },
      });

      return res.json({
        data: rows.map((row) => ({
          value: row[groupBy] || "unknown",
          count: row._count._all,
        })),
      });
    }

    if (dataset === "attendance") {
      const allowed = ["hibretId", "status"];
      if (!allowed.includes(groupBy)) throw createError(400, "Invalid groupBy for attendance");

      const rows = await prisma.hibretAttendance.groupBy({
        by: [groupBy],
        _count: { _all: true },
      });

      return res.json({
        data: rows.map((row) => ({
          value: row[groupBy] || "unknown",
          count: row._count._all,
        })),
      });
    }

    throw createError(400, "Unsupported dataset");
  })
);

router.get(
  "/hibret/overview",
  asyncHandler(async (req, res) => {
    if (!isHibret(req.user)) throw createError(403, "Forbidden");

    const hibretId = req.user.hibretId;
    const memberWhere = { hibretId };

    const assignmentIds = (
      await prisma.familyAssignment.findMany({
        where: { hibretId },
        select: { id: true },
      })
    ).map((assignment) => assignment.id);

    const [
      totalFamilies,
      totalMembers,
      familyAdmins,
      activeWoredaDirectives,
      responses,
      attendance,
      familyResponses,
      forms,
      membersByFamily,
      membersByGender,
      membersByMembershipStatus,
      membersByEducationLevel,
      membersByWorkType,
    ] = await Promise.all([
      prisma.family.count({ where: { hibretId } }),
      prisma.member.count({ where: memberWhere }),
      prisma.user.count({ where: { role: "family_admin", hibretId } }),
      prisma.announcementTarget.count({ where: { hibretId } }),
      responseSummary({ hibretId }),
      attendanceRateForHibret(hibretId),
      assignmentIds.length
        ? familyResponseSummary({ familyAssignmentId: { in: assignmentIds } })
        : Promise.resolve({ total: 0, draft: 0, submitted: 0, submissionRate: null }),
      formSubmissionRate({ OR: [{ sourceType: "woreda" }, { sourceType: "hibret", hibretId }] }),
      prisma.member.groupBy({
        by: ["familyId"],
        where: memberWhere,
        _count: { _all: true },
      }),
      memberBreakdown(memberWhere, "gender"),
      memberBreakdown(memberWhere, "membershipStatus"),
      memberBreakdown(memberWhere, "educationLevel"),
      memberBreakdown(memberWhere, "workType"),
    ]);

    res.json({
      data: {
        totals: {
          families: totalFamilies,
          members: totalMembers,
          familyAdmins,
          activeWoredaDirectives,
        },
        hibretResponses: responses,
        familyResponses,
        attendance,
        forms,
        membersByFamily: membersByFamily.map((row) => ({
          familyId: row.familyId || "not_assigned",
          count: row._count._all,
        })),
        membersByGender,
        membersByMembershipStatus,
        membersByEducationLevel,
        membersByWorkType,
      },
    });
  })
);

router.post(
  "/hibret/custom",
  asyncHandler(async (req, res) => {
    if (!isHibret(req.user)) throw createError(403, "Forbidden");

    const dataset = req.body.dataset;
    const groupBy = req.body.groupBy;
    const hibretId = req.user.hibretId;

    if (dataset === "members") {
      const allowed = ["familyId", "gender", "membershipStatus", "registrationType", "educationLevel", "workType"];
      if (!allowed.includes(groupBy)) throw createError(400, "Invalid groupBy for members");

      const rows = await prisma.member.groupBy({
        by: [groupBy],
        where: { hibretId },
        _count: { _all: true },
      });

      return res.json({
        data: rows.map((row) => ({
          value: row[groupBy] || "unknown",
          count: row._count._all,
        })),
      });
    }

    if (dataset === "attendance") {
      const allowed = ["status"];
      if (!allowed.includes(groupBy)) throw createError(400, "Invalid groupBy for attendance");

      const rows = await prisma.hibretAttendance.groupBy({
        by: [groupBy],
        where: { hibretId },
        _count: { _all: true },
      });

      return res.json({
        data: rows.map((row) => ({
          value: row[groupBy] || "unknown",
          count: row._count._all,
        })),
      });
    }

    throw createError(400, "Unsupported dataset");
  })
);

router.get(
  "/family/overview",
  asyncHandler(async (req, res) => {
    if (!isFamily(req.user)) throw createError(403, "Forbidden");

    const familyId = req.user.familyId;
    const memberWhere = { familyId };

    const assignmentIds = (
      await prisma.familyAssignment.findMany({
        where: { familyId },
        select: { id: true },
      })
    ).map((assignment) => assignment.id);

    const totalMembers = await prisma.member.count({ where: memberWhere });
    const memberIds = (
      await prisma.member.findMany({
        where: memberWhere,
        select: { id: true },
      })
    ).map((member) => member.id);

    const [membersWithAccounts, pendingSetupAccounts, activeAccounts] = await Promise.all([
      prisma.user.count({ where: { memberId: { in: memberIds } } }),
      prisma.user.count({ where: { memberId: { in: memberIds }, status: "pending_setup" } }),
      prisma.user.count({ where: { memberId: { in: memberIds }, status: "active" } }),
    ]);

    const familyResponses = assignmentIds.length
      ? await familyResponseSummary({ familyAssignmentId: { in: assignmentIds }, familyId })
      : { total: 0, draft: 0, submitted: 0, submissionRate: null };

    const totalAttendance = await prisma.familyAttendance.count({ where: { familyId } });
    const attended = await prisma.familyAttendance.count({ where: { familyId, status: "attended" } });

    const [
      membersByGender,
      membersByMembershipStatus,
      membersByEducationLevel,
      membersByWorkType,
      forms,
    ] = await Promise.all([
      memberBreakdown(memberWhere, "gender"),
      memberBreakdown(memberWhere, "membershipStatus"),
      memberBreakdown(memberWhere, "educationLevel"),
      memberBreakdown(memberWhere, "workType"),
      formSubmissionRate({ OR: [{ sourceType: "woreda" }, { sourceType: "hibret", hibretId: req.user.hibretId }] }),
    ]);

    res.json({
      data: {
        totals: {
          members: totalMembers,
          membersWithAccounts,
          pendingSetupAccounts,
          activeAccounts,
          assignments: assignmentIds.length,
        },
        familyResponses,
        attendance: {
          total: totalAttendance,
          attended,
          rate: percent(attended, totalAttendance),
        },
        forms,
        membersByGender,
        membersByMembershipStatus,
        membersByEducationLevel,
        membersByWorkType,
      },
    });
  })
);

router.post(
  "/family/custom",
  asyncHandler(async (req, res) => {
    if (!isFamily(req.user)) throw createError(403, "Forbidden");

    const dataset = req.body.dataset;
    const groupBy = req.body.groupBy;

    if (dataset === "members") {
      const allowed = ["gender", "membershipStatus", "educationLevel", "workType"];
      if (!allowed.includes(groupBy)) throw createError(400, "Invalid groupBy for members");

      const rows = await prisma.member.groupBy({
        by: [groupBy],
        where: { familyId: req.user.familyId },
        _count: { _all: true },
      });

      return res.json({
        data: rows.map((row) => ({
          value: row[groupBy] || "unknown",
          count: row._count._all,
        })),
      });
    }

    if (dataset === "attendance") {
      const allowed = ["status"];
      if (!allowed.includes(groupBy)) throw createError(400, "Invalid groupBy for attendance");

      const rows = await prisma.familyAttendance.groupBy({
        by: [groupBy],
        where: { familyId: req.user.familyId },
        _count: { _all: true },
      });

      return res.json({
        data: rows.map((row) => ({
          value: row[groupBy] || "unknown",
          count: row._count._all,
        })),
      });
    }

    throw createError(400, "Unsupported dataset");
  })
);

router.get(
  "/export",
  asyncHandler(async (req, res) => {
    if (isMember(req.user)) throw createError(403, "Forbidden");

    let rows = [];

    if (isWoreda(req.user)) {
      rows = [
        {
          scope: "woreda",
          totalHibrets: await prisma.hibret.count(),
          totalFamilies: await prisma.family.count(),
          totalMembers: await prisma.member.count(),
          totalAnnouncements: await prisma.announcement.count(),
          totalActivities: await prisma.activityLog.count(),
        },
      ];
    }

    if (isHibret(req.user)) {
      rows = [
        {
          scope: "hibret",
          hibretId: req.user.hibretId,
          totalFamilies: await prisma.family.count({ where: { hibretId: req.user.hibretId } }),
          totalMembers: await prisma.member.count({ where: { hibretId: req.user.hibretId } }),
          totalResponses: await prisma.hibretResponse.count({ where: { hibretId: req.user.hibretId } }),
        },
      ];
    }

    if (isFamily(req.user)) {
      rows = [
        {
          scope: "family",
          familyId: req.user.familyId,
          totalMembers: await prisma.member.count({ where: { familyId: req.user.familyId } }),
          totalAssignments: await prisma.familyAssignment.count({ where: { familyId: req.user.familyId } }),
          totalResponses: await prisma.familyResponse.count({ where: { familyId: req.user.familyId } }),
        },
      ];
    }

    sendCsv(res, "analytics-summary.csv", rows);
  })
);

router.get("/health", (_req, res) => {
  res.json({ ok: true, module: "analytics" });
});

export default router;
