import { Router } from "express";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "../../prisma/client";
import { comparePassword, hashPassword } from "../../utils/password";
import { signToken } from "../../utils/jwt";
import { authMiddleware } from "../../middleware/auth.middleware";
import { sendMail } from "../mail/mail.service";
import { env } from "../../config/env";

const router = Router();

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many authentication attempts. Please try again later.",
  },
});

const authSensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many requests. Please try again later.",
  },
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const twoFactorLoginSchema = z.object({
  twoFactorToken: z.string().min(20),
  code: z.string().min(4).max(12),
});

const setupAccountSchema = z.object({
  token: z.string().min(20),
  password: z
    .string()
    .min(8)
    .regex(/[A-Za-z]/, "Password must contain at least one letter.")
    .regex(/[0-9]/, "Password must contain at least one number."),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z
    .string()
    .min(8)
    .regex(/[A-Za-z]/, "Password must contain at least one letter.")
    .regex(/[0-9]/, "Password must contain at least one number."),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(20),
  password: z
    .string()
    .min(8)
    .regex(/[A-Za-z]/, "Password must contain at least one letter.")
    .regex(/[0-9]/, "Password must contain at least one number."),
});

const twoFactorCodeSchema = z.object({
  code: z.string().min(4).max(12),
});

function frontendUrl() {
  return env.FRONTEND_URL;
}

function emailPreviewUrl(previewUrl?: string | null) {
  return env.IS_PRODUCTION ? null : previewUrl || null;
}

function makeToken() {
  return crypto.randomBytes(32).toString("hex");
}

function makeOtp() {
  return String(crypto.randomInt(100000, 999999));
}

function addMinutes(minutes: number) {
  return new Date(Date.now() + minutes * 60 * 1000);
}

function mapAuthUser(user: any) {
  const hibretName = user.hibret?.name ?? null;
  const memberName = user.member
    ? [user.member.firstName, user.member.fatherName, user.member.grandfatherName]
        .filter(Boolean)
        .join(" ") || null
    : null;

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    privileges: user.privileges,
    hibretId: user.hibretId,
    memberId: user.memberId,
    hibretName,
    memberName,
    twoFactorEnabled: Boolean(user.twoFactorEnabled),
  };
}

async function sendResetEmail(email: string, resetUrl: string) {
  return sendMail({
    to: email,
    subject: "Reset your Astedader Woreda password",
    text: `Use this link to reset your password:\n${resetUrl}\n\nIf you did not request this, ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #191C1D; line-height: 1.6;">
        <h2 style="color:#004C6B;">Astedader Woreda password reset</h2>
        <p>A password reset was requested for this account.</p>
        <p>
          <a href="${resetUrl}" style="display:inline-block;background:#00658D;color:white;padding:10px 16px;text-decoration:none;font-weight:700;">
            Reset Password
          </a>
        </p>
        <p>If the button does not work, copy this link:</p>
        <p style="word-break:break-all;">${resetUrl}</p>
        <p>If you did not request this, you can ignore this email.</p>
      </div>
    `,
  });
}

async function sendTwoFactorEmail(email: string, code: string) {
  return sendMail({
    to: email,
    subject: "Astedader Woreda verification code",
    text: `Your Astedader Woreda verification code is: ${code}\n\nThis code expires in 10 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #191C1D; line-height: 1.6;">
        <h2 style="color:#004C6B;">Astedader Woreda verification code</h2>
        <p>Use this code to continue:</p>
        <div style="font-size:28px;font-weight:800;letter-spacing:6px;background:#F8F9FA;border:1px solid #BFC7CF;padding:14px 18px;display:inline-block;">
          ${code}
        </div>
        <p>This code expires in 10 minutes.</p>
      </div>
    `,
  });
}

router.post("/login", authRateLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid login data",
      errors: parsed.error.flatten(),
    });
  }

  const email = parsed.data.email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || !user.passwordHash) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  if (user.status === "DISABLED") {
    return res.status(403).json({ message: "Account is disabled." });
  }

  const valid = await comparePassword(parsed.data.password, user.passwordHash);

  if (!valid) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  // Email verification is required on every login after password validation.
  const code = makeOtp();
  const twoFactorLoginToken = makeToken();
  const twoFactorCodeHash = await bcrypt.hash(code, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      twoFactorLoginToken,
      twoFactorLoginExpiresAt: addMinutes(10),
      twoFactorCodeHash,
      twoFactorCodeExpiresAt: addMinutes(10),
    },
  });

  let emailResult: { previewUrl?: string | null; skipped?: boolean } = {
    previewUrl: null,
  };

  try {
    emailResult = await sendTwoFactorEmail(user.email, code);
  } catch (error) {
    console.error("Unable to send 2FA email:", error);
  }

  if (emailResult.skipped && !env.IS_PRODUCTION) {
    console.warn(`[auth] OTP for ${user.email}: ${code}`);
  }

  return res.json({
    twoFactorRequired: true,
    twoFactorToken: twoFactorLoginToken,
    previewUrl: emailPreviewUrl(emailResult.previewUrl),
    message: "Verification code sent to your email.",
  });
});

