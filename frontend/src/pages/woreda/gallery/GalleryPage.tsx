import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Archive,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  FileText,
  Filter,
  FolderOpen,
  Image as ImageIcon,
  Images,
  Search,
  X,
} from "lucide-react";
import { PageButton } from "../../../components/ui/PageButton";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/shadcn/card";
import { Button } from "@/components/ui/shadcn/button";
import { Badge } from "@/components/ui/shadcn/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/shadcn/select";
import { statusToBadgeVariant } from "@/lib/badge";
import {
  getGalleryReportAlbum,
  getGalleryReportAlbums,
} from "../../../services/galleryService";
import type { GalleryAlbum, GalleryAttachment } from "../../../services/galleryService";
import {
  downloadAuthenticatedExport,
  getFileDownloadUrl,
  getFilePreviewUrl,
  getFileViewUrl,
} from "../../../services/announcementService";
import { apiClient } from "../../../services/apiClient";

type ReviewFilter = "all" | "pending" | "approved" | "rejected" | "changes_requested";
type MediaFilter = "all" | "media" | "documents";

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function bytesToMb(value?: number) {
  if (!value) return "";
  return `${(value / 1024 / 1024).toFixed(2)} MB`;
}

function isMedia(mimeType: string) {
  return mimeType.startsWith("image/") || mimeType.startsWith("video/");
}

function isImage(mimeType: string) {
  return mimeType.startsWith("image/");
}

