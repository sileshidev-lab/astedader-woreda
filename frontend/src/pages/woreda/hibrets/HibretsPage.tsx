import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { createPortal } from "react-dom";
import {
  ArrowRight,
  Building2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  createHibret,
  getWoredaHibrets,
} from "../../../services/woredaHibretService";
import type { WoredaHibretListItem } from "../../../services/woredaHibretService";
import { useAuthStore } from "../../../store/authStore";

type SortOrder =
  | "name"
  | "members_desc"
  | "members_asc"
  | "pending_desc"
  | "submitted_desc";

function StatCard({
  label,
  value,
  sub,
  tone = "primary",
}: {
  label: string;
  value: string | number;
  sub: string;
  tone?: "primary" | "success" | "warning" | "magenta";
}) {
  return (
    <article className="aw-stat-card">
      <div className="relative min-w-0">
        <p className="aw-stat-label">{label}</p>
        <p className={`aw-stat-value ${tone === 'magenta' ? 'text-[var(--aw-magenta)]' : tone === 'success' ? 'text-[var(--aw-success)]' : tone === 'warning' ? 'text-[var(--aw-yellow-text)]' : 'text-[var(--aw-primary)]'}`}>
          {value}
        </p>
        <p className="mt-2 truncate text-xs font-semibold text-[var(--aw-muted)]">{sub}</p>
      </div>
    </article>
  );
}

