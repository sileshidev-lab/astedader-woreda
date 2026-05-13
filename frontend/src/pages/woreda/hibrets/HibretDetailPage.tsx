import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Edit3,
  Phone,
  Plus,
  Search,
  Trash2,
  UserRound,
  X,
  FileText,
  LayoutDashboard,
  Users
} from "lucide-react";
import {
  assignMembersToFamily,
  createHibretFamily,
  deleteHibretFamily,
  getWoredaHibret,
  unassignMembersFromFamily,
  updateHibretFamily
} from "../../../services/woredaHibretService";
import type {
  FamilyPayload,
  WoredaHibretDetail,
  WoredaHibretFamily,
} from "../../../services/woredaHibretService";
import { useWoredaHibretDetailHeaderStore } from "../../../store/woredaHibretDetailHeaderStore";
import { HibretAdministrativeMembersPage } from "./HibretAdministrativeMembersPage";
import { useAuthStore } from "../../../store/authStore";

type Side = "political" | "administrative";
type PoliticalTab = "meeting" | "conference" | "trend_report" | "other";
type AdministrativeTab = "members" | "families";

const politicalTabs: Array<{ key: PoliticalTab; label: string }> = [
  { key: "meeting", label: "Meetings" },
  { key: "conference", label: "Conferences" },
  { key: "trend_report", label: "Trend Reports" },
  { key: "other", label: "Other" },
];

const administrativeTabs: Array<{ key: AdministrativeTab; label: string }> = [
  { key: "members", label: "Members" },
  { key: "families", label: "Families" },
];

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function statusClass(status?: string | null) {
  const s = (status || "").toLowerCase();
  if (["approved", "active", "submitted", "active"].includes(s)) {
    return "rounded-full border border-[var(--aw-success)]/20 bg-[var(--aw-success-bg)] px-2.5 py-0.5 text-[10px] font-black uppercase text-[var(--aw-success)]";
  }
  if (["published", "pending_setup"].includes(s)) {
    return "rounded-full border border-[var(--aw-primary)]/20 bg-[var(--aw-primary-soft)] px-2.5 py-0.5 text-[10px] font-black uppercase text-[var(--aw-primary)]";
  }
  if (["rejected", "inactive", "disabled"].includes(s)) {
    return "rounded-full border border-[var(--aw-danger)]/20 bg-[var(--aw-danger-bg)] px-2.5 py-0.5 text-[10px] font-black uppercase text-[var(--aw-danger)]";
  }
  if (s === "changes_requested") {
    return "rounded-full border border-[var(--aw-warning)] bg-[var(--aw-warning-bg)] px-2.5 py-0.5 text-[10px] font-black uppercase text-[var(--aw-warning)]";
  }
  return "rounded-full border border-[var(--aw-border)] bg-[var(--aw-surface-muted)] px-2.5 py-0.5 text-[10px] font-black uppercase text-[var(--aw-muted)]";
}

function directiveTypeLabel(value: string) {
  if (value === "meeting") return "Meeting";
  if (value === "conference") return "Conference";
  if (value === "trend_report") return "Trend Report";
  return "Other";
}

