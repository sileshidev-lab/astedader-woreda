import { Router } from "express";
import { prisma } from "../db.js";
import { sendSetupEmail } from "../email.js";
import { requireAuth } from "../middleware.js";
import {
  asyncHandler,
  buildSearchWhere,
  createError,
  getPagination,
  hashToken,
  listResponse,
  logActivity,
  randomToken,
  sanitizeUser,
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

function canManageMember(user, member) {
  if (isWoreda(user)) return true;
  if (isHibret(user)) return member.hibretId === user.hibretId;
  return false;
}

function memberScopeWhere(user) {
  if (isWoreda(user)) return {};
  if (isHibret(user)) return { hibretId: user.hibretId };
  if (isFamily(user)) return { familyId: user.familyId };
  if (isMember(user)) return { id: user.memberId };
  return { id: "__none__" };
}

function familyScopeWhere(user) {
  if (isWoreda(user)) return {};
  if (isHibret(user)) return { hibretId: user.hibretId };
  if (isFamily(user)) return { id: user.familyId };
  return { id: "__none__" };
}

function adminScopeWhere(user) {
  if (!isWoreda(user)) return { id: "__none__" };
  return { role: { in: ["woreda_admin", "hibret_admin", "family_admin"] } };
}

function presentUniqueMemberFilters(row) {
  const or = [];
  if (row.memberCode) or.push({ memberCode: row.memberCode });
  if (row.fanId) or.push({ fanId: row.fanId });
  if (row.ppId) or.push({ ppId: row.ppId });
  return or;
}

async function createSetupTokenForUser(userId) {
  const plain = randomToken();
  await prisma.setupToken.create({
    data: {
      userId,
      tokenHash: hashToken(plain),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    },
  });
  return plain;
}

async function validateMemberImportRows(rows, user) {
  const valid = [];
  const invalid = [];
  let duplicateRows = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] || {};
    const errors = [];

    if (!row.firstName) errors.push("firstName is required");
    if (!row.fatherName) errors.push("fatherName is required");
    if (!row.gender) errors.push("gender is required");

    const hibretId = isHibret(user) ? user.hibretId : row.hibretId;
    if (!hibretId) errors.push("hibretId is required");

    const hibret = hibretId ? await prisma.hibret.findUnique({ where: { id: hibretId } }) : null;
    if (hibretId && !hibret) errors.push("hibret does not exist");

    if (isHibret(user) && hibretId !== user.hibretId) {
      errors.push("hibret is outside your scope");
    }

    if (row.familyId) {
      const family = await prisma.family.findUnique({ where: { id: row.familyId } });
      if (!family) errors.push("family does not exist");
      else if (family.hibretId !== hibretId) errors.push("family does not belong to selected hibret");
    }

    const uniqueFilters = presentUniqueMemberFilters(row);
    if (uniqueFilters.length) {
      const duplicate = await prisma.member.findFirst({ where: { OR: uniqueFilters } });
      if (duplicate) {
        duplicateRows++;
        errors.push("duplicate memberCode, fanId, or ppId");
      }
    }

    const normalized = {
      ...row,
      hibretId,
      membershipYear: row.membershipYear ? Number(row.membershipYear) : undefined,
      workExperienceYears: row.workExperienceYears ? Number(row.workExperienceYears) : undefined,
      profileCompletion: row.profileCompletion ? Number(row.profileCompletion) : undefined,
    };

    if (errors.length) invalid.push({ row: i + 1, data: row, errors });
    else valid.push(normalized);
  }

  return { validRows: valid, invalidRows: invalid, duplicateRows };
}

/* =========================================================
   ADMINS
========================================================= */

router.get(
  "/admins",
  asyncHandler(async (req, res) => {
    if (!isWoreda(req.user)) throw createError(403, "Forbidden");

    const { page, limit, skip } = getPagination(req);
    const where = adminScopeWhere(req.user);

    if (req.query.search) {
      Object.assign(where, buildSearchWhere(req.query.search, ["email"]));
    }
    if (req.query.role) where.role = req.query.role;
    if (req.query.status) where.status = req.query.status;

    const [rows, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count({ where }),
    ]);

    res.json(listResponse(rows.map(sanitizeUser), page, limit, total));
  })
);

