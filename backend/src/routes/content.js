import { Router } from "express";
import fs from "fs";
import path from "path";
import { prisma } from "../db.js";
import { requireAuth, upload } from "../middleware.js";
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

function sourceScopeWhere(user) {
  if (isWoreda(user)) return {};
  if (isHibret(user)) return { OR: [{ sourceType: "woreda" }, { sourceType: "hibret", hibretId: user.hibretId }] };
  if (isFamily(user)) return { OR: [{ sourceType: "woreda" }, { sourceType: "hibret", hibretId: user.hibretId }] };
  if (isMember(user)) return { OR: [{ sourceType: "woreda" }, { sourceType: "hibret", hibretId: user.hibretId }] };
  return { id: "__none__" };
}

function canManageSourceRecord(user, record) {
  if (isWoreda(user) && record.sourceType === "woreda") return true;
  if (isWoreda(user)) return true;
  if (isHibret(user) && record.sourceType === "hibret" && record.hibretId === user.hibretId) return true;
  return false;
}

async function getFileOrThrow(id) {
  const file = await prisma.fileAsset.findUnique({ where: { id } });
  if (!file || file.deletedAt) throw createError(404, "File not found");
  return file;
}

async function getFormOrThrow(id) {
  const form = await prisma.form.findUnique({ where: { id } });
  if (!form) throw createError(404, "Form not found");
  return form;
}

function canManageForm(user, form) {
  if (isWoreda(user) && form.sourceType === "woreda") return true;
  if (isWoreda(user)) return true;
  if (isHibret(user) && form.sourceType === "hibret" && form.hibretId === user.hibretId) return true;
  return false;
}

async function canSubmitForm(user, form) {
  if (form.status !== "published") return false;

  const targets = await prisma.formTarget.findMany({ where: { formId: form.id } });
  if (targets.length === 0) return false;

  return targets.some((target) => {
    if (target.role && target.role === user.role) return true;
    if (target.hibretId && target.hibretId === user.hibretId) return true;
    if (target.familyId && target.familyId === user.familyId) return true;
    if (target.memberId && target.memberId === user.memberId) return true;
    return false;
  });
}

function scopedBroadcastWhere(user) {
  if (isWoreda(user)) return {};

  const visibility = [{ status: "published", sourceType: "woreda" }];

  if (user.hibretId) {
    visibility.push({ status: "published", sourceType: "hibret", hibretId: user.hibretId });
  }

  return { OR: visibility };
}

/* =========================================================
   FILES
========================================================= */

router.post(
  "/files/upload",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw createError(400, "file is required");

    const created = await prisma.fileAsset.create({
      data: {
        originalName: req.file.originalname,
        fileName: req.file.filename,
        mimeType: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
        uploadedByUserId: req.user.sub,
      },
    });

    await logActivity(req, "file_uploaded", "file", created.id, "File uploaded");

    res.status(201).json({ data: created });
  })
);

router.get(
  "/files",
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req);
    const where = { deletedAt: null };
    if (!isWoreda(req.user)) where.uploadedByUserId = req.user.sub;

    const [rows, total] = await Promise.all([
      prisma.fileAsset.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }),
      prisma.fileAsset.count({ where }),
    ]);

    res.json(listResponse(rows, page, limit, total));
  })
);

router.get(
  "/files/:id/download",
  asyncHandler(async (req, res) => {
    const file = await getFileOrThrow(req.params.id);
    if (!isWoreda(req.user) && file.uploadedByUserId !== req.user.sub) {
      // Shared files are usually downloaded through resource/form/broadcast context later.
      // This basic file endpoint allows owner or Woreda only.
      throw createError(403, "Forbidden");
    }

    res.download(file.path, file.originalName);
  })
);

router.get(
  "/files/:id",
  asyncHandler(async (req, res) => {
    const file = await getFileOrThrow(req.params.id);
    if (!isWoreda(req.user) && file.uploadedByUserId !== req.user.sub) throw createError(403, "Forbidden");
    res.json({ data: file });
  })
);

router.delete(
  "/files/:id",
  asyncHandler(async (req, res) => {
    const file = await getFileOrThrow(req.params.id);
    if (!isWoreda(req.user) && file.uploadedByUserId !== req.user.sub) throw createError(403, "Forbidden");

    const updated = await prisma.fileAsset.update({
      where: { id: file.id },
      data: { deletedAt: new Date() },
    });

    await logActivity(req, "file_deleted", "file", file.id, "File deleted");

    res.json({ data: updated });
  })
);

/* =========================================================
   RESOURCES
========================================================= */

