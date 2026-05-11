import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import { env } from "./config/env";
import authRoutes from "./modules/auth/auth.routes";
import announcementRoutes from "./modules/announcements/announcement.routes";
import hibretRoutes from "./modules/hibrets/hibret.routes";
import memberRoutes from "./modules/members/members.routes";
import adminRoutes from "./modules/admins/admins.routes";
import reportRoutes from "./modules/reports/report.routes";
import attendanceRoutes from "./modules/attendance/attendance.routes";
import exportRoutes from "./modules/exports/export.routes";
import galleryRoutes from "./modules/gallery/gallery.routes";
import broadcastRoutes from "./modules/broadcasts/broadcasts.routes";
import resourceRoutes from "./modules/resources/resources.routes";
import fileRoutes from "./modules/files/file.routes";
import notificationRoutes from "./modules/notifications/notifications.routes";
import userRoutes from "./modules/users/users.routes";
import dashboardRoutes from "./modules/dashboard/dashboard.routes";
import activityRoutes from "./modules/activity/activity.routes";
import { activityMiddleware } from "./middleware/activity.middleware";

const app = express();

function isAllowedOrigin(origin?: string) {
  if (!origin) return true;
  if (!env.IS_PRODUCTION) return true;
  return env.CORS_ORIGINS.includes(origin);
}

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "blob:", ...env.CORS_ORIGINS],
        mediaSrc: ["'self'", "data:", "blob:", ...env.CORS_ORIGINS],
      },
    },
  })
);

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan(env.IS_PRODUCTION ? "combined" : "dev"));
app.use(activityMiddleware);

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "astedader-woreda-backend",
    environment: env.NODE_ENV,
  });
});

app.use("/auth", authRoutes);
app.use("/", exportRoutes);
app.use("/", galleryRoutes);
app.use("/announcements", announcementRoutes);
app.use("/hibrets", hibretRoutes);
app.use("/members", memberRoutes);
app.use("/admins", adminRoutes);
app.use("/", attendanceRoutes);
app.use("/", reportRoutes);
app.use("/broadcasts", broadcastRoutes);
app.use("/resources", resourceRoutes);
app.use("/files", fileRoutes);
app.use("/notifications", notificationRoutes);
app.use("/users", userRoutes);
app.use("/activity", activityRoutes);
app.use(dashboardRoutes);

export default app;