router.get(
  "/admins/export",
  asyncHandler(async (req, res) => {
    if (!isWoreda(req.user)) throw createError(403, "Forbidden");

    const where = adminScopeWhere(req.user);
    if (req.query.role) where.role = req.query.role;
    if (req.query.status) where.status = req.query.status;

    const rows = await prisma.user.findMany({ where, orderBy: { createdAt: "desc" } });
    sendCsv(res, "admins.csv", rows.map(sanitizeUser));
  })
);

router.get(
  "/admins/:id",
  asyncHandler(async (req, res) => {
    if (!isWoreda(req.user)) throw createError(403, "Forbidden");

    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) throw createError(404, "Admin not found");

    res.json({ data: sanitizeUser(user) });
  })
);

router.post(
  "/admins",
  asyncHandler(async (req, res) => {
    if (!isWoreda(req.user)) throw createError(403, "Forbidden");

    const { email, role, privileges = [], hibretId, familyId } = req.body;

    if (!["woreda_admin", "hibret_admin", "family_admin"].includes(role)) {
      throw createError(400, "Invalid admin role");
    }

    let data = {
      email,
      role,
      privileges,
      status: "pending_setup",
      passwordHash: null,
      hibretId: null,
      familyId: null,
      memberId: null,
    };

    if (role === "hibret_admin") {
      if (!hibretId) throw createError(400, "hibretId is required for hibret_admin");
      const hibret = await prisma.hibret.findUnique({ where: { id: hibretId } });
      if (!hibret) throw createError(400, "Hibret not found");
      data.hibretId = hibretId;
    }

    if (role === "family_admin") {
      if (!familyId) throw createError(400, "familyId is required for family_admin");
      const family = await prisma.family.findUnique({ where: { id: familyId } });
      if (!family) throw createError(400, "Family not found");
      data.familyId = familyId;
      data.hibretId = family.hibretId;
    }

    const created = await prisma.user.create({ data });
    const setupToken = await createSetupTokenForUser(created.id);

    await logActivity(req, "admin_created", "user", created.id, "Admin account created", {
      role,
      email,
    });

    const emailResult = await sendSetupEmail({ to: email, token: setupToken });
    console.log(`Setup email sent to ${email}`);

    res.status(201).json({
      data: sanitizeUser(created),
      message: "Setup email sent",
    });
  })
);

router.patch(
  "/admins/:id",
  asyncHandler(async (req, res) => {
    if (!isWoreda(req.user)) throw createError(403, "Forbidden");

    const allowed = {};
    for (const key of ["email", "role", "status", "privileges", "hibretId", "familyId"]) {
      if (req.body[key] !== undefined) allowed[key] = req.body[key];
    }

    if (allowed.role === "woreda_admin") {
      allowed.hibretId = null;
      allowed.familyId = null;
      allowed.memberId = null;
    }

    if (allowed.role === "family_admin" && allowed.familyId) {
      const family = await prisma.family.findUnique({ where: { id: allowed.familyId } });
      if (!family) throw createError(400, "Family not found");
      allowed.hibretId = family.hibretId;
    }

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: allowed,
    });

    await logActivity(req, "admin_updated", "user", updated.id, "Admin account updated");

    res.json({ data: sanitizeUser(updated) });
  })
);

router.patch(
  "/admins/:id/suspend",
  asyncHandler(async (req, res) => {
    if (!isWoreda(req.user)) throw createError(403, "Forbidden");

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { status: "suspended" },
    });

    await logActivity(req, "admin_suspended", "user", updated.id, "Admin account suspended");

    res.json({ data: sanitizeUser(updated) });
  })
);

router.patch(
  "/admins/:id/reactivate",
  asyncHandler(async (req, res) => {
    if (!isWoreda(req.user)) throw createError(403, "Forbidden");

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { status: "active" },
    });

    await logActivity(req, "admin_reactivated", "user", updated.id, "Admin account reactivated");

    res.json({ data: sanitizeUser(updated) });
  })
);

