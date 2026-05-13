import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, X, ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import {
  createAdmin,
  getAdminFormOptions,
  getAdmins,
  updateAdmin,
  updateAdminStatus,
} from "../../../services/adminService";
import type {
  AdminFormOptions,
  AdminListItem,
  AdminPayload,
  AdminRole,
  AdminSummary,
} from "../../../services/adminService";
import { useAuthStore } from "../../../store/authStore";

const emptySummary: AdminSummary = { total: 0, woredaAdmins: 0, hibretAdmins: 0, active: 0, pendingSetup: 0, disabled: 0 };
const emptyOptions: AdminFormOptions = { hibrets: [], privileges: [] };

function statusClass(s?: string | null) {
  if (s === "ACTIVE") return "rounded-full border border-[var(--aw-success)]/20 bg-[var(--aw-success-bg)] px-2.5 py-0.5 text-[10px] font-black uppercase text-[var(--aw-success)]";
  if (s === "PENDING_SETUP") return "rounded-full border border-[var(--aw-primary)]/20 bg-[var(--aw-primary-soft)] px-2.5 py-0.5 text-[10px] font-black uppercase text-[var(--aw-primary)]";
  if (s === "DISABLED") return "rounded-full border border-[var(--aw-danger)]/20 bg-[var(--aw-danger-bg)] px-2.5 py-0.5 text-[10px] font-black uppercase text-[var(--aw-danger)]";
  return "rounded-full border border-[var(--aw-border)] bg-[var(--aw-surface-muted)] px-2.5 py-0.5 text-[10px] font-black uppercase text-[var(--aw-muted)]";
}

