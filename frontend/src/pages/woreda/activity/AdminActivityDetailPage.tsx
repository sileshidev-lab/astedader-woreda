import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getActivity } from "../../../services/activityService";
import { ErrorState } from "../../../components/ui/ErrorState";
import { LoadingState } from "../../../components/ui/LoadingState";
import type { ActivityLogItem } from "../../../services/activityService";

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

export function AdminActivityDetailPage() {
  const [params] = useSearchParams();
  const initialSearch = params.get("search") || "";

  const [search, setSearch] = useState(initialSearch);
  const [activity, setActivity] = useState<ActivityLogItem[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const title = useMemo(() => (search ? `Activity: ${search}` : "Admin activity"), [search]);

  async function load(page = 1) {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getActivity({ page, pageSize: 25, ...(search ? { search } : {}) });
      setActivity(data.activity || []);
      setPagination(data.pagination);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Unable to load activity.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="aw-design-page aw-mobile-page flex min-h-0 flex-1 flex-col gap-5">
      <div className="flex flex-col gap-3 rounded-3xl border border-woreda-border/70 bg-woreda-surface px-5 py-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-woreda-textMuted">
              Monitoring
            </p>
            <h2 className="mt-1 text-xl font-black text-woreda-text">{title}</h2>
            <p className="mt-2 text-sm font-semibold text-woreda-textMuted">
              Filter by admin email, operation name, or target to locate relevant actions.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/woreda/activity"
              className="min-h-10 rounded-2xl border border-woreda-border bg-woreda-surface px-4 text-sm font-black text-woreda-text hover:border-woreda-primary hover:text-woreda-primary"
            >
              Back to activity
            </Link>
          </div>
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-[1fr,auto]">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email, operation, target..."
            className="min-h-10 rounded-2xl border border-woreda-border bg-woreda-surface px-3 text-sm font-semibold text-woreda-text outline-none placeholder:text-woreda-textMuted focus:border-woreda-primary"
          />
          <button
            type="button"
            onClick={() => void load(1)}
            className="min-h-10 rounded-2xl bg-woreda-primary px-4 text-sm font-black text-white hover:brightness-105"
          >
            Search
          </button>
        </div>
      </div>

      {isLoading ? <LoadingState label="Loading activity..." /> : null}
      {error ? <ErrorState message={error} onRetry={() => void load(1)} /> : null}

      {!isLoading && !error ? (
        <div className="overflow-x-auto rounded-3xl border border-woreda-border/70 bg-woreda-surface">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-woreda-surfaceLow">
              <tr>
                <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-woreda-textMuted">
                  Time
                </th>
                <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-woreda-textMuted">
                  Actor
                </th>
                <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-woreda-textMuted">
                  Operation
                </th>
                <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-woreda-textMuted">
                  Target
                </th>
                <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-woreda-textMuted">
                  Description
                </th>
              </tr>
            </thead>
            <tbody>
              {activity.length ? (
                activity.map((row) => (
                  <tr key={row.id} className="border-t border-woreda-border/60">
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-woreda-text">
                      {formatDate(row.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-woreda-text">
                      <div className="flex flex-col">
                        <span className="font-black">{row.actorEmail || "-"}</span>
                        <span className="text-xs font-semibold text-woreda-textMuted">
                          {row.actorRole || "-"}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-woreda-text">
                      {row.operation}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-woreda-text">
                      {[row.targetType, row.targetName].filter(Boolean).join(": ") || "-"}
                    </td>
                    <td className="min-w-[18rem] px-4 py-3 font-semibold text-woreda-text">
                      {row.description || "-"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm font-semibold text-woreda-textMuted">
                    No activity records match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {pagination ? (
            <div className="border-t border-woreda-border/60 px-4 py-3 text-sm font-semibold text-woreda-textMuted">
              Showing page <span className="font-black text-woreda-text">{pagination.page}</span> of{" "}
              <span className="font-black text-woreda-text">{pagination.totalPages}</span>.
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