router.post(
  "/admins/:id/resend-setup-link",
  asyncHandler(async (req, res) => {
    if (!isWoreda(req.user)) throw createError(403, "Forbidden");

    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) throw createError(404, "Admin not found");

    const setupToken = await createSetupTokenForUser(user.id);

    await logActivity(req, "admin_setup_link_resent", "user", user.id, "Admin setup link resent");

    const emailResult = await sendSetupEmail({ to: user.email, token: setupToken });
    console.log(`Setup email sent to ${user.email}`);

    res.json({ message: "Setup email sent" });
  })
);

/* =========================================================
   HIBRETS
========================================================= */

router.get(
  "/hibrets",
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req);
    const where = {};

    if (isHibret(req.user)) where.id = req.user.hibretId;
    if (isFamily(req.user) || isMember(req.user)) where.id = req.user.hibretId || "__none__";
    if (req.query.search) Object.assign(where, buildSearchWhere(req.query.search, ["name"]));

    const [rows, total] = await Promise.all([
      prisma.hibret.findMany({ where, skip, take: limit, orderBy: { name: "asc" } }),
      prisma.hibret.count({ where }),
    ]);

    res.json(listResponse(rows, page, limit, total));
  })
);

router.get(
  "/hibrets/export",
  asyncHandler(async (req, res) => {
    if (!isWoreda(req.user)) throw createError(403, "Forbidden");

    const where = {};
    if (req.query.search) Object.assign(where, buildSearchWhere(req.query.search, ["name"]));
    const rows = await prisma.hibret.findMany({ where, orderBy: { name: "asc" } });
    sendCsv(res, "hibrets.csv", rows);
  })
);

router.get(
  "/hibrets/:id/administrative",
  asyncHandler(async (req, res) => {
    if (isHibret(req.user) && req.user.hibretId !== req.params.id) throw createError(403, "Forbidden");
    if ((isFamily(req.user) || isMember(req.user)) && req.user.hibretId !== req.params.id) throw createError(403, "Forbidden");

    const hibret = await prisma.hibret.findUnique({ where: { id: req.params.id } });
    if (!hibret) throw createError(404, "Hibret not found");

    const [familyCount, memberCount, adminCount] = await Promise.all([
      prisma.family.count({ where: { hibretId: req.params.id } }),
      prisma.member.count({ where: { hibretId: req.params.id } }),
      prisma.user.count({ where: { hibretId: req.params.id, role: "hibret_admin" } }),
    ]);

    res.json({
      data: {
        hibret,
        familyCount,
        memberCount,
        adminCount,
      },
    });
  })
);

router.get(
  "/hibrets/:id",
  asyncHandler(async (req, res) => {
    if (isHibret(req.user) && req.user.hibretId !== req.params.id) throw createError(403, "Forbidden");
    if ((isFamily(req.user) || isMember(req.user)) && req.user.hibretId !== req.params.id) throw createError(403, "Forbidden");

    const hibret = await prisma.hibret.findUnique({ where: { id: req.params.id } });
    if (!hibret) throw createError(404, "Hibret not found");

    res.json({ data: hibret });
  })
);

router.post(
  "/hibrets",
  asyncHandler(async (req, res) => {
    if (!isWoreda(req.user)) throw createError(403, "Only Woreda Admin can create Hibrets");

    const created = await prisma.hibret.create({ data: { name: req.body.name } });

    await logActivity(req, "hibret_created", "hibret", created.id, "Hibret created");

    res.status(201).json({ data: created });
  })
);

router.patch(
  "/hibrets/:id",
  asyncHandler(async (req, res) => {
    if (!isWoreda(req.user)) throw createError(403, "Only Woreda Admin can update Hibrets");

    const updated = await prisma.hibret.update({
      where: { id: req.params.id },
      data: { name: req.body.name },
    });

    await logActivity(req, "hibret_updated", "hibret", updated.id, "Hibret updated");

    res.json({ data: updated });
  })
);

/* =========================================================
   FAMILIES
========================================================= */

