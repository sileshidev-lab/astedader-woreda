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
    <div className="group flex items-start justify-between gap-3 rounded-3xl border border-woreda-border/70 bg-woreda-surface px-4 py-4">
      <div className="flex min-w-0 items-start gap-3">
        <div className="mt-0.5 rounded-2xl border border-woreda-border bg-woreda-surfaceLow p-2 text-woreda-textMuted">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-woreda-text">{file.originalName}</p>
          <p className="mt-1 text-xs font-semibold text-woreda-textMuted">
            {file.mimeType} · {Math.round(file.sizeBytes / 1024)} KB
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              className="rounded-2xl border border-woreda-border bg-woreda-surface px-3 py-2 text-xs font-black text-woreda-text hover:border-woreda-primary hover:text-woreda-primary"
              href={filePreviewUrl(file.id)}
              target="_blank"
              rel="noreferrer"
            >
              View
            </a>
            <a
              className="rounded-2xl bg-woreda-primary px-3 py-2 text-xs font-black text-white hover:brightness-105"
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