router.get(
  "/resources/export",
  asyncHandler(async (req, res) => {
    const where = { deletedAt: null, ...sourceScopeWhere(req.user) };
    if (req.query.sourceType) where.sourceType = String(req.query.sourceType);
    if (isWoreda(req.user) && req.query.hibretId) where.hibretId = String(req.query.hibretId);

    const rows = await prisma.resource.findMany({ where, orderBy: { createdAt: "desc" } });
    sendCsv(res, "resources.csv", rows);
  })
);

router.get(
  "/resources",
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req);
    const where = { deletedAt: null, ...sourceScopeWhere(req.user) };

    if (req.query.search) Object.assign(where, buildSearchWhere(req.query.search, ["title", "description"]));
    if (req.query.sourceType) where.sourceType = String(req.query.sourceType);
    if (isWoreda(req.user) && req.query.hibretId) where.hibretId = String(req.query.hibretId);

    const [rows, total] = await Promise.all([
      prisma.resource.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }),
      prisma.resource.count({ where }),
    ]);

    res.json(listResponse(rows, page, limit, total));
  })
);

router.get(
  "/resources/:id",
  asyncHandler(async (req, res) => {
    const resource = await prisma.resource.findUnique({ where: { id: req.params.id } });
    if (!resource || resource.deletedAt) throw createError(404, "Resource not found");

    if (!canManageSourceRecord(req.user, resource)) {
      const visible = resource.sourceType === "woreda" || (resource.sourceType === "hibret" && resource.hibretId === req.user.hibretId);
      if (!visible) throw createError(403, "Forbidden");
    }

    res.json({ data: resource });
  })
);

router.post(
  "/resources",
  asyncHandler(async (req, res) => {
    if (!isWoreda(req.user) && !isHibret(req.user)) throw createError(403, "Forbidden");

    const sourceType = isWoreda(req.user) ? req.body.sourceType || "woreda" : "hibret";
    const hibretId = sourceType === "hibret" ? (isHibret(req.user) ? req.user.hibretId : req.body.hibretId) : null;

    if (sourceType === "hibret" && !hibretId) throw createError(400, "hibretId is required for Hibret resource");
    if (!req.body.fileAssetId) throw createError(400, "fileAssetId is required");

    const created = await prisma.resource.create({
      data: {
        title: req.body.title,
        description: req.body.description || null,
        sourceType,
        hibretId,
        fileAssetId: req.body.fileAssetId,
        createdByUserId: req.user.sub,
      },
    });

    await logActivity(req, "resource_created", "resource", created.id, "Resource created");

    res.status(201).json({ data: created });
  })
);

router.patch(
  "/resources/:id",
  asyncHandler(async (req, res) => {
    const resource = await prisma.resource.findUnique({ where: { id: req.params.id } });
    if (!resource || resource.deletedAt) throw createError(404, "Resource not found");
    if (!canManageSourceRecord(req.user, resource)) throw createError(403, "Forbidden");

    const updated = await prisma.resource.update({
      where: { id: resource.id },
      data: {
        title: req.body.title ?? resource.title,
        description: req.body.description ?? resource.description,
      },
    });

    await logActivity(req, "resource_updated", "resource", resource.id, "Resource updated");

    res.json({ data: updated });
  })
);

router.delete(
  "/resources/:id",
  asyncHandler(async (req, res) => {
    const resource = await prisma.resource.findUnique({ where: { id: req.params.id } });
    if (!resource || resource.deletedAt) throw createError(404, "Resource not found");
    if (!canManageSourceRecord(req.user, resource)) throw createError(403, "Forbidden");

    const updated = await prisma.resource.update({ where: { id: resource.id }, data: { deletedAt: new Date() } });

    await logActivity(req, "resource_deleted", "resource", resource.id, "Resource deleted");

    res.json({ data: updated });
  })
);

/* =========================================================
   GALLERY
========================================================= */

router.get(
  "/gallery/export",
  asyncHandler(async (req, res) => {
    const where = { deletedAt: null };
    if (isHibret(req.user)) where.hibretId = req.user.hibretId;
    if (isFamily(req.user)) where.familyId = req.user.familyId;
    if (isMember(req.user)) where.OR = [{ hibretId: req.user.hibretId }, { familyId: req.user.familyId }];
    if (req.query.mediaType) where.mediaType = String(req.query.mediaType);

    const rows = await prisma.galleryItem.findMany({ where, orderBy: { createdAt: "desc" } });
    sendCsv(res, "gallery.csv", rows);
  })
);

