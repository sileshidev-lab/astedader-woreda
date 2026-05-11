"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const crypto_1 = __importDefault(require("crypto"));
const client_1 = require("../../prisma/client");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const requirePrivilege_1 = require("../../middleware/requirePrivilege");
const mail_service_1 = require("../mail/mail.service");
const env_1 = require("../../config/env");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authMiddleware);
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
function setupUrl(token) {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    return `${frontendUrl}/setup-account?token=${encodeURIComponent(token)}`;
}
function cleanString(value) {
    if (value === undefined || value === null)
        return null;
    const text = String(value).trim();
    return text === "" ? null : text;
}
function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
}
function mapAdmin(user) {
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
async function sendAdminSetupEmail(user) {
    if (!user.setupToken) {
        return {
            setupUrl: null,
            previewUrl: null,
            skipped: true,
        };
    }
    const url = setupUrl(user.setupToken);
    const roleLabel = user.role === "WOREDA_ADMIN" ? "Woreda administrator" : "Hibret administrator";
    const result = await (0, mail_service_1.sendMail)({
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
        previewUrl: env_1.env.IS_PRODUCTION ? null : result.previewUrl,
        skipped: result.skipped,
    };
}
router.get("/form-options", (0, requirePrivilege_1.requirePrivilege)("admin.read"), async (_req, res) => {
    const hibrets = await client_1.prisma.hibret.findMany({
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
});
router.get("/", (0, requirePrivilege_1.requirePrivilege)("admin.read"), async (_req, res) => {
    const admins = await client_1.prisma.user.findMany({
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
    const mapped = admins.map(mapAdmin);
    return res.json({
        summary: {
            total: mapped.length,
            woredaAdmins: mapped.filter((admin) => admin.role === "WOREDA_ADMIN").length,
            hibretAdmins: mapped.filter((admin) => admin.role === "HIBRET_ADMIN").length,
            active: mapped.filter((admin) => admin.status === "ACTIVE").length,
            pendingSetup: mapped.filter((admin) => admin.status === "PENDING_SETUP").length,
            disabled: mapped.filter((admin) => admin.status === "DISABLED").length,
        },
        admins: mapped,
    });
});
router.post("/", (0, requirePrivilege_1.requirePrivilege)("admin.create"), async (req, res) => {
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
        return res.status(400).json({ message: "Hibret is required for Hibret admins." });
    }
    if (role === "WOREDA_ADMIN" && hibretId) {
        return res.status(400).json({ message: "Woreda admins should not be assigned to a Hibret." });
    }
    if (hibretId) {
        const hibret = await client_1.prisma.hibret.findUnique({ where: { id: hibretId } });
        if (!hibret) {
            return res.status(400).json({ message: "Selected Hibret was not found." });
        }
    }
    const existing = await client_1.prisma.user.findUnique({ where: { email } });
    if (existing) {
        return res.status(409).json({ message: "An account with this email already exists." });
    }
    const setupToken = crypto_1.default.randomBytes(32).toString("hex");
    const user = await client_1.prisma.user.create({
        data: {
            email,
            role: role,
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
        previewUrl: env_1.env.IS_PRODUCTION ? null : emailResult.previewUrl,
    });
});
router.get("/:adminId", (0, requirePrivilege_1.requirePrivilege)("admin.read"), async (req, res) => {
    const adminId = String(req.params.adminId);
    const admin = await client_1.prisma.user.findUnique({
        where: { id: adminId },
        include: {
            hibret: true,
        },
    });
    if (!admin || !["WOREDA_ADMIN", "HIBRET_ADMIN"].includes(admin.role)) {
        return res.status(404).json({ message: "Admin not found." });
    }
    const activity = await client_1.prisma.activityLog.findMany({
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
router.patch("/:adminId", (0, requirePrivilege_1.requirePrivilege)("admin.update"), async (req, res) => {
    const adminId = String(req.params.adminId);
    const email = req.body.email === undefined ? undefined : normalizeEmail(req.body.email);
    const role = req.body.role === undefined ? undefined : String(req.body.role || "").trim();
    const hibretId = req.body.hibretId === undefined ? undefined : cleanString(req.body.hibretId);
    const privileges = req.body.privileges === undefined
        ? undefined
        : Array.isArray(req.body.privileges)
            ? req.body.privileges.map(String)
            : [];
    const existing = await client_1.prisma.user.findUnique({
        where: { id: adminId },
    });
    if (!existing || !["WOREDA_ADMIN", "HIBRET_ADMIN"].includes(existing.role)) {
        return res.status(404).json({ message: "Admin not found." });
    }
    const nextRole = role || existing.role;
    const nextHibretId = hibretId === undefined ? existing.hibretId : hibretId;
    if (!["WOREDA_ADMIN", "HIBRET_ADMIN"].includes(nextRole)) {
        return res.status(400).json({ message: "Select a valid admin role." });
    }
    if (nextRole === "HIBRET_ADMIN" && !nextHibretId) {
        return res.status(400).json({ message: "Hibret is required for Hibret admins." });
    }
    if (nextRole === "WOREDA_ADMIN" && nextHibretId) {
        return res.status(400).json({ message: "Woreda admins should not be assigned to a Hibret." });
    }
    if (nextHibretId) {
        const hibret = await client_1.prisma.hibret.findUnique({ where: { id: nextHibretId } });
        if (!hibret) {
            return res.status(400).json({ message: "Selected Hibret was not found." });
        }
    }
    if (email && email !== existing.email) {
        const duplicate = await client_1.prisma.user.findUnique({ where: { email } });
        if (duplicate) {
            return res.status(409).json({ message: "An account with this email already exists." });
        }
    }
    const updated = await client_1.prisma.user.update({
        where: { id: adminId },
        data: {
            ...(email !== undefined ? { email } : {}),
            ...(role !== undefined ? { role: nextRole } : {}),
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
});
router.patch("/:adminId/status", (0, requirePrivilege_1.requirePrivilege)("admin.update"), async (req, res) => {
    const adminId = String(req.params.adminId);
    const status = String(req.body.status || "").trim();
    if (!["ACTIVE", "DISABLED", "PENDING_SETUP"].includes(status)) {
        return res.status(400).json({ message: "Invalid account status." });
    }
    const existing = await client_1.prisma.user.findUnique({
        where: { id: adminId },
    });
    if (!existing || !["WOREDA_ADMIN", "HIBRET_ADMIN"].includes(existing.role)) {
        return res.status(404).json({ message: "Admin not found." });
    }
    const updated = await client_1.prisma.user.update({
        where: { id: adminId },
        data: { status: status },
        include: {
            hibret: true,
        },
    });
    return res.json({
        message: "Admin status updated.",
        admin: mapAdmin(updated),
    });
});
router.post("/:adminId/resend-setup", (0, requirePrivilege_1.requirePrivilege)("admin.update"), async (req, res) => {
    const adminId = String(req.params.adminId);
    const existing = await client_1.prisma.user.findUnique({
        where: { id: adminId },
        include: {
            hibret: true,
        },
    });
    if (!existing || !["WOREDA_ADMIN", "HIBRET_ADMIN"].includes(existing.role)) {
        return res.status(404).json({ message: "Admin not found." });
    }
    const setupToken = crypto_1.default.randomBytes(32).toString("hex");
    const updated = await client_1.prisma.user.update({
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
        previewUrl: env_1.env.IS_PRODUCTION ? null : emailResult.previewUrl,
    });
});
exports.default = router;