router.post("/login/2fa", authRateLimiter, async (req, res) => {
  const parsed = twoFactorLoginSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid verification data",
      errors: parsed.error.flatten(),
    });
  }

  const user = await prisma.user.findFirst({
    where: {
      twoFactorLoginToken: parsed.data.twoFactorToken,
      twoFactorLoginExpiresAt: {
        gt: new Date(),
      },
      twoFactorCodeExpiresAt: {
        gt: new Date(),
      },
    },
  });

  if (!user || !user.twoFactorCodeHash) {
    return res.status(401).json({ message: "Verification code is invalid or expired." });
  }

  const valid = await bcrypt.compare(parsed.data.code.trim(), user.twoFactorCodeHash);

  if (!valid) {
    return res.status(401).json({ message: "Verification code is invalid or expired." });
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      lastLoginAt: new Date(),
      twoFactorLoginToken: null,
      twoFactorLoginExpiresAt: null,
      twoFactorCodeHash: null,
      twoFactorCodeExpiresAt: null,
    },
  });

  const token = signToken({
    userId: updatedUser.id,
    role: updatedUser.role,
  });

  return res.json({
    token,
    user: mapAuthUser(updatedUser),
  });
});

router.post("/forgot-password", authSensitiveLimiter, async (req, res) => {
  const parsed = forgotPasswordSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Enter a valid email address.",
      errors: parsed.error.flatten(),
    });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });

  // Do not reveal if an email exists.
  if (!user || user.status === "DISABLED") {
    return res.json({
      message: "If the email exists, a password reset link has been sent.",
    });
  }

  const resetToken = makeToken();
  const resetUrl = `${frontendUrl()}/reset-password?token=${encodeURIComponent(resetToken)}`;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetToken,
      resetTokenExpiresAt: addMinutes(30),
    },
  });

  const emailResult = await sendResetEmail(user.email, resetUrl);

  return res.json({
    message: "If the email exists, a password reset link has been sent.",
    previewUrl: emailPreviewUrl(emailResult.previewUrl),
  });
});

router.get("/reset-token/:token", async (req, res) => {
  const token = String(req.params.token);

  const user = await prisma.user.findFirst({
    where: {
      resetToken: token,
      resetTokenExpiresAt: {
        gt: new Date(),
      },
    },
    select: {
      email: true,
    },
  });

  if (!user) {
    return res.status(404).json({ message: "Reset link is invalid or expired." });
  }

  return res.json({
    account: {
      email: user.email,
    },
  });
});

router.post("/reset-password", authSensitiveLimiter, async (req, res) => {
  const parsed = resetPasswordSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid reset data",
      errors: parsed.error.flatten(),
    });
  }

  const user = await prisma.user.findFirst({
    where: {
      resetToken: parsed.data.token,
      resetTokenExpiresAt: {
        gt: new Date(),
      },
    },
  });

  if (!user) {
    return res.status(404).json({ message: "Reset link is invalid or expired." });
  }

  const passwordHash = await hashPassword(parsed.data.password);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      resetToken: null,
      resetTokenExpiresAt: null,
      setupToken: null,
      status: "ACTIVE",
      twoFactorLoginToken: null,
      twoFactorLoginExpiresAt: null,
      twoFactorCodeHash: null,
      twoFactorCodeExpiresAt: null,
    },
  });

  return res.json({ message: "Password reset successfully. You can now sign in." });
});

router.get("/setup-token/:token", async (req, res) => {
  const token = String(req.params.token);

  const user = await prisma.user.findFirst({
    where: {
      setupToken: token,
      status: "PENDING_SETUP",
    },
    include: {
      member: true,
      hibret: true,
    },
  });

  if (!user) {
    return res.status(404).json({ message: "Setup link is invalid or already used." });
  }

  return res.json({
    account: {
      email: user.email,
      role: user.role,
      memberName: user.member
        ? [user.member.firstName, user.member.fatherName, user.member.grandfatherName]
            .filter(Boolean)
            .join(" ")
        : null,
      hibretName: user.hibret?.name ?? null,
    },
  });
});