export function HibretDetailPage() {
  const { hibretId } = useParams();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthStore();
  const privileges = user?.privileges ?? [];
  const canAccessAll = privileges.includes("*");
  const can = (p: string) => canAccessAll || privileges.includes(p);

  const [hibret, setHibret] = useState<WoredaHibretDetail | null>(null);
  const [politicalTab, setPoliticalTab] = useState<PoliticalTab>("meeting");
  const [administrativeTab, setAdministrativeTab] = useState<AdministrativeTab>("members");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const side = (searchParams.get("side") as Side) || "political";

  async function loadHibret() {
    if (!hibretId) return;
    const isInitialLoad = !hibret;
    if (isInitialLoad) setIsLoading(true);
    setError("");
    try {
      const data = await getWoredaHibret(hibretId);
      setHibret(data);
    } catch {
      setError("Unable to load Hibret detail.");
    } finally {
      if (isInitialLoad) setIsLoading(false);
    }
  }

  useEffect(() => { void loadHibret(); }, [hibretId]);

  const setHibretDetailHeaderTitle = useWoredaHibretDetailHeaderStore((s) => s.setDetailTitle);
  useEffect(() => {
    setHibretDetailHeaderTitle(hibret?.name || null);
    return () => setHibretDetailHeaderTitle(null);
  }, [hibret, setHibretDetailHeaderTitle]);

  const politicalDirectives = useMemo(() => {
    return (hibret?.directives ?? []).filter((d) => d.type === politicalTab);
  }, [hibret?.directives, politicalTab]);

  if (isLoading) return <div className="aw-panel p-8 text-center font-bold text-[var(--aw-muted)]">Loading unit data...</div>;
  if (error && !hibret) return <div className="aw-panel p-8 !bg-[var(--aw-danger-bg)] !border-[var(--aw-danger)] text-[var(--aw-danger)] font-bold">{error}</div>;
  if (!hibret) return <div className="aw-panel p-8 text-center font-bold text-[var(--aw-muted)]">Unit not found.</div>;

  return (
    <div className="flex flex-col gap-6">
      {error && <div className="aw-panel !bg-[var(--aw-danger-bg)] !border-[var(--aw-danger)] px-4 py-3 text-sm font-black text-[var(--aw-danger)]">{error}</div>}

      <header className="aw-panel !rounded-3xl shrink-0 overflow-hidden shadow-soft">
        <div className="border-b border-[var(--aw-border-soft)] bg-[var(--aw-surface)] p-5 sm:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <Link to="/woreda/hibrets" className="aw-btn aw-btn-outline !min-h-[36px] !px-3 !rounded-xl !text-xs"><ArrowLeft size={14} />Registry</Link>
              <div className="h-10 w-px bg-[var(--aw-border-soft)]" />
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--aw-primary)] mb-1">Administrative Unit</p>
                <h1 className="text-2xl font-black tracking-tight">{hibret.name}</h1>
              </div>
            </div>
            <div className="flex bg-[var(--aw-bg)] p-1 rounded-2xl border border-[var(--aw-border-soft)]">
              <button onClick={() => setSearchParams({ side: 'political' })} className={["px-6 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all", side === 'political' ? "bg-[var(--aw-surface)] text-[var(--aw-primary)] shadow-sm" : "text-[var(--aw-muted)] hover:text-[var(--aw-text)]"].join(" ")}>Political Side</button>
              <button onClick={() => setSearchParams({ side: 'administrative' })} className={["px-6 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all", side === 'administrative' ? "bg-[var(--aw-surface)] text-[var(--aw-primary)] shadow-sm" : "text-[var(--aw-muted)] hover:text-[var(--aw-text)]"].join(" ")}>Administrative Side</button>
            </div>
          </div>
        </div>

        {side === 'political' ? (
          <nav className="flex bg-[var(--aw-surface-muted)]">
            {politicalTabs.map((tab) => (
              <button key={tab.key} onClick={() => setPoliticalTab(tab.key)} className={["flex-1 min-h-[52px] text-xs font-black uppercase tracking-widest border-r border-[var(--aw-border-soft)] last:border-r-0 transition-colors", politicalTab === tab.key ? "bg-[var(--aw-primary)] text-white" : "text-[var(--aw-muted)] hover:bg-[var(--aw-bg)]"].join(" ")}>{tab.label}</button>
            ))}
          </nav>
        ) : (
          <nav className="flex bg-[var(--aw-surface-muted)]">
            {administrativeTabs.map((tab) => (
              <button key={tab.key} onClick={() => setAdministrativeTab(tab.key)} className={["flex-1 min-h-[52px] text-xs font-black uppercase tracking-widest border-r border-[var(--aw-border-soft)] last:border-r-0 transition-colors", administrativeTab === tab.key ? "bg-[var(--aw-primary)] text-white" : "text-[var(--aw-muted)] hover:bg-[var(--aw-bg)]"].join(" ")}>{tab.label}</button>
            ))}
          </nav>
        )}
      </header>

      <main className="min-h-0 flex-1">
        {side === "political" ? (
          <div className="flex flex-col gap-6">
             <div className="aw-stat-grid">
               <div className="aw-stat-card"><p className="aw-stat-label">Total {directiveTypeLabel(politicalTab)}</p><p className="aw-stat-value">{politicalDirectives.length}</p></div>
               <div className="aw-stat-card"><p className="aw-stat-label">Submitted Reports</p><p className="aw-stat-value text-[var(--aw-success)]">{politicalDirectives.filter(d => d.report?.submittedAt).length}</p></div>
               <div className="aw-stat-card"><p className="aw-stat-label">Pending Review</p><p className="aw-stat-value text-[var(--aw-magenta)]">{politicalDirectives.filter(d => d.report?.submittedAt && !d.report?.reviewDecision).length}</p></div>
               <div className="aw-stat-card"><p className="aw-stat-label">Reviewed</p><p className="aw-stat-value text-[var(--aw-primary)]">{politicalDirectives.filter(d => d.report?.reviewDecision).length}</p></div>
             </div>

             <section className="aw-panel">
               <header className="aw-panel-header">
                 <div>
                   <h2 className="aw-panel-title">{directiveTypeLabel(politicalTab)} workstream</h2>
                   <p className="text-xs font-bold text-[var(--aw-muted)] mt-1">Review directives, reports, and attendance for this specific stream.</p>
                 </div>
               </header>
               <div className="aw-table-wrapper !border-none !rounded-none">
                 <table className="aw-table aw-table-to-cards">
                   <thead>
                     <tr>
                       <th>Directive</th>
                       <th>Status</th>
                       <th>Deadline</th>
                       <th>Report</th>
                       <th>Review</th>
                       <th className="text-right">Control</th>
                     </tr>
                   </thead>
                   <tbody>
                     {politicalDirectives.length === 0 ? (
                       <tr><td colSpan={6} className="py-12 text-center font-bold text-[var(--aw-muted)]">No directives found in this category.</td></tr>
                     ) : (
                       politicalDirectives.map((d) => (
                         <tr key={d.id}>
                           <td data-label="Directive">
                             <p className="font-black text-[var(--aw-text)]">{d.title}</p>
                             <p className="text-[10px] font-bold text-[var(--aw-muted)] uppercase mt-1">Assigned {formatDate(d.assignedAt)}</p>
                           </td>
                           <td data-label="Status"><span className={statusClass(d.status)}>{d.status}</span></td>
                           <td data-label="Deadline" className="font-bold text-[var(--aw-muted)]">{formatDate(d.deadline)}</td>
                           <td data-label="Report"><span className={statusClass(d.report?.status || (d.status === 'closed' ? 'Unsubmitted' : 'Pending'))}>{d.report?.status || (d.status === 'closed' ? 'Unsubmitted' : 'Pending')}</span></td>
                           <td data-label="Review"><span className={statusClass(d.report?.reviewDecision || 'None')}>{d.report?.reviewDecision || 'None'}</span></td>
                           <td data-label="Action" className="text-right">
                             {d.report?.submittedAt ? (
                               <Link to={`/woreda/announcements/${d.id}/hibrets/${hibret.id}/report?returnTo=${encodeURIComponent(location.pathname+location.search)}`} className="aw-btn aw-btn-primary !min-h-[34px] !px-4 !text-[11px] uppercase tracking-wider">Open Report</Link>
                             ) : <span className="text-[10px] font-black uppercase text-[var(--aw-muted)]">Waiting...</span>}
                           </td>
                         </tr>
                       ))
                     )}
                   </tbody>
                 </table>
               </div>
             </section>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {administrativeTab === "members" ? (
              <HibretAdministrativeMembersPage hibretId={hibretId || hibret.id} />
            ) : (
              <FamiliesPanel hibret={hibret} onReload={loadHibret} canManage={can("hibret.update")} />
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function FamiliesPanel({ hibret, onReload, canManage }: { hibret: WoredaHibretDetail; onReload: () => Promise<void>; canManage: boolean }) {
  const [selectedFamily, setSelectedFamily] = useState<WoredaHibretFamily | null>(hibret.families[0] ?? null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingFamily, setEditingFamily] = useState<WoredaHibretFamily | null>(null);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [unassignedSearch, setUnassignedSearch] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  const currentFamily = hibret.families.find((f) => f.id === selectedFamily?.id) ?? hibret.families[0] ?? null;
  const familyMembers = currentFamily ? hibret.members.filter((m) => m.familyId === currentFamily.id) : [];
  const unassignedMembers = useMemo(() => {
    const q = unassignedSearch.trim().toLowerCase();
    return hibret.members.filter((m) => !m.familyId).filter((m) => !q || [m.name, m.memberCode, m.phone].some(f => f?.toLowerCase().includes(q)));
  }, [hibret.members, unassignedSearch]);

  async function handleSaveFamily(payload: FamilyPayload) {
    setIsBusy(true);
    try {
      if (editingFamily) await updateHibretFamily(hibret.id, editingFamily.id, payload);
      else { const nf = await createHibretFamily(hibret.id, payload); setSelectedFamily(nf); }
      setIsFormOpen(false); setEditingFamily(null); await onReload();
    } catch (e) { alert("Failed to save family"); }
    finally { setIsBusy(false); }
  }

  async function handleDeleteFamily(family: WoredaHibretFamily) {
    if(!window.confirm("Are you sure?")) return;
    setIsBusy(true);
    try { await deleteHibretFamily(hibret.id, family.id); setSelectedFamily(null); await onReload(); }
    catch (e) { alert("Failed to delete"); }
    finally { setIsBusy(false); }
  }

  async function handleAssign() {
    if(!currentFamily || selectedMemberIds.length === 0) return;
    setIsBusy(true);
    try { await assignMembersToFamily(hibret.id, currentFamily.id, selectedMemberIds); setSelectedMemberIds([]); await onReload(); }
    catch(e) { alert("Failed to assign"); }
    finally { setIsBusy(false); }
  }

  async function handleUnassign(ids: string[]) {
    setIsBusy(true);
    try { await unassignMembersFromFamily(hibret.id, ids); await onReload(); }
    catch(e) { alert("Failed to unassign"); }
    finally { setIsBusy(false); }
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-6 items-start">
      <section className="aw-panel">
        <header className="aw-panel-header !py-6">
          <div className="min-w-0">
            <h2 className="aw-panel-title">Family list</h2>
            <p className="text-xs font-bold text-[var(--aw-muted)] mt-1">{hibret.families.length} units defined.</p>
          </div>
          {canManage && <button onClick={() => { setEditingFamily(null); setIsFormOpen(true); }} className="aw-btn aw-btn-primary !min-h-[36px] !px-3 !rounded-xl !text-xs"><Plus size={14}/>Add</button>}
        </header>
        <div className="p-4 flex flex-col gap-3 max-h-[70vh] overflow-y-auto aw-seamless-scroll">
          {hibret.families.length === 0 ? (
            <p className="text-sm font-bold text-[var(--aw-muted)] text-center py-8">No families recorded.</p>
          ) : hibret.families.map((f) => (
            <button key={f.id} onClick={() => setSelectedFamily(f)} className={["w-full p-5 rounded-2xl border text-left transition-all", currentFamily?.id === f.id ? "border-[var(--aw-primary)] bg-[var(--aw-primary-soft)]/20 shadow-sm" : "border-[var(--aw-border-soft)] bg-[var(--aw-surface)] hover:border-[var(--aw-primary)]/50"].join(" ")}>
              <div className="flex justify-between items-start mb-3">
                <span className="text-base font-black text-[var(--aw-text)]">{f.name}</span>
                <span className={statusClass(f.status)}>{f.status}</span>
              </div>
              <div className="flex items-center gap-4 text-xs font-bold text-[var(--aw-muted)]">
                <span className="flex items-center gap-1.5"><Users size={14}/>{f.memberCount} members</span>
                {f.phone && <span className="flex items-center gap-1.5"><Phone size={14}/>{f.phone}</span>}
              </div>
            </button>
          ))}
        </div>
      </section>

      <div className="flex flex-col gap-6">
        {currentFamily ? (
          <>
            <section className="aw-panel">
              <header className="aw-panel-header !py-7 !bg-[var(--aw-surface)]">
                <div className="min-w-0">
                  <div className="flex items-center gap-3 mb-2"><h2 className="text-2xl font-black">{currentFamily.name}</h2><span className={statusClass(currentFamily.status)}>{currentFamily.status}</span></div>
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-bold text-[var(--aw-muted)]">
                    <span className="flex items-center gap-2"><UserRound size={16} className="text-[var(--aw-primary)]"/>{currentFamily.contactName || "No contact"}</span>
                    <span className="flex items-center gap-2"><Phone size={16} className="text-[var(--aw-primary)]"/>{currentFamily.phone || "No phone"}</span>
                    <span className="flex items-center gap-2"><FileText size={16} className="text-[var(--aw-primary)]"/>Created {formatDate(currentFamily.createdAt)}</span>
                  </div>
                </div>
                {canManage && (
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingFamily(currentFamily); setIsFormOpen(true); }} className="aw-btn aw-btn-outline !min-h-[38px] !px-4"><Edit3 size={15}/>Edit</button>
                    <button onClick={() => handleDeleteFamily(currentFamily)} className="aw-btn aw-btn-outline !text-[var(--aw-danger)] !border-[var(--aw-danger)]/30 hover:!bg-[var(--aw-danger-bg)] !min-h-[38px] !px-4"><Trash2 size={15}/>Remove</button>
                  </div>
                )}
              </header>
              <div className="aw-table-wrapper !border-none !rounded-none">
                <table className="aw-table aw-table-to-cards">
                  <thead>
                    <tr><th>Member name</th><th>Identifier</th><th>Contact</th><th className="text-right">Actions</th></tr>
                  </thead>
                  <tbody>
                    {familyMembers.length === 0 ? (
                      <tr><td colSpan={4} className="py-12 text-center font-bold text-[var(--aw-muted)]">No members assigned to this family.</td></tr>
                    ) : familyMembers.map((m) => (
                      <tr key={m.id}>
                        <td data-label="Name" className="font-black">{m.name}</td>
                        <td data-label="Code" className="font-bold text-[var(--aw-muted)]">{m.memberCode || "—"}</td>
                        <td data-label="Contact" className="font-bold text-[var(--aw-muted)]">{m.phone || "—"}</td>
                        <td data-label="Control" className="text-right">
                          {canManage && <button onClick={() => handleUnassign([m.id])} className="text-[10px] font-black uppercase text-[var(--aw-danger)] hover:underline">Unassign</button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {canManage && (
              <section className="aw-panel">
                <header className="aw-panel-header !py-6">
                  <div className="min-w-0">
                    <h2 className="aw-panel-title">Assign unassigned members</h2>
                    <p className="text-xs font-bold text-[var(--aw-muted)] mt-1">Found {unassignedMembers.length} members without family association.</p>
                  </div>
                  <div className="flex gap-3">
                    <div className="aw-search-wrap !min-h-[36px] !bg-[var(--aw-surface-muted)]"><Search size={14}/><input type="text" className="aw-search-input" placeholder="Filter..." value={unassignedSearch} onChange={e => setUnassignedSearch(e.target.value)}/></div>
                    <button disabled={selectedMemberIds.length === 0 || isBusy} onClick={handleAssign} className="aw-btn aw-btn-primary !min-h-[36px] !px-4 !text-[11px] uppercase tracking-wider disabled:opacity-30">Assign Selected ({selectedMemberIds.length})</button>
                  </div>
                </header>
                <div className="aw-table-wrapper !border-none !rounded-none max-h-[300px] overflow-y-auto aw-seamless-scroll">
                  <table className="aw-table aw-table-to-cards">
                    <thead className="sticky top-0 z-10 shadow-sm"><tr><th className="w-12"><input type="checkbox" checked={unassignedMembers.length > 0 && unassignedMembers.every(m => selectedMemberIds.includes(m.id))} onChange={e => setSelectedMemberIds(e.target.checked ? unassignedMembers.map(m => m.id) : [])} className="h-4 w-4 rounded accent-[var(--aw-primary)]" /></th><th>Full name</th><th>Member code</th></tr></thead>
                    <tbody>
                      {unassignedMembers.length === 0 ? (
                        <tr><td colSpan={3} className="py-12 text-center font-bold text-[var(--aw-muted)]">No unassigned members found.</td></tr>
                      ) : unassignedMembers.map(m => (
                        <tr key={m.id} className="hover:!bg-[var(--aw-bg)]"><td className="w-12"><input type="checkbox" checked={selectedMemberIds.includes(m.id)} onChange={() => setSelectedMemberIds(s => s.includes(m.id) ? s.filter(id => id !== m.id) : [...s, m.id])} className="h-4 w-4 rounded accent-[var(--aw-primary)]" /></td><td className="font-bold">{m.name}</td><td className="font-bold text-[var(--aw-muted)]">{m.memberCode}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        ) : <div className="aw-panel !bg-[var(--aw-surface-muted)] !border-dashed p-20 flex flex-col items-center justify-center gap-4 text-[var(--aw-muted)]"><LayoutDashboard size={64} strokeWidth={1}/><p className="font-black text-lg">Select a family from the list</p></div>}
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[var(--aw-overlay-scrim-strong)] backdrop-blur-sm" onClick={() => setIsFormOpen(false)} />
          <FamilyFormModal family={editingFamily} isSaving={isBusy} onClose={() => setIsFormOpen(false)} onSubmit={handleSaveFamily} />
        </div>
      )}
    </div>
  );
}

function FamilyFormModal({ family, isSaving, onClose, onSubmit }: { family: WoredaHibretFamily | null; isSaving: boolean; onClose: () => void; onSubmit: (p: FamilyPayload) => Promise<void> }) {
  const [form, setForm] = useState<FamilyPayload>({ name: family?.name || "", contactName: family?.contactName || "", phone: family?.phone || "", status: family?.status || "active" });
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="relative aw-panel w-full max-w-lg shadow-2xl !rounded-3xl border-none">
      <header className="aw-panel-header !rounded-t-3xl !py-6">
        <h2 className="text-xl font-black">{family ? "Edit Family" : "Create Family"}</h2>
        <button type="button" onClick={onClose} className="aw-btn aw-btn-outline !min-h-[36px] !px-2 !rounded-xl"><X size={18}/></button>
      </header>
      <div className="p-8 space-y-5">
        <div className="aw-form-field"><label className="aw-form-label">Family name</label><input required className="aw-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
        <div className="aw-form-field"><label className="aw-form-label">Contact name</label><input className="aw-input" value={form.contactName || ''} onChange={e => setForm({...form, contactName: e.target.value})} /></div>
        <div className="aw-form-field"><label className="aw-form-label">Phone number</label><input className="aw-input" value={form.phone || ''} onChange={e => setForm({...form, phone: e.target.value})} /></div>
        <div className="aw-form-field"><label className="aw-form-label">Status</label><select className="aw-filter-select" value={form.status || 'active'} onChange={e => setForm({...form, status: e.target.value})}><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
      </div>
      <div className="p-6 bg-[var(--aw-surface-muted)] flex justify-end gap-3 rounded-b-3xl">
        <button type="button" onClick={onClose} className="aw-btn aw-btn-outline !bg-white">Cancel</button>
        <button type="submit" disabled={isSaving} className="aw-btn aw-btn-primary min-w-[140px]">{isSaving ? "Saving..." : "Save Family"}</button>
      </div>
    </form>
  );
}
