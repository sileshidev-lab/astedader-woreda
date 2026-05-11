import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getActivity, getActivitySummary, type ActivityLogItem } from "../../../services/activityService";
import { ErrorState } from "../../../components/ui/ErrorState";
import { LoadingState } from "../../../components/ui/LoadingState";
import { SearchInput } from "../../../components/ui/SearchInput";

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

export function ActivityPage() {
  const [search, setSearch] = useState("");
  const [actorRole, setActorRole] = useState("");
  const [operation, setOperation] = useState("");
  const [targetType, setTargetType] = useState("");
  const [activity, setActivity] = useState<ActivityLogItem[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load(page = 1) {
    setIsLoading(true);
    setError(null);
    try {
      const [summaryData, activityData] = await Promise.all([
        getActivitySummary(),
        getActivity({
          page,
          pageSize: 25,
          ...(search ? { search } : {}),
          ...(actorRole ? { actorRole } : {}),
          ...(operation ? { operation } : {}),
          ...(targetType ? { targetType } : {}),
        }),
      ]);
      setSummary(summaryData);
      setActivity(activityData.activity || []);
      setPagination(activityData.pagination);
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
    <section className="aw-design-page aw-mobile-page aw-design-activity flex min-h-0 flex-1 flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <article className="aw-stat-card relative overflow-hidden rounded-3xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] p-4 shadow-sm">
          <div className="absolute right-0 top-0 h-20 w-20 rounded-bl-full bg-[var(--aw-primary-soft)]" aria-hidden />
          <p className="relative text-[10px] font-black uppercase tracking-[0.16em] text-[var(--aw-muted)]">Events total</p>
          <p className="relative mt-2 text-[clamp(1.35rem,2vw,2rem)] font-black leading-none text-[var(--aw-primary)]">
            {summary?.summary?.total ?? "-"}
          </p>
        </article>
        <article className="aw-stat-card relative overflow-hidden rounded-3xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] p-4 shadow-sm">
          <div className="absolute right-0 top-0 h-20 w-20 rounded-bl-full bg-[var(--aw-success-bg)]" aria-hidden />
          <p className="relative text-[10px] font-black uppercase tracking-[0.16em] text-[var(--aw-muted)]">Events today</p>
          <p className="relative mt-2 text-[clamp(1.35rem,2vw,2rem)] font-black leading-none text-[var(--aw-success)]">
            {summary?.summary?.today ?? "-"}
          </p>
        </article>
        <article className="aw-stat-card relative overflow-hidden rounded-3xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] p-4 shadow-sm">
          <div className="absolute right-0 top-0 h-20 w-20 rounded-bl-full bg-[var(--aw-magenta-bg)]" aria-hidden />
          <p className="relative text-[10px] font-black uppercase tracking-[0.16em] text-[var(--aw-muted)]">Recent loaded</p>
          <p className="relative mt-2 text-[clamp(1.35rem,2vw,2rem)] font-black leading-none text-[var(--aw-magenta)]">
            {activity.length}
          </p>
        </article>
        <article className="aw-stat-card relative overflow-hidden rounded-3xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] p-4 shadow-sm">
          <div className="absolute right-0 top-0 h-20 w-20 rounded-bl-full bg-[var(--aw-surface-muted)]" aria-hidden />
          <p className="relative text-[10px] font-black uppercase tracking-[0.16em] text-[var(--aw-muted)]">Pages</p>
          <p className="relative mt-2 text-[clamp(1.35rem,2vw,2rem)] font-black leading-none text-[var(--aw-muted)]">
            {pagination?.totalPages ?? "-"}
          </p>
        </article>
      </div>

      <div className="overflow-hidden rounded-3xl border border-woreda-border/70 bg-woreda-surface shadow-none">
        <div className="flex flex-col gap-3 border-b border-woreda-border/70 bg-woreda-surfaceLow px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-black text-woreda-text">Activity log</h2>
            <p className="mt-1 text-sm font-semibold text-woreda-textMuted">
              Recent administrative events across directives, members, and account actions.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
            <div className="min-w-[18rem]">
              <SearchInput value={search} onChange={setSearch} placeholder="Search activity..." />
            </div>
            <select
              value={actorRole}
              onChange={(e) => setActorRole(e.target.value)}
              className="min-h-10 rounded-2xl border border-woreda-border bg-woreda-surface px-3 text-sm font-semibold text-woreda-text outline-none focus:border-woreda-primary"
              aria-label="Actor role filter"
            >
              <option value="">All roles</option>
              <option value="WOREDA_ADMIN">WOREDA_ADMIN</option>
              <option value="HIBRET_ADMIN">HIBRET_ADMIN</option>
              <option value="MEMBER">MEMBER</option>
            </select>
            <input
              value={operation}
              onChange={(e) => setOperation(e.target.value)}
              placeholder="Operation"
              className="min-h-10 rounded-2xl border border-woreda-border bg-woreda-surface px-3 text-sm font-semibold text-woreda-text outline-none placeholder:text-woreda-textMuted focus:border-woreda-primary"
            />
            <input
              value={targetType}
              onChange={(e) => setTargetType(e.target.value)}
              placeholder="Target type"
              className="min-h-10 rounded-2xl border border-woreda-border bg-woreda-surface px-3 text-sm font-semibold text-woreda-text outline-none placeholder:text-woreda-textMuted focus:border-woreda-primary"
            />
            <button
              type="button"
              onClick={() => void load(1)}
              className="min-h-10 rounded-2xl bg-woreda-primary px-4 text-sm font-black text-white hover:brightness-105"
            >
              Refresh
            </button>
            <Link
              to={search ? `/woreda/activity/admin?search=${encodeURIComponent(search)}` : "/woreda/activity/admin"}
              className="min-h-10 rounded-2xl border border-woreda-border bg-woreda-surface px-4 text-sm font-black text-woreda-text hover:border-woreda-primary hover:text-woreda-primary"
            >
              Open detail
            </Link>
          </div>
        </div>

        {isLoading ? (
          <div className="px-4 py-5">
            <LoadingState label="Loading activity..." />
          </div>
        ) : error ? (
          <div className="px-4 py-5">
            <ErrorState message={error} onRetry={() => void load(1)} />
          </div>
        ) : (
          <div className="overflow-x-auto">
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
                          <Link
                            to={row.actorEmail ? `/woreda/activity/admin?search=${encodeURIComponent(row.actorEmail)}` : "/woreda/activity/admin"}
                            className="font-black hover:text-woreda-primary"
                          >
                            {row.actorEmail || "-"}
                          </Link>
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
                      No activity records are available for the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
