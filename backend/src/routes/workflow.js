import { Router } from "express";
import archiver from "archiver";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware.js";
import {
  asyncHandler,
  buildSearchWhere,
  createError,
  getPagination,
  listResponse,
  logActivity,
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

async function getAnnouncementOrThrow(id) {
  const announcement = await prisma.announcement.findUnique({ where: { id } });
  if (!announcement) throw createError(404, "Announcement not found");
  return announcement;
}

async function isAnnouncementTargetedToHibret(announcementId, hibretId) {
  const target = await prisma.announcementTarget.findUnique({
    where: { announcementId_hibretId: { announcementId, hibretId } },
  });
  return Boolean(target);
}

async function assertHibretCanAccessAnnouncement(user, announcementId) {
  if (isWoreda(user)) return true;
  if (!isHibret(user)) return false;
  return isAnnouncementTargetedToHibret(announcementId, user.hibretId);
}

async function getFamilyAssignmentOrThrow(id) {
  const assignment = await prisma.familyAssignment.findUnique({ where: { id } });
  if (!assignment) throw createError(404, "Family assignment not found");
  return assignment;
}

function assertFamilyAssignmentScope(user, assignment) {
  if (isWoreda(user)) return true;
  if (isHibret(user) && assignment.hibretId === user.hibretId) return true;
  if (isFamily(user) && assignment.familyId === user.familyId) return true;
  return false;
}

async function getHibretResponseForUser(announcementId, user) {
  if (!isHibret(user)) throw createError(403, "Only Hibret Admin can do this");
  const targeted = await isAnnouncementTargetedToHibret(announcementId, user.hibretId);
  if (!targeted) throw createError(403, "Announcement is not targeted to your Hibret");

  return prisma.hibretResponse.findUnique({
    where: {
      announcementId_hibretId: {
        announcementId,
        hibretId: user.hibretId,
      },
    },
  });
}

async function assertHibretResponseEditable(announcementId, user) {
  const response = await getHibretResponseForUser(announcementId, user);
  if (response && !["draft", "changes_requested"].includes(response.status)) {
    throw createError(400, "Response is locked");
  }
  return response;
}

async function getFamilyResponseForAssignment(assignmentId, familyId) {
  return prisma.familyResponse.findUnique({
    where: {
      familyAssignmentId_familyId: {
        familyAssignmentId: assignmentId,
        familyId,
      },
    },
  });
}

/* =========================================================
   ANNOUNCEMENTS / WOREDA → HIBRET
========================================================= */

router.get(
  "/announcements/export",
  asyncHandler(async (req, res) => {
    if (!isWoreda(req.user)) throw createError(403, "Forbidden");

    const where = {};
    if (req.query.search) Object.assign(where, buildSearchWhere(req.query.search, ["title", "description"]));
    if (req.query.type) where.type = String(req.query.type);
    if (req.query.status) where.status = String(req.query.status);

    const rows = await prisma.announcement.findMany({ where, orderBy: { createdAt: "desc" } });
    sendCsv(res, "announcements.csv", rows);
  })
);

router.get(
  "/announcements/:id/export",
  asyncHandler(async (req, res) => {
    if (!isWoreda(req.user)) throw createError(403, "Only Woreda Admin can export announcement package");

    const announcement = await getAnnouncementOrThrow(req.params.id);

    const [targets, attachments, responses, attendance] = await Promise.all([
      prisma.announcementTarget.findMany({ where: { announcementId: announcement.id } }),
      prisma.announcementAttachment.findMany({ where: { announcementId: announcement.id } }),
      prisma.hibretResponse.findMany({ where: { announcementId: announcement.id } }),
      prisma.hibretAttendance.findMany({ where: { announcementId: announcement.id } }),
    ]);

    await logActivity(req, "announcement_exported", "announcement", announcement.id, "Announcement ZIP exported");

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="announcement-${announcement.id}.zip"`);

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.on("error", (error) => {
      throw error;
    });

    archive.pipe(res);

    archive.append(JSON.stringify(announcement, null, 2), { name: "announcement.json" });
    archive.append(JSON.stringify(targets, null, 2), { name: "targeted-hibrets.json" });
    archive.append(JSON.stringify(attachments, null, 2), { name: "announcement-attachments.json" });
    archive.append(JSON.stringify(responses, null, 2), { name: "hibret-responses.json" });
    archive.append(JSON.stringify(attendance, null, 2), { name: "hibret-attendance.json" });
    archive.append(
      JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          exportedBy: req.user.email,
          note: "This package contains Woreda announcement data, Hibret responses, and Hibret-level attendance if available.",
        },
        null,
        2
      ),
      { name: "metadata.json" }
    );

    await archive.finalize();
  })
);

router.get(
  "/announcements",
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req);

    const where = {};
    if (req.query.search) Object.assign(where, buildSearchWhere(req.query.search, ["title", "description"]));
    if (req.query.type) where.type = String(req.query.type);
    if (req.query.status) where.status = String(req.query.status);

    if (isHibret(req.user)) {
      where.status = { in: ["published", "closed"] };
      where.id = {
        in: (
          await prisma.announcementTarget.findMany({
            where: { hibretId: req.user.hibretId },
            select: { announcementId: true },
          })
        ).map((target) => target.announcementId),
      };
    }

    if (isFamily(req.user) || isMember(req.user)) {
      where.id = "__none__";
    }

    const [rows, total] = await Promise.all([
      prisma.announcement.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }),
      prisma.announcement.count({ where }),
    ]);

    res.json(listResponse(rows, page, limit, total));
  })
);

router.get(
  "/announcements/:id",
  asyncHandler(async (req, res) => {
    const announcement = await getAnnouncementOrThrow(req.params.id);

    if (isHibret(req.user)) {
      if (!["published", "closed"].includes(announcement.status)) throw createError(403, "Forbidden");
      const targeted = await isAnnouncementTargetedToHibret(announcement.id, req.user.hibretId);
      if (!targeted) throw createError(403, "Forbidden");
    }

    if (isFamily(req.user) || isMember(req.user)) throw createError(403, "Forbidden");

    const [targets, attachments] = await Promise.all([
      prisma.announcementTarget.findMany({ where: { announcementId: announcement.id } }),
      prisma.announcementAttachment.findMany({ where: { announcementId: announcement.id } }),
    ]);

    res.json({ data: { ...announcement, targets, attachments } });
  })
);

router.post(
  "/announcements",
  asyncHandler(async (req, res) => {
    if (!isWoreda(req.user)) throw createError(403, "Only Woreda Admin can create announcements");

    const { title, description, type, deadline, allowAttendance = false, targetHibretIds = [] } = req.body;

    const created = await prisma.announcement.create({
      data: {
        title,
        description,
        type,
        deadline: deadline ? new Date(deadline) : null,
        allowAttendance: Boolean(allowAttendance),
        createdByUserId: req.user.sub,
      },
    });

    if (Array.isArray(targetHibretIds) && targetHibretIds.length) {
      await prisma.announcementTarget.createMany({
        data: targetHibretIds.map((hibretId) => ({
          announcementId: created.id,
          hibretId,
        })),
        skipDuplicates: true,
      });
    }

    await logActivity(req, "announcement_created", "announcement", created.id, "Announcement created");

    res.status(201).json({ data: created });
  })
);

router.patch(
  "/announcements/:id",
  asyncHandler(async (req, res) => {
    if (!isWoreda(req.user)) throw createError(403, "Only Woreda Admin can update announcements");

    const announcement = await getAnnouncementOrThrow(req.params.id);
    if (announcement.status !== "draft") throw createError(400, "Only draft announcements can be edited");

    const updated = await prisma.announcement.update({
      where: { id: announcement.id },
      data: {
        title: req.body.title ?? announcement.title,
        description: req.body.description ?? announcement.description,
        type: req.body.type ?? announcement.type,
        deadline: req.body.deadline ? new Date(req.body.deadline) : announcement.deadline,
        allowAttendance:
          req.body.allowAttendance !== undefined ? Boolean(req.body.allowAttendance) : announcement.allowAttendance,
      },
    });

    if (Array.isArray(req.body.targetHibretIds)) {
      await prisma.announcementTarget.deleteMany({ where: { announcementId: announcement.id } });
      await prisma.announcementTarget.createMany({
        data: req.body.targetHibretIds.map((hibretId) => ({
          announcementId: announcement.id,
          hibretId,
        })),
        skipDuplicates: true,
      });
    }

    await logActivity(req, "announcement_updated", "announcement", announcement.id, "Announcement updated");

    res.json({ data: updated });
  })
);

router.patch(
  "/announcements/:id/publish",
  asyncHandler(async (req, res) => {
    if (!isWoreda(req.user)) throw createError(403, "Only Woreda Admin can publish announcements");

    const announcement = await getAnnouncementOrThrow(req.params.id);
    if (announcement.status !== "draft") throw createError(400, "Only draft announcements can be published");

    const targetCount = await prisma.announcementTarget.count({ where: { announcementId: announcement.id } });
    if (targetCount === 0) throw createError(400, "At least one target Hibret is required");

    const updated = await prisma.announcement.update({
      where: { id: announcement.id },
      data: { status: "published", publishedAt: new Date() },
    });

    await logActivity(req, "announcement_published", "announcement", announcement.id, "Announcement published");

    res.json({ data: updated });
  })
);

router.patch(
  "/announcements/:id/close",
  asyncHandler(async (req, res) => {
    if (!isWoreda(req.user)) throw createError(403, "Only Woreda Admin can close announcements");

    const announcement = await getAnnouncementOrThrow(req.params.id);
    if (announcement.status !== "published") throw createError(400, "Only published announcements can be closed");

    const updated = await prisma.announcement.update({
      where: { id: announcement.id },
      data: { status: "closed", closedAt: new Date() },
    });

    await logActivity(req, "announcement_closed", "announcement", announcement.id, "Announcement closed");

    res.json({ data: updated });
  })
);

router.post(
  "/announcements/:id/attachments",
  asyncHandler(async (req, res) => {
    if (!isWoreda(req.user)) throw createError(403, "Only Woreda Admin can attach files");

    const announcement = await getAnnouncementOrThrow(req.params.id);
    const fileAssetId = req.body.fileAssetId;
    if (!fileAssetId) throw createError(400, "fileAssetId is required");

    const created = await prisma.announcementAttachment.create({
      data: { announcementId: announcement.id, fileAssetId },
    });

    await logActivity(req, "announcement_attachment_added", "announcement", announcement.id, "Announcement attachment added");

    res.status(201).json({ data: created });
  })
);

/* =========================================================
   HIBRET RESPONSE TO WOREDA ANNOUNCEMENT
========================================================= */

router.get(
  "/announcements/:announcementId/hibret-response",
  asyncHandler(async (req, res) => {
    const announcement = await getAnnouncementOrThrow(req.params.announcementId);

    if (isHibret(req.user)) {
      const targeted = await isAnnouncementTargetedToHibret(announcement.id, req.user.hibretId);
      if (!targeted) throw createError(403, "Forbidden");

      const response = await prisma.hibretResponse.findUnique({
        where: {
          announcementId_hibretId: {
            announcementId: announcement.id,
            hibretId: req.user.hibretId,
          },
        },
      });

      return res.json({ data: response });
    }

    if (isWoreda(req.user)) {
      const where = { announcementId: announcement.id };
      if (req.query.hibretId) where.hibretId = String(req.query.hibretId);

      const { page, limit, skip } = getPagination(req);

      const [rows, total] = await Promise.all([
        prisma.hibretResponse.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }),
        prisma.hibretResponse.count({ where }),
      ]);

      return res.json(listResponse(rows, page, limit, total));
    }

    throw createError(403, "Forbidden");
  })
);

router.post(
  "/announcements/:announcementId/hibret-response",
  asyncHandler(async (req, res) => {
    const announcement = await getAnnouncementOrThrow(req.params.announcementId);
    if (!["published", "closed"].includes(announcement.status)) throw createError(400, "Announcement is not active");

    const existing = await assertHibretResponseEditable(announcement.id, req.user);
    if (existing) throw createError(400, "Response already exists. Use PATCH to update it.");

    const created = await prisma.hibretResponse.create({
      data: {
        announcementId: announcement.id,
        hibretId: req.user.hibretId,
        title: req.body.title || null,
        body: req.body.body || "",
        summary: req.body.summary || null,
        challenges: req.body.challenges || null,
      },
    });

    await logActivity(req, "hibret_response_created", "hibret_response", created.id, "Hibret response created");

    res.status(201).json({ data: created });
  })
);

router.patch(
  "/announcements/:announcementId/hibret-response",
  asyncHandler(async (req, res) => {
    const announcement = await getAnnouncementOrThrow(req.params.announcementId);
    const response = await assertHibretResponseEditable(announcement.id, req.user);
    if (!response) throw createError(404, "Response not found");

    const updated = await prisma.hibretResponse.update({
      where: { id: response.id },
      data: {
        title: req.body.title ?? response.title,
        body: req.body.body ?? response.body,
        summary: req.body.summary ?? response.summary,
        challenges: req.body.challenges ?? response.challenges,
      },
    });

    await logActivity(req, "hibret_response_updated", "hibret_response", response.id, "Hibret response updated");

    res.json({ data: updated });
  })
);

router.patch(
  "/announcements/:announcementId/hibret-response/submit",
  asyncHandler(async (req, res) => {
    const announcement = await getAnnouncementOrThrow(req.params.announcementId);
    const response = await assertHibretResponseEditable(announcement.id, req.user);
    if (!response) throw createError(404, "Response not found");

    const updated = await prisma.hibretResponse.update({
      where: { id: response.id },
      data: { status: "submitted", submittedAt: new Date() },
    });

    await logActivity(req, "hibret_response_submitted", "hibret_response", response.id, "Hibret response submitted");

    res.json({ data: updated });
  })
);

async function reviewHibretResponse(req, action, status) {
  if (!isWoreda(req.user)) throw createError(403, "Only Woreda Admin can review responses");

  const announcement = await getAnnouncementOrThrow(req.params.announcementId);
  const hibretId = req.body.hibretId;
  if (!hibretId) throw createError(400, "hibretId is required");

  const response = await prisma.hibretResponse.findUnique({
    where: {
      announcementId_hibretId: {
        announcementId: announcement.id,
        hibretId,
      },
    },
  });

  if (!response) throw createError(404, "Hibret response not found");
  if (response.status !== "submitted") throw createError(400, "Only submitted responses can be reviewed");

  const updated = await prisma.hibretResponse.update({
    where: { id: response.id },
    data: {
      status,
      reviewedAt: new Date(),
      reviewedByUserId: req.user.sub,
      reviewNote: req.body.reviewNote || null,
    },
  });

  await logActivity(req, action, "hibret_response", response.id, `Hibret response ${status}`);

  return updated;
}

router.patch(
  "/announcements/:announcementId/hibret-response/approve",
  asyncHandler(async (req, res) => {
    res.json({ data: await reviewHibretResponse(req, "hibret_response_approved", "approved") });
  })
);

router.patch(
  "/announcements/:announcementId/hibret-response/reject",
  asyncHandler(async (req, res) => {
    res.json({ data: await reviewHibretResponse(req, "hibret_response_rejected", "rejected") });
  })
);

router.patch(
  "/announcements/:announcementId/hibret-response/request-changes",
  asyncHandler(async (req, res) => {
    res.json({ data: await reviewHibretResponse(req, "hibret_response_changes_requested", "changes_requested") });
  })
);

router.post(
  "/announcements/:announcementId/hibret-response/attachments",
  asyncHandler(async (req, res) => {
    const announcement = await getAnnouncementOrThrow(req.params.announcementId);
    const response = await assertHibretResponseEditable(announcement.id, req.user);
    if (!response) throw createError(404, "Response not found");

    if (!req.body.fileAssetId) throw createError(400, "fileAssetId is required");

    const created = await prisma.hibretResponseAttachment.create({
      data: {
        hibretResponseId: response.id,
        fileAssetId: req.body.fileAssetId,
      },
    });

    await logActivity(req, "hibret_response_attachment_added", "hibret_response", response.id, "Hibret response attachment added");

    res.status(201).json({ data: created });
  })
);

/* =========================================================
   HIBRET ATTENDANCE FOR WOREDA TASK
========================================================= */

router.get(
  "/announcements/:announcementId/hibret-attendance",
  asyncHandler(async (req, res) => {
    const announcement = await getAnnouncementOrThrow(req.params.announcementId);
    const { page, limit, skip } = getPagination(req);

    const where = { announcementId: announcement.id };

    if (isHibret(req.user)) {
      const targeted = await isAnnouncementTargetedToHibret(announcement.id, req.user.hibretId);
      if (!targeted) throw createError(403, "Forbidden");
      where.hibretId = req.user.hibretId;
    } else if (isWoreda(req.user)) {
      if (req.query.hibretId) where.hibretId = String(req.query.hibretId);
    } else {
      throw createError(403, "Forbidden");
    }

    const [rows, total] = await Promise.all([
      prisma.hibretAttendance.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }),
      prisma.hibretAttendance.count({ where }),
    ]);

    res.json(listResponse(rows, page, limit, total));
  })
);

async function assertHibretAttendanceWritable(req, announcement) {
  if (!isHibret(req.user)) throw createError(403, "Only Hibret Admin can record Hibret attendance");
  if (!announcement.allowAttendance) throw createError(400, "Attendance is not allowed for this announcement");

  const targeted = await isAnnouncementTargetedToHibret(announcement.id, req.user.hibretId);
  if (!targeted) throw createError(403, "Announcement is not targeted to your Hibret");

  const response = await prisma.hibretResponse.findUnique({
    where: {
      announcementId_hibretId: {
        announcementId: announcement.id,
        hibretId: req.user.hibretId,
      },
    },
  });

  if (response && !["draft", "changes_requested"].includes(response.status)) {
    throw createError(400, "Attendance is locked after response submission");
  }
}

router.post(
  "/announcements/:announcementId/hibret-attendance",
  asyncHandler(async (req, res) => {
    const announcement = await getAnnouncementOrThrow(req.params.announcementId);
    await assertHibretAttendanceWritable(req, announcement);

    const member = await prisma.member.findUnique({ where: { id: req.body.memberId } });
    if (!member || member.hibretId !== req.user.hibretId) {
      throw createError(400, "Member is not under your Hibret");
    }

    const saved = await prisma.hibretAttendance.upsert({
      where: {
        announcementId_hibretId_memberId: {
          announcementId: announcement.id,
          hibretId: req.user.hibretId,
          memberId: member.id,
        },
      },
      update: {
        status: req.body.status,
        note: req.body.note || null,
        recordedByUserId: req.user.sub,
      },
      create: {
        announcementId: announcement.id,
        hibretId: req.user.hibretId,
        memberId: member.id,
        status: req.body.status,
        note: req.body.note || null,
        recordedByUserId: req.user.sub,
      },
    });

    await logActivity(req, "hibret_attendance_saved", "hibret_attendance", saved.id, "Hibret attendance saved");

    res.json({ data: saved });
  })
);

router.patch(
  "/announcements/:announcementId/hibret-attendance/bulk",
  asyncHandler(async (req, res) => {
    const announcement = await getAnnouncementOrThrow(req.params.announcementId);
    await assertHibretAttendanceWritable(req, announcement);

    const memberIds = Array.isArray(req.body.memberIds) ? req.body.memberIds : [];
    const status = req.body.status;
    if (!status) throw createError(400, "status is required");

    let saved = 0;

    for (const memberId of memberIds) {
      const member = await prisma.member.findUnique({ where: { id: memberId } });
      if (!member || member.hibretId !== req.user.hibretId) continue;

      await prisma.hibretAttendance.upsert({
        where: {
          announcementId_hibretId_memberId: {
            announcementId: announcement.id,
            hibretId: req.user.hibretId,
            memberId,
          },
        },
        update: {
          status,
          recordedByUserId: req.user.sub,
        },
        create: {
          announcementId: announcement.id,
          hibretId: req.user.hibretId,
          memberId,
          status,
          recordedByUserId: req.user.sub,
        },
      });
      saved++;
    }

    await logActivity(req, "hibret_attendance_bulk_saved", "announcement", announcement.id, "Hibret attendance bulk saved", {
      saved,
    });

    res.json({ data: { saved } });
  })
);

/* =========================================================
   HIBRET → FAMILY ASSIGNMENTS
========================================================= */

router.get(
  "/family-assignments/export",
  asyncHandler(async (req, res) => {
    const where = {};

    if (isHibret(req.user)) where.hibretId = req.user.hibretId;
    else if (isFamily(req.user)) where.familyId = req.user.familyId;
    else if (isMember(req.user)) throw createError(403, "Forbidden");

    if (req.query.status) where.status = String(req.query.status);
    if (req.query.familyId && isHibret(req.user)) where.familyId = String(req.query.familyId);

    const rows = await prisma.familyAssignment.findMany({ where, orderBy: { createdAt: "desc" } });
    sendCsv(res, "family-assignments.csv", rows);
  })
);

router.get(
  "/family-assignments",
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req);
    const where = {};

    if (isWoreda(req.user)) {
      where.id = "__none__";
    } else if (isHibret(req.user)) {
      where.hibretId = req.user.hibretId;
    } else if (isFamily(req.user)) {
      where.familyId = req.user.familyId;
      where.status = { in: ["published", "closed"] };
    } else {
      throw createError(403, "Forbidden");
    }

    if (req.query.search) Object.assign(where, buildSearchWhere(req.query.search, ["title", "description"]));
    if (req.query.status && !isFamily(req.user)) where.status = String(req.query.status);
    if (req.query.type) where.type = String(req.query.type);
    if (req.query.familyId && isHibret(req.user)) where.familyId = String(req.query.familyId);

    const [rows, total] = await Promise.all([
      prisma.familyAssignment.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }),
      prisma.familyAssignment.count({ where }),
    ]);

    res.json(listResponse(rows, page, limit, total));
  })
);

router.get(
  "/family-assignments/:id",
  asyncHandler(async (req, res) => {
    const assignment = await getFamilyAssignmentOrThrow(req.params.id);

    if (!assertFamilyAssignmentScope(req.user, assignment)) throw createError(403, "Forbidden");
    if (isWoreda(req.user)) throw createError(403, "Woreda does not manage Family Assignments");
    if (isFamily(req.user) && assignment.status === "draft") throw createError(403, "Forbidden");

    res.json({ data: assignment });
  })
);

router.post(
  "/family-assignments",
  asyncHandler(async (req, res) => {
    if (!isHibret(req.user)) throw createError(403, "Only Hibret Admin can create Family Assignments");

    const family = await prisma.family.findUnique({ where: { id: req.body.familyId } });
    if (!family || family.hibretId !== req.user.hibretId) throw createError(400, "Family is outside your Hibret");

    const created = await prisma.familyAssignment.create({
      data: {
        hibretId: req.user.hibretId,
        familyId: family.id,
        title: req.body.title,
        description: req.body.description || "",
        type: req.body.type || "other",
        deadline: req.body.deadline ? new Date(req.body.deadline) : null,
        allowAttendance: Boolean(req.body.allowAttendance),
        createdByUserId: req.user.sub,
      },
    });

    await logActivity(req, "family_assignment_created", "family_assignment", created.id, "Family assignment created");

    res.status(201).json({ data: created });
  })
);

router.patch(
  "/family-assignments/:id",
  asyncHandler(async (req, res) => {
    if (!isHibret(req.user)) throw createError(403, "Only Hibret Admin can update Family Assignments");

    const assignment = await getFamilyAssignmentOrThrow(req.params.id);
    if (assignment.hibretId !== req.user.hibretId) throw createError(403, "Forbidden");
    if (assignment.status !== "draft") throw createError(400, "Only draft assignments can be edited");

    const updated = await prisma.familyAssignment.update({
      where: { id: assignment.id },
      data: {
        title: req.body.title ?? assignment.title,
        description: req.body.description ?? assignment.description,
        type: req.body.type ?? assignment.type,
        deadline: req.body.deadline ? new Date(req.body.deadline) : assignment.deadline,
        allowAttendance:
          req.body.allowAttendance !== undefined ? Boolean(req.body.allowAttendance) : assignment.allowAttendance,
      },
    });

    await logActivity(req, "family_assignment_updated", "family_assignment", assignment.id, "Family assignment updated");

    res.json({ data: updated });
  })
);

router.patch(
  "/family-assignments/:id/publish",
  asyncHandler(async (req, res) => {
    if (!isHibret(req.user)) throw createError(403, "Only Hibret Admin can publish Family Assignments");

    const assignment = await getFamilyAssignmentOrThrow(req.params.id);
    if (assignment.hibretId !== req.user.hibretId) throw createError(403, "Forbidden");
    if (assignment.status !== "draft") throw createError(400, "Only draft assignments can be published");

    const updated = await prisma.familyAssignment.update({
      where: { id: assignment.id },
      data: { status: "published", publishedAt: new Date() },
    });

    await logActivity(req, "family_assignment_published", "family_assignment", assignment.id, "Family assignment published");

    res.json({ data: updated });
  })
);

router.patch(
  "/family-assignments/:id/close",
  asyncHandler(async (req, res) => {
    if (!isHibret(req.user)) throw createError(403, "Only Hibret Admin can close Family Assignments");

    const assignment = await getFamilyAssignmentOrThrow(req.params.id);
    if (assignment.hibretId !== req.user.hibretId) throw createError(403, "Forbidden");
    if (assignment.status !== "published") throw createError(400, "Only published assignments can be closed");

    const updated = await prisma.familyAssignment.update({
      where: { id: assignment.id },
      data: { status: "closed", closedAt: new Date() },
    });

    await logActivity(req, "family_assignment_closed", "family_assignment", assignment.id, "Family assignment closed");

    res.json({ data: updated });
  })
);

router.post(
  "/family-assignments/:id/attachments",
  asyncHandler(async (req, res) => {
    if (!isHibret(req.user)) throw createError(403, "Only Hibret Admin can attach files");

    const assignment = await getFamilyAssignmentOrThrow(req.params.id);
    if (assignment.hibretId !== req.user.hibretId) throw createError(403, "Forbidden");
    if (!req.body.fileAssetId) throw createError(400, "fileAssetId is required");

    const created = await prisma.familyAssignmentAttachment.create({
      data: {
        familyAssignmentId: assignment.id,
        fileAssetId: req.body.fileAssetId,
      },
    });

    await logActivity(req, "family_assignment_attachment_added", "family_assignment", assignment.id, "Family assignment attachment added");

    res.status(201).json({ data: created });
  })
);

/* =========================================================
   FAMILY RESPONSE + FAMILY ATTENDANCE
========================================================= */

router.get(
  "/family-assignments/:assignmentId/response",
  asyncHandler(async (req, res) => {
    const assignment = await getFamilyAssignmentOrThrow(req.params.assignmentId);
    if (!assertFamilyAssignmentScope(req.user, assignment)) throw createError(403, "Forbidden");

    const familyId = isFamily(req.user) ? req.user.familyId : assignment.familyId;
    const response = await getFamilyResponseForAssignment(assignment.id, familyId);

    res.json({ data: response });
  })
);

router.post(
  "/family-assignments/:assignmentId/response",
  asyncHandler(async (req, res) => {
    const assignment = await getFamilyAssignmentOrThrow(req.params.assignmentId);
    if (!isFamily(req.user) || assignment.familyId !== req.user.familyId) throw createError(403, "Only assigned Family can respond");
    if (assignment.status !== "published") throw createError(400, "Assignment is not published");

    const existing = await getFamilyResponseForAssignment(assignment.id, req.user.familyId);
    if (existing) throw createError(400, "Response already exists. Use PATCH to update.");

    const created = await prisma.familyResponse.create({
      data: {
        familyAssignmentId: assignment.id,
        familyId: req.user.familyId,
        body: req.body.body || "",
        summary: req.body.summary || null,
        challenges: req.body.challenges || null,
      },
    });

    await logActivity(req, "family_response_created", "family_response", created.id, "Family response created");

    res.status(201).json({ data: created });
  })
);

router.patch(
  "/family-assignments/:assignmentId/response",
  asyncHandler(async (req, res) => {
    const assignment = await getFamilyAssignmentOrThrow(req.params.assignmentId);
    if (!isFamily(req.user) || assignment.familyId !== req.user.familyId) throw createError(403, "Only assigned Family can update response");

    const response = await getFamilyResponseForAssignment(assignment.id, req.user.familyId);
    if (!response) throw createError(404, "Response not found");
    if (response.status !== "draft") throw createError(400, "Submitted response is locked");

    const updated = await prisma.familyResponse.update({
      where: { id: response.id },
      data: {
        body: req.body.body ?? response.body,
        summary: req.body.summary ?? response.summary,
        challenges: req.body.challenges ?? response.challenges,
      },
    });

    await logActivity(req, "family_response_updated", "family_response", response.id, "Family response updated");

    res.json({ data: updated });
  })
);

router.patch(
  "/family-assignments/:assignmentId/response/submit",
  asyncHandler(async (req, res) => {
    const assignment = await getFamilyAssignmentOrThrow(req.params.assignmentId);
    if (!isFamily(req.user) || assignment.familyId !== req.user.familyId) throw createError(403, "Only assigned Family can submit response");

    const response = await getFamilyResponseForAssignment(assignment.id, req.user.familyId);
    if (!response) throw createError(404, "Response not found");
    if (response.status !== "draft") throw createError(400, "Response is already submitted");

    const updated = await prisma.familyResponse.update({
      where: { id: response.id },
      data: { status: "submitted", submittedAt: new Date() },
    });

    await logActivity(req, "family_response_submitted", "family_response", response.id, "Family response submitted");

    res.json({ data: updated });
  })
);

router.post(
  "/family-assignments/:assignmentId/response/attachments",
  asyncHandler(async (req, res) => {
    const assignment = await getFamilyAssignmentOrThrow(req.params.assignmentId);
    if (!isFamily(req.user) || assignment.familyId !== req.user.familyId) throw createError(403, "Forbidden");

    const response = await getFamilyResponseForAssignment(assignment.id, req.user.familyId);
    if (!response) throw createError(404, "Response not found");
    if (response.status !== "draft") throw createError(400, "Submitted response is locked");
    if (!req.body.fileAssetId) throw createError(400, "fileAssetId is required");

    const created = await prisma.familyResponseAttachment.create({
      data: {
        familyResponseId: response.id,
        fileAssetId: req.body.fileAssetId,
      },
    });

    await logActivity(req, "family_response_attachment_added", "family_response", response.id, "Family response attachment added");

    res.status(201).json({ data: created });
  })
);

router.get(
  "/submissions",
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req);
    const where = {};

    if (isHibret(req.user)) {
      const assignments = await prisma.familyAssignment.findMany({
        where: { hibretId: req.user.hibretId },
        select: { id: true },
      });
      where.familyAssignmentId = { in: assignments.map((a) => a.id) };
    } else if (isFamily(req.user)) {
      where.familyId = req.user.familyId;
    } else if (isWoreda(req.user)) {
      where.id = "__none__";
    } else {
      throw createError(403, "Forbidden");
    }

    if (req.query.status) where.status = String(req.query.status);

    const [rows, total] = await Promise.all([
      prisma.familyResponse.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }),
      prisma.familyResponse.count({ where }),
    ]);

    res.json(listResponse(rows, page, limit, total));
  })
);

router.get(
  "/submissions/:id",
  asyncHandler(async (req, res) => {
    const response = await prisma.familyResponse.findUnique({ where: { id: req.params.id } });
    if (!response) throw createError(404, "Submission not found");

    const assignment = await prisma.familyAssignment.findUnique({ where: { id: response.familyAssignmentId } });
    if (!assignment || !assertFamilyAssignmentScope(req.user, assignment) || isWoreda(req.user)) {
      throw createError(403, "Forbidden");
    }

    res.json({ data: response });
  })
);

router.get(
  "/family-assignments/:assignmentId/attendance",
  asyncHandler(async (req, res) => {
    const assignment = await getFamilyAssignmentOrThrow(req.params.assignmentId);
    if (!assertFamilyAssignmentScope(req.user, assignment) || isWoreda(req.user)) throw createError(403, "Forbidden");

    const { page, limit, skip } = getPagination(req);
    const where = { familyAssignmentId: assignment.id };

    if (isFamily(req.user)) where.familyId = req.user.familyId;

    const [rows, total] = await Promise.all([
      prisma.familyAttendance.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }),
      prisma.familyAttendance.count({ where }),
    ]);

    res.json(listResponse(rows, page, limit, total));
  })
);

async function assertFamilyAttendanceWritable(req, assignment) {
  if (!isFamily(req.user) || assignment.familyId !== req.user.familyId) {
    throw createError(403, "Only assigned Family can record attendance");
  }

  if (!assignment.allowAttendance) throw createError(400, "Attendance is not allowed for this assignment");

  const response = await getFamilyResponseForAssignment(assignment.id, req.user.familyId);
  if (response && response.status === "submitted") throw createError(400, "Attendance is locked after response submission");
}

router.post(
  "/family-assignments/:assignmentId/attendance",
  asyncHandler(async (req, res) => {
    const assignment = await getFamilyAssignmentOrThrow(req.params.assignmentId);
    await assertFamilyAttendanceWritable(req, assignment);

    const member = await prisma.member.findUnique({ where: { id: req.body.memberId } });
    if (!member || member.familyId !== req.user.familyId) throw createError(400, "Member is not in your Family");

    const saved = await prisma.familyAttendance.upsert({
      where: {
        familyAssignmentId_familyId_memberId: {
          familyAssignmentId: assignment.id,
          familyId: req.user.familyId,
          memberId: member.id,
        },
      },
      update: {
        status: req.body.status,
        note: req.body.note || null,
        recordedByUserId: req.user.sub,
      },
      create: {
        familyAssignmentId: assignment.id,
        familyId: req.user.familyId,
        memberId: member.id,
        status: req.body.status,
        note: req.body.note || null,
        recordedByUserId: req.user.sub,
      },
    });

    await logActivity(req, "family_attendance_saved", "family_attendance", saved.id, "Family attendance saved");

    res.json({ data: saved });
  })
);

router.patch(
  "/family-assignments/:assignmentId/attendance/bulk",
  asyncHandler(async (req, res) => {
    const assignment = await getFamilyAssignmentOrThrow(req.params.assignmentId);
    await assertFamilyAttendanceWritable(req, assignment);

    const memberIds = Array.isArray(req.body.memberIds) ? req.body.memberIds : [];
    const status = req.body.status;
    if (!status) throw createError(400, "status is required");

    let saved = 0;

    for (const memberId of memberIds) {
      const member = await prisma.member.findUnique({ where: { id: memberId } });
      if (!member || member.familyId !== req.user.familyId) continue;

      await prisma.familyAttendance.upsert({
        where: {
          familyAssignmentId_familyId_memberId: {
            familyAssignmentId: assignment.id,
            familyId: req.user.familyId,
            memberId,
          },
        },
        update: {
          status,
          recordedByUserId: req.user.sub,
        },
        create: {
          familyAssignmentId: assignment.id,
          familyId: req.user.familyId,
          memberId,
          status,
          recordedByUserId: req.user.sub,
        },
      });

      saved++;
    }

    await logActivity(req, "family_attendance_bulk_saved", "family_assignment", assignment.id, "Family attendance bulk saved", {
      saved,
    });

    res.json({ data: { saved } });
  })
);

router.get("/health", (_req, res) => {
  res.json({ ok: true, module: "workflow" });
});

export default router;
