import type { Prisma } from "@prisma/client";
import { prisma } from "../../prisma/client";

type ActivityInput = {
  actorUserId?: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  operation: string;
  targetType?: string | null;
  targetName?: string | null;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
};

const SENSITIVE_KEYS = new Set([
  "password",
  "passwordHash",
  "newPassword",
  "currentPassword",
  "confirmPassword",
  "token",
  "accessToken",
  "refreshToken",
  "twoFactorToken",
  "twoFactorCode",
  "code",
  "authorization",
  "cookie",
]);

function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.slice(0, 25).map(sanitizeValue);
  }

  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};

    for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        output[key] = "[hidden]";
        continue;
      }

      output[key] = sanitizeValue(nestedValue);
    }

    return output;
  }

  if (typeof value === "string" && value.length > 500) {
    return `${value.slice(0, 500)}...`;
  }

  return value;
}

export function sanitizeActivityMetadata(
  metadata?: Record<string, unknown> | null
): Prisma.InputJsonValue | undefined {
  if (!metadata) return undefined;

  // JSON stringify/parse removes undefined and guarantees a JSON-safe object
  // before passing it to Prisma's Json field.
  return JSON.parse(JSON.stringify(sanitizeValue(metadata))) as Prisma.InputJsonValue;
}

export async function recordActivity(input: ActivityInput) {
  try {
    await prisma.activityLog.create({
      data: {
        actorUserId: input.actorUserId ?? null,
        actorEmail: input.actorEmail ?? null,
        actorRole: input.actorRole ?? null,
        operation: input.operation,
        targetType: input.targetType ?? null,
        targetName: input.targetName ?? null,
        description: input.description ?? null,
        metadata: sanitizeActivityMetadata(input.metadata),
      },
    });
  } catch (error) {
    console.error("Failed to record activity log:", error);
  }
}
