import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listHibretReports } from "../../../services/reportService";
import { ErrorState } from "../../../components/ui/ErrorState";
import { LoadingState } from "../../../components/ui/LoadingState";
import { EmptyState } from "../../../components/ui/EmptyState";
import { StatusBadge } from "../../../components/ui/StatusBadge";

export function HibretReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listHibretReports();
      setReports(data.reports || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Unable to load reports.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  if (isLoading) return <LoadingState label="Loading reports..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  if (!reports.length) {
    return (
      <EmptyState
        title="No reports yet"
        message="Reports appear after you start drafting a directive report or submit it to Woreda."
        action={
          <Link
            to="/hibret/announcements"
            className="min-h-10 rounded-2xl bg-woreda-primary px-4 text-sm font-black text-white hover:brightness-105"
          >
            Open directives
          </Link>
        }
      />
    );
  }

  return (
    <section className="aw-design-page aw-mobile-page flex min-h-0 flex-1 flex-col gap-4">
      <div className="overflow-x-auto rounded-3xl border border-woreda-border/70 bg-woreda-surface">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-woreda-surfaceLow">
            <tr>
              <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-woreda-textMuted">
                Directive
              </th>
              <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-woreda-textMuted">
                Report title
              </th>
              <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-woreda-textMuted">
                Status
              </th>
              <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-woreda-textMuted">
                Updated
              </th>
              <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-woreda-textMuted">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr key={report.id} className="border-t border-woreda-border/60">
                <td className="px-4 py-3 font-semibold text-woreda-text">
                  {report.announcement?.title || "-"}
                </td>
                <td className="px-4 py-3 font-semibold text-woreda-text">{report.title}</td>
                <td className="px-4 py-3">
                  <StatusBadge value={report.status} />
                </td>
                <td className="px-4 py-3 font-semibold text-woreda-textMuted">
                  {new Date(report.updatedAt || report.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <Link
                    to={`/hibret/reports/${report.id}`}
                    className="rounded-2xl bg-woreda-primary px-3 py-2 text-xs font-black text-white hover:brightness-105"
                  >
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

