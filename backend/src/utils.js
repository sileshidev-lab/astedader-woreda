import crypto from "crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { config } from "./config.js";
import { prisma } from "./db.js";

export function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function createError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export function sanitizeUser(user) {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe;
}

export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function randomToken() {
  return crypto.randomBytes(32).toString("hex");
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      privileges: user.privileges || [],
      hibretId: user.hibretId || null,
      familyId: user.familyId || null,
      memberId: user.memberId || null,
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

export function getPagination(req) {
  const page = Math.max(Number(req.query.page || 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 100);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

export function listResponse(data, page, limit, total) {
  return {
    data,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export function hasPrivilege(user, privilege) {
  if (!user) return false;
  const privileges = user.privileges || [];
  return privileges.includes("*") || privileges.includes(privilege);
}

export function requireOwnerScope(user, record) {
  if (user.role === "woreda_admin") return true;
  if (user.role === "hibret_admin") return record?.hibretId === user.hibretId;
  if (user.role === "family_admin") return record?.familyId === user.familyId;
  if (user.role === "member") return record?.memberId === user.memberId || record?.id === user.memberId;
  return false;
}

export async function logActivity(req, operation, targetType, targetId, description, metadata = {}) {
  try {
    await prisma.activityLog.create({
      data: {
        actorUserId: req.user?.sub || null,
        actorEmail: req.user?.email || null,
        actorRole: req.user?.role || null,
        operation,
        targetType,
        targetId: targetId || null,
        description,
        metadata,
      },
    });
  } catch (error) {
    console.error("Activity logging failed:", error.message);
  }
}

export function sendCsv(res, filename, rows) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const keys = Array.from(
    safeRows.reduce((set, row) => {
      Object.keys(row || {}).forEach((key) => set.add(key));
      return set;
    }, new Set())
  );

  const escape = (value) => {
    if (value === null || value === undefined) return "";
    const text = typeof value === "object" ? JSON.stringify(value) : String(value);
    return `"${text.replaceAll('"', '""')}"`;
  };

  const csv = [
    keys.join(","),
    ...safeRows.map((row) => keys.map((key) => escape(row[key])).join(",")),
  ].join("\n");

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(csv);
}

export function buildSearchWhere(search, fields) {
  if (!search) return {};
  return {
    OR: fields.map((field) => ({
      [field]: { contains: String(search), mode: "insensitive" },
    })),
  };
}