router.get(
  "/gallery",
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req);
    const where = { deletedAt: null };

    if (isHibret(req.user)) where.hibretId = req.user.hibretId;
    if (isFamily(req.user)) where.familyId = req.user.familyId;
    if (isMember(req.user)) where.OR = [{ hibretId: req.user.hibretId }, { familyId: req.user.familyId }];
    if (req.query.search) Object.assign(where, buildSearchWhere(req.query.search, ["title", "description"]));
    if (req.query.mediaType) where.mediaType = String(req.query.mediaType);

    const [rows, total] = await Promise.all([
      prisma.galleryItem.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }),
      prisma.galleryItem.count({ where }),
    ]);

    res.json(listResponse(rows, page, limit, total));
  })
);

router.get(
  "/gallery/:id",
  asyncHandler(async (req, res) => {
    const item = await prisma.galleryItem.findUnique({ where: { id: req.params.id } });
    if (!item || item.deletedAt) throw createError(404, "Gallery item not found");

    if (isHibret(req.user) && item.hibretId !== req.user.hibretId) throw createError(403, "Forbidden");
    if (isFamily(req.user) && item.familyId !== req.user.familyId && item.hibretId !== req.user.hibretId) throw createError(403, "Forbidden");
    if (isMember(req.user) && item.familyId !== req.user.familyId && item.hibretId !== req.user.hibretId) throw createError(403, "Forbidden");

    res.json({ data: item });
  })
);

router.post(
  "/gallery",
  asyncHandler(async (req, res) => {
    if (!isWoreda(req.user) && !isHibret(req.user) && !isFamily(req.user)) throw createError(403, "Forbidden");
    if (!req.body.fileAssetId) throw createError(400, "fileAssetId is required");

    const sourceType = isWoreda(req.user) ? req.body.sourceType || "woreda" : isHibret(req.user) ? "hibret" : "family";

    const created = await prisma.galleryItem.create({
      data: {
        title: req.body.title,
        description: req.body.description || null,
        mediaType: req.body.mediaType || "other",
        fileAssetId: req.body.fileAssetId,
        sourceType,
        hibretId: isWoreda(req.user) ? req.body.hibretId || null : req.user.hibretId || null,
        familyId: isFamily(req.user) ? req.user.familyId : req.body.familyId || null,
        announcementId: req.body.announcementId || null,
        hibretResponseId: req.body.hibretResponseId || null,
        familyAssignmentId: req.body.familyAssignmentId || null,
        familyResponseId: req.body.familyResponseId || null,
        createdByUserId: req.user.sub,
      },
    });

    await logActivity(req, "gallery_item_created", "gallery", created.id, "Gallery item created");

    res.status(201).json({ data: created });
  })
);

router.delete(
  "/gallery/:id",
  asyncHandler(async (req, res) => {
    const item = await prisma.galleryItem.findUnique({ where: { id: req.params.id } });
    if (!item || item.deletedAt) throw createError(404, "Gallery item not found");

    if (!isWoreda(req.user) && item.createdByUserId !== req.user.sub) throw createError(403, "Forbidden");

    const updated = await prisma.galleryItem.update({ where: { id: item.id }, data: { deletedAt: new Date() } });

    await logActivity(req, "gallery_item_deleted", "gallery", item.id, "Gallery item deleted");

    res.json({ data: updated });
  })
);

/* =========================================================
   BROADCASTS
========================================================= */

router.get(
  "/broadcasts/export",
  asyncHandler(async (req, res) => {
    const where = scopedBroadcastWhere(req.user);
    if (req.query.status && (isWoreda(req.user) || isHibret(req.user))) where.status = String(req.query.status);
    const rows = await prisma.broadcast.findMany({ where, orderBy: { createdAt: "desc" } });
    sendCsv(res, "broadcasts.csv", rows);
  })
);

router.get(
  "/broadcasts",
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req);
    const where = scopedBroadcastWhere(req.user);

    if (req.query.search) Object.assign(where, buildSearchWhere(req.query.search, ["title", "body"]));
    if (req.query.status && (isWoreda(req.user) || isHibret(req.user))) where.status = String(req.query.status);
    if (req.query.sourceType) where.sourceType = String(req.query.sourceType);

    const [rows, total] = await Promise.all([
      prisma.broadcast.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }),
      prisma.broadcast.count({ where }),
    ]);

    res.json(listResponse(rows, page, limit, total));
  })
);

router.get(
  "/broadcasts/:id",
  asyncHandler(async (req, res) => {
    const broadcast = await prisma.broadcast.findUnique({ where: { id: req.params.id } });
    if (!broadcast) throw createError(404, "Broadcast not found");

    if (!canManageSourceRecord(req.user, broadcast)) {
      const visible = broadcast.status === "published" && (broadcast.sourceType === "woreda" || broadcast.hibretId === req.user.hibretId);
      if (!visible) throw createError(403, "Forbidden");
    }

    res.json({ data: broadcast });
  })
);

