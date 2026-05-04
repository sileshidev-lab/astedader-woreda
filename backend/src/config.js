import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || "change-this-dev-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  uploadDir: process.env.UPLOAD_DIR || "uploads",
  appBaseUrl: process.env.APP_BASE_URL || "http://localhost:4000",
  frontendBaseUrl: process.env.FRONTEND_BASE_URL || "http://localhost:5173",
  emailFrom: process.env.EMAIL_FROM || "Astedader Woreda <no-reply@astedader.local>",

  smtp: {
    host: process.env.SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
};
