"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMail = sendMail;
exports.buildSetupEmail = buildSetupEmail;
const nodemailer_1 = __importDefault(require("nodemailer"));
function escapeHtml(value) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
function createTransporter() {
    return nodemailer_1.default.createTransport({
        host: process.env.SMTP_HOST || "smtp.ethereal.email",
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
}
async function sendMail(input) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn("SMTP_USER or SMTP_PASS is missing. Email was not sent.");
        return {
            messageId: null,
            previewUrl: null,
            skipped: true,
        };
    }
    const transporter = createTransporter();
    const info = await transporter.sendMail({
        from: process.env.SMTP_FROM || "Astedader Woreda <no-reply@astedader.local>",
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
    });
    const previewUrl = nodemailer_1.default.getTestMessageUrl(info);
    if (previewUrl && process.env.NODE_ENV !== "production") {
        console.log("Ethereal preview URL:", previewUrl);
    }
    return {
        messageId: info.messageId,
        previewUrl: previewUrl || null,
        skipped: false,
    };
}
function buildSetupEmail({ memberName, setupUrl, }) {
    const safeMemberName = escapeHtml(memberName);
    const safeSetupUrl = escapeHtml(setupUrl);
    return {
        subject: "Set up your Astedader Woreda account",
        text: `Hello ${memberName},

Your Astedader Woreda account has been created.

Set your password using this link:
${setupUrl}

If you did not expect this email, please ignore it.`,
        html: `
      <div style="font-family: Arial, sans-serif; color: #191C1D; line-height: 1.6;">
        <h2 style="color: #004C6B;">Astedader Woreda account setup</h2>
        <p>Hello <strong>${safeMemberName}</strong>,</p>
        <p>Your account has been created. Use the button below to set your password.</p>
        <p>
          <a href="${safeSetupUrl}" style="display:inline-block;background:#00658D;color:#ffffff;padding:10px 16px;text-decoration:none;font-weight:700;">
            Set Password
          </a>
        </p>
        <p>If the button does not work, copy this link:</p>
        <p style="word-break:break-all;">${safeSetupUrl}</p>
      </div>
    `,
    };
}
