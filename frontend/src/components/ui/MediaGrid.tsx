import { fileDownloadUrl } from "../../services/fileService";

function isImage(mime?: string | null) {
  return Boolean(mime && mime.startsWith("image/"));
}

function isVideo(mime?: string | null) {
  return Boolean(mime && mime.startsWith("video/"));
}

export function MediaGrid({
  items,
}: {
  items: Array<{ id: string; originalName: string; mimeType: string; sizeBytes: number }>;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
      {items.map((file) => (
        <a
          key={file.id}
          href={fileDownloadUrl(file.id, { inline: true })}
          target="_blank"
          rel="noreferrer"
          className="group overflow-hidden rounded-3xl border border-woreda-border/70 bg-woreda-surface shadow-sm"
        >
          <div className="aspect-[4/3] bg-woreda-surfaceLow">
            {isImage(file.mimeType) ? (
              <img
                src={fileDownloadUrl(file.id, { inline: true })}
                alt={file.originalName}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : isVideo(file.mimeType) ? (
              <div className="flex h-full w-full items-center justify-center text-sm font-black text-woreda-textMuted">
                Video
              </div>
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-black text-woreda-textMuted">
                File
              </div>
            )}
          </div>
          <div className="px-3 py-3">
            <p className="truncate text-xs font-black text-woreda-text">{file.originalName}</p>
            <p className="mt-1 text-[11px] font-semibold text-woreda-textMuted">
              {Math.round(file.sizeBytes / 1024)} KB
            </p>
          </div>
        </a>
      ))}
    </div>
  );
}