export function AdminsPage() {
  const { user } = useAuthStore();
  const privileges = user?.privileges ?? [];
  const canAccessAll = privileges.includes("*");
  const can = (p: string) => canAccessAll || privileges.includes(p);

  const [admins, setAdmins] = useState<AdminListItem[]>([]);
  const [summary, setSummary] = useState<AdminSummary>(emptySummary);
  const [options, setOptions] = useState<AdminFormOptions>(emptyOptions);
  const [searchText, setSearchText] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminListItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [busyAdminId, setBusyAdminId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  async function loadAdmins() {
    setIsLoading(true); setError("");
    try {
      const [ad, opt] = await Promise.all([getAdmins(), getAdminFormOptions()]);
      setAdmins(ad.admins); setSummary(ad.summary); setOptions(opt);
    } catch { setError("Unable to load admins."); } finally { setIsLoading(false); }
  }

  useEffect(() => { void loadAdmins(); }, []);

  const filteredAdmins = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return admins.filter((a) => {
      if (roleFilter && a.role !== roleFilter) return false;
      if (statusFilter && a.status !== statusFilter) return false;
      if (!q) return true;
      return [a.email, a.role, a.hibretName].some(f => f?.toLowerCase().includes(q));
    });
  }, [admins, roleFilter, searchText, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredAdmins.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedAdmins = filteredAdmins.slice((safePage - 1) * pageSize, safePage * pageSize);

  async function handleSave(p: AdminPayload) {
    setIsSaving(true); setError(""); setMessage("");
    try {
      const res = editingAdmin ? await updateAdmin(editingAdmin.id, p) : await createAdmin(p);
      setMessage(res.message); setIsFormOpen(false); setEditingAdmin(null); await loadAdmins();
    } catch (err: any) { setError(err?.response?.data?.message || "Error saving admin."); } finally { setIsSaving(false); }
  }

  async function handleStatus(a: AdminListItem, s: "ACTIVE" | "DISABLED" | "PENDING_SETUP") {
    setBusyAdminId(a.id);
    try { const res = await updateAdminStatus(a.id, s); setMessage(res.message); await loadAdmins(); }
    catch { setError("Status update failed."); } finally { setBusyAdminId(null); }
  }

  return (
    <div className="flex flex-col gap-6">
      {error && <div className="aw-panel !bg-[var(--aw-danger-bg)] !border-[var(--aw-danger)] px-4 py-3 text-sm font-black text-[var(--aw-danger)]">{error}</div>}
      {message && <div className="aw-panel !bg-[var(--aw-primary-soft)]/20 !border-[var(--aw-primary)] px-4 py-3 text-sm font-black text-[var(--aw-primary)]">{message}</div>}

      <div className="aw-stat-grid !grid-cols-2 md:!grid-cols-3 xl:!grid-cols-6">
        <div className="aw-stat-card"><p className="aw-stat-label">Total Admins</p><p className="aw-stat-value">{summary.total}</p></div>
        <div className="aw-stat-card"><p className="aw-stat-label">Woreda</p><p className="aw-stat-value text-[var(--aw-primary)]">{summary.woredaAdmins}</p></div>
        <div className="aw-stat-card"><p className="aw-stat-label">Hibret</p><p className="aw-stat-value text-[var(--aw-primary)]">{summary.hibretAdmins}</p></div>
        <div className="aw-stat-card"><p className="aw-stat-label">Active</p><p className="aw-stat-value text-[var(--aw-success)]">{summary.active}</p></div>
        <div className="aw-stat-card"><p className="aw-stat-label">Pending</p><p className="aw-stat-value text-[var(--aw-primary)]">{summary.pendingSetup}</p></div>
        <div className="aw-stat-card"><p className="aw-stat-label">Disabled</p><p className="aw-stat-value text-[var(--aw-danger)]">{summary.disabled}</p></div>
      </div>

      <section className="aw-panel shadow-soft">
        <header className="aw-panel-header !bg-[var(--aw-surface)] !py-6">
          <div className="min-w-0">
             <h2 className="aw-panel-title">Administrator Access</h2>
             <p className="text-xs font-bold text-[var(--aw-muted)] mt-1">Manage system administrators and their assigned privileges.</p>
          </div>
          {can("admin.create") && <button onClick={() => { setEditingAdmin(null); setIsFormOpen(true); }} className="aw-btn aw-btn-primary"><Plus size={16}/>New Admin</button>}
        </header>

        <div className="aw-toolbar !border-none !rounded-none !bg-[var(--aw-surface-muted)] !p-4">
           <div className="aw-search-wrap !bg-[var(--aw-surface)] flex-1 max-w-md">
             <Search size={14} className="text-[var(--aw-muted)]"/>
             <input type="text" className="aw-search-input" placeholder="Search by email, role, or unit..." value={searchText} onChange={e => setSearchText(e.target.value)}/>
           </div>
           <button type="button" onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)} className="aw-btn aw-btn-outline lg:hidden"><SlidersHorizontal size={14}/>Filters</button>
           <div className={["flex flex-wrap gap-2", mobileFiltersOpen ? "w-full" : "hidden lg:flex"].join(" ")}>
              <select className="aw-filter-select" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}><option value="">All Roles</option><option value="WOREDA_ADMIN">Woreda Admin</option><option value="HIBRET_ADMIN">Hibret Admin</option></select>
              <select className="aw-filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="">All Statuses</option><option value="ACTIVE">Active</option><option value="PENDING_SETUP">Pending Setup</option><option value="DISABLED">Disabled</option></select>
           </div>
        </div>

        <div className="aw-table-wrapper !border-none !rounded-none">
          <table className="aw-table aw-table-to-cards">
            <thead>
              <tr><th>Administrator</th><th>Scope & Unit</th><th>Access Level</th><th>Status</th><th className="text-right">Control</th></tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="py-12 text-center font-bold text-[var(--aw-muted)]">Loading administrator records...</td></tr>
              ) : filteredAdmins.length === 0 ? (
                <tr><td colSpan={5} className="py-16 text-center font-bold text-[var(--aw-muted)]">No administrators found.</td></tr>
              ) : (
                paginatedAdmins.map(a => (
                  <tr key={a.id}>
                    <td data-label="Admin">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-[var(--aw-primary-soft)]/20 flex items-center justify-center font-black text-[var(--aw-primary)] text-xs">{a.email.slice(0,2).toUpperCase()}</div>
                        <div className="min-w-0"><p className="font-black truncate">{a.email}</p><p className="text-[10px] font-bold text-[var(--aw-muted)] uppercase tracking-wider">{a.role.replace('_',' ')}</p></div>
                      </div>
                    </td>
                    <td data-label="Scope">
                      <p className="font-bold">{a.role === 'WOREDA_ADMIN' ? 'Global System' : a.hibretName || 'Unassigned'}</p>
                      <p className="text-[10px] font-bold text-[var(--aw-muted)] uppercase tracking-wider">{a.role === 'WOREDA_ADMIN' ? 'All Hibrets' : 'Assigned Unit'}</p>
                    </td>
                    <td data-label="Access">
                      {a.privileges.includes('*') ? <span className="text-[10px] font-black uppercase text-[var(--aw-primary)]">Full Root Access</span> : <span className="text-[10px] font-black uppercase text-[var(--aw-muted)]">{a.privileges.length} Assigned Permissions</span>}
                    </td>
                    <td data-label="Status"><span className={statusClass(a.status)}>{a.status.replace('_',' ')}</span></td>
                    <td data-label="Control" className="text-right">
                      <div className="flex justify-end gap-2">
                        {can("admin.update") && (
                          <>
                            <button onClick={() => { setEditingAdmin(a); setIsFormOpen(true); }} className="aw-btn aw-btn-outline !min-h-[32px] !px-3 !text-[11px] uppercase tracking-wider">Edit</button>
                            <button disabled={busyAdminId === a.id} onClick={() => handleStatus(a, a.status === 'DISABLED' ? 'ACTIVE' : 'DISABLED')} className={["aw-btn !min-h-[32px] !px-3 !text-[11px] uppercase tracking-wider", a.status === 'DISABLED' ? 'aw-btn-primary' : 'aw-btn-outline !text-[var(--aw-danger)] !border-[var(--aw-danger)]/30'].join(" ")}>{a.status === 'DISABLED' ? 'Enable' : 'Disable'}</button>
                          </>
                        )}
                        <Link to={`/woreda/admins/${a.id}`} className="aw-btn aw-btn-outline !min-h-[32px] !px-3 !text-[11px] uppercase tracking-wider">Details</Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <footer className="aw-panel-header !bg-[var(--aw-surface-muted)] !border-none !py-4">
          <p className="text-xs font-bold text-[var(--aw-muted)]">Page {safePage} of {totalPages} · {filteredAdmins.length} Admins</p>
          <div className="flex items-center gap-2">
            <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))} className="aw-filter-select !min-h-[34px] !text-xs w-24">
              <option value={10}>10 / pg</option><option value={20}>20 / pg</option><option value={50}>50 / pg</option>
            </select>
            <button disabled={safePage <= 1} onClick={() => setPage(p => p - 1)} className="aw-btn aw-btn-outline !min-h-[34px] !px-2 disabled:opacity-30"><ChevronLeft size={16}/></button>
            <button disabled={safePage >= totalPages} onClick={() => setPage(p => p + 1)} className="aw-btn aw-btn-outline !min-h-[34px] !px-2 disabled:opacity-30"><ChevronRight size={16}/></button>
          </div>
        </footer>
      </section>

      {isFormOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[var(--aw-overlay-scrim-strong)] backdrop-blur-sm" onClick={() => setIsFormOpen(false)} />
          <AdminFormModal admin={editingAdmin} options={options} isSaving={isSaving} onClose={() => setIsFormOpen(false)} onSubmit={handleSave} />
        </div>
      )}
    </div>
  );
}

