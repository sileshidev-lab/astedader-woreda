import nodemailer from "nodemailer";
import { config } from "./config.js";

function hasSmtpConfig() {
  return Boolean(
    config.smtp &&
    config.smtp.host &&
    config.smtp.user &&
    config.smtp.pass
  );
}

export function getTransporter() {
  if (!hasSmtpConfig()) return null;

  return nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port || 587,
    secure: Boolean(config.smtp.secure),
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass,
    },
  });
}

export async function sendEmail({ to, subject, text, html }) {
  const transporter = getTransporter();

  if (!transporter) {
    console.log("SMTP not configured. Email not sent.");
    console.log({ to, subject, text });
    return { sent: false, previewUrl: null };
  }

  const info = await transporter.sendMail({
    from: config.emailFrom,
    to,
    subject,
    text,
    html,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);

  return {
    sent: true,
    messageId: info.messageId,
    previewUrl,
  };
}

export async function sendSetupEmail({ to, token }) {
  const setupUrl = `${config.frontendBaseUrl}/setup-account?token=${token}`;

  return sendEmail({
    to,
    subject: "Set up your Astedader Woreda account",
    text: `Your Astedader Woreda account has been created.

Open this link to set your password:
${setupUrl}

If you did not expect this email, ignore it.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Astedader Woreda Account Setup</h2>
        <p>Your Astedader Woreda account has been created.</p>
        <p>
          <a href="${setupUrl}" style="background:#00658D;color:white;padding:10px 14px;text-decoration:none;border-radius:6px;">
            Set up account
          </a>
        </p>
        <p>Or copy this link:</p>
        <p>${setupUrl}</p>
        <p>If you did not expect this email, ignore it.</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail({ to, token }) {
  const resetUrl = `${config.frontendBaseUrl}/reset-password?token=${token}`;

  return sendEmail({
    to,
    subject: "Reset your Astedader Woreda password",
    text: `A password reset was requested for your Astedader Woreda account.

Open this link to reset your password:
${resetUrl}

This link expires soon. If you did not request it, ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Astedader Woreda Password Reset</h2>
        <p>A password reset was requested for your account.</p>
        <p>
          <a href="${resetUrl}" style="background:#00658D;color:white;padding:10px 14px;text-decoration:none;border-radius:6px;">
            Reset password
          </a>
        </p>
        <p>Or copy this link:</p>
        <p>${resetUrl}</p>
        <p>If you did not request this, ignore this email.</p>
      </div>
    `,
  });
}
