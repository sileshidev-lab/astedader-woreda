import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp, Eye, Filter, Search } from "lucide-react";
import { getHibretAnnouncements, type HibretAnnouncementsSummary } from "../../../services/hibretService";
import type { Announcement, AnnouncementType } from "../../../types/announcement";
import type { PaginationMeta } from "../../../services/announcementService";
import { AdminEmptyState, AdminMetricCard } from "../../../components/ui/AdminPagePrimitives";

type StatusFilter = "all" | "draft" | "published" | "closed";
type TypeFilter = "all" | AnnouncementType;

const typeLabels: Record<AnnouncementType, string> = {
  meeting: "Meeting",
  conference: "Conference",
  trend_report: "Trend Report",
  other: "Other",
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
}

function reportStatus(announcement: Announcement) {
  const report = announcement.reports?.[0];
  if (!report) return "Not started";
  return report.status || "draft";
}

function reviewStatus(announcement: Announcement) {
  const report = announcement.reports?.[0];
  if (!report?.reviewDecision) return "Pending";
  return report.reviewDecision;
}

function labelize(value: string) {
  if (value === "changes_requested") return "Changes requested";
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function badgeClass(value: string) {
  const clean = value.toLowerCase();
  if (clean === "published" || clean === "approved" || clean === "submitted") {
    return "border-[var(--aw-magenta)]/25 bg-[var(--aw-magenta-bg)] text-[var(--aw-magenta)]";
  }
  if (clean === "draft" || clean === "pending" || clean === "not started") {
    return "border-[var(--aw-yellow)]/40 bg-[var(--aw-yellow-bg)] text-[var(--aw-yellow-text)]";
  }
  if (clean === "closed") {
    return "border-[var(--aw-primary)]/20 bg-[var(--aw-primary-soft)] text-[var(--aw-primary)]";
  }
  if (clean === "rejected" || clean === "changes requested" || clean === "changes_requested") {
    return "border-[var(--aw-danger)]/25 bg-[var(--aw-danger-bg)] text-[var(--aw-danger)]";
  }
  return "border-[var(--aw-border-soft)] bg-[var(--aw-surface-muted)] text-[var(--aw-muted)]";
}

export function HibretAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [summary, setSummary] = useState<HibretAnnouncementsSummary>({
    assigned: 0,
    submitted: 0,
    pending: 0,
    approved: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchText, setSearchText] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  async function loadData() {
    setIsLoading(true);
    setError("");

    try {
      const data = await getHibretAnnouncements({
        page,
        pageSize,
        search: searchText || undefined,
        type: typeFilter,
        status: statusFilter,
      });
      setAnnouncements(data.announcements);
      setPagination(data.pagination);
      setSummary(data.summary);
    } catch {
      setError("Unable to load assigned directives.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [page, pageSize, searchText, typeFilter, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [searchText, typeFilter, statusFilter]);

  const filteredAnnouncements = announcements;

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-5">
      {error ? (
        <div className="shrink-0 rounded-2xl border border-[var(--aw-danger)] bg-[var(--aw-danger-bg)] px-4 py-3 text-sm font-bold text-[var(--aw-danger)]">
          {error}
        </div>
      ) : null}

      <div className="grid shrink-0 grid-cols-1 gap-4 md:grid-cols-3">
        <AdminMetricCard label="Assigned Directives" value={summary.assigned} note="Targeted to this Hibret" />
        <AdminMetricCard label="Submitted Reports" value={summary.submitted} note="Sent to Woreda for review" tone="success" />
        <AdminMetricCard label="Pending / Approved" value={`${summary.pending} / ${summary.approved}`} note="Not started versus approved" tone="warning" />
      </div>

      <section className="shrink-0 rounded-3xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-lg font-black text-[var(--aw-text)]">Directive List</h2>
            <p className="mt-1 text-sm font-semibold text-[var(--aw-muted)]">
              Search, filter, and review directives assigned to this Hibret.
            </p>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <label className="flex min-h-11 min-w-0 items-center gap-2 rounded-2xl border border-[var(--aw-border-soft)] bg-[var(--aw-bg)] px-3 focus-within:border-[var(--aw-primary)] focus-within:ring-2 focus-within:ring-[var(--aw-primary)]/15 sm:min-w-[280px]">
              <Search size={18} className="shrink-0 text-[var(--aw-muted)]" />
              <input
                type="search"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search directive title..."
                className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm font-semibold text-[var(--aw-text)] outline-none placeholder:text-[var(--aw-muted)] focus:ring-0"
              />
            </label>

            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] px-4 text-sm font-black text-[var(--aw-text)] shadow-sm hover:border-[var(--aw-primary)] hover:text-[var(--aw-primary)] md:hidden"
              onClick={() => setMobileFiltersOpen((open) => !open)}
              aria-expanded={mobileFiltersOpen}
              aria-controls="hibret-directive-filters"
            >
              <Filter size={16} />
              Filters
              {mobileFiltersOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        <div
          id="hibret-directive-filters"
          className={[
            "mt-4 gap-2",
            mobileFiltersOpen ? "grid grid-cols-1 sm:grid-cols-2" : "hidden",
            "md:flex md:flex-wrap",
          ].join(" ")}
        >
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}
            className="min-h-11 min-w-[140px] rounded-2xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] px-3 text-sm font-bold text-[var(--aw-text)] outline-none focus:border-[var(--aw-primary)]"
          >
            <option value="all">All types</option>
            <option value="meeting">Meeting</option>
            <option value="conference">Conference</option>
            <option value="trend_report">Trend Report</option>
            <option value="other">Other</option>
          </select>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            className="min-h-11 min-w-[140px] rounded-2xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] px-3 text-sm font-bold text-[var(--aw-text)] outline-none focus:border-[var(--aw-primary)]"
          >
            <option value="all">All statuses</option>
            <option value="published">Published</option>
            <option value="closed">Closed</option>
            <option value="draft">Draft</option>
          </select>

          <button
            type="button"
            onClick={() => {
              setSearchText("");
              setTypeFilter("all");
              setStatusFilter("all");
            }}
            className="min-h-11 rounded-2xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] px-4 text-sm font-black text-[var(--aw-text)] hover:border-[var(--aw-primary)] hover:text-[var(--aw-primary)]"
          >
            Clear
          </button>
        </div>
      </section>

      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] shadow-sm">
        <div className="flex shrink-0 flex-col gap-3 border-b border-[var(--aw-border-soft)] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <h2 className="text-lg font-black text-[var(--aw-text)]">{pagination.total} Announcements</h2>
            <p className="mt-1 text-sm font-semibold text-[var(--aw-muted)]">
              Showing {filteredAnnouncements.length} directives currently loaded for this Hibret.
            </p>
          </div>
        </div>

        <div className="min-h-0 flex-1">
          <div className="grid gap-4 p-4 md:hidden">
            {isLoading ? (
              <div className="rounded-2xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface-muted)] px-4 py-8 text-sm font-semibold text-[var(--aw-muted)]">
                Loading announcements...
              </div>
            ) : filteredAnnouncements.length === 0 ? (
              <AdminEmptyState title="No directives found" description="Adjust filters and try again." />
            ) : (
              filteredAnnouncements.map((announcement) => {
                const myReport = reportStatus(announcement);
                const review = reviewStatus(announcement);

                return (
                  <article
                    key={announcement.id}
                    className="overflow-hidden rounded-3xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] shadow-sm"
                  >
                    <div className="bg-gradient-to-br from-[var(--aw-primary-soft)] to-[var(--aw-yellow-bg)] px-4 py-4">
                      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--aw-muted)]">
                        {typeLabels[announcement.type]}
                      </p>
                      <Link
                        to={`/hibret/announcements/${announcement.id}`}
                        className="mt-1 line-clamp-2 text-base font-black text-[var(--aw-primary-dark)] hover:text-[var(--aw-primary)]"
                      >
                        {announcement.title}
                      </Link>
                    </div>

                    <div className="grid gap-3 p-4 text-sm">
                      <div className="flex items-center justify-between gap-4">
                        <span className="font-bold text-[var(--aw-muted)]">Status</span>
                        <span className={["inline-flex rounded-full border px-3 py-1 text-xs font-black", badgeClass(announcement.status)].join(" ")}>
                          {labelize(announcement.status)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <span className="font-bold text-[var(--aw-muted)]">Deadline</span>
                        <span className="font-black text-[var(--aw-text)]">{formatDate(announcement.deadline)}</span>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <span className="font-bold text-[var(--aw-muted)]">My report</span>
                        <span className={["inline-flex rounded-full border px-3 py-1 text-xs font-black", badgeClass(myReport)].join(" ")}>
                          {labelize(myReport)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <span className="font-bold text-[var(--aw-muted)]">Woreda review</span>
                        <span className={["inline-flex rounded-full border px-3 py-1 text-xs font-black", badgeClass(review)].join(" ")}>
                          {labelize(review)}
                        </span>
                      </div>

                      {announcement.attendanceRequired ? (
                        <div className="flex items-center justify-between gap-4">
                          <span className="font-bold text-[var(--aw-muted)]">Attendance</span>
                          <span className="font-black text-[var(--aw-text)]">Required</span>
                        </div>
                      ) : null}

                      <Link
                        to={`/hibret/announcements/${announcement.id}`}
                        className="mt-1 inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl bg-[var(--aw-primary)] px-4 text-sm font-black text-white hover:bg-[var(--aw-primary-dark)]"
                      >
                        <Eye size={16} />
                        Open
                      </Link>
                    </div>
                  </article>
                );
              })
            )}
          </div>

          <div className="hidden h-full overflow-x-auto md:block">
            <table className="w-[max(100%,980px)] border-collapse text-left">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-[var(--aw-border-soft)] bg-[var(--aw-surface-muted)] text-[11px] font-black uppercase tracking-[0.1em] text-[var(--aw-muted)]">
                  <th className="px-5 py-4">Title</th>
                  <th className="px-5 py-4">Type</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Deadline</th>
                  <th className="px-5 py-4">My Report</th>
                  <th className="px-5 py-4">Woreda Review</th>
                  <th className="px-5 py-4 text-center">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[var(--aw-border-soft)] text-sm text-[var(--aw-text)]">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-sm font-semibold text-[var(--aw-muted)]">
                      Loading announcements...
                    </td>
                  </tr>
                ) : filteredAnnouncements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center">
                      <div className="mx-auto max-w-md">
                        <AdminEmptyState title="No directives found" description="Adjust filters and try again." />
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredAnnouncements.map((announcement) => {
                    const myReport = reportStatus(announcement);
                    const review = reviewStatus(announcement);

                    return (
                      <tr key={announcement.id} className="transition hover:bg-[var(--aw-primary-soft)]/50">
                        <td className="max-w-[360px] px-5 py-4">
                          <Link
                            to={`/hibret/announcements/${announcement.id}`}
                            className="line-clamp-2 font-black text-[var(--aw-primary-dark)] hover:text-[var(--aw-primary)]"
                          >
                            {announcement.title}
                          </Link>
                          {announcement.attendanceRequired ? (
                            <p className="mt-1 text-xs font-semibold text-[var(--aw-muted)]">Attendance required</p>
                          ) : null}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 font-bold text-[var(--aw-muted)]">
                          {typeLabels[announcement.type]}
                        </td>

                        <td className="px-5 py-4">
                          <span className={["inline-flex rounded-full border px-3 py-1 text-xs font-black", badgeClass(announcement.status)].join(" ")}>
                            {labelize(announcement.status)}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 font-semibold text-[var(--aw-muted)]">
                          {formatDate(announcement.deadline)}
                        </td>

                        <td className="px-5 py-4">
                          <span className={["inline-flex rounded-full border px-3 py-1 text-xs font-black", badgeClass(myReport)].join(" ")}>
                            {labelize(myReport)}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span className={["inline-flex rounded-full border px-3 py-1 text-xs font-black", badgeClass(review)].join(" ")}>
                            {labelize(review)}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-center">
                          <Link
                            to={`/hibret/announcements/${announcement.id}`}
                            className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl bg-[var(--aw-primary)] px-3 text-xs font-black text-white hover:bg-[var(--aw-primary-dark)]"
                          >
                            <Eye size={15} />
                            Open
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="shrink-0 border-t border-[var(--aw-border-soft)] bg-[var(--aw-surface)] p-4">
          <div className="flex flex-col gap-3 text-xs font-bold text-[var(--aw-muted)] sm:flex-row sm:items-center sm:justify-between">
            <span>
              Page {pagination.page} of {pagination.totalPages} · {pagination.total} total
            </span>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
                className="min-h-10 rounded-xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] px-3 text-sm font-bold text-[var(--aw-text)]"
              >
                <option value={10}>10 / page</option>
                <option value={20}>20 / page</option>
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
              </select>

              <button
                type="button"
                disabled={!pagination.hasPreviousPage}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="min-h-10 rounded-xl border border-[var(--aw-border-soft)] px-3 text-sm font-black text-[var(--aw-text)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>

              <button
                type="button"
                disabled={!pagination.hasNextPage}
                onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}
                className="min-h-10 rounded-xl border border-[var(--aw-border-soft)] px-3 text-sm font-black text-[var(--aw-text)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </section>
    </section>
  );
}