router.get(
  "/families",
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req);
    const where = familyScopeWhere(req.user);

    if (req.query.hibretId && isWoreda(req.user)) where.hibretId = String(req.query.hibretId);
    if (req.query.search) Object.assign(where, buildSearchWhere(req.query.search, ["name"]));

    const [rows, total] = await Promise.all([
      prisma.family.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }),
      prisma.family.count({ where }),
    ]);

    res.json(listResponse(rows, page, limit, total));
  })
);

router.get(
  "/families/export",
  asyncHandler(async (req, res) => {
    const where = familyScopeWhere(req.user);
    if (req.query.hibretId && isWoreda(req.user)) where.hibretId = String(req.query.hibretId);
    const rows = await prisma.family.findMany({ where, orderBy: { createdAt: "desc" } });
    sendCsv(res, "families.csv", rows);
  })
);

router.get(
  "/families/:id/members",
  asyncHandler(async (req, res) => {
    const family = await prisma.family.findUnique({ where: { id: req.params.id } });
    if (!family) throw createError(404, "Family not found");

    if (isHibret(req.user) && family.hibretId !== req.user.hibretId) throw createError(403, "Forbidden");
    if (isFamily(req.user) && family.id !== req.user.familyId) throw createError(403, "Forbidden");
    if (isMember(req.user) && family.id !== req.user.familyId) throw createError(403, "Forbidden");

    const { page, limit, skip } = getPagination(req);

    const [rows, total] = await Promise.all([
      prisma.member.findMany({ where: { familyId: family.id }, skip, take: limit, orderBy: { firstName: "asc" } }),
      prisma.member.count({ where: { familyId: family.id } }),
    ]);

    res.json(listResponse(rows, page, limit, total));
  })
);

router.get(
  "/families/:id",
  asyncHandler(async (req, res) => {
    const family = await prisma.family.findUnique({ where: { id: req.params.id } });
    if (!family) throw createError(404, "Family not found");

    if (isHibret(req.user) && family.hibretId !== req.user.hibretId) throw createError(403, "Forbidden");
    if (isFamily(req.user) && family.id !== req.user.familyId) throw createError(403, "Forbidden");
    if (isMember(req.user) && family.id !== req.user.familyId) throw createError(403, "Forbidden");

    res.json({ data: family });
  })
);

router.post(
  "/families",
  asyncHandler(async (req, res) => {
    if (!isWoreda(req.user) && !isHibret(req.user)) throw createError(403, "Forbidden");

    const hibretId = isHibret(req.user) ? req.user.hibretId : req.body.hibretId;
    if (!hibretId) throw createError(400, "hibretId is required");

    const created = await prisma.family.create({
      data: {
        name: req.body.name,
        hibretId,
        familyAdminUserId: req.body.familyAdminUserId || null,
      },
    });

    await logActivity(req, "family_created", "family", created.id, "Family created");

    res.status(201).json({ data: created });
  })
);

router.patch(
  "/families/:id",
  asyncHandler(async (req, res) => {
    const family = await prisma.family.findUnique({ where: { id: req.params.id } });
    if (!family) throw createError(404, "Family not found");

    if (!isWoreda(req.user) && !(isHibret(req.user) && family.hibretId === req.user.hibretId)) {
      throw createError(403, "Forbidden");
    }

    const updated = await prisma.family.update({
      where: { id: family.id },
      data: {
        name: req.body.name ?? family.name,
        familyAdminUserId: req.body.familyAdminUserId ?? family.familyAdminUserId,
      },
    });

    await logActivity(req, "family_updated", "family", updated.id, "Family updated");

    res.json({ data: updated });
  })
);

/* =========================================================
   MEMBERS STATIC ROUTES FIRST
========================================================= */

router.get(
  "/members/import-template",
  asyncHandler(async (_req, res) => {
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="members-import-template.csv"');
    res.send(
      "memberCode,fanId,ppId,firstName,fatherName,grandfatherName,gender,email,phone,hibretId,familyId,membershipStatus,registrationType,membershipYear,partyRole,educationLevel,fieldOfStudy,workplace,workType,workExperienceYears,zone,kebele,ethnicity,healthStatus\n"
    );
  })
);

