import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpen, CalendarDays, Eye, FileText, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { getBroadcasts } from "../../../services/contentService";
import type { Broadcast } from "../../../services/contentService";
import { Button } from "@/components/ui/shadcn/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/shadcn/select";
import {
  broadcastImageUrl,
  filePreviewUrl,
  formatBroadcastDate,
  formatBroadcastDateTime,
  rewriteBodyFileUrls,
  stripHtml,
  visibleAttachments,
} from "./broadcastUtils";

type PublishedBroadcastsPageProps = {
  title: string;
  subtitle: string;
  detailBasePath?: string;
};

function excerptFor(item: Broadcast) {
  return item.summary?.trim() || stripHtml(item.bodyHtml) || "Open this broadcast to read the full post.";
}

export function PublishedBroadcastsPage({ title, subtitle, detailBasePath }: PublishedBroadcastsPageProps) {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [selected, setSelected] = useState<Broadcast | null>(null);
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  async function loadBroadcasts() {
    try {
      const data = await getBroadcasts();
      setBroadcasts(data.broadcasts.filter((item) => item.status === "published"));
      setBrokenImages({});
    } catch {
      toast.error("Unable to load broadcasts.");
    }
  }

  useEffect(() => {
    void loadBroadcasts();
  }, []);

  const filteredBroadcasts = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    if (!query) return broadcasts;

    return broadcasts.filter((item) =>
      [item.title, item.summary, stripHtml(item.bodyHtml)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [broadcasts, searchText]);

  useEffect(() => {
    setPage(1);
  }, [searchText]);

  const totalPages = Math.max(1, Math.ceil(filteredBroadcasts.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedBroadcasts = filteredBroadcasts.slice((safePage - 1) * pageSize, safePage * pageSize);

  function renderImage(item: Broadcast, className: string) {
    const imageUrl = broadcastImageUrl(item);

    if (!imageUrl || brokenImages[item.id]) {
      return (
        <div className="flex h-full items-center justify-center bg-primary/10">
          <BookOpen size={38} className="text-primary" aria-hidden />
        </div>
      );
    }

    return (
      <img
        src={imageUrl}
        alt={item.title}
        className={className}
        onError={() => setBrokenImages((current) => ({ ...current, [item.id]: true }))}
      />
    );
  }

  if (selected && !detailBasePath) {
    const selectedHtml = rewriteBodyFileUrls(selected.bodyHtml);
    const attachments = visibleAttachments(selected);
    const publishedDate = selected.publishedAt || selected.createdAt;

    return (
      <section className="article-container">
        <nav className="article-nav" aria-label="Broadcast navigation">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSelected(null)}
          >
            <ArrowLeft aria-hidden />
            Back to broadcasts
          </Button>
        </nav>

        <article className="article-body">
          <header className="article-header">
            <h1 className="article-title">{selected.title}</h1>

            <div className="article-meta">
              <span className="meta-date">
                <CalendarDays size={14} aria-hidden />
                {formatBroadcastDate(publishedDate)}
              </span>
              <span className="meta-divider">·</span>
              <span className="meta-read-time">5 min read</span>
            </div>

            {selected.summary ? (
              <p className="article-summary">{selected.summary}</p>
            ) : null}
          </header>

          <div className="article-hero">
            {renderImage(selected, "hero-image")}
          </div>

          <main className="article-content">
            <div dangerouslySetInnerHTML={{ __html: selectedHtml }} />
          </main>

          {attachments.length > 0 ? (
            <section className="article-attachments" aria-label="Broadcast attachments">
              <h3>
                <FileText size={16} aria-hidden />
                Attachments
              </h3>

              <div className="article-attachments-grid">
                {attachments.map((attachment) => (
                  <a
                    key={attachment.id}
                    href={filePreviewUrl(attachment.file.id)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span>{attachment.file.originalName}</span>
                    <small>Open attachment</small>
                  </a>
                ))}
              </div>
            </section>
          ) : null}
        </article>
      </section>
    );
  }

  return (
    <section className="broadcast-list-page flex min-h-0 flex-col gap-5">
      <div className="broadcast-list-toolbar" aria-label={title}>
        <h1 className="sr-only">{title}</h1>
        <p className="sr-only">{subtitle}</p>

        <div className="broadcast-search-box">
          <Search size={16} aria-hidden />
          <input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search broadcasts"
          />
        </div>
      </div>

      <div className="broadcast-list-shell min-h-0 flex-1">
        <div className="broadcast-list-scroller min-h-0 flex-1 overflow-auto">
          {filteredBroadcasts.length === 0 ? (
            <div className="broadcast-empty-state">
              <BookOpen size={38} aria-hidden />
              <h2>No published broadcasts found</h2>
              <p>Published Woreda posts will appear here.</p>
            </div>
          ) : (
            <div className="blog-card-grid">
              {paginatedBroadcasts.map((item, index) => (
                <article key={item.id} className="blog-card">
                  {detailBasePath ? (
                    <Link
                      to={`${detailBasePath}/${encodeURIComponent(item.id)}`}
                      className="blog-card-click-area"
                      aria-label={`Open ${item.title}`}
                    >
                      <div className="card-image-container">
                        {renderImage(item, "card-image")}

                        <div className="card-badge-row">
                          {safePage === 1 && index === 0 ? <span className="badge-latest">Latest</span> : null}
                          <span className="badge-date">
                            {formatBroadcastDate(item.publishedAt || item.createdAt)}
                          </span>
                        </div>
                      </div>

                      <div className="card-content">
                        <h2 className="card-title">{item.title}</h2>

                        <p className="card-excerpt">{excerptFor(item)}</p>

                        <div className="card-footer">
                          <span className="timestamp">
                            {formatBroadcastDateTime(item.publishedAt || item.createdAt)}
                          </span>

                          <span className="btn-read">
                            <Eye size={15} aria-hidden />
                            Open and read
                          </span>
                        </div>
                      </div>
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSelected(item)}
                      className="blog-card-click-area"
                      aria-label={`Open ${item.title}`}
                    >
                      <div className="card-image-container">
                        {renderImage(item, "card-image")}

                        <div className="card-badge-row">
                          {safePage === 1 && index === 0 ? <span className="badge-latest">Latest</span> : null}
                          <span className="badge-date">
                            {formatBroadcastDate(item.publishedAt || item.createdAt)}
                          </span>
                        </div>
                      </div>

                      <div className="card-content">
                        <h2 className="card-title">{item.title}</h2>

                        <p className="card-excerpt">{excerptFor(item)}</p>

                        <div className="card-footer">
                          <span className="timestamp">
                            {formatBroadcastDateTime(item.publishedAt || item.createdAt)}
                          </span>

                          <span className="btn-read">
                            <Eye size={15} aria-hidden />
                            Open and read
                          </span>
                        </div>
                      </div>
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="broadcast-list-pagination">
          <span className="text-sm font-medium text-muted-foreground">
            Page {safePage} of {totalPages} · {filteredBroadcasts.length} total
          </span>
          <div className="flex items-center gap-2">
            <Select
              value={String(pageSize)}
              onValueChange={(value) => {
                setPageSize(Number(value));
                setPage(1);
              }}
            >
              <SelectTrigger className="w-32">
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
              disabled={safePage <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={safePage >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
