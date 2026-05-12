import { FileText, Image as ImageIcon, Video } from "lucide-react";
import type { ReactNode } from "react";
import { fileDownloadUrl, filePreviewUrl } from "../../services/fileService";

function isImage(mime?: string | null) {
  return Boolean(mime && mime.startsWith("image/"));
}

function isVideo(mime?: string | null) {
  return Boolean(mime && mime.startsWith("video/"));
}

export function FilePreviewCard({
  file,
  actions,
}: {
  file: { id: string; originalName: string; mimeType: string; sizeBytes: number };
  actions?: ReactNode;
}) {
  const icon = isImage(file.mimeType) ? (
    <ImageIcon size={18} aria-hidden />
  ) : isVideo(file.mimeType) ? (
    <Video size={18} aria-hidden />
  ) : (
    <FileText size={18} aria-hidden />
  );

  return (
    <div
      className="group flex items-start justify-between gap-3 rounded-lg border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] px-4 py-4 transition hover:border-[var(--aw-border)]"
      style={{ boxShadow: "var(--aw-shadow-xs)" }}
    >
      <div className="flex min-w-0 items-start gap-3">
        <div
          className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-md border border-[var(--aw-border-soft)] text-[var(--aw-primary)]"
          style={{ background: "var(--aw-primary-softer)" }}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-semibold text-[var(--aw-text-strong)]">
            {file.originalName}
          </p>
          <p className="mt-1 text-xs font-medium text-[var(--aw-muted)]">
            {file.mimeType} · {Math.round(file.sizeBytes / 1024)} KB
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              className="inline-flex items-center rounded-md border border-[var(--aw-border)] bg-[var(--aw-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--aw-text)] transition hover:border-[var(--aw-primary)] hover:bg-[var(--aw-primary-softer)] hover:text-[var(--aw-primary)]"
              href={filePreviewUrl(file.id)}
              target="_blank"
              rel="noreferrer"
            >
              View
            </a>
            <a
              className="inline-flex items-center rounded-md border border-[var(--aw-primary)] bg-[var(--aw-primary)] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--aw-primary-dark)]"
              href={fileDownloadUrl(file.id)}
              target="_blank"
              rel="noreferrer"
            >
              Download
            </a>
          </div>
        </div>
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}
