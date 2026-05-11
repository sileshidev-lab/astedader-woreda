import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, FileText } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { getBroadcast, type Broadcast } from "../../../services/contentService";
import { ErrorState } from "../../../components/ui/ErrorState";
import { LoadingState } from "../../../components/ui/LoadingState";
import { FilePreviewCard } from "../../../components/ui/FilePreviewCard";

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

export function BroadcastReaderPage({
  backTo,
  backLabel,
}: {
  backTo: string;
  backLabel: string;
}) {
  const { broadcastId } = useParams();
  const [broadcast, setBroadcast] = useState<Broadcast | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const title = useMemo(() => broadcast?.title || "Broadcast", [broadcast?.title]);

  async function load() {
    if (!broadcastId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getBroadcast(broadcastId);
      setBroadcast(data);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Unable to load broadcast.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [broadcastId]);

  if (!broadcastId) return <ErrorState message="Broadcast id is missing." />;
  if (isLoading) return <LoadingState label="Loading broadcast..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!broadcast) return <ErrorState message="Broadcast not found." />;

  return (
    <section className="aw-design-page aw-mobile-page flex min-h-0 flex-1 flex-col gap-5">
      <div className="rounded-3xl border border-woreda-border/70 bg-woreda-surface px-5 py-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <Link
              to={backTo}
              className="inline-flex min-h-10 items-center gap-2 rounded-2xl border border-woreda-border bg-woreda-surface px-3 text-sm font-black text-woreda-text hover:border-woreda-primary hover:text-woreda-primary"
            >
              <ArrowLeft size={16} />
              {backLabel}
            </Link>

            <p className="mt-5 text-[11px] font-black uppercase tracking-[0.16em] text-woreda-textMuted">
              {broadcast.status}
            </p>

            <h1 className="mt-1 truncate text-[clamp(1.35rem,2.2vw,2rem)] font-black tracking-tight text-woreda-text">
              {title}
            </h1>

            <div className="mt-3 flex flex-wrap gap-3 text-sm font-semibold text-woreda-textMuted">
              <span className="inline-flex items-center gap-2">
                <CalendarDays size={16} />
                {formatDate(broadcast.publishedAt || broadcast.createdAt)}
              </span>
              {broadcast.summary ? <span className="hidden md:inline">·</span> : null}
              {broadcast.summary ? <span className="truncate">{broadcast.summary}</span> : null}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr,0.6fr]">
        <article className="min-h-0 overflow-hidden rounded-3xl border border-woreda-border/70 bg-woreda-surface">
          <div className="border-b border-woreda-border/70 bg-woreda-surfaceLow px-5 py-4">
            <h3 className="text-base font-black text-woreda-text">Post body</h3>
          </div>
          <div className="px-5 py-5">
            <div
              className="aw-richtext text-sm font-semibold leading-relaxed text-woreda-text"
              dangerouslySetInnerHTML={{ __html: broadcast.bodyHtml }}
            />
          </div>
        </article>

        <aside className="flex min-h-0 flex-col gap-4">
          <div className="rounded-3xl border border-woreda-border/70 bg-woreda-surface px-5 py-5">
            <h3 className="flex items-center gap-2 text-base font-black text-woreda-text">
              <FileText size={18} />
              Attachments
            </h3>
            <p className="mt-1 text-sm font-semibold text-woreda-textMuted">Files included with this post.</p>
          </div>

          {broadcast.attachments.length ? (
            <div className="flex flex-col gap-3">
              {broadcast.attachments.map((item) => (
                <FilePreviewCard key={item.id} file={item.file} />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-woreda-border/70 bg-woreda-surface px-5 py-8 text-sm font-semibold text-woreda-textMuted">
              No attachments were submitted for this post.
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

