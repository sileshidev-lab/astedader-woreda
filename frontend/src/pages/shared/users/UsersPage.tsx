import { useEffect, useState } from "react";
import { Search, UserCheck, ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import {
  bulkUpdateManagedUsers,
  getManagedUsers,
  updateManagedUserStatus,
  type ManagedUser,
} from "../../../services/userService";
import { useAuthStore } from "../../../store/authStore";

function statusClass(s: string) {
  if (s === "ACTIVE") return "rounded-full border border-[var(--aw-success)]/20 bg-[var(--aw-success-bg)] px-2.5 py-0.5 text-[10px] font-black uppercase text-[var(--aw-success)]";
  if (s === "PENDING_SETUP") return "rounded-full border border-[var(--aw-primary)]/20 bg-[var(--aw-primary-soft)] px-2.5 py-0.5 text-[10px] font-black uppercase text-[var(--aw-primary)]";
  if (s === "DISABLED") return "rounded-full border border-[var(--aw-danger)]/20 bg-[var(--aw-danger-bg)] px-2.5 py-0.5 text-[10px] font-black uppercase text-[var(--aw-danger)]";
  return "rounded-full border border-[var(--aw-border)] bg-[var(--aw-surface-muted)] px-2.5 py-0.5 text-[10px] font-black uppercase text-[var(--aw-muted)]";
}

export function UsersPage() {
  const { user: authUser } = useAuthStore();
  const privileges = authUser?.privileges ?? [];
  const canAccessAll = privileges.includes("*");
  const can = (p: string) => canAccessAll || privileges.includes(p);

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [summary, setSummary] = useState({ total: 0, active: 0, pending: 0, disabled: 0 });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  async function loadUsers() {
    setLoading(true); setError("");
    try {
      const data = await getManagedUsers({ search: search || undefined, status: statusFilter || undefined, role: "MEMBER" });
      const items = data.users.filter((u) => u.role === "MEMBER");
      setUsers(items);
      setSummary({ total: items.length, active: items.filter(u => u.status === "ACTIVE").length, pending: items.filter(u => u.status === "PENDING_SETUP").length, disabled: items.filter(u => u.status === "DISABLED").length });
      setSelected([]);
    } catch { setError("Unable to load member accounts."); } finally { setLoading(false); }
  }

  useEffect(() => { const t = setTimeout(() => { void loadUsers(); }, 300); return () => clearTimeout(t); }, [search, statusFilter]);
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(users.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedUsers = users.slice((safePage - 1) * pageSize, safePage * pageSize);
  const allSelected = paginatedUsers.length > 0 && paginatedUsers.every(u => selected.includes(u.id));

  async function updateStatus(ids: string[], next: "ACTIVE" | "DISABLED" | "PENDING_SETUP") {
    try {
      if (ids.length === 1) await updateManagedUserStatus(ids[0], next);
      else await bulkUpdateManagedUsers(ids, next);
      await loadUsers();
    } catch { alert("Status update failed."); }
  }

  return (
    <div className="flex flex-col gap-6">
      {error && <div className="aw-panel !bg-[var(--aw-danger-bg)] !border-[var(--aw-danger)] px-4 py-3 text-sm font-black text-[var(--aw-danger)]">{error}</div>}

      <div className="aw-stat-grid !grid-cols-2 md:!grid-cols-4">
        <div className="aw-stat-card"><p className="aw-stat-label">Member Users</p><p className="aw-stat-value">{summary.total}</p></div>
        <div className="aw-stat-card"><p className="aw-stat-label">Active</p><p className="aw-stat-value text-[var(--aw-success)]">{summary.active}</p></div>
        <div className="aw-stat-card"><p className="aw-stat-label">Pending</p><p className="aw-stat-value text-[var(--aw-primary)]">{summary.pending}</p></div>
        <div className="aw-stat-card"><p className="aw-stat-label">Disabled</p><p className="aw-stat-value text-[var(--aw-danger)]">{summary.disabled}</p></div>
      </div>

      <section className="aw-panel shadow-soft">
        <header className="aw-panel-header !bg-[var(--aw-surface)] !py-6">
          <div className="min-w-0">
            <h2 className="aw-panel-title">Member Accounts</h2>
            <p className="text-xs font-bold text-[var(--aw-muted)] mt-1">Manage portal access and account statuses for members.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
             <div className="aw-search-wrap !min-h-[38px]">
                <Search size={14} className="text-[var(--aw-muted)]" />
                <input type="text" className="aw-search-input" placeholder="Search accounts..." value={search} onChange={e => setSearch(e.target.value)} />
             </div>
             <button type="button" onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)} className="aw-btn aw-btn-outline lg:hidden"><SlidersHorizontal size={14}/>Filters</button>
             <select className={["aw-filter-select !min-h-[38px]", mobileFiltersOpen ? "block" : "hidden lg:block"].join(" ")} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="">All statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="PENDING_SETUP">Pending Setup</option>
                <option value="DISABLED">Disabled</option>
             </select>
          </div>
        </header>

        {selected.length > 0 && can("member_account.update") && (
          <div className="bg-[var(--aw-primary-soft)]/20 px-6 py-4 flex flex-wrap items-center justify-between gap-4 border-b border-[var(--aw-border-soft)]">
            <p className="text-xs font-black uppercase text-[var(--aw-primary)] tracking-widest">{selected.length} accounts selected</p>
            <div className="flex gap-2">
              <button onClick={() => updateStatus(selected, 'ACTIVE')} className="aw-btn aw-btn-outline !min-h-[32px] !px-3 !text-[11px] !bg-white">Enable All</button>
              <button onClick={() => updateStatus(selected, 'DISABLED')} className="aw-btn aw-btn-outline !min-h-[32px] !px-3 !text-[11px] !bg-white !text-[var(--aw-danger)]">Disable All</button>
              <button onClick={() => setSelected([])} className="aw-btn aw-btn-outline !min-h-[32px] !px-3 !text-[11px] !bg-white">Clear</button>
            </div>
          </div>
        )}

        <div className="aw-table-wrapper !border-none !rounded-none">
          <table className="aw-table aw-table-to-cards">
            <thead>
              <tr>
                <th className="w-12 text-center"><input type="checkbox" checked={allSelected} onChange={(e) => setSelected(e.target.checked ? Array.from(new Set([...selected, ...paginatedUsers.map(u => u.id)])) : selected.filter(id => !paginatedUsers.some(u => u.id === id)))} className="h-4 w-4 rounded accent-[var(--aw-primary)]" /></th>
                <th>Member details</th>
                <th>Email address</th>
                <th>Hibret unit</th>
                <th>Status</th>
                <th className="text-right">Control</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-12 text-center font-bold text-[var(--aw-muted)]">Fetching accounts...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} className="py-16 text-center font-bold text-[var(--aw-muted)]">No accounts found.</td></tr>
              ) : (
                paginatedUsers.map(u => (
                  <tr key={u.id}>
                    <td data-label="Select" className="text-center"><input type="checkbox" checked={selected.includes(u.id)} onChange={() => setSelected(selected.includes(u.id) ? selected.filter(id => id !== u.id) : [...selected, u.id])} className="h-4 w-4 rounded accent-[var(--aw-primary)]" /></td>
                    <td data-label="Member">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-[var(--aw-primary-soft)]/20 flex items-center justify-center text-[var(--aw-primary)]"><UserCheck size={18}/></div>
                        <div className="min-w-0"><p className="font-black truncate">{u.memberName || 'Member Portal'}</p><p className="text-[10px] font-bold text-[var(--aw-muted)] uppercase tracking-wider">{u.memberId ? 'Profile Linked' : 'System Account'}</p></div>
                      </div>
                    </td>
                    <td data-label="Email" className="font-bold">{u.email}</td>
                    <td data-label="Hibret" className="font-bold text-[var(--aw-muted)]">{u.hibretName || 'Global'}</td>
                    <td data-label="Status"><span className={statusClass(u.status)}>{u.status.replace('_',' ')}</span></td>
                    <td data-label="Action" className="text-right">
                      {can("member_account.update") && (
                        <div className="flex justify-end gap-2">
                           <button onClick={() => updateStatus([u.id], u.status === 'DISABLED' ? 'ACTIVE' : 'DISABLED')} className={["aw-btn !min-h-[32px] !px-3 !text-[11px] uppercase tracking-wider", u.status === 'DISABLED' ? 'aw-btn-primary' : 'aw-btn-outline !text-[var(--aw-danger)] !border-[var(--aw-danger)]/30'].join(" ")}>{u.status === 'DISABLED' ? 'Enable' : 'Disable'}</button>
                           <button onClick={() => updateStatus([u.id], 'PENDING_SETUP')} className="aw-btn aw-btn-outline !min-h-[32px] !px-3 !text-[11px] uppercase tracking-wider">Reset</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <footer className="aw-panel-header !bg-[var(--aw-surface-muted)] !border-none !py-4">
          <p className="text-xs font-bold text-[var(--aw-muted)]">Page {safePage} of {totalPages} · {users.length} Total</p>
          <div className="flex items-center gap-2">
            <button disabled={safePage <= 1} onClick={() => setPage(p => p - 1)} className="aw-btn aw-btn-outline !min-h-[34px] !px-2 disabled:opacity-30"><ChevronLeft size={16}/></button>
            <button disabled={safePage >= totalPages} onClick={() => setPage(p => p + 1)} className="aw-btn aw-btn-outline !min-h-[34px] !px-2 disabled:opacity-30"><ChevronRight size={16}/></button>
          </div>
        </footer>
      </section>
    </div>
  );
}
