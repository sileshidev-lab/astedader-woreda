import { Router } from "express";
import crypto from "crypto";
import { prisma } from "../../prisma/client";
import { authMiddleware } from "../../middleware/auth.middleware";
import { requirePrivilege } from "../../middleware/requirePrivilege";
import { sendMail } from "../mail/mail.service";
import { env } from "../../config/env";

const router = Router();

router.use(authMiddleware);

const DEFAULT_HIBRET_ADMIN_PRIVILEGES = [
  "announcement.read",
  "report.read",
  "report.create",
  "report.update",
  "report.submit",
  "family.read",
  "family.create",
  "family.update",
  "family.delete",
  "member.read",
  "member.create",
  "member.update",
  "member_account.read",
  "member_account.create",
  "member_account.update",
  "attendance.read",
  "attendance.update",
  "resource.read",
  "broadcast.read",
  "gallery.read",
  "media.upload",
  "profile.read",
  "profile.update",
];

const DEFAULT_WOREDA_ADMIN_PRIVILEGES = ["*"];

const AVAILABLE_PRIVILEGES = [
  "*",

  "announcement.read",
  "announcement.create",
  "announcement.update",
  "announcement.publish",
  "announcement.close",
  "announcement.export",

  "hibret.read",
  "hibret.create",
  "hibret.update",

  "family.read",
  "family.create",
  "family.update",
  "family.delete",

  "member.read",
  "member.create",
  "member.update",

  "member_account.read",
  "member_account.create",
  "member_account.update",

  "admin.read",
  "admin.create",
  "admin.update",
  "admin.delete",

  "report.read",
  "report.create",
  "report.update",
  "report.submit",
  "report.review",
  "report.export",

  "attendance.read",
  "attendance.update",
  "attendance.export",

  "resource.read",
  "resource.create",
  "resource.update",
  "resource.publish",
  "resource.archive",
  "resource.delete",

  "broadcast.read",
  "broadcast.create",
  "broadcast.update",
  "broadcast.publish",
  "broadcast.archive",
  "broadcast.delete",

  "gallery.read",
  "media.upload",

  "activity.read",
  "analytics.read",
  "woreda_analytics.read",

  "chat.read",
  "chat.send",

  "profile.read",
  "profile.update",
];

function setupUrl(token: string) {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  return `${frontendUrl}/setup-account?token=${encodeURIComponent(token)}`;
}

function cleanString(value: unknown) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
}