router.post(
  "/broadcasts",
  asyncHandler(async (req, res) => {
    if (!isWoreda(req.user) && !isHibret(req.user)) throw createError(403, "Forbidden");

    const sourceType = isWoreda(req.user) ? req.body.sourceType || "woreda" : "hibret";
    const hibretId = sourceType === "hibret" ? (isHibret(req.user) ? req.user.hibretId : req.body.hibretId) : null;

    const created = await prisma.broadcast.create({
      data: {
        title: req.body.title,
        body: req.body.body,
        sourceType,
        hibretId,
        targetType: req.body.targetType || "all",
        createdByUserId: req.user.sub,
      },
    });

    await logActivity(req, "broadcast_created", "broadcast", created.id, "Broadcast created");

    res.status(201).json({ data: created });
  })
);

router.patch(
  "/broadcasts/:id",
  asyncHandler(async (req, res) => {
    const broadcast = await prisma.broadcast.findUnique({ where: { id: req.params.id } });
    if (!broadcast) throw createError(404, "Broadcast not found");
    if (!canManageSourceRecord(req.user, broadcast)) throw createError(403, "Forbidden");
    if (broadcast.status !== "draft") throw createError(400, "Only draft broadcasts can be edited");

    const updated = await prisma.broadcast.update({
      where: { id: broadcast.id },
      data: {
        title: req.body.title ?? broadcast.title,
        body: req.body.body ?? broadcast.body,
        targetType: req.body.targetType ?? broadcast.targetType,
      },
    });

    await logActivity(req, "broadcast_updated", "broadcast", broadcast.id, "Broadcast updated");

    res.json({ data: updated });
  })
);

router.patch(
  "/broadcasts/:id/publish",
  asyncHandler(async (req, res) => {
    const broadcast = await prisma.broadcast.findUnique({ where: { id: req.params.id } });
    if (!broadcast) throw createError(404, "Broadcast not found");
    if (!canManageSourceRecord(req.user, broadcast)) throw createError(403, "Forbidden");
    if (broadcast.status !== "draft") throw createError(400, "Only draft broadcasts can be published");

    const updated = await prisma.broadcast.update({
      where: { id: broadcast.id },
      data: { status: "published", publishedAt: new Date() },
    });

    await logActivity(req, "broadcast_published", "broadcast", broadcast.id, "Broadcast published");

    res.json({ data: updated });
  })
);

router.patch(
  "/broadcasts/:id/archive",
  asyncHandler(async (req, res) => {
    const broadcast = await prisma.broadcast.findUnique({ where: { id: req.params.id } });
    if (!broadcast) throw createError(404, "Broadcast not found");
    if (!canManageSourceRecord(req.user, broadcast)) throw createError(403, "Forbidden");

    const updated = await prisma.broadcast.update({
      where: { id: broadcast.id },
      data: { status: "closed", archivedAt: new Date() },
    });

    await logActivity(req, "broadcast_archived", "broadcast", broadcast.id, "Broadcast archived");

    res.json({ data: updated });
  })
);

router.post(
  "/broadcasts/:id/attachments",
  asyncHandler(async (req, res) => {
    const broadcast = await prisma.broadcast.findUnique({ where: { id: req.params.id } });
    if (!broadcast) throw createError(404, "Broadcast not found");
    if (!canManageSourceRecord(req.user, broadcast)) throw createError(403, "Forbidden");
    if (!req.body.fileAssetId) throw createError(400, "fileAssetId is required");

    const created = await prisma.broadcastAttachment.create({
      data: { broadcastId: broadcast.id, fileAssetId: req.body.fileAssetId },
    });

    await logActivity(req, "broadcast_attachment_added", "broadcast", broadcast.id, "Broadcast attachment added");

    res.status(201).json({ data: created });
  })
);

/* =========================================================
   FORMS
========================================================= */

router.get(
  "/forms/export",
  asyncHandler(async (req, res) => {
    const where = sourceScopeWhere(req.user);
    if (req.query.status) where.status = String(req.query.status);
    const rows = await prisma.form.findMany({ where, orderBy: { createdAt: "desc" } });
    sendCsv(res, "forms.csv", rows);
  })
);

router.get(
  "/forms/:id/submissions/export",
  asyncHandler(async (req, res) => {
    const form = await getFormOrThrow(req.params.id);
    if (!canManageForm(req.user, form)) throw createError(403, "Forbidden");
    const rows = await prisma.formSubmission.findMany({ where: { formId: form.id }, orderBy: { createdAt: "desc" } });
    sendCsv(res, `form-${form.id}-submissions.csv`, rows);
  })
);