router.post(
  "/members/import/preview",
  asyncHandler(async (req, res) => {
    if (!isWoreda(req.user) && !isHibret(req.user)) throw createError(403, "Forbidden");

    const rows = Array.isArray(req.body.rows) ? req.body.rows : [];
    const result = await validateMemberImportRows(rows, req.user);

    res.json({
      data: {
        validRows: result.validRows.length,
        invalidRows: result.invalidRows.length,
        duplicateRows: result.duplicateRows,
        rowErrors: result.invalidRows,
      },
    });
  })
);

router.post(
  "/members/import/confirm",
  asyncHandler(async (req, res) => {
    if (!isWoreda(req.user) && !isHibret(req.user)) throw createError(403, "Forbidden");

    const rows = Array.isArray(req.body.rows) ? req.body.rows : [];
    const result = await validateMemberImportRows(rows, req.user);

    if (result.invalidRows.length) {
      throw createError(400, "Import contains invalid rows. Preview first and fix errors.");
    }

    if (isHibret(req.user)) {
      const approval = await prisma.approvalRequest.create({
        data: {
          requestedByUserId: req.user.sub,
          type: "member_import",
          status: "pending",
          payload: { rows: result.validRows },
        },
      });

      await logActivity(req, "member_import_requested", "approval", approval.id, "Member import requested");

      return res.json({
        message: "Import submitted for Woreda approval",
        data: approval,
      });
    }

    let createdCount = 0;
    for (const row of result.validRows) {
      const uniqueFilters = presentUniqueMemberFilters(row);
      if (uniqueFilters.length) {
        const duplicate = await prisma.member.findFirst({ where: { OR: uniqueFilters } });
        if (duplicate) continue;
      }

      await prisma.member.create({ data: row });
      createdCount++;
    }

    await logActivity(req, "member_import_completed", "member", null, "Member import completed", { createdCount });

    res.json({ data: { createdCount } });
  })
);

router.get(
  "/members/export",
  asyncHandler(async (req, res) => {
    const where = memberScopeWhere(req.user);

    if (isWoreda(req.user) && req.query.hibretId) where.hibretId = String(req.query.hibretId);
    if ((isWoreda(req.user) || isHibret(req.user)) && req.query.familyId) where.familyId = String(req.query.familyId);
    if (req.query.gender) where.gender = String(req.query.gender);
    if (req.query.membershipStatus) where.membershipStatus = String(req.query.membershipStatus);
    if (req.query.registrationType) where.registrationType = String(req.query.registrationType);
    if (req.query.educationLevel) where.educationLevel = String(req.query.educationLevel);
    if (req.query.workType) where.workType = String(req.query.workType);

    if (isHibret(req.user)) {
      const approval = await prisma.approvalRequest.create({
        data: {
          requestedByUserId: req.user.sub,
          type: "member_export",
          status: "pending",
          payload: { filters: req.query, scope: { hibretId: req.user.hibretId } },
        },
      });

      await logActivity(req, "member_export_requested", "approval", approval.id, "Member export requested");

      return res.json({
        message: "Export submitted for Woreda approval",
        data: approval,
      });
    }

    const rows = await prisma.member.findMany({ where, orderBy: { createdAt: "desc" } });
    sendCsv(res, "members.csv", rows);
  })
);

