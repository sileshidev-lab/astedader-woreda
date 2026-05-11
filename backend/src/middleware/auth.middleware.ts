import type { NextFunction, Request, Response } from "express";
import { prisma } from "../prisma/client";
import { verifyToken } from "../utils/jwt";

function queryTokenAllowed(req: Request) {
  const originalUrl = req.originalUrl || req.url || "";

  // Query tokens are intentionally allowed only for browser-opened file/export links.
  // Normal API authentication should use Authorization: Bearer <token>.
  return (
    originalUrl.startsWith("/files/") ||
    originalUrl.includes("/export") ||
    originalUrl.includes("export") ||
    originalUrl.includes("/download") ||
    originalUrl.includes("/preview")
  );
}

function getRequestToken(req: Request) {
  const authHeader = req.headers.authorization;

  const headerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : undefined;

  const queryToken =
    queryTokenAllowed(req) && typeof req.query.token === "string"
      ? req.query.token
      : undefined;

  return headerToken || queryToken;
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const token = getRequestToken(req);

  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const payload = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: {
        id: payload.userId,
      },
      include: {
        hibret: {
          select: {
            name: true,
          },
        },
        member: {
          select: {
            firstName: true,
            fatherName: true,
          },
        },
      },
    });

    if (!user || user.status === "DISABLED") {
      return res.status(401).json({ message: "Authentication required" });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      privileges: user.privileges,
      hibretId: user.hibretId,
      memberId: user.memberId,
      hibretName: user.hibret?.name ?? null,
      memberName: user.member
        ? `${user.member.firstName} ${user.member.fatherName}`
        : null,
    };

    return next();
  } catch {
    return res.status(401).json({ message: "Authentication required" });
  }
}