router.get(
  "/forms/:id/analytics",
  asyncHandler(async (req, res) => {
    const form = await getFormOrThrow(req.params.id);
    if (!canManageForm(req.user, form)) throw createError(403, "Forbidden");

    const [total, submitted] = await Promise.all([
      prisma.formSubmission.count({ where: { formId: form.id } }),
      prisma.formSubmission.count({ where: { formId: form.id, status: "submitted" } }),
    ]);

    res.json({
      data: {
        totalSubmissions: total,
        submitted,
        draft: total - submitted,
        submissionRate: total ? submitted / total : null,
      },
    });
  })
);

router.get(
  "/forms",
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req);
    const where = sourceScopeWhere(req.user);

    if (req.query.search) Object.assign(where, buildSearchWhere(req.query.search, ["title", "description"]));
    if (req.query.status) where.status = String(req.query.status);
    if (req.query.sourceType) where.sourceType = String(req.query.sourceType);

    const [rows, total] = await Promise.all([
      prisma.form.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }),
      prisma.form.count({ where }),
    ]);

    res.json(listResponse(rows, page, limit, total));
  })
);

router.get(
  "/forms/:id",
  asyncHandler(async (req, res) => {
    const form = await getFormOrThrow(req.params.id);
    const fields = await prisma.formField.findMany({ where: { formId: form.id }, orderBy: { order: "asc" } });
    const targets = await prisma.formTarget.findMany({ where: { formId: form.id } });

    if (!canManageForm(req.user, form)) {
      const allowed = await canSubmitForm(req.user, form);
      if (!allowed) throw createError(403, "Forbidden");
    }

    res.json({ data: { ...form, fields, targets } });
  })
);

router.post(
  "/forms",
  asyncHandler(async (req, res) => {
    if (!isWoreda(req.user) && !isHibret(req.user)) throw createError(403, "Forbidden");

    const sourceType = isWoreda(req.user) ? req.body.sourceType || "woreda" : "hibret";
    const hibretId = sourceType === "hibret" ? (isHibret(req.user) ? req.user.hibretId : req.body.hibretId) : null;

    const created = await prisma.form.create({
      data: {
        title: req.body.title,
        description: req.body.description || null,
        sourceType,
        hibretId,
        deadline: req.body.deadline ? new Date(req.body.deadline) : null,
        createdByUserId: req.user.sub,
      },
    });

    await logActivity(req, "form_created", "form", created.id, "Form created");

    res.status(201).json({ data: created });
  })
);

router.patch(
  "/forms/:id",
  asyncHandler(async (req, res) => {
    const form = await getFormOrThrow(req.params.id);
    if (!canManageForm(req.user, form)) throw createError(403, "Forbidden");
    if (form.status !== "draft") throw createError(400, "Only draft forms can be edited");

    const updated = await prisma.form.update({
      where: { id: form.id },
      data: {
        title: req.body.title ?? form.title,
        description: req.body.description ?? form.description,
        deadline: req.body.deadline ? new Date(req.body.deadline) : form.deadline,
      },
    });

    await logActivity(req, "form_updated", "form", form.id, "Form updated");

    res.json({ data: updated });
  })
);

router.patch(
  "/forms/:id/publish",
  asyncHandler(async (req, res) => {
    const form = await getFormOrThrow(req.params.id);
    if (!canManageForm(req.user, form)) throw createError(403, "Forbidden");
    if (form.status !== "draft") throw createError(400, "Only draft forms can be published");

    const updated = await prisma.form.update({
      where: { id: form.id },
      data: { status: "published", publishedAt: new Date() },
    });

    await logActivity(req, "form_published", "form", form.id, "Form published");

    res.json({ data: updated });
  })
);

router.patch(
  "/forms/:id/close",
  asyncHandler(async (req, res) => {
    const form = await getFormOrThrow(req.params.id);
    if (!canManageForm(req.user, form)) throw createError(403, "Forbidden");
    if (form.status !== "published") throw createError(400, "Only published forms can be closed");

    const updated = await prisma.form.update({
      where: { id: form.id },
      data: { status: "closed", closedAt: new Date() },
    });

    await logActivity(req, "form_closed", "form", form.id, "Form closed");

    res.json({ data: updated });
  })
);

router.post(
  "/forms/:id/fields",
  asyncHandler(async (req, res) => {
    const form = await getFormOrThrow(req.params.id);
    if (!canManageForm(req.user, form)) throw createError(403, "Forbidden");
    if (form.status !== "draft") throw createError(400, "Only draft forms can be edited");

    const created = await prisma.formField.create({
      data: {
        formId: form.id,
        label: req.body.label,
        type: req.body.type,
        required: Boolean(req.body.required),
        options: req.body.options || null,
        order: Number(req.body.order || 0),
      },
    });

    await logActivity(req, "form_field_created", "form", form.id, "Form field created");

    res.status(201).json({ data: created });
  })
);