export function HibretsPage() {
  const { user } = useAuthStore();
  const privileges = user?.privileges ?? [];
  const canAccessAll = privileges.includes("*");
  const can = (p: string) => canAccessAll || privileges.includes(p);

  const [hibrets, setHibrets] = useState<WoredaHibretListItem[]>([]);
  const [searchText, setSearchText] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("name");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [newName, setNewName] = useState("");
  const [listError, setListError] = useState("");
  const [createError, setCreateError] = useState("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  async function loadHibrets() {
    setIsLoading(true);
    setListError("");
    try {
      const data = await getWoredaHibrets();
      setHibrets(data);
    } catch {
      setListError("Unable to load Hibrets.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { void loadHibrets(); }, []);

  const filteredHibrets = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    const filtered = hibrets.filter((hibret) => !query || hibret.name.toLowerCase().includes(query));
    return [...filtered].sort((a, b) => {
      if (sortOrder === "members_desc") return b.memberCount - a.memberCount;
      if (sortOrder === "members_asc") return a.memberCount - b.memberCount;
      if (sortOrder === "pending_desc") return (b.pendingReports || 0) - (a.pendingReports || 0);
      if (sortOrder === "submitted_desc") return (b.submittedReports || 0) - (a.submittedReports || 0);
      return a.name.localeCompare(b.name);
    });
  }, [hibrets, searchText, sortOrder]);

  const summary = useMemo(() => {
    return {
      total: hibrets.length,
      totalMembers: hibrets.reduce((sum, h) => sum + h.memberCount, 0),
      pendingReports: hibrets.reduce((sum, h) => sum + (h.pendingReports || 0), 0),
      submittedReports: hibrets.reduce((sum, h) => sum + (h.submittedReports || 0), 0),
    };
  }, [hibrets]);

  useEffect(() => { setPage(1); }, [searchText, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredHibrets.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedHibrets = filteredHibrets.slice((safePage - 1) * pageSize, safePage * pageSize);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newName.trim();
    if (!name) { setCreateError("Hibret name is required."); return; }
    setIsSaving(true);
    setCreateError("");
    try {
      await createHibret({ name, description: null, status: "active" });
      setNewName("");
      setIsCreateOpen(false);
      await loadHibrets();
    } catch (err: any) {
      setCreateError(err?.response?.data?.message || "Unable to create Hibret.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {listError && <div className="aw-panel !bg-[var(--aw-danger-bg)] !border-[var(--aw-danger)] p-4 text-sm font-black text-[var(--aw-danger)]">{listError}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_200px] gap-4">
        <div className="aw-stat-grid">
          <StatCard label="Total Hibrets" value={summary.total} sub="Active units" />
          <StatCard label="Total Members" value={summary.totalMembers} sub="Registered population" tone="success" />
          <StatCard label="Submitted" value={summary.submittedReports} sub="Reports received" tone="primary" />
          <StatCard label="Pending" value={summary.pendingReports} sub="Expected reports" tone="magenta" />
        </div>
        {can("hibret.create") && (
          <button type="button" onClick={() => setIsCreateOpen(true)} className="aw-btn aw-btn-primary xl:h-full !rounded-3xl shadow-lg">
            <Plus size={20} />
            <span className="xl:hidden">New Hibret</span>
            <span className="hidden xl:inline">Create Hibret</span>
          </button>
        )}
      </div>

      <section className="aw-panel shadow-soft">
        <header className="aw-panel-header !bg-[var(--aw-surface)] !py-6">
          <div className="min-w-0">
            <h2 className="aw-panel-title">Hibret Registry</h2>
            <p className="text-xs font-bold text-[var(--aw-muted)] mt-1">Manage all administrative units and their membership.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
             <div className="aw-search-wrap !min-h-[38px]">
                <Search size={14} className="text-[var(--aw-muted)]" />
                <input type="text" className="aw-search-input" placeholder="Search Hibrets..." value={searchText} onChange={(e) => setSearchText(e.target.value)} />
             </div>
             <button type="button" onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)} className="aw-btn aw-btn-outline !min-h-[38px] lg:hidden"><SlidersHorizontal size={14}/>Filters</button>
             <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as SortOrder)} className={["aw-filter-select !min-h-[38px]", mobileFiltersOpen ? "block" : "hidden lg:block"].join(" ")}>
                <option value="name">Sort by name</option>
                <option value="members_desc">Most members</option>
                <option value="members_asc">Fewest members</option>
                <option value="submitted_desc">Most submitted</option>
                <option value="pending_desc">Most pending</option>
             </select>
          </div>
        </header>

        <div className="aw-table-wrapper !border-none !rounded-none">
          <table className="aw-table aw-table-to-cards">
            <thead>
              <tr>
                <th className="w-16 text-center">#</th>
                <th>Hibret name</th>
                <th className="text-center">Members</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={4} className="py-12 text-center font-bold text-[var(--aw-muted)]">Fetching registry data...</td></tr>
              ) : filteredHibrets.length === 0 ? (
                <tr><td colSpan={4} className="py-16 text-center"><div className="flex flex-col items-center gap-3 text-[var(--aw-muted)]"><Building2 size={40} strokeWidth={1} /><p className="font-bold">No Hibrets matching your search.</p></div></td></tr>
              ) : (
                paginatedHibrets.map((hibret, idx) => (
                  <tr key={hibret.id}>
                    <td data-label="#" className="text-center font-black text-[var(--aw-muted)]">{(safePage - 1) * pageSize + idx + 1}</td>
                    <td data-label="Hibret">
                      <Link to={`/woreda/hibrets/${hibret.id}?side=administrative`} className="text-sm font-black text-[var(--aw-text)] hover:text-[var(--aw-primary)] transition-colors">{hibret.name}</Link>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold text-[var(--aw-muted)] uppercase tracking-wider">{hibret.familyCount || 0} Families</span>
                        <span className="text-[10px] text-[var(--aw-border)]">•</span>
                        <span className="text-[10px] font-bold text-[var(--aw-muted)] uppercase tracking-wider">{hibret.adminCount || 0} Admins</span>
                      </div>
                    </td>
                    <td data-label="Population" className="text-center"><span className="text-sm font-black">{hibret.memberCount}</span></td>
                    <td data-label="Control" className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link to={`/woreda/hibrets/${hibret.id}?side=political`} className="aw-btn aw-btn-outline !min-h-[34px] !px-3 !text-xs">Political</Link>
                        <Link to={`/woreda/hibrets/${hibret.id}?side=administrative`} className="aw-btn aw-btn-primary !min-h-[34px] !px-3 !text-xs">Manage<ArrowRight size={12} className="ml-1" /></Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <footer className="aw-panel-header !bg-[var(--aw-surface-muted)] !border-none !py-4">
          <p className="text-xs font-bold text-[var(--aw-muted)]">Page {safePage} of {totalPages} · {filteredHibrets.length} Hibrets</p>
          <div className="flex items-center gap-2">
            <button disabled={safePage <= 1} onClick={() => setPage(p => p - 1)} className="aw-btn aw-btn-outline !min-h-[34px] !px-2 disabled:opacity-30"><ChevronLeft size={16}/></button>
            <button disabled={safePage >= totalPages} onClick={() => setPage(p => p + 1)} className="aw-btn aw-btn-outline !min-h-[34px] !px-2 disabled:opacity-30"><ChevronRight size={16}/></button>
          </div>
        </footer>
      </section>

      {isCreateOpen && createPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[var(--aw-overlay-scrim-strong)] backdrop-blur-sm" onClick={() => setIsCreateOpen(false)} />
          <form onSubmit={handleCreate} className="relative aw-panel w-full max-w-lg shadow-2xl !rounded-3xl border-none">
            <header className="aw-panel-header !rounded-t-3xl !py-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--aw-primary)] mb-1"> Hibret Administration </p>
                <h2 className="text-xl font-black">Register New Hibret</h2>
              </div>
              <button type="button" onClick={() => setIsCreateOpen(false)} className="aw-btn aw-btn-outline !min-h-[36px] !px-2 !rounded-xl"><X size={18}/></button>
            </header>
            <div className="p-8 space-y-6">
              {createError && <div className="aw-panel !bg-[var(--aw-danger-bg)] !border-[var(--aw-danger)] p-4 text-xs font-black text-[var(--aw-danger)]">{createError}</div>}
              <div className="aw-form-field">
                <label className="aw-form-label">Unit Name</label>
                <input autoFocus className="aw-input" placeholder="e.g. Hibret 01" value={newName} onChange={(e) => setNewName(e.target.value)} />
              </div>
              <p className="text-xs font-medium text-[var(--aw-muted)] leading-relaxed">Registering a new Hibret will allow you to assign members and administrators to this unit.</p>
            </div>
            <div className="p-6 bg-[var(--aw-surface-muted)] flex justify-end gap-3 rounded-b-3xl">
              <button type="button" onClick={() => setIsCreateOpen(false)} className="aw-btn aw-btn-outline !bg-white">Cancel</button>
              <button type="submit" disabled={isSaving} className="aw-btn aw-btn-primary min-w-[140px]">{isSaving ? "Saving..." : "Create Unit"}</button>
            </div>
          </form>
        </div>,
        document.body
      )}
    </div>
  );
}