router.post("/setup-account", authSensitiveLimiter, async (req, res) => {
  const parsed = setupAccountSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid setup data",
      errors: parsed.error.flatten(),
    });
  }

  const user = await prisma.user.findFirst({
    where: {
      setupToken: parsed.data.token,
      status: "PENDING_SETUP",
    },
  });

  if (!user) {
    return res.status(404).json({ message: "Setup link is invalid or already used." });
  }

  const passwordHash = await hashPassword(parsed.data.password);

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      setupToken: null,
      status: "ACTIVE",
    },
  });

  const token = signToken({
    userId: updatedUser.id,
    role: updatedUser.role,
  });

  return res.json({
    token,
    user: mapAuthUser(updatedUser),
  });
});

router.post("/change-password", authMiddleware, async (req, res) => {
  const parsed = changePasswordSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid password data",
      errors: parsed.error.flatten(),
    });
  }

  if (parsed.data.currentPassword === parsed.data.newPassword) {
    return res.status(400).json({
      message: "New password must be different from the current password.",
    });
  }

  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "Authentication required." });
  }

  const user = await prisma.user.findUnique({
    where: { id: String(userId) },
  });

  if (!user || !user.passwordHash) {
    return res.status(404).json({ message: "Account not found." });
  }

  const currentPasswordIsValid = await comparePassword(
    parsed.data.currentPassword,
    user.passwordHash
  );

  if (!currentPasswordIsValid) {
    return res.status(400).json({ message: "Current password is incorrect." });
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      resetToken: null,
      resetTokenExpiresAt: null,
    },
  });

  return res.json({ message: "Password updated successfully." });
});

router.get("/2fa/status", authMiddleware, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: String(req.user?.id) },
    select: {
      twoFactorEnabled: true,
      email: true,
    },
  });

  if (!user) {
    return res.status(404).json({ message: "Account not found." });
  }

  return res.json({
    twoFactorEnabled: user.twoFactorEnabled,
    email: user.email,
  });
});

router.post("/2fa/request", authMiddleware, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: String(req.user?.id) },
  });

  if (!user) {
    return res.status(404).json({ message: "Account not found." });
  }

  const code = makeOtp();
  const twoFactorCodeHash = await bcrypt.hash(code, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      twoFactorCodeHash,
      twoFactorCodeExpiresAt: addMinutes(10),
    },
  });

  const emailResult = await sendTwoFactorEmail(user.email, code);

  return res.json({
    message: "Verification code sent to your email.",
    previewUrl: emailPreviewUrl(emailResult.previewUrl),
  });
});

router.post("/2fa/enable", authMiddleware, async (req, res) => {
  const parsed = twoFactorCodeSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid verification code.",
      errors: parsed.error.flatten(),
    });
  }

  const user = await prisma.user.findFirst({
    where: {
      id: String(req.user?.id),
      twoFactorCodeExpiresAt: {
        gt: new Date(),
      },
    },
  });

  if (!user || !user.twoFactorCodeHash) {
    return res.status(400).json({ message: "Verification code is invalid or expired." });
  }

  const valid = await bcrypt.compare(parsed.data.code.trim(), user.twoFactorCodeHash);

  if (!valid) {
    return res.status(400).json({ message: "Verification code is invalid or expired." });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      twoFactorEnabled: true,
      twoFactorCodeHash: null,
      twoFactorCodeExpiresAt: null,
    },
  });

  return res.json({ message: "Two-factor authentication enabled." });
});

router.post("/2fa/disable", authMiddleware, async (req, res) => {
  const parsed = changePasswordSchema.pick({ currentPassword: true }).safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Current password is required.",
      errors: parsed.error.flatten(),
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: String(req.user?.id) },
  });

  if (!user || !user.passwordHash) {
    return res.status(404).json({ message: "Account not found." });
  }

  const valid = await comparePassword(parsed.data.currentPassword, user.passwordHash);

  if (!valid) {
    return res.status(400).json({ message: "Current password is incorrect." });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      twoFactorEnabled: false,
      twoFactorLoginToken: null,
      twoFactorLoginExpiresAt: null,
      twoFactorCodeHash: null,
      twoFactorCodeExpiresAt: null,
    },
  });

  return res.json({ message: "Two-factor authentication disabled." });
});

router.get("/me", authMiddleware, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: String(req.user?.id) },
    include: {
      hibret: {
        select: { name: true },
      },
      member: {
        select: {
          firstName: true,
          fatherName: true,
          grandfatherName: true,
        },
      },
    },
  });

  if (!user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  return res.json({ user: mapAuthUser(user) });
});

export default router;