router.patch(
  "/forms/:id/fields/:fieldId",
  asyncHandler(async (req, res) => {
    const form = await getFormOrThrow(req.params.id);
    if (!canManageForm(req.user, form)) throw createError(403, "Forbidden");
    if (form.status !== "draft") throw createError(400, "Only draft forms can be edited");

    const field = await prisma.formField.findUnique({ where: { id: req.params.fieldId } });
    if (!field || field.formId !== form.id) throw createError(404, "Field not found");

    const updated = await prisma.formField.update({
      where: { id: field.id },
      data: {
        label: req.body.label ?? field.label,
        type: req.body.type ?? field.type,
        required: req.body.required !== undefined ? Boolean(req.body.required) : field.required,
        options: req.body.options ?? field.options,
        order: req.body.order !== undefined ? Number(req.body.order) : field.order,
      },
    });

    res.json({ data: updated });
  })
);

router.delete(
  "/forms/:id/fields/:fieldId",
  asyncHandler(async (req, res) => {
    const form = await getFormOrThrow(req.params.id);
    if (!canManageForm(req.user, form)) throw createError(403, "Forbidden");
    if (form.status !== "draft") throw createError(400, "Only draft forms can be edited");

    const field = await prisma.formField.findUnique({ where: { id: req.params.fieldId } });
    if (!field || field.formId !== form.id) throw createError(404, "Field not found");

    await prisma.formField.delete({ where: { id: field.id } });

    res.json({ message: "Field deleted" });
  })
);

router.post(
  "/forms/:id/targets",
  asyncHandler(async (req, res) => {
    const form = await getFormOrThrow(req.params.id);
    if (!canManageForm(req.user, form)) throw createError(403, "Forbidden");
    if (form.status !== "draft") throw createError(400, "Only draft forms can be targeted");

    const targets = Array.isArray(req.body.targets) ? req.body.targets : [];
    await prisma.formTarget.deleteMany({ where: { formId: form.id } });

    if (targets.length) {
      await prisma.formTarget.createMany({
        data: targets.map((target) => ({
          formId: form.id,
          targetType: target.targetType,
          role: target.role || null,
          hibretId: target.hibretId || null,
          familyId: target.familyId || null,
          memberId: target.memberId || null,
        })),
      });
    }

    await logActivity(req, "form_targets_set", "form", form.id, "Form targets set", { count: targets.length });

    res.json({ message: "Targets saved" });
  })
);

router.get(
  "/forms/:id/submissions",
  asyncHandler(async (req, res) => {
    const form = await getFormOrThrow(req.params.id);
    if (!canManageForm(req.user, form)) throw createError(403, "Forbidden");

    const { page, limit, skip } = getPagination(req);
    const where = { formId: form.id };
    if (req.query.status) where.status = String(req.query.status);

    const [rows, total] = await Promise.all([
      prisma.formSubmission.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }),
      prisma.formSubmission.count({ where }),
    ]);

    res.json(listResponse(rows, page, limit, total));
  })
);

router.get(
  "/forms/:id/submissions/:submissionId",
  asyncHandler(async (req, res) => {
    const submission = await prisma.formSubmission.findUnique({ where: { id: req.params.submissionId } });
    if (!submission || submission.formId !== req.params.id) throw createError(404, "Submission not found");

    const form = await getFormOrThrow(req.params.id);
    const owner = submission.submittedByUserId === req.user.sub;
    if (!owner && !canManageForm(req.user, form)) throw createError(403, "Forbidden");

    const answers = await prisma.formAnswer.findMany({ where: { submissionId: submission.id } });
    res.json({ data: { ...submission, answers } });
  })
);

router.post(
  "/forms/:id/submissions",
  asyncHandler(async (req, res) => {
    const form = await getFormOrThrow(req.params.id);
    const allowed = await canSubmitForm(req.user, form);
    if (!allowed) throw createError(403, "You are not targeted for this form");

    const created = await prisma.formSubmission.create({
      data: {
        formId: form.id,
        submittedByUserId: req.user.sub,
        memberId: req.user.memberId || null,
        familyId: req.user.familyId || null,
      },
    });

    await logActivity(req, "form_submission_created", "form_submission", created.id, "Form submission created");

    res.status(201).json({ data: created });
  })
);

