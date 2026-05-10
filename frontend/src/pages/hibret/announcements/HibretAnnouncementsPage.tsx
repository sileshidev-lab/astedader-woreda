import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp } from "lucide-react";
import { getHibretAnnouncements, type HibretAnnouncementsSummary } from "../../../services/hibretService";
import type { Announcement, AnnouncementType } from "../../../types/announcement";
import type { PaginationMeta } from "../../../services/announcementService";

type StatusFilter = "all" | "draft" | "published" | "closed";
type TypeFilter = "all" | AnnouncementType;

const typeLabels: Record<AnnouncementType, string> = {
  meeting: "Meeting",
  conference: "Conference",
  trend_report: "Trend Report",
  other: "Other",
};

function formatDate(value?: string | null) {
  if (!value) return "No deadline";
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

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function reportBadgeClass(value: string) {
  const clean = value.toLowerCase();
  if (clean === "approved" || clean === "submitted") return "aw-review-badge aw-review-approved";
  if (clean === "rejected" || clean === "changes_requested") return "aw-review-badge aw-review-rejected";
  return "aw-tag aw-tag-other";
}

function reviewBadgeClass(value: string) {
  const clean = value.toLowerCase();
  if (clean === "pending") return "aw-review-badge aw-review-pending badge-pending";
  if (clean === "approved") return "aw-review-badge aw-review-approved";
  if (clean === "rejected" || clean === "changes_requested") return "aw-review-badge aw-review-rejected";
  return "aw-tag aw-tag-other";
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
    <section className="aw-design-page aw-mobile-page aw-design-directives aw-design-list aw-stitch-page aw-stitch-announcements aw-mobile-directives aw-mobile-filterable flex min-h-0 flex-1 flex-col gap-8 bg-woreda-surface">
      {error ? (
        <div className="border border-woreda-danger bg-woreda-dangerBg px-4 py-3 text-sm font-semibold text-woreda-danger">
          {error}
        </div>
      ) : null}

      <div className="aw-stats-row hidden md:grid">
        <div className="aw-stat-card">
          <div className="aw-stat-corner-accent corner-slate" aria-hidden />
          <div>
            <div className="aw-stat-label">Assigned Directives</div>
            <div className="aw-stat-value">{summary.assigned}</div>
            <div className="aw-stat-sub">Targeted to this Hibret</div>
          </div>
        </div>

        <div className="aw-stat-card">
          <div className="aw-stat-corner-accent corner-teal" aria-hidden />
          <div>
            <div className="aw-stat-label">Submitted Reports</div>
            <div className="aw-stat-value v-teal">{summary.submitted}</div>
            <div className="aw-stat-sub">Sent to Woreda</div>
          </div>
        </div>

        <div className="aw-stat-card">
          <div className="aw-stat-corner-accent corner-magenta" aria-hidden />
          <div>
            <div className="aw-stat-label">Pending / Approved</div>
            <div className="aw-stat-value v-magenta">{summary.pending} / {summary.approved}</div>
            <div className="aw-stat-sub">Not started vs approved</div>
          </div>
        </div>
      </div>

      <div className="aw-panel flex min-h-0 flex-1 flex-col">
        <div className="aw-panel-header">
          <div>
            <span className="aw-panel-title">Assigned Directives</span>
            <p className="aw-panel-count">
              Showing {filteredAnnouncements.length} of {pagination.total} directives targeted to this Hibret.
            </p>
          </div>

          <div className="aw-toolbar aw-toolbar-mobile-controls">
            <label className="aw-search-wrap block">
              <input
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search directive title..."
                className="aw-search-input"
              />
            </label>
            <button
              type="button"
              className="aw-btn aw-btn-outline aw-mobile-filters-toggle md:hidden"
              onClick={() => setMobileFiltersOpen((open) => !open)}
              aria-expanded={mobileFiltersOpen}
              aria-controls="hibret-directive-mobile-filters"
            >
              Filters
              {mobileFiltersOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            <div
              id="hibret-directive-mobile-filters"
              className={[
                "aw-toolbar-filter-group",
                mobileFiltersOpen ? "aw-toolbar-filter-group-open" : "",
              ].join(" ")}
            >

            <label className="block">
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}
                className="aw-filter-select"
              >
                <option value="all">All types</option>
                <option value="meeting">Meeting</option>
                <option value="conference">Conference</option>
                <option value="trend_report">Trend Report</option>
                <option value="other">Other</option>
              </select>
            </label>

            <label className="block">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                className="aw-filter-select"
              >
                <option value="all">All statuses</option>
                <option value="published">Published</option>
                <option value="closed">Closed</option>
                <option value="draft">Draft</option>
              </select>
            </label>

            <button
              type="button"
              onClick={() => {
                setSearchText("");
                setTypeFilter("all");
                setStatusFilter("all");
              }}
              className="aw-btn aw-btn-outline"
            >
              Clear
            </button>
            </div>
          </div>
        </div>

        <div className="hidden min-h-0 flex-1 overflow-auto md:block">
          <table className="aw-dashboard-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Deadline</th>
                  <th>My Report</th>
                  <th>Woreda Review</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>

              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-woreda-textMuted">
                      Loading announcements...
                    </td>
                  </tr>
                ) : filteredAnnouncements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-14 text-center">
                      <div className="mx-auto max-w-md">
                        <h3 className="mt-1 text-lg font-bold text-woreda-text">No directives found</h3>
                        <p className="mt-2 text-sm text-woreda-textMuted">Adjust filters and try again.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredAnnouncements.map((announcement) => {
                  const myReport = reportStatus(announcement);
                  const review = reviewStatus(announcement);

                  return (
                    <tr key={announcement.id}>
                      <td className="directive-title aw-td-title">
                        <p className="font-bold text-woreda-text">
                          {announcement.title}
                        </p>
                        {announcement.attendanceRequired ? (
                          <p className="mt-1 text-xs font-semibold text-woreda-textMuted">
                            Attendance required
                          </p>
                        ) : null}
                      </td>

                      <td>
                        <span className="aw-tag aw-tag-directive-type">
                          {typeLabels[announcement.type]}
                        </span>
                      </td>

                      <td>
                        <span className={`aw-status aw-status-${announcement.status}`}>
                          <span className="aw-status-dot"></span>
                          {labelize(announcement.status)}
                        </span>
                      </td>

                      <td>
                        {formatDate(announcement.deadline)}
                      </td>

                      <td>
                        <span className={reportBadgeClass(myReport)}>
                          {labelize(myReport)}
                        </span>
                      </td>

                      <td>
                        <span className={reviewBadgeClass(review)}>
                          {labelize(review)}
                        </span>
                      </td>

                      <td className="text-right">
                        <Link
                          to={`/hibret/announcements/${announcement.id}`}
                          className="aw-btn aw-btn-outline aw-open-btn"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  );
                }))
                }
              </tbody>
            </table>
        </div>
        <div className="aw-directives-mobile-list md:hidden">
          {isLoading ? (
            <div className="aw-directives-mobile-empty">Loading announcements...</div>
          ) : filteredAnnouncements.length === 0 ? (
            <div className="aw-directives-mobile-empty">
              <h3>No directives found</h3>
              <p>Adjust filters and try again.</p>
            </div>
          ) : (
            filteredAnnouncements.map((announcement) => {
              const myReport = reportStatus(announcement);
              const review = reviewStatus(announcement);

              return (
                <Link
                  key={announcement.id}
                  to={`/hibret/announcements/${announcement.id}`}
                  className="aw-directives-mobile-card"
                >
                  <div className="aw-directives-mobile-card-top">
                    <p className="aw-directives-mobile-title">{announcement.title}</p>
                    <span className={`aw-status aw-status-${announcement.status}`}>
                      <span className="aw-status-dot"></span>
                      {labelize(announcement.status)}
                    </span>
                  </div>
                  <div className="aw-directives-mobile-meta">
                    <span className="aw-tag aw-tag-directive-type">{typeLabels[announcement.type]}</span>
                    <span className="aw-deadline">{formatDate(announcement.deadline)}</span>
                  </div>
                  <div className="aw-directives-mobile-counts">
                    <span>Report: <strong>{labelize(myReport)}</strong></span>
                    <span>Review: <strong>{labelize(review)}</strong></span>
                  </div>
                </Link>
              );
            })
          )}
        </div>
        <div className="flex items-center justify-between border-t border-woreda-border bg-woreda-surfaceLow px-5 py-3">
          <span className="text-sm font-semibold text-woreda-textMuted">
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} total
          </span>
          <div className="flex items-center gap-2">
            <select
              className="aw-filter-select"
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
            >
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
            </select>
            <button
              className="aw-btn aw-btn-outline"
              disabled={!pagination.hasPreviousPage}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </button>
            <button
              className="aw-btn aw-btn-outline"
              disabled={!pagination.hasNextPage}
              onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}
            >
              Next
            </button>
          </div>
        </div>

      </div>
    </section>
  );
}
