import type { Broadcast } from "../../../services/contentService";
import { getAuthenticatedExportUrl } from "../../../services/announcementService";

export function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function formatBroadcastDate(value?: string | null) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatBroadcastDateTime(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

export function addInlineParam(url: string) {
  if (url.includes("inline=true")) return url;
  return `${url}${url.includes("?") ? "&" : "?"}inline=true`;
}

export function fileInlineUrl(fileId: string) {
  return addInlineParam(getAuthenticatedExportUrl(`/files/${fileId}/download`));
}

export function filePreviewUrl(fileId: string) {
  return getAuthenticatedExportUrl(`/files/${fileId}/preview`);
}

export function isImageFile(file: { mimeType?: string | null; originalName?: string | null }) {
  const mime = file.mimeType || "";
  const name = (file.originalName || "").toLowerCase();

  return (
    mime.startsWith("image/") ||
    name.endsWith(".png") ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".gif") ||
    name.endsWith(".webp")
  );
}

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function makeCoverMarker(url: string) {
  return `<!-- broadcast-cover-url:${url} -->`;
}

export function extractCoverMarker(html: string) {
  const match = html.match(/<!--\s*broadcast-cover-url:([\s\S]*?)-->/);
  return match?.[1]?.trim() || "";
}

export function removeCoverMarkers(html: string) {
  return html.replace(/<!--\s*broadcast-cover-url:[\s\S]*?-->/g, "");
}

export function rewriteBodyFileUrls(html: string) {
  if (!html) return "";

  return html.replace(
    /(?:https?:\/\/[^"')\s]+)?\/files\/([a-zA-Z0-9_-]+)\/download(?:\?[^"')\s]*)?/g,
    (_match, fileId: string) => fileInlineUrl(fileId)
  );
}

export function extractFirstBodyImage(html: string) {
  const normalized = rewriteBodyFileUrls(html);

  const imgMatch = normalized.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch?.[1]) return imgMatch[1];

  return "";
}

export function broadcastImageUrl(item: Broadcast) {
  if (item.coverFileId) return fileInlineUrl(item.coverFileId);

  const markedCover = extractCoverMarker(item.bodyHtml);
  if (markedCover) return markedCover;

  const bodyImage = extractFirstBodyImage(item.bodyHtml);
  if (bodyImage) return bodyImage;

  const imageAttachment = item.attachments.find((attachment) => isImageFile(attachment.file));
  if (imageAttachment) return fileInlineUrl(imageAttachment.file.id);

  return "";
}

export function visibleAttachments(item: Broadcast) {
  const heroImageAttachment = item.attachments.find((attachment) => isImageFile(attachment.file));
  const heroImageAttachmentId = heroImageAttachment?.file.id;
  const hasCover = Boolean(item.coverFileId || extractCoverMarker(item.bodyHtml) || extractFirstBodyImage(item.bodyHtml));

  return item.attachments.filter((attachment) => {
    if (hasCover && heroImageAttachmentId && attachment.file.id === heroImageAttachmentId) {
      return false;
    }

    return true;
  });
}

export function audienceLabel(targetRoles: string[]) {
  const admins = targetRoles.includes("HIBRET_ADMIN");
  const members = targetRoles.includes("MEMBER");

  if (admins && members) return "Admins and Members";
  if (admins) return "Admins Only";
  if (members) return "Members Only";
  return "No audience";
}
