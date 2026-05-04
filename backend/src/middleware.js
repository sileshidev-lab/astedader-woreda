import multer from "multer";
import path from "path";
import fs from "fs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { config } from "./config.js";
import { createError, hasPrivilege } from "./utils.js";

if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, config.uploadDir),
  filename: (_req, file, cb) => {
    const safeExt = path.extname(file.originalname || "").slice(0, 20);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
});

export function requireAuth(req, _res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) return next(createError(401, "Missing token"));

  try {
    req.user = jwt.verify(token, config.jwtSecret);
    return next();
  } catch {
    return next(createError(401, "Invalid token"));
  }
}

export function requireRole(...roles) {
  return function roleGuard(req, _res, next) {
    if (!req.user) return next(createError(401, "Authentication required"));
    if (!roles.includes(req.user.role)) return next(createError(403, "Forbidden"));
    return next();
  };
}

export function requirePrivilege(privilege) {
  return function privilegeGuard(req, _res, next) {
    if (!req.user) return next(createError(401, "Authentication required"));
    if (!hasPrivilege(req.user, privilege)) return next(createError(403, "Missing privilege"));
    return next();
  };
}

export function validate(schema) {
  return function validationGuard(req, _res, next) {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      return next(createError(400, result.error.issues.map((i) => i.message).join(", ")));
    }

    req.validated = result.data;
    return next();
  };
}

export function notFound(req, _res, next) {
  next(createError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

export function errorHandler(error, _req, res, _next) {
  const status = error.status || 500;
  if (status >= 500) {
    console.error(error);
  }
  res.status(status).json({
    message: error.message || "Internal server error",
  });
}