function GalleryKpiCard({
  label,
  value,
}: {
  label: string;
  value: number;
  tone?: "primary" | "success" | "magenta" | "muted";
}) {
  return (
    <Card>
      <CardHeader className="px-4 py-3">
        <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
          {label}
        </span>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        <p className="text-2xl font-semibold tabular-nums leading-none tracking-tight text-foreground">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function FilePreviewCard({
  attachment,
  previewUrl,
  onOpen,
}: {
  attachment: GalleryAttachment;
  previewUrl?: string;
  onOpen: () => void;
}) {
  const image = isImage(attachment.file.mimeType);
  const media = isMedia(attachment.file.mimeType);

  return (
    <div className="group overflow-hidden border border-woreda-border/60 bg-woreda-surface shadow-none transition hover:border-woreda-primary/60 hover:shadow-none">
      <div className="relative aspect-[4/3] overflow-hidden bg-[var(--primary-darkest)]">
        {image && previewUrl ? (
          <img
            src={previewUrl}
            alt=""
            className="h-full w-full object-contain bg-[var(--primary-darkest)] p-2 transition duration-300 group-hover:scale-[1.01]"
          />
        ) : media ? (
          <div className="flex h-full w-full items-center justify-center bg-woreda-surfaceLow">
            <Images size={38} className="text-woreda-textMuted" />
          </div>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-woreda-surfaceLow text-woreda-textMuted">
            <FileText size={40} className="text-woreda-primary" />
            <span className="max-w-[80%] truncate text-xs font-bold uppercase">
              {attachment.file.mimeType.split("/").pop() || "file"}
            </span>
          </div>
        )}

        <span className="absolute right-2 top-2 bg-[var(--overlay-scrim-strong)] px-2 py-1 text-[10px] font-bold text-white backdrop-blur">
          {bytesToMb(attachment.file.sizeBytes)}
        </span>

        <div className="absolute inset-0 flex items-center justify-center gap-3 bg-[var(--overlay-scrim)] opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={onOpen}
            className="flex h-10 w-10 items-center justify-center rounded bg-white text-woreda-text shadow-none hover:bg-woreda-primary hover:text-white"
            title="View"
          >
            <ExternalLink size={18} />
          </button>

          <a
            href={getFileDownloadUrl(attachment.file.id)}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => event.stopPropagation()}
            className="flex h-10 w-10 items-center justify-center rounded bg-white text-woreda-text shadow-none hover:bg-woreda-primary hover:text-white"
            title="Download"
          >
            <Download size={18} />
          </a>
        </div>
      </div>

      <div className="p-2.5">
        <p
          className="truncate text-xs font-bold text-woreda-text"
          title={attachment.file.originalName}
        >
          {attachment.file.originalName}
        </p>
        <p className="mt-1 truncate text-[11px] font-semibold text-woreda-textMuted">
          {attachment.file.mimeType}
        </p>
      </div>
    </div>
  );
}

export function GalleryPage() {
  const [albums, setAlbums] = useState<GalleryAlbum[]>([]);
  const [hibrets, setHibrets] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<GalleryAlbum | null>(null);
  const [viewerAttachment, setViewerAttachment] = useState<GalleryAttachment | null>(null);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState({
    albums: 0,
    mediaFiles: 0,
    documentFiles: 0,
    approvedAlbums: 0,
    pendingReviewAlbums: 0,
  });

  const [searchText, setSearchText] = useState("");
  const [hibretFilter, setHibretFilter] = useState("all");
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("all");
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  const [isLoading, setIsLoading] = useState(true);
  const [isAlbumLoading, setIsAlbumLoading] = useState(false);
  const [error, setError] = useState("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const filterParams = useMemo(
    () => ({
      search: searchText.trim() || undefined,
      hibretId: hibretFilter === "all" ? undefined : hibretFilter,
      reviewStatus: reviewFilter === "all" ? undefined : reviewFilter,
      mediaType: mediaFilter === "all" ? undefined : mediaFilter,
    }),
    [searchText, hibretFilter, reviewFilter, mediaFilter]
  );

  async function loadAlbums() {
    setIsLoading(true);
    setError("");

    try {
      const data = await getGalleryReportAlbums(filterParams);
      setAlbums(data.albums);
      setHibrets(data.hibrets);
      setSummary(data.summary);

      if (selectedAlbum) {
        const refreshed = data.albums.find(
          (album) => album.reportId === selectedAlbum.reportId
        );

        if (refreshed) {
          setSelectedAlbum(refreshed);
        }
      }
    } catch {
      setError("Unable to load gallery albums.");
    } finally {
      setIsLoading(false);
    }
  }

  async function openAlbum(album: GalleryAlbum) {
    setIsAlbumLoading(true);
    setError("");

    try {
      const data = await getGalleryReportAlbum(album.reportId);
      setSelectedAlbum(data);
    } catch {
      setError("Unable to open gallery album.");
    } finally {
      setIsAlbumLoading(false);
    }
  }

  useEffect(() => {
    void loadAlbums();
  }, [filterParams]);

  useEffect(() => {
    setPage(1);
  }, [searchText, hibretFilter, reviewFilter, mediaFilter]);

  useEffect(() => {
    const files = [
      ...albums.map((album) => album.coverFile).filter(Boolean),
      ...(selectedAlbum?.attachments.map((attachment) => attachment.file) ?? []),
    ].filter((file): file is NonNullable<typeof file> =>
      Boolean(file && isImage(file.mimeType))
    );

    if (!files.length) {
      setPreviewUrls({});
      return;
    }

    let cancelled = false;
    const objectUrls: string[] = [];

    async function loadPreviews() {
      const uniqueFiles = Array.from(
        new Map(files.map((file) => [file.id, file])).values()
      );

      const entries = await Promise.all(
        uniqueFiles.map(async (file) => {
          const response = await apiClient.get<Blob>(
            `/files/${file.id}/download?inline=true`,
            { responseType: "blob" }
          );

          const objectUrl = URL.createObjectURL(response.data);
          objectUrls.push(objectUrl);

          return [file.id, objectUrl] as const;
        })
      );

      if (!cancelled) {
        setPreviewUrls(Object.fromEntries(entries));
      }
    }

    void loadPreviews();

    return () => {
      cancelled = true;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [albums, selectedAlbum]);

  function resetFilters() {
    setSearchText("");
    setHibretFilter("all");
    setReviewFilter("all");
    setMediaFilter("all");
  }

  const selectedMedia =
    selectedAlbum?.attachments.filter((attachment) =>
      isMedia(attachment.file.mimeType)
    ) ?? [];

  const selectedDocuments =
    selectedAlbum?.attachments.filter(
      (attachment) => !isMedia(attachment.file.mimeType)
    ) ?? [];

  return (
    <section className="aw-design-page aw-design-gallery aw-mobile-page aw-mobile-filterable flex min-h-0 flex-1 flex-col gap-5">
      {error ? (
        <div className="border border-woreda-danger bg-woreda-dangerBg px-4 py-3 text-sm font-semibold text-woreda-danger">
          {error}
        </div>
      ) : null}

      <div className="hidden grid-cols-2 gap-3 md:grid md:grid-cols-5">
        <GalleryKpiCard label="Albums" value={summary.albums} tone="primary" />
        <GalleryKpiCard label="Media Files" value={summary.mediaFiles} tone="primary" />
        <GalleryKpiCard label="Documents" value={summary.documentFiles} tone="magenta" />
        <GalleryKpiCard label="Approved" value={summary.approvedAlbums} tone="success" />
        <GalleryKpiCard label="Pending Review" value={summary.pendingReviewAlbums} tone="muted" />
      </div>

      <div className="border border-woreda-border/80 bg-woreda-surface shadow-none">
        <div className="border-b border-woreda-border bg-woreda-surfaceLow px-5 py-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              
</div>

            <PageButton onClick={() => void loadAlbums()}>Refresh</PageButton>
          </div>

          <div className="aw-toolbar aw-toolbar-mobile-controls mt-4">
            <div className="flex min-h-11 border border-woreda-border/70 bg-woreda-surface">
              <span className="flex items-center px-3 text-woreda-textMuted">
                <Search size={16} />
              </span>
              <input
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search directive, report, or Hibret"
                className="w-full bg-transparent px-2 py-2.5 text-sm outline-none"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="default"
              className="md:hidden"
              onClick={() => setMobileFiltersOpen((open) => !open)}
              aria-expanded={mobileFiltersOpen}
              aria-controls="gallery-mobile-filters"
            >
              Filters
              {mobileFiltersOpen ? <ChevronUp aria-hidden /> : <ChevronDown aria-hidden />}
            </Button>
            <div
              id="gallery-mobile-filters"
              className={[
                "aw-toolbar-filter-group",
                mobileFiltersOpen ? "aw-toolbar-filter-group-open" : "",
              ].join(" ")}
            >

            <select
              value={hibretFilter}
              onChange={(event) => setHibretFilter(event.target.value)}
              className="min-h-11 border border-woreda-border/70 bg-woreda-surface px-3 py-2.5 text-sm outline-none focus:border-woreda-primary"
            >
              <option value="all">All Hibrets</option>
              {hibrets.map((hibret) => (
                <option key={hibret.id} value={hibret.id}>
                  {hibret.name}
                </option>
              ))}
            </select>

            <select
              value={reviewFilter}
              onChange={(event) => setReviewFilter(event.target.value as ReviewFilter)}
              className="min-h-11 border border-woreda-border/70 bg-woreda-surface px-3 py-2.5 text-sm outline-none focus:border-woreda-primary"
            >
              <option value="all">All reviews</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="changes_requested">Changes requested</option>
              <option value="rejected">Rejected</option>
            </select>

            <select
              value={mediaFilter}
              onChange={(event) => setMediaFilter(event.target.value as MediaFilter)}
              className="min-h-11 border border-woreda-border/70 bg-woreda-surface px-3 py-2.5 text-sm outline-none focus:border-woreda-primary"
            >
              <option value="all">All files</option>
              <option value="media">Images / video</option>
              <option value="documents">Documents</option>
            </select>

            <PageButton onClick={resetFilters} className="min-h-11">
              <Filter size={16} />
              <span className="ml-2">Reset</span>
            </PageButton>
            </div>
          </div>
        </div>

        <div className="p-5">
          {isLoading ? (
            <div className="border border-dashed border-woreda-border bg-woreda-surfaceLow px-4 py-12 text-center text-sm font-semibold text-woreda-textMuted">
              Loading gallery albums...
            </div>
          ) : albums.length === 0 ? (
            <div className="border border-dashed border-woreda-border bg-woreda-surfaceLow px-4 py-12 text-center">
              <Images className="mx-auto text-woreda-textMuted" size={36} />
              <h3 className="mt-3 text-lg font-bold text-woreda-text">
                No report albums found
              </h3>
              <p className="mt-2 text-sm text-woreda-textMuted">
                Submitted reports with attachments or media will appear here as albums.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {albums.slice((Math.min(page, Math.max(1, Math.ceil(albums.length / pageSize))) - 1) * pageSize, Math.min(page, Math.max(1, Math.ceil(albums.length / pageSize))) * pageSize).map((album) => {
                const coverUrl =
                  album.coverFile && isImage(album.coverFile.mimeType)
                    ? previewUrls[album.coverFile.id] || getFileViewUrl(album.coverFile.id)
                    : "";

                return (
                  <article
                    key={album.reportId}
                    className="group overflow-hidden border border-woreda-border/70 bg-woreda-surface shadow-none transition hover:border-woreda-primary/60"
                  >
                    <button
                      type="button"
                      onClick={() => void openAlbum(album)}
                      className="block w-full text-left"
                    >
                      <div className="relative aspect-[16/10] overflow-hidden border-b border-woreda-border bg-[var(--primary-darkest)]">
                        {coverUrl ? (
                          <img
                            src={coverUrl}
                            alt=""
                            className="h-full w-full object-contain bg-[var(--primary-darkest)] p-2 transition duration-300 group-hover:scale-[1.01]"
                          />
                        ) : (
                          <div className="flex h-full flex-col items-center justify-center gap-3 text-woreda-textMuted">
                            <Archive size={42} />
                            <span className="text-sm font-bold">Document album</span>
                          </div>
                        )}

                        <div className="absolute right-3 top-3 bg-[var(--overlay-scrim-strong)] px-2.5 py-1 text-xs font-bold text-white backdrop-blur">
                          {album.attachmentCount} files
                        </div>

                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-3">
                          <p className="truncate text-sm font-bold text-white">
                            {album.hibretName}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3 p-4">
                        <div>
                          <h2
                            className="line-clamp-2 text-base font-bold text-woreda-text"
                            title={album.reportTitle}
                          >
                            {album.reportTitle}
                          </h2>
                          <p
                            className="mt-1 truncate text-sm font-semibold text-woreda-textMuted"
                            title={album.directiveTitle}
                          >
                            {album.directiveTitle}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Badge
                            variant={statusToBadgeVariant(album.reviewDecision)}
                            className="capitalize"
                          >
                            {album.reviewDecision || "Pending review"}
                          </Badge>

                          <Badge variant="muted">{album.mediaCount} media</Badge>

                          <Badge variant="muted">{album.documentCount} documents</Badge>
                        </div>

                        <p className="text-xs font-semibold text-woreda-textMuted">
                          Submitted: {formatDate(album.submittedAt)}
                        </p>
                      </div>
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-3 border-t border-border bg-muted/30 px-5 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            Page {Math.min(page, Math.max(1, Math.ceil(albums.length / pageSize)))} of {Math.max(1, Math.ceil(albums.length / pageSize))} · {albums.length} total
          </span>
          <div className="flex w-full flex-wrap items-center justify-start gap-2 sm:w-auto sm:justify-end">
            <Select
              value={String(pageSize)}
              onValueChange={(value) => {
                setPageSize(Number(value));
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-auto px-2 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6">6 / page</SelectItem>
                <SelectItem value="12">12 / page</SelectItem>
                <SelectItem value="24">24 / page</SelectItem>
                <SelectItem value="48">48 / page</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={Math.min(page, Math.max(1, Math.ceil(albums.length / pageSize))) <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={Math.min(page, Math.max(1, Math.ceil(albums.length / pageSize))) >= Math.max(1, Math.ceil(albums.length / pageSize))}
              onClick={() => setPage((current) => Math.min(Math.max(1, Math.ceil(albums.length / pageSize)), current + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {selectedAlbum ? (
        <div className="fixed inset-0 z-[2147483646] bg-[var(--overlay-scrim-strong)] p-4">
          <div className="ml-auto flex h-full w-full max-w-6xl flex-col border border-woreda-border/70 bg-woreda-surface shadow-none">
            <div className="border-b border-woreda-border bg-woreda-surfaceLow px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-woreda-textMuted">
                    Gallery album
                  </p>
                  <h2 className="mt-1 text-2xl font-bold text-woreda-text">
                    {selectedAlbum.reportTitle}
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-woreda-textMuted">
                    {selectedAlbum.hibretName} · {selectedAlbum.directiveTitle}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge
                      variant={statusToBadgeVariant(selectedAlbum.reviewDecision)}
                      className="capitalize"
                    >
                      {selectedAlbum.reviewDecision || "Pending review"}
                    </Badge>
                    <Badge variant="muted">{selectedAlbum.mediaCount} media</Badge>
                    <Badge variant="muted">{selectedAlbum.documentCount} documents</Badge>
                    <Badge variant="muted">Submitted {formatDate(selectedAlbum.submittedAt)}</Badge>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap justify-end gap-2">
                  <Link
                    to={`/woreda/announcements/${selectedAlbum.announcementId}/hibrets/${selectedAlbum.hibretId}/report`}
                    className="inline-flex min-h-10 items-center gap-2 border border-woreda-primary bg-woreda-surface px-4 py-2 text-sm font-bold text-woreda-primary hover:bg-woreda-primarySoft"
                  >
                    <ExternalLink size={16} />
                    Report Review
                  </Link>

                  <PageButton
                    onClick={() =>
                      downloadAuthenticatedExport(
                        `/woreda/reports/${selectedAlbum.reportId}/export.zip`
                      )
                    }
                  >
                    <Download size={16} />
                    <span className="ml-2">Performance Report</span>
                  </PageButton>

                  <button
                    type="button"
                    onClick={() => setSelectedAlbum(null)}
                    className="inline-flex min-h-10 items-center gap-2 border border-woreda-border/70 bg-woreda-surface px-4 py-2 text-sm font-bold text-woreda-text hover:border-woreda-danger hover:text-woreda-danger"
                  >
                    <X size={16} />
                    Close
                  </button>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {isAlbumLoading ? (
                <div className="border border-dashed border-woreda-border bg-woreda-surfaceLow px-4 py-10 text-center text-sm font-semibold text-woreda-textMuted">
                  Loading album...
                </div>
              ) : (
                <div className="space-y-7">
                  <section>
                    <div className="mb-3 flex items-center justify-between gap-3 border-b border-woreda-border/70 pb-3">
                      <div>
                        <h3 className="text-lg font-bold text-woreda-text">
                          Media
                        </h3>
                        <p className="text-sm text-woreda-textMuted">
                          Images and videos submitted with this Hibret report.
                        </p>
                      </div>
                      <span className="border border-woreda-primary/20 bg-woreda-primarySoft px-3 py-1.5 text-xs font-bold text-woreda-primary">
                        {selectedMedia.length} media
                      </span>
                    </div>

                    {selectedMedia.length === 0 ? (
                      <div className="border border-dashed border-woreda-border bg-woreda-surfaceLow px-4 py-10 text-center">
                        <ImageIcon className="mx-auto text-woreda-textMuted" size={34} />
                        <p className="mt-2 text-sm font-semibold text-woreda-textMuted">
                          No image or video files in this album.
                        </p>
                      </div>
                    ) : (
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {selectedMedia.map((attachment) => (
                          <FilePreviewCard
                            key={attachment.id}
                            attachment={attachment}
                            previewUrl={
                              previewUrls[attachment.file.id] ||
                              getFileViewUrl(attachment.file.id)
                            }
                            onOpen={() => setViewerAttachment(attachment)}
                          />
                        ))}
                      </div>
                    )}
                  </section>

                  <section>
                    <div className="mb-3 flex items-center justify-between gap-3 border-b border-woreda-border/70 pb-3">
                      <div>
                        <h3 className="text-lg font-bold text-woreda-text">
                          Documents
                        </h3>
                        <p className="text-sm text-woreda-textMuted">
                          Supporting documents and submitted files in this album.
                        </p>
                      </div>
                      <span className="border border-woreda-border/70 bg-woreda-surfaceLow px-3 py-1.5 text-xs font-bold text-woreda-textMuted">
                        {selectedDocuments.length} documents
                      </span>
                    </div>

                    {selectedDocuments.length === 0 ? (
                      <div className="border border-dashed border-woreda-border bg-woreda-surfaceLow px-4 py-10 text-center">
                        <FolderOpen className="mx-auto text-woreda-textMuted" size={34} />
                        <p className="mt-2 text-sm font-semibold text-woreda-textMuted">
                          No document files in this album.
                        </p>
                      </div>
                    ) : (
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {selectedDocuments.map((attachment) => (
                          <FilePreviewCard
                            key={attachment.id}
                            attachment={attachment}
                            onOpen={() =>
                              window.open(
                                getFilePreviewUrl(attachment.file.id),
                                "_blank",
                                "noopener,noreferrer"
                              )
                            }
                          />
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {viewerAttachment ? (
        <div className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-[var(--overlay-scrim-strong)] p-5">
          <div className="flex h-[var(--aw-gallery-viewer-h)] w-full max-w-[min(1600px,calc(var(--aw-viewport-inline)-2.5rem))] flex-col border border-woreda-border/70 bg-woreda-surface shadow-none">
            <div className="flex items-center justify-between gap-4 border-b border-woreda-border bg-woreda-surfaceLow px-5 py-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-woreda-text">
                  {viewerAttachment.file.originalName}
                </p>
                <p className="mt-1 text-xs font-semibold text-woreda-textMuted">
                  {viewerAttachment.file.mimeType}
                </p>
              </div>

              <div className="flex shrink-0 gap-2">
                <a
                  href={getFileDownloadUrl(viewerAttachment.file.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 border border-woreda-border/70 bg-woreda-surface px-3 py-2 text-xs font-bold text-woreda-text hover:border-woreda-primary hover:text-woreda-primary"
                >
                  <Download size={14} />
                  Download
                </a>

                <button
                  type="button"
                  onClick={() => setViewerAttachment(null)}
                  className="inline-flex items-center gap-2 border border-woreda-border/70 bg-woreda-surface px-3 py-2 text-xs font-bold text-woreda-text hover:border-woreda-danger hover:text-woreda-danger"
                >
                  <X size={14} />
                  Close
                </button>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-[var(--text)] p-4">
              {isImage(viewerAttachment.file.mimeType) ? (
                <img
                  src={
                    previewUrls[viewerAttachment.file.id] ||
                    getFileViewUrl(viewerAttachment.file.id)
                  }
                  alt=""
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <iframe
                  src={getFilePreviewUrl(viewerAttachment.file.id)}
                  title={viewerAttachment.file.originalName}
                  className="h-full w-full bg-white"
                />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