function normalizeEmail(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

type AdminListItem = {
  id: string;
  email: string;
  role: string;
  status: string;
  privileges: string[];
  hibretId: string | null;
  hibretName: string | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type AdminRecord = {
  id: string;
  email: string;
  role: string;
  status: string;
  privileges?: string[] | null;
  hibretId: string | null;
  hibret?: { name?: string | null } | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function mapAdmin(user: AdminRecord): AdminListItem {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    privileges: user.privileges ?? [],
    hibretId: user.hibretId,
    hibretName: user.hibret?.name ?? null,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

async function sendAdminSetupEmail(user: any) {
  if (!user.setupToken) {
    return {
      setupUrl: null,
      previewUrl: null,
      skipped: true,
    };
  }

  const url = setupUrl(user.setupToken);
  const roleLabel =
    user.role === "WOREDA_ADMIN"
      ? "Woreda administrator"
      : "Hibret administrator";

  const result = await sendMail({
    to: user.email,
    subject: "Set up your Astedader Woreda admin account",
    text: `Hello,

Your Astedader Woreda ${roleLabel} account has been created.

Set your password using this link:
${url}

If you did not expect this email, please ignore it.`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #191C1D; line-height: 1.6;">
        <h2 style="color: #004C6B;">Astedader Woreda admin account setup</h2>
        <p>Your <strong>${roleLabel}</strong> account has been created.</p>
        <p>
          <a href="${url}" style="display:inline-block;background:#00658D;color:#ffffff;padding:10px 16px;text-decoration:none;font-weight:700;">
            Set Password
          </a>
        </p>
        <p>If the button does not work, copy this link:</p>
        <p style="word-break:break-all;">${url}</p>
      </div>
    `,
  });

  return {
    setupUrl: url,
    previewUrl: env.IS_PRODUCTION ? null : result.previewUrl,
    skipped: result.skipped,
  };
}

router.get(
  "/form-options",
  requirePrivilege("admin.read"),
  async (_req, res) => {
    const hibrets = await prisma.hibret.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        status: true,
      },
    });

    return res.json({
      options: {
        hibrets,
        privileges: AVAILABLE_PRIVILEGES,
      },
    });
  },
);

router.get("/", requirePrivilege("admin.read"), async (_req, res) => {
  const admins = await prisma.user.findMany({
    where: {
      role: {
        in: ["WOREDA_ADMIN", "HIBRET_ADMIN"],
      },
    },
    include: {
      hibret: true,
    },
    orderBy: [{ role: "asc" }, { email: "asc" }],
  });

  const mapped: AdminListItem[] = admins.map(mapAdmin);

  return res.json({
    summary: {
      total: mapped.length,
      woredaAdmins: mapped.filter((admin) => admin.role === "WOREDA_ADMIN")
        .length,
      hibretAdmins: mapped.filter((admin) => admin.role === "HIBRET_ADMIN")
        .length,
      active: mapped.filter((admin) => admin.status === "ACTIVE").length,
      pendingSetup: mapped.filter((admin) => admin.status === "PENDING_SETUP")
        .length,
      disabled: mapped.filter((admin) => admin.status === "DISABLED").length,
    },
    admins: mapped,
  });
});

router.post("/", requirePrivilege("admin.create"), async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const role = String(req.body.role || "").trim();
  const hibretId = cleanString(req.body.hibretId);
  const privileges = Array.isArray(req.body.privileges)
    ? req.body.privileges.map(String)
    : role === "WOREDA_ADMIN"
      ? DEFAULT_WOREDA_ADMIN_PRIVILEGES
      : DEFAULT_HIBRET_ADMIN_PRIVILEGES;

  if (!email) {
    return res.status(400).json({ message: "Email is required." });
  }

  if (!["WOREDA_ADMIN", "HIBRET_ADMIN"].includes(role)) {
    return res.status(400).json({ message: "Select a valid admin role." });
  }

  if (role === "HIBRET_ADMIN" && !hibretId) {
    return res
      .status(400)
      .json({ message: "Hibret is required for Hibret admins." });
  }

  if (role === "WOREDA_ADMIN" && hibretId) {
    return res
      .status(400)
      .json({ message: "Woreda admins should not be assigned to a Hibret." });
  }

  if (hibretId) {
    const hibret = await prisma.hibret.findUnique({ where: { id: hibretId } });

    if (!hibret) {
      return res
        .status(400)
        .json({ message: "Selected Hibret was not found." });
    }
  }

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    return res
      .status(409)
      .json({ message: "An account with this email already exists." });
  }

  const setupToken = crypto.randomBytes(32).toString("hex");

  const user = await prisma.user.create({
    data: {
      email,
      role: role as any,
      status: "PENDING_SETUP",
      privileges,
      hibretId: role === "HIBRET_ADMIN" ? hibretId : null,
      setupToken,
      passwordHash: null,
    },
    include: {
      hibret: true,
    },
  });

  const emailResult = await sendAdminSetupEmail(user);

  return res.status(201).json({
    message: "Admin account created.",
    admin: mapAdmin(user),
    setupUrl: emailResult.setupUrl,
    previewUrl: env.IS_PRODUCTION ? null : emailResult.previewUrl,
  });
});

router.get("/:adminId", requirePrivilege("admin.read"), async (req, res) => {
  const adminId = String(req.params.adminId);

  const admin = await prisma.user.findUnique({
    where: { id: adminId },
    include: {
      hibret: true,
    },
  });

  if (!admin || !["WOREDA_ADMIN", "HIBRET_ADMIN"].includes(admin.role)) {
    return res.status(404).json({ message: "Admin not found." });
  }

  const activity = await prisma.activityLog.findMany({
    where: {
      actorUserId: admin.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  });

  return res.json({
    admin: {
      ...mapAdmin(admin),
      activity,
    },
  });
});

router.patch(
  "/:adminId",
  requirePrivilege("admin.update"),
  async (req, res) => {
    const adminId = String(req.params.adminId);
    const email =
      req.body.email === undefined ? undefined : normalizeEmail(req.body.email);
    const role =
      req.body.role === undefined
        ? undefined
        : String(req.body.role || "").trim();
    const hibretId =
      req.body.hibretId === undefined
        ? undefined
        : cleanString(req.body.hibretId);
    const privileges =
      req.body.privileges === undefined
        ? undefined
        : Array.isArray(req.body.privileges)
          ? req.body.privileges.map(String)
          : [];

    const existing = await prisma.user.findUnique({
      where: { id: adminId },
    });

    if (
      !existing ||
      !["WOREDA_ADMIN", "HIBRET_ADMIN"].includes(existing.role)
    ) {
      return res.status(404).json({ message: "Admin not found." });
    }

    const nextRole = role || existing.role;
    const nextHibretId = hibretId === undefined ? existing.hibretId : hibretId;

    if (!["WOREDA_ADMIN", "HIBRET_ADMIN"].includes(nextRole)) {
      return res.status(400).json({ message: "Select a valid admin role." });
    }

    if (nextRole === "HIBRET_ADMIN" && !nextHibretId) {
      return res
        .status(400)
        .json({ message: "Hibret is required for Hibret admins." });
    }

    if (nextRole === "WOREDA_ADMIN" && nextHibretId) {
      return res
        .status(400)
        .json({ message: "Woreda admins should not be assigned to a Hibret." });
    }

    if (nextHibretId) {
      const hibret = await prisma.hibret.findUnique({
        where: { id: nextHibretId },
      });

      if (!hibret) {
        return res
          .status(400)
          .json({ message: "Selected Hibret was not found." });
      }
    }

    if (email && email !== existing.email) {
      const duplicate = await prisma.user.findUnique({ where: { email } });

      if (duplicate) {
        return res
          .status(409)
          .json({ message: "An account with this email already exists." });
      }
    }

    const updated = await prisma.user.update({
      where: { id: adminId },
      data: {
        ...(email !== undefined ? { email } : {}),
        ...(role !== undefined ? { role: nextRole as any } : {}),
        ...(hibretId !== undefined || role !== undefined
          ? { hibretId: nextRole === "HIBRET_ADMIN" ? nextHibretId : null }
          : {}),
        ...(privileges !== undefined ? { privileges } : {}),
      },
      include: {
        hibret: true,
      },
    });

    return res.json({
      message: "Admin updated.",
      admin: mapAdmin(updated),
    });
  },
);

router.patch(
  "/:adminId/status",
  requirePrivilege("admin.update"),
  async (req, res) => {
    const adminId = String(req.params.adminId);
    const status = String(req.body.status || "").trim();

    if (!["ACTIVE", "DISABLED", "PENDING_SETUP"].includes(status)) {
      return res.status(400).json({ message: "Invalid account status." });
    }

    const existing = await prisma.user.findUnique({
      where: { id: adminId },
    });

    if (
      !existing ||
      !["WOREDA_ADMIN", "HIBRET_ADMIN"].includes(existing.role)
    ) {
      return res.status(404).json({ message: "Admin not found." });
    }

    const updated = await prisma.user.update({
      where: { id: adminId },
      data: { status: status as any },
      include: {
        hibret: true,
      },
    });

    return res.json({
      message: "Admin status updated.",
      admin: mapAdmin(updated),
    });
  },
);

router.post(
  "/:adminId/resend-setup",
  requirePrivilege("admin.update"),
  async (req, res) => {
    const adminId = String(req.params.adminId);

    const existing = await prisma.user.findUnique({
      where: { id: adminId },
      include: {
        hibret: true,
      },
    });

    if (
      !existing ||
      !["WOREDA_ADMIN", "HIBRET_ADMIN"].includes(existing.role)
    ) {
      return res.status(404).json({ message: "Admin not found." });
    }

    const setupToken = crypto.randomBytes(32).toString("hex");

    const updated = await prisma.user.update({
      where: { id: adminId },
      data: {
        setupToken,
        status: "PENDING_SETUP",
        passwordHash: null,
      },
      include: {
        hibret: true,
      },
    });

    const emailResult = await sendAdminSetupEmail(updated);

    return res.json({
      message: "Setup email sent.",
      admin: mapAdmin(updated),
      setupUrl: emailResult.setupUrl,
      previewUrl: env.IS_PRODUCTION ? null : emailResult.previewUrl,
    });
  },
);

export default router;