router.patch(
  "/forms/:id/submissions/:submissionId",
  asyncHandler(async (req, res) => {
    const submission = await prisma.formSubmission.findUnique({ where: { id: req.params.submissionId } });
    if (!submission || submission.formId !== req.params.id) throw createError(404, "Submission not found");
    if (submission.submittedByUserId !== req.user.sub) throw createError(403, "Forbidden");
    if (submission.status !== "draft") throw createError(400, "Submitted form is locked");

    const form = await getFormOrThrow(req.params.id);
    const fields = await prisma.formField.findMany({ where: { formId: form.id } });
    const answers = Array.isArray(req.body.answers) ? req.body.answers : [];

    for (const field of fields) {
      const answer = answers.find((a) => a.fieldId === field.id);
      if (field.required && (!answer || (answer.value === undefined && !answer.fileAssetId))) {
        throw createError(400, `Required field missing: ${field.label}`);
      }
      if (field.type === "file" && answer && !answer.fileAssetId) {
        throw createError(400, `File field requires fileAssetId: ${field.label}`);
      }
    }

    await prisma.formAnswer.deleteMany({ where: { submissionId: submission.id } });

    if (answers.length) {
      await prisma.formAnswer.createMany({
        data: answers.map((answer) => ({
          submissionId: submission.id,
          fieldId: answer.fieldId,
          value: answer.value === undefined ? null : answer.value,
          fileAssetId: answer.fileAssetId || null,
        })),
      });
    }

    await logActivity(req, "form_submission_updated", "form_submission", submission.id, "Form submission updated");

    res.json({ message: "Submission saved" });
  })
);

router.patch(
  "/forms/:id/submissions/:submissionId/submit",
  asyncHandler(async (req, res) => {
    const submission = await prisma.formSubmission.findUnique({ where: { id: req.params.submissionId } });
    if (!submission || submission.formId !== req.params.id) throw createError(404, "Submission not found");
    if (submission.submittedByUserId !== req.user.sub) throw createError(403, "Forbidden");
    if (submission.status !== "draft") throw createError(400, "Submission is already submitted");

    const updated = await prisma.formSubmission.update({
      where: { id: submission.id },
      data: { status: "submitted", submittedAt: new Date() },
    });

    await logActivity(req, "form_submission_submitted", "form_submission", submission.id, "Form submission submitted");

    res.json({ data: updated });
  })
);

/* =========================================================
   CHAT
========================================================= */

router.get(
  "/chat/threads/export",
  asyncHandler(async (req, res) => {
    const participantRows = await prisma.chatParticipant.findMany({ where: { userId: req.user.sub }, select: { threadId: true } });
    const threadIds = participantRows.map((p) => p.threadId);
    const rows = await prisma.chatThread.findMany({ where: { id: { in: threadIds } }, orderBy: { updatedAt: "desc" } });
    sendCsv(res, "chat-threads.csv", rows);
  })
);

router.get(
  "/chat/threads",
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req);
    const participantRows = await prisma.chatParticipant.findMany({ where: { userId: req.user.sub }, select: { threadId: true } });
    const threadIds = participantRows.map((p) => p.threadId);

    const [rows, total] = await Promise.all([
      prisma.chatThread.findMany({ where: { id: { in: threadIds } }, skip, take: limit, orderBy: { updatedAt: "desc" } }),
      prisma.chatThread.count({ where: { id: { in: threadIds } } }),
    ]);

    res.json(listResponse(rows, page, limit, total));
  })
);

async function canChatWith(user, participantIds) {
  const users = await prisma.user.findMany({ where: { id: { in: participantIds } } });
  if (users.length !== participantIds.length) return false;

  if (isWoreda(user)) {
    return users.every((u) => ["woreda_admin", "hibret_admin"].includes(u.role));
  }

  if (isHibret(user)) {
    return users.every((u) => {
      if (u.role === "woreda_admin") return true;
      if (u.role === "family_admin" && u.hibretId === user.hibretId) return true;
      return u.id === user.sub;
    });
  }

  return users.some((u) => u.id === user.sub);
}

router.post(
  "/chat/threads",
  asyncHandler(async (req, res) => {
    const participantIds = Array.from(new Set([req.user.sub, ...(Array.isArray(req.body.participantIds) ? req.body.participantIds : [])]));

    if (!(await canChatWith(req.user, participantIds))) throw createError(403, "One or more participants are outside your chat scope");

    const thread = await prisma.chatThread.create({
      data: {
        title: req.body.title || null,
        createdByUserId: req.user.sub,
      },
    });

    await prisma.chatParticipant.createMany({
      data: participantIds.map((userId) => ({ threadId: thread.id, userId })),
      skipDuplicates: true,
    });

    await logActivity(req, "chat_thread_created", "chat_thread", thread.id, "Chat thread created");

    res.status(201).json({ data: thread });
  })
);

