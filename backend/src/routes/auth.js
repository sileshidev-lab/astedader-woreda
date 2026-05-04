import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { sendPasswordResetEmail } from "../email.js";
import { authLimiter, requireAuth, validate } from "../middleware.js";
import {
  asyncHandler,
  comparePassword,
  createError,
  hashPassword,
  hashToken,
  logActivity,
  randomToken,
  sanitizeUser,
  signAccessToken,
} from "../utils.js";

const router = Router();

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
});

const setupSchema = z.object({
  body: z.object({
    token: z.string().min(10),
    password: z.string().min(8),
  }),
});

const forgotSchema = z.object({
  body: z.object({
    email: z.string().email(),
  }),
});

const resetSchema = z.object({
  body: z.object({
    token: z.string().min(10),
    password: z.string().min(8),
  }),
});

const profilePatchSchema = z.object({
  body: z.object({
    email: z.string().email().optional(),
  }),
});

const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
  }),
});

router.get("/health", (_req, res) => {
  res.json({ ok: true, module: "auth" });
});

router.post(
  "/login",
  authLimiter,
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.passwordHash) {
      await logActivity(req, "login_failed", "user", null, "Login failed", { email });
      throw createError(401, "Invalid email or password");
    }

    if (user.status !== "active") {
      await logActivity(req, "login_blocked", "user", user.id, "Login blocked because user is not active", {
        email,
        status: user.status,
      });
      throw createError(403, `Account is ${user.status}`);
    }

    const ok = await comparePassword(password, user.passwordHash);
    if (!ok) {
      await logActivity(req, "login_failed", "user", user.id, "Login failed", { email });
      throw createError(401, "Invalid email or password");
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const accessToken = signAccessToken(updated);

    req.user = {
      sub: updated.id,
      email: updated.email,
      role: updated.role,
      privileges: updated.privileges,
      hibretId: updated.hibretId,
      familyId: updated.familyId,
      memberId: updated.memberId,
    };

    await logActivity(req, "login_success", "user", updated.id, "User logged in");

    res.json({
      accessToken,
      user: sanitizeUser(updated),
    });
  })
);

router.post(
  "/setup-account",
  authLimiter,
  validate(setupSchema),
  asyncHandler(async (req, res) => {
    const { token, password } = req.body;
    const tokenHash = hashToken(token);

    const setupToken = await prisma.setupToken.findUnique({ where: { tokenHash } });

    if (!setupToken || setupToken.usedAt || setupToken.expiresAt < new Date()) {
      throw createError(400, "Invalid or expired setup token");
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.update({
      where: { id: setupToken.userId },
      data: {
        passwordHash,
        status: "active",
      },
    });

    await prisma.setupToken.update({
      where: { id: setupToken.id },
      data: { usedAt: new Date() },
    });

    req.user = {
      sub: user.id,
      email: user.email,
      role: user.role,
      privileges: user.privileges,
      hibretId: user.hibretId,
      familyId: user.familyId,
      memberId: user.memberId,
    };

    await logActivity(req, "account_setup_completed", "user", user.id, "Account setup completed");

    res.json({
      message: "Account setup completed",
      user: sanitizeUser(user),
    });
  })
);

router.post(
  "/forgot-password",
  authLimiter,
  validate(forgotSchema),
  asyncHandler(async (req, res) => {
    const { email } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const plainToken = randomToken();

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(plainToken),
          expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        },
      });

      const emailResult = await sendPasswordResetEmail({ to: email, token: plainToken });
      console.log(`Password reset email sent to ${email}`);

      req.user = {
        sub: user.id,
        email: user.email,
        role: user.role,
        privileges: user.privileges,
        hibretId: user.hibretId,
        familyId: user.familyId,
        memberId: user.memberId,
      };

      await logActivity(req, "password_reset_requested", "user", user.id, "Password reset requested");
    }

    res.json({
      message: "If the email exists, a password reset link has been sent.",
    });
  })
);

router.post(
  "/reset-password",
  authLimiter,
  validate(resetSchema),
  asyncHandler(async (req, res) => {
    const { token, password } = req.body;
    const tokenHash = hashToken(token);

    const resetToken = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      throw createError(400, "Invalid or expired reset token");
    }

    const user = await prisma.user.update({
      where: { id: resetToken.userId },
      data: {
        passwordHash: await hashPassword(password),
        status: "active",
      },
    });

    await prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    });

    req.user = {
      sub: user.id,
      email: user.email,
      role: user.role,
      privileges: user.privileges,
      hibretId: user.hibretId,
      familyId: user.familyId,
      memberId: user.memberId,
    };

    await logActivity(req, "password_reset_completed", "user", user.id, "Password reset completed");

    res.json({
      message: "Password reset completed",
    });
  })
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
    res.json({ user: sanitizeUser(user) });
  })
);

router.get(
  "/../users/profile",
  requireAuth,
  asyncHandler(async (_req, res) => {
    res.status(404).json({ message: "Use /api/users/profile" });
  })
);

router.get(
  "/profile",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user.sub } });

    let memberProfile = null;
    if (user?.memberId) {
      memberProfile = await prisma.member.findUnique({ where: { id: user.memberId } });
    }

    res.json({
      data: {
        user: sanitizeUser(user),
        memberProfile,
      },
    });
  })
);

router.patch(
  "/profile",
  requireAuth,
  validate(profilePatchSchema),
  asyncHandler(async (req, res) => {
    const { email } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user.sub },
      data: email ? { email } : {},
    });

    await logActivity(req, "profile_updated", "user", user.id, "User profile updated");

    res.json({ data: sanitizeUser(user) });
  })
);

router.get(
  "/settings",
  requireAuth,
  asyncHandler(async (_req, res) => {
    res.json({
      data: {
        language: "en",
        notifications: true,
      },
    });
  })
);

router.patch(
  "/settings",
  requireAuth,
  asyncHandler(async (req, res) => {
    await logActivity(req, "settings_updated", "user", req.user.sub, "User settings updated", req.body);
    res.json({
      data: {
        language: req.body.language || "en",
        notifications: req.body.notifications ?? true,
      },
    });
  })
);

router.patch(
  "/change-password",
  requireAuth,
  validate(changePasswordSchema),
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user.sub } });

    if (!user?.passwordHash) {
      throw createError(400, "Password is not set");
    }

    const ok = await comparePassword(currentPassword, user.passwordHash);
    if (!ok) {
      throw createError(400, "Current password is incorrect");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(newPassword) },
    });

    await logActivity(req, "password_changed", "user", user.id, "User changed password");

    res.json({ message: "Password changed successfully" });
  })
);

export default router;
