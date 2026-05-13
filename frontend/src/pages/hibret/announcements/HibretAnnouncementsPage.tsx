import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
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

function formatDate(v?: string | null) { return v ? new Date(v).toLocaleDateString() : "No deadline"; }

function statusClass(s: string) {
  const c = s.toLowerCase();
  if (["approved", "submitted", "published"].includes(c)) return "rounded-full border border-[var(--aw-success)]/20 bg-[var(--aw-success-bg)] px-2.5 py-0.5 text-[10px] font-black uppercase text-[var(--aw-success)]";
  if (["rejected", "changes_requested", "closed"].includes(c)) return "rounded-full border border-[var(--aw-danger)]/20 bg-[var(--aw-danger-bg)] px-2.5 py-0.5 text-[10px] font-black uppercase text-[var(--aw-danger)]";
  return "rounded-full border border-[var(--aw-border)] bg-[var(--aw-surface-muted)] px-2.5 py-0.5 text-[10px] font-black uppercase text-[var(--aw-muted)]";
}

export function HibretAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({ total: 0, page: 1, pageSize: 20, totalPages: 1, hasNextPage: false, hasPreviousPage: false });
  const [summary, setSummary] = useState<HibretAnnouncementsSummary>({ assigned: 0, submitted: 0, pending: 0, approved: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  async function loadData() {
    setIsLoading(true);
    try {
      const data = await getHibretAnnouncements({ page, pageSize, search: searchText || undefined, type: typeFilter, status: statusFilter });
      setAnnouncements(data.announcements); setPagination(data.pagination); setSummary(data.summary);
    } catch { console.error("Error loading assigned directives."); }
    finally { setIsLoading(false); }
  }

  useEffect(() => { void loadData(); }, [page, pageSize, searchText, typeFilter, statusFilter]);
  useEffect(() => { setPage(1); }, [searchText, typeFilter, statusFilter]);

  return (
    <div className="flex flex-col gap-6">
      <div className="aw-stat-grid !grid-cols-2 md:!grid-cols-4">
        <div className="aw-stat-card"><p className="aw-stat-label">Assigned</p><p className="aw-stat-value">{summary.assigned}</p></div>
        <div className="aw-stat-card"><p className="aw-stat-label">Submitted</p><p className="aw-stat-value text-[var(--aw-success)]">{summary.submitted}</p></div>
        <div className="aw-stat-card"><p className="aw-stat-label">Pending</p><p className="aw-stat-value text-[var(--aw-primary)]">{summary.pending}</p></div>
        <div className="aw-stat-card"><p className="aw-stat-label">Approved</p><p className="aw-stat-value text-[var(--aw-success)]">{summary.approved}</p></div>
      </div>

      <section className="aw-panel shadow-soft">
        <header className="aw-panel-header !bg-[var(--aw-surface)] !py-6">
          <div className="min-w-0">
            <h2 className="aw-panel-title">Assigned Directives</h2>
            <p className="text-xs font-bold text-[var(--aw-muted)] mt-1">Official directives and meeting mandates from Woreda administration.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
             <div className="aw-search-wrap !min-h-[38px]">
                <Search size={14} className="text-[var(--aw-muted)]" />
                <input type="text" className="aw-search-input" placeholder="Search directives..." value={searchText} onChange={e => setSearchText(e.target.value)} />
             </div>
             <button type="button" onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)} className="aw-btn aw-btn-outline lg:hidden"><SlidersHorizontal size={14}/>Filters</button>
             <div className={["flex gap-2", mobileFiltersOpen ? "w-full" : "hidden lg:flex"].join(" ")}>
                <select className="aw-filter-select !min-h-[38px]" value={typeFilter} onChange={e => setTypeFilter(e.target.value as TypeFilter)}>
                   <option value="all">All types</option>
                   <option value="meeting">Meeting</option>
                   <option value="conference">Conference</option>
                   <option value="trend_report">Trend Report</option>
                </select>
                <select className="aw-filter-select !min-h-[38px]" value={statusFilter} onChange={e => setStatusFilter(e.target.value as StatusFilter)}>
                   <option value="all">All statuses</option>
                   <option value="published">Published</option>
                   <option value="closed">Closed</option>
                </select>
             </div>
          </div>
        </header>

        <div className="aw-table-wrapper !border-none !rounded-none">
          <table className="aw-table aw-table-to-cards">
            <thead>
              <tr>
                <th>Directive details</th>
                <th>Category</th>
                <th className="text-center">Status</th>
                <th>Deadline</th>
                <th>Report</th>
                <th className="text-right">Control</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="py-12 text-center font-bold text-[var(--aw-muted)]">Loading assigned tasks...</td></tr>
              ) : announcements.length === 0 ? (
                <tr><td colSpan={6} className="py-16 text-center font-bold text-[var(--aw-muted)]">No directives found.</td></tr>
              ) : (
                announcements.map((a) => {
                  const r = a.reports?.[0];
                  return (
                    <tr key={a.id}>
                      <td data-label="Directive">
                        <p className="font-black text-[var(--aw-text)]">{a.title}</p>
                        {a.attendanceRequired && <p className="text-[10px] font-bold text-[var(--aw-primary)] uppercase mt-1">Attendance Required</p>}
                      </td>
                      <td data-label="Type"><span className="text-[10px] font-black uppercase text-[var(--aw-muted)] bg-[var(--aw-bg)] px-2 py-1 rounded-lg border border-[var(--aw-border-soft)]">{typeLabels[a.type]}</span></td>
                      <td data-label="Status" className="text-center"><span className={statusClass(a.status)}>{a.status}</span></td>
                      <td data-label="Deadline" className="font-bold text-[var(--aw-muted)]">{formatDate(a.deadline)}</td>
                      <td data-label="Report"><span className={statusClass(r?.status || 'not started')}>{r?.status || 'not started'}</span></td>
                      <td data-label="Action" className="text-right">
                        <Link to={`/hibret/announcements/${a.id}`} className="aw-btn aw-btn-primary !min-h-[34px] !px-4 !text-[11px] uppercase tracking-wider">Open Directive</Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <footer className="aw-panel-header !bg-[var(--aw-surface-muted)] !border-none !py-4">
          <p className="text-xs font-bold text-[var(--aw-muted)]">Page {pagination.page} of {pagination.totalPages} · {pagination.total} total</p>
          <div className="flex items-center gap-2">
            <button disabled={!pagination.hasPreviousPage} onClick={() => setPage(p => p - 1)} className="aw-btn aw-btn-outline !min-h-[34px] !px-2 disabled:opacity-30"><ChevronLeft size={16}/></button>
            <button disabled={!pagination.hasNextPage} onClick={() => setPage(p => p + 1)} className="aw-btn aw-btn-outline !min-h-[34px] !px-2 disabled:opacity-30"><ChevronRight size={16}/></button>
          </div>
        </footer>
      </section>
    </div>
  );
}