router.post(
  "/members/accounts/bulk-create",
  asyncHandler(async (req, res) => {
    if (!isWoreda(req.user) && !isHibret(req.user)) throw createError(403, "Forbidden");

    const memberIds = Array.isArray(req.body.memberIds) ? req.body.memberIds : [];
    let created = 0;
    const skipped = [];

    for (const id of memberIds) {
      const member = await prisma.member.findUnique({ where: { id } });
      if (!member || !canManageMember(req.user, member)) {
        skipped.push({ id, reason: "out of scope or missing" });
        continue;
      }

      if (!member.email) {
        skipped.push({ id, reason: "member has no email" });
        continue;
      }

      const existing = await prisma.user.findFirst({ where: { memberId: member.id } });
      if (existing) {
        skipped.push({ id, reason: "account already exists" });
        continue;
      }

      const user = await prisma.user.create({
        data: {
          email: member.email,
          role: "member",
          status: "pending_setup",
          privileges: [
            "broadcast.read",
            "form.read",
            "form_submission.create",
            "resource.read",
            "resource.download",
            "profile.read",
            "profile.update_request",
            "account.password_change",
          ],
          hibretId: member.hibretId,
          familyId: member.familyId,
          memberId: member.id,
          passwordHash: null,
        },
      });

      const setupToken = await createSetupTokenForUser(user.id);
      const emailResult = await sendSetupEmail({ to: member.email, token: setupToken });
      console.log(`Member setup email sent to ${member.email}`);

      created++;
    }

    await logActivity(req, "member_accounts_bulk_created", "user", null, "Bulk member accounts created", {
      created,
      skipped,
    });

    res.json({ data: { created, skipped } });
  })
);

/* =========================================================
   MEMBERS DYNAMIC ROUTES
========================================================= */

router.get(
  "/members",
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req);
    const where = memberScopeWhere(req.user);

    if (isWoreda(req.user) && req.query.hibretId) where.hibretId = String(req.query.hibretId);
    if ((isWoreda(req.user) || isHibret(req.user)) && req.query.familyId) where.familyId = String(req.query.familyId);
    if (req.query.gender) where.gender = String(req.query.gender);
    if (req.query.membershipStatus) where.membershipStatus = String(req.query.membershipStatus);
    if (req.query.registrationType) where.registrationType = String(req.query.registrationType);
    if (req.query.educationLevel) where.educationLevel = String(req.query.educationLevel);
    if (req.query.workType) where.workType = String(req.query.workType);

    if (req.query.search) {
      Object.assign(where, {
        OR: [
          { firstName: { contains: String(req.query.search), mode: "insensitive" } },
          { fatherName: { contains: String(req.query.search), mode: "insensitive" } },
          { grandfatherName: { contains: String(req.query.search), mode: "insensitive" } },
          { fanId: { contains: String(req.query.search), mode: "insensitive" } },
          { ppId: { contains: String(req.query.search), mode: "insensitive" } },
          { memberCode: { contains: String(req.query.search), mode: "insensitive" } },
        ],
      });
    }

    const [rows, total] = await Promise.all([
      prisma.member.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }),
      prisma.member.count({ where }),
    ]);

    res.json(listResponse(rows, page, limit, total));
  })
);

router.get(
  "/members/:id",
  asyncHandler(async (req, res) => {
    const member = await prisma.member.findUnique({ where: { id: req.params.id } });
    if (!member) throw createError(404, "Member not found");

    if (!canManageMember(req.user, member) && !(isFamily(req.user) && member.familyId === req.user.familyId) && !(isMember(req.user) && member.id === req.user.memberId)) {
      throw createError(403, "Forbidden");
    }

    res.json({ data: member });
  })
);

router.post(
  "/members",
  asyncHandler(async (req, res) => {
    if (!isWoreda(req.user) && !isHibret(req.user)) throw createError(403, "Forbidden");

    const hibretId = isHibret(req.user) ? req.user.hibretId : req.body.hibretId;
    if (!hibretId) throw createError(400, "hibretId is required");

    if (req.body.familyId) {
      const family = await prisma.family.findUnique({ where: { id: req.body.familyId } });
      if (!family || family.hibretId !== hibretId) {
        throw createError(400, "Family does not belong to selected Hibret");
      }
    }

    const created = await prisma.member.create({
      data: {
        ...req.body,
        hibretId,
        membershipYear: req.body.membershipYear ? Number(req.body.membershipYear) : undefined,
        workExperienceYears: req.body.workExperienceYears ? Number(req.body.workExperienceYears) : undefined,
      },
    });

    await logActivity(req, "member_created", "member", created.id, "Member created");

    res.status(201).json({ data: created });
  })
);

