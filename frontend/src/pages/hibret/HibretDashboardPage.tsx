import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getHibretAnnouncements } from "../../services/reportService";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import { StatCard } from "../../components/ui/StatCard";

export function HibretDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getHibretAnnouncements({ page: 1, pageSize: 20, status: "all", type: "all" });
      setData(result);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Unable to load Hibret dashboard.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  if (isLoading) return <LoadingState label="Loading dashboard..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const summary = data?.summary || {};
  const announcements: any[] = data?.announcements || [];

  return (
    <section className="aw-design-page aw-mobile-page flex min-h-0 flex-1 flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Assigned directives" value={summary.assigned ?? announcements.length ?? 0} />
        <StatCard label="Pending reports" value={summary.pending ?? 0} />
        <StatCard label="Submitted" value={summary.submitted ?? 0} />
        <StatCard label="Approved" value={summary.approved ?? 0} />
      </div>

      <div className="overflow-hidden rounded-3xl border border-woreda-border/70 bg-woreda-surface">
        <div className="border-b border-woreda-border/70 bg-woreda-surfaceLow px-5 py-4">
          <h2 className="text-lg font-black text-woreda-text">Latest directives</h2>
          <p className="mt-1 text-sm font-semibold text-woreda-textMuted">
            Quick access to the most recently assigned directives for your Hibret.
          </p>
        </div>
        <div className="divide-y divide-woreda-border/60">
          {announcements.slice(0, 8).map((item) => (
            <div key={item.id} className="flex flex-col gap-2 px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-woreda-text">{item.title}</p>
                <p className="mt-1 text-xs font-semibold text-woreda-textMuted">
                  {item.type} · {item.status}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  to={`/hibret/announcements/${item.id}`}
                  className="min-h-10 rounded-2xl bg-woreda-primary px-4 text-sm font-black text-white hover:brightness-105"
                >
                  Open
                </Link>
              </div>
            </div>
          ))}
          {announcements.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm font-semibold text-woreda-textMuted">
              No directives have been assigned to this Hibret yet.
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