function AdminFormModal({ admin, options, isSaving, onClose, onSubmit }: { admin: AdminListItem | null; options: AdminFormOptions; isSaving: boolean; onClose: () => void; onSubmit: (p: AdminPayload) => Promise<void> }) {
  const [email, setEmail] = useState(admin?.email || "");
  const [role, setRole] = useState<AdminRole>((admin?.role as AdminRole) || "HIBRET_ADMIN");
  const [hibretId, setHibretId] = useState(admin?.hibretId || "");
  const [privileges, setPrivileges] = useState<string[]>(admin?.privileges || []);

  const togglePriv = (p: string) => {
    if(p === '*') setPrivileges(privileges.includes('*') ? [] : ['*']);
    else {
      const next = privileges.filter(x => x !== '*');
      setPrivileges(next.includes(p) ? next.filter(x => x !== p) : [...next, p]);
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ email, role, hibretId: role === 'HIBRET_ADMIN' ? hibretId : null, privileges }); }} className="relative aw-panel w-full max-w-2xl shadow-2xl !rounded-3xl border-none flex flex-col max-h-[90dvh]">
      <header className="aw-panel-header !rounded-t-3xl !py-6">
        <h2 className="text-xl font-black">{admin ? "Edit Administrator" : "New Administrator"}</h2>
        <button type="button" onClick={onClose} className="aw-btn aw-btn-outline !min-h-[36px] !px-2 !rounded-xl"><X size={18}/></button>
      </header>
      <div className="p-8 space-y-6 overflow-y-auto aw-seamless-scroll flex-1">
        <div className="aw-form-field"><label className="aw-form-label">Email address</label><input required type="email" className="aw-input" value={email} onChange={e => setEmail(e.target.value)} /></div>
        <div className="aw-form-grid">
           <div className="aw-form-field"><label className="aw-form-label">System Role</label><select className="aw-filter-select" value={role} onChange={e => setRole(e.target.value as AdminRole)}><option value="HIBRET_ADMIN">Hibret Admin</option><option value="WOREDA_ADMIN">Woreda Admin</option></select></div>
           <div className="aw-form-field"><label className="aw-form-label">Assigned Hibret</label><select disabled={role === 'WOREDA_ADMIN'} className="aw-filter-select disabled:opacity-30" value={hibretId} onChange={e => setHibretId(e.target.value)}><option value="">Select unit...</option>{options.hibrets.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}</select></div>
        </div>
        <section>
          <p className="aw-form-label mb-3">Permissions & Privileges</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {options.privileges.map(p => (
              <label key={p} className="flex items-center gap-3 p-3 rounded-xl border border-[var(--aw-border-soft)] hover:bg-[var(--aw-bg)] cursor-pointer transition-colors">
                <input type="checkbox" checked={privileges.includes(p)} onChange={() => togglePriv(p)} className="h-4 w-4 rounded accent-[var(--aw-primary)]" />
                <span className="text-xs font-bold text-[var(--aw-text)]">{p === '*' ? 'FULL ROOT ACCESS' : p}</span>
              </label>
            ))}
          </div>
        </section>
      </div>
      <div className="p-6 bg-[var(--aw-surface-muted)] flex justify-end gap-3 rounded-b-3xl">
        <button type="button" onClick={onClose} className="aw-btn aw-btn-outline !bg-white">Cancel</button>
        <button type="submit" disabled={isSaving} className="aw-btn aw-btn-primary min-w-[140px]">{isSaving ? "Saving..." : "Save Admin"}</button>
      </div>
    </form>
  );
}