router.patch(
  "/members/:id",
  asyncHandler(async (req, res) => {
    const member = await prisma.member.findUnique({ where: { id: req.params.id } });
    if (!member) throw createError(404, "Member not found");

    if (!canManageMember(req.user, member)) throw createError(403, "Forbidden");

    const data = { ...req.body };
    delete data.hibretId;

    if (data.familyId) {
      const family = await prisma.family.findUnique({ where: { id: data.familyId } });
      if (!family || family.hibretId !== member.hibretId) {
        throw createError(400, "Family does not belong to member Hibret");
      }
    }

    const updated = await prisma.member.update({
      where: { id: member.id },
      data,
    });

    await logActivity(req, "member_updated", "member", updated.id, "Member updated");

    res.json({ data: updated });
  })
);

router.patch(
  "/members/:id/assign-family",
  asyncHandler(async (req, res) => {
    const member = await prisma.member.findUnique({ where: { id: req.params.id } });
    if (!member) throw createError(404, "Member not found");

    if (!canManageMember(req.user, member)) throw createError(403, "Forbidden");

    const family = await prisma.family.findUnique({ where: { id: req.body.familyId } });
    if (!family || family.hibretId !== member.hibretId) {
      throw createError(400, "Family does not belong to member Hibret");
    }

    const updated = await prisma.member.update({
      where: { id: member.id },
      data: { familyId: family.id },
    });

    await logActivity(req, "member_family_assigned", "member", member.id, "Member assigned to family", {
      familyId: family.id,
    });

    res.json({ data: updated });
  })
);

router.post(
  "/members/:id/create-account",
  asyncHandler(async (req, res) => {
    const member = await prisma.member.findUnique({ where: { id: req.params.id } });
    if (!member) throw createError(404, "Member not found");

    if (!canManageMember(req.user, member)) throw createError(403, "Forbidden");
    if (!member.email) throw createError(400, "Member has no email");

    let user = await prisma.user.findFirst({ where: { memberId: member.id } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: member.email,
          role: "member",
          status: "pending_setup",
          privileges: [
            "broadcast.read",
            "form.read",
            "form_submission.create",
            "resource.read",
            "resource.download",
            "profile.read",
            "profile.update_request",
            "account.password_change",
          ],
          hibretId: member.hibretId,
          familyId: member.familyId,
          memberId: member.id,
          passwordHash: null,
        },
      });
    }

    const setupToken = await createSetupTokenForUser(user.id);
    const emailResult = await sendSetupEmail({ to: member.email, token: setupToken });
    console.log(`Member setup email sent to ${member.email}`);

    await logActivity(req, "member_account_created", "user", user.id, "Member account created/setup token issued");

    res.json({
      message: "Member account ready. Setup email sent.",
      data: sanitizeUser(user),
    });
  })
);

router.post(
  "/members/:id/resend-setup-link",
  asyncHandler(async (req, res) => {
    const member = await prisma.member.findUnique({ where: { id: req.params.id } });
    if (!member) throw createError(404, "Member not found");
    if (!canManageMember(req.user, member)) throw createError(403, "Forbidden");

    const user = await prisma.user.findFirst({ where: { memberId: member.id } });
    if (!user) throw createError(404, "Member account not found");

    const setupToken = await createSetupTokenForUser(user.id);
    const emailResult = await sendSetupEmail({ to: user.email, token: setupToken });
    console.log(`Member setup email sent to ${user.email}`);

    await logActivity(req, "member_setup_link_resent", "user", user.id, "Member setup link resent");

    res.json({ message: "Setup email sent" });
  })
);

router.patch(
  "/members/:id/account/disable",
  asyncHandler(async (req, res) => {
    const member = await prisma.member.findUnique({ where: { id: req.params.id } });
    if (!member) throw createError(404, "Member not found");
    if (!canManageMember(req.user, member)) throw createError(403, "Forbidden");

    const user = await prisma.user.findFirst({ where: { memberId: member.id } });
    if (!user) throw createError(404, "Member account not found");

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { status: "inactive" },
    });

    await logActivity(req, "member_account_disabled", "user", user.id, "Member account disabled");

    res.json({ data: sanitizeUser(updated) });
  })
);

