"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const env_1 = require("./config/env");
const auth_routes_1 = __importDefault(require("./modules/auth/auth.routes"));
const announcement_routes_1 = __importDefault(require("./modules/announcements/announcement.routes"));
const hibret_routes_1 = __importDefault(require("./modules/hibrets/hibret.routes"));
const members_routes_1 = __importDefault(require("./modules/members/members.routes"));
const admins_routes_1 = __importDefault(require("./modules/admins/admins.routes"));
const report_routes_1 = __importDefault(require("./modules/reports/report.routes"));
const attendance_routes_1 = __importDefault(require("./modules/attendance/attendance.routes"));
const export_routes_1 = __importDefault(require("./modules/exports/export.routes"));
const gallery_routes_1 = __importDefault(require("./modules/gallery/gallery.routes"));
const broadcasts_routes_1 = __importDefault(require("./modules/broadcasts/broadcasts.routes"));
const resources_routes_1 = __importDefault(require("./modules/resources/resources.routes"));
const file_routes_1 = __importDefault(require("./modules/files/file.routes"));
const notifications_routes_1 = __importDefault(require("./modules/notifications/notifications.routes"));
const users_routes_1 = __importDefault(require("./modules/users/users.routes"));
const dashboard_routes_1 = __importDefault(require("./modules/dashboard/dashboard.routes"));
const activity_routes_1 = __importDefault(require("./modules/activity/activity.routes"));
const activity_middleware_1 = require("./middleware/activity.middleware");
const app = (0, express_1.default)();
function isAllowedOrigin(origin) {
    if (!origin)
        return true;
    if (!env_1.env.IS_PRODUCTION)
        return true;
    return env_1.env.CORS_ORIGINS.includes(origin);
}
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "blob:", ...env_1.env.CORS_ORIGINS],
            mediaSrc: ["'self'", "data:", "blob:", ...env_1.env.CORS_ORIGINS],
        },
    },
}));
app.use((0, cors_1.default)({
    origin(origin, callback) {
        if (isAllowedOrigin(origin)) {
            callback(null, true);
            return;
        }
        callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true,
}));
app.use(express_1.default.json({ limit: "20mb" }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cookie_parser_1.default)());
app.use((0, morgan_1.default)(env_1.env.IS_PRODUCTION ? "combined" : "dev"));
app.use(activity_middleware_1.activityMiddleware);
app.get("/health", (_req, res) => {
    res.json({
        status: "ok",
        service: "astedader-woreda-backend",
        environment: env_1.env.NODE_ENV,
    });
});
app.use("/auth", auth_routes_1.default);
app.use("/", export_routes_1.default);
app.use("/", gallery_routes_1.default);
app.use("/announcements", announcement_routes_1.default);
app.use("/hibrets", hibret_routes_1.default);
app.use("/members", members_routes_1.default);
app.use("/admins", admins_routes_1.default);
app.use("/", attendance_routes_1.default);
app.use("/", report_routes_1.default);
app.use("/broadcasts", broadcasts_routes_1.default);
app.use("/resources", resources_routes_1.default);
app.use("/files", file_routes_1.default);
app.use("/notifications", notifications_routes_1.default);
app.use("/users", users_routes_1.default);
app.use("/activity", activity_routes_1.default);
app.use(dashboard_routes_1.default);
exports.default = app;