async function assertThreadParticipant(userId, threadId) {
  const participant = await prisma.chatParticipant.findUnique({
    where: { threadId_userId: { threadId, userId } },
  });
  if (!participant) throw createError(403, "Forbidden");
  return participant;
}

router.get(
  "/chat/threads/:id",
  asyncHandler(async (req, res) => {
    await assertThreadParticipant(req.user.sub, req.params.id);
    const thread = await prisma.chatThread.findUnique({ where: { id: req.params.id } });
    const participants = await prisma.chatParticipant.findMany({ where: { threadId: req.params.id } });
    res.json({ data: { ...thread, participants } });
  })
);

router.get(
  "/chat/threads/:id/messages",
  asyncHandler(async (req, res) => {
    await assertThreadParticipant(req.user.sub, req.params.id);
    const { page, limit, skip } = getPagination(req);

    const [rows, total] = await Promise.all([
      prisma.chatMessage.findMany({ where: { threadId: req.params.id }, skip, take: limit, orderBy: { createdAt: "asc" } }),
      prisma.chatMessage.count({ where: { threadId: req.params.id } }),
    ]);

    res.json(listResponse(rows, page, limit, total));
  })
);

router.post(
  "/chat/threads/:id/messages",
  asyncHandler(async (req, res) => {
    await assertThreadParticipant(req.user.sub, req.params.id);

    const message = await prisma.chatMessage.create({
      data: {
        threadId: req.params.id,
        senderUserId: req.user.sub,
        body: req.body.body,
        fileAssetId: req.body.fileAssetId || null,
      },
    });

    await prisma.chatThread.update({ where: { id: req.params.id }, data: { updatedAt: new Date() } });

    await logActivity(req, "chat_message_sent", "chat_thread", req.params.id, "Chat message sent");

    res.status(201).json({ data: message });
  })
);

router.patch(
  "/chat/threads/:id/read",
  asyncHandler(async (req, res) => {
    await assertThreadParticipant(req.user.sub, req.params.id);

    const updated = await prisma.chatParticipant.update({
      where: { threadId_userId: { threadId: req.params.id, userId: req.user.sub } },
      data: { lastReadAt: new Date() },
    });

    res.json({ data: updated });
  })
);

/* =========================================================
   ACTIVITY
========================================================= */

router.get(
  "/activity/export",
  asyncHandler(async (req, res) => {
    if (!isWoreda(req.user) && !isHibret(req.user) && !isFamily(req.user)) throw createError(403, "Forbidden");

    const where = {};
    if (!isWoreda(req.user)) {
      where.OR = [
        { actorUserId: req.user.sub },
        { metadata: { path: ["hibretId"], equals: req.user.hibretId || "" } },
        { metadata: { path: ["familyId"], equals: req.user.familyId || "" } },
      ];
    }
    if (req.query.operation) where.operation = String(req.query.operation);
    if (req.query.targetType) where.targetType = String(req.query.targetType);

    const rows = await prisma.activityLog.findMany({ where, orderBy: { createdAt: "desc" } });
    sendCsv(res, "activity.csv", rows);
  })
);

router.get(
  "/activity",
  asyncHandler(async (req, res) => {
    if (!isWoreda(req.user) && !isHibret(req.user) && !isFamily(req.user)) throw createError(403, "Forbidden");

    const { page, limit, skip } = getPagination(req);
    const where = {};

    if (!isWoreda(req.user)) {
      where.OR = [
        { actorUserId: req.user.sub },
        { metadata: { path: ["hibretId"], equals: req.user.hibretId || "" } },
        { metadata: { path: ["familyId"], equals: req.user.familyId || "" } },
      ];
    }

    if (req.query.operation) where.operation = String(req.query.operation);
    if (req.query.targetType) where.targetType = String(req.query.targetType);

    const [rows, total] = await Promise.all([
      prisma.activityLog.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }),
      prisma.activityLog.count({ where }),
    ]);

    res.json(listResponse(rows, page, limit, total));
  })
);

router.get(
  "/activity/admin/:adminUserId",
  asyncHandler(async (req, res) => {
    if (!isWoreda(req.user)) throw createError(403, "Forbidden");
    const { page, limit, skip } = getPagination(req);
    const where = { actorUserId: req.params.adminUserId };

    const [rows, total] = await Promise.all([
      prisma.activityLog.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }),
      prisma.activityLog.count({ where }),
    ]);

    res.json(listResponse(rows, page, limit, total));
  })
);

router.get("/health", (_req, res) => {
  res.json({ ok: true, module: "content" });
});

export default router;