router.patch(
  "/members/:id/account/reactivate",
  asyncHandler(async (req, res) => {
    const member = await prisma.member.findUnique({ where: { id: req.params.id } });
    if (!member) throw createError(404, "Member not found");
    if (!canManageMember(req.user, member)) throw createError(403, "Forbidden");

    const user = await prisma.user.findFirst({ where: { memberId: member.id } });
    if (!user) throw createError(404, "Member account not found");

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { status: "active" },
    });

    await logActivity(req, "member_account_reactivated", "user", user.id, "Member account reactivated");

    res.json({ data: sanitizeUser(updated) });
  })
);

/* =========================================================
   APPROVALS
========================================================= */

router.get(
  "/approvals",
  asyncHandler(async (req, res) => {
    if (!isWoreda(req.user) && !isHibret(req.user)) throw createError(403, "Forbidden");

    const { page, limit, skip } = getPagination(req);
    const where = isWoreda(req.user) ? {} : { requestedByUserId: req.user.sub };

    if (req.query.status) where.status = String(req.query.status);
    if (req.query.type) where.type = String(req.query.type);

    const [rows, total] = await Promise.all([
      prisma.approvalRequest.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }),
      prisma.approvalRequest.count({ where }),
    ]);

    res.json(listResponse(rows, page, limit, total));
  })
);

router.get(
  "/approvals/:id",
  asyncHandler(async (req, res) => {
    const approval = await prisma.approvalRequest.findUnique({ where: { id: req.params.id } });
    if (!approval) throw createError(404, "Approval not found");

    if (!isWoreda(req.user) && approval.requestedByUserId !== req.user.sub) {
      throw createError(403, "Forbidden");
    }

    res.json({ data: approval });
  })
);

router.patch(
  "/approvals/:id/approve",
  asyncHandler(async (req, res) => {
    if (!isWoreda(req.user)) throw createError(403, "Only Woreda Admin can approve");

    const approval = await prisma.approvalRequest.findUnique({ where: { id: req.params.id } });
    if (!approval) throw createError(404, "Approval not found");
    if (approval.status !== "pending") throw createError(400, "Approval is not pending");

    let result = null;

    if (approval.type === "member_import") {
      const rows = approval.payload?.rows || [];
      let createdCount = 0;

      for (const row of rows) {
        const uniqueFilters = presentUniqueMemberFilters(row);
        if (uniqueFilters.length) {
          const duplicate = await prisma.member.findFirst({ where: { OR: uniqueFilters } });
          if (duplicate) continue;
        }
        await prisma.member.create({ data: row });
        createdCount++;
      }

      result = { createdCount };
    }

    const updated = await prisma.approvalRequest.update({
      where: { id: approval.id },
      data: {
        status: "approved",
        reviewedByUserId: req.user.sub,
        reviewedAt: new Date(),
        reviewNote: req.body.reviewNote || null,
      },
    });

    await logActivity(req, "approval_approved", "approval", approval.id, "Approval request approved", {
      type: approval.type,
      result,
    });

    res.json({ data: updated, result });
  })
);

router.patch(
  "/approvals/:id/reject",
  asyncHandler(async (req, res) => {
    if (!isWoreda(req.user)) throw createError(403, "Only Woreda Admin can reject");

    const approval = await prisma.approvalRequest.findUnique({ where: { id: req.params.id } });
    if (!approval) throw createError(404, "Approval not found");
    if (approval.status !== "pending") throw createError(400, "Approval is not pending");

    const updated = await prisma.approvalRequest.update({
      where: { id: approval.id },
      data: {
        status: "rejected",
        reviewedByUserId: req.user.sub,
        reviewedAt: new Date(),
        reviewNote: req.body.reviewNote || null,
      },
    });

    await logActivity(req, "approval_rejected", "approval", approval.id, "Approval request rejected", {
      type: approval.type,
    });

    res.json({ data: updated });
  })
);

router.get("/health", (_req, res) => {
  res.json({ ok: true, module: "core" });
});

export default router;
