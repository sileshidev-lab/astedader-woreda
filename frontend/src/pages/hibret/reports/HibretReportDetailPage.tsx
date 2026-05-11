import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getHibretReport } from "../../../services/reportService";
import { ErrorState } from "../../../components/ui/ErrorState";
import { LoadingState } from "../../../components/ui/LoadingState";
import { FilePreviewCard } from "../../../components/ui/FilePreviewCard";
import { StatusBadge } from "../../../components/ui/StatusBadge";

export function HibretReportDetailPage() {
  const { reportId } = useParams();
  const [report, setReport] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!reportId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getHibretReport(reportId);
      setReport(data.report);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Unable to load report.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId]);

  if (!reportId) return <ErrorState message="Report id is missing." />;
  if (isLoading) return <LoadingState label="Loading report..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!report) return <ErrorState message="Report not found." />;

  return (
    <section className="aw-design-page aw-mobile-page flex min-h-0 flex-1 flex-col gap-5">
      <div className="rounded-3xl border border-woreda-border/70 bg-woreda-surface px-5 py-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-woreda-textMuted">
              {report.announcement?.title || "Directive report"}
            </p>
            <h2 className="mt-1 text-xl font-black text-woreda-text">{report.title}</h2>
            <div className="mt-3">
              <StatusBadge value={report.status} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to={`/hibret/announcements/${report.announcementId}`}
              className="min-h-10 rounded-2xl border border-woreda-border bg-woreda-surface px-4 text-sm font-black text-woreda-text hover:border-woreda-primary hover:text-woreda-primary"
            >
              Open directive
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.2fr,0.8fr]">
        <article className="overflow-hidden rounded-3xl border border-woreda-border/70 bg-woreda-surface">
          <div className="border-b border-woreda-border/70 bg-woreda-surfaceLow px-5 py-4">
            <h3 className="text-base font-black text-woreda-text">Report body</h3>
          </div>
          <div className="px-5 py-5">
            <p className="whitespace-pre-wrap text-sm font-semibold leading-relaxed text-woreda-text">
              {report.body || "-"}
            </p>
          </div>
        </article>

        <aside className="flex flex-col gap-4">
          <div className="rounded-3xl border border-woreda-border/70 bg-woreda-surface px-5 py-5">
            <h3 className="text-base font-black text-woreda-text">Submitted files</h3>
            <p className="mt-1 text-sm font-semibold text-woreda-textMuted">
              Media and attachments uploaded for this report.
            </p>
          </div>
          {report.attachments?.length ? (
            <div className="flex flex-col gap-3">
              {report.attachments.map((attachment: any) => (
                <FilePreviewCard key={attachment.id} file={attachment.file} />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-woreda-border/70 bg-woreda-surface px-5 py-8 text-sm font-semibold text-woreda-textMuted">
              No files have been uploaded for this report yet.
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

