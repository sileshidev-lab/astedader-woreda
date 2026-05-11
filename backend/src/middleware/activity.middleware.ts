import type { NextFunction, Request, Response } from "express";
import { recordActivity } from "../modules/activity/activity.service";

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function getTargetType(path: string) {
  const cleanPath = path.split("?")[0] || "/";
  const firstSegment = cleanPath.split("/").filter(Boolean)[0];

  if (!firstSegment) return "system";

  return firstSegment
    .replace(/-/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "")
    .toLowerCase();
}

function getOperation(req: Request) {
  const targetType = getTargetType(req.originalUrl || req.url);
  const method = req.method.toUpperCase();

  if (targetType === "auth" && req.originalUrl.includes("/login/2fa")) {
    return "auth.login_2fa";
  }

  if (targetType === "auth" && req.originalUrl.includes("/login")) {
    return "auth.login";
  }

  if (targetType === "auth" && req.originalUrl.includes("/forgot-password")) {
    return "auth.forgot_password";
  }

  if (targetType === "auth" && req.originalUrl.includes("/reset-password")) {
    return "auth.reset_password";
  }

  if (targetType === "auth" && req.originalUrl.includes("/setup-account")) {
    return "auth.setup_account";
  }

  return `${targetType}.${method.toLowerCase()}`;
}

function shouldSkip(req: Request) {
  const path = req.originalUrl || req.url || "";

  if (!WRITE_METHODS.has(req.method.toUpperCase())) return true;
  if (path.startsWith("/health")) return true;
  if (path.startsWith("/notifications") && path.includes("/read")) return false;

  return false;
}

function actorEmailFromBody(req: Request) {
  const body = req.body as any;

  if (body && typeof body.email === "string") {
    return body.email.trim().toLowerCase();
  }

  return null;
}

export function activityMiddleware(req: Request, res: Response, next: NextFunction) {
  if (shouldSkip(req)) {
    return next();
  }

  const startedAt = Date.now();

  res.on("finish", () => {
    const user = req.user;

    void recordActivity({
      actorUserId: user?.id ?? null,
      actorEmail: user?.email ?? actorEmailFromBody(req),
      actorRole: user?.role ?? null,
      operation: getOperation(req),
      targetType: getTargetType(req.originalUrl || req.url),
      targetName: req.params ? Object.values(req.params).filter(Boolean).join(", ") || null : null,
      description: `${req.method.toUpperCase()} ${req.originalUrl || req.url} completed with ${res.statusCode}`,
      metadata: {
        method: req.method.toUpperCase(),
        path: req.originalUrl || req.url,
        statusCode: res.statusCode,
        durationMs: Date.now() - startedAt,
        params: req.params,
        query: req.query,
        body: req.body,
      },
    });
  });

  return next();
}
