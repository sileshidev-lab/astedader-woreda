// Status → shadcn Badge variant mapping, shared by every page that renders
// status pills or activity chips. Keep this in sync with the variants exposed
// by `@/components/ui/shadcn/badge`.

export type BadgeStatusVariant =
  | "default"
  | "secondary"
  | "success"
  | "warning"
  | "destructive"
  | "outline"
  | "muted";

/**
 * Map an arbitrary backend/status string to a shadcn Badge variant.
 *
 * Conventions:
 * - success: approved, submitted, active, published, completed, paid, ok, sent
 * - warning: pending, draft, candidate, review, in_progress, queued
 * - destructive: rejected, overdue, disabled, banned, failed, error, closed_negative
 * - default (primary tint): info-like states (published is success above; this is for "open"/"new")
 * - secondary: neutral / fallback
 *
 * The matcher is intentionally permissive and case-insensitive so it can
 * absorb the variety of status spellings the API returns.
 */
export function statusToBadgeVariant(
  status: string | null | undefined,
): BadgeStatusVariant {
  if (!status) return "secondary";

  const normalized = String(status).toLowerCase().replace(/[\s_-]+/g, "");

  // Success-ish
  if (
    normalized.includes("approved") ||
    normalized.includes("submitted") ||
    normalized.includes("active") ||
    normalized.includes("published") ||
    normalized.includes("completed") ||
    normalized.includes("complete") ||
    normalized.includes("paid") ||
    normalized.includes("sent") ||
    normalized.includes("delivered") ||
    normalized.includes("success") ||
    normalized.includes("ok")
  ) {
    return "success";
  }

  // Warning-ish
  if (
    normalized.includes("pending") ||
    normalized.includes("draft") ||
    normalized.includes("candidate") ||
    normalized.includes("review") ||
    normalized.includes("inprogress") ||
    normalized.includes("processing") ||
    normalized.includes("queued") ||
    normalized.includes("warning") ||
    normalized.includes("await")
  ) {
    return "warning";
  }

  // Destructive-ish
  if (
    normalized.includes("rejected") ||
    normalized.includes("overdue") ||
    normalized.includes("disabled") ||
    normalized.includes("banned") ||
    normalized.includes("failed") ||
    normalized.includes("error") ||
    normalized.includes("blocked") ||
    normalized.includes("archived") ||
    normalized.includes("deleted") ||
    normalized.includes("expired")
  ) {
    return "destructive";
  }

  return "secondary";
}
