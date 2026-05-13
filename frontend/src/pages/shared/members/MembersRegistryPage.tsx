import { useEffect, useMemo, useState } from "react";
import type { ReactNode, FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Grid3X3,
  List,
  Search,
  Upload,
  UserPlus,
  X,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal
} from "lucide-react";
import { apiClient, AUTH_TOKEN_KEY } from "../../../services/apiClient";
import { MemberImportDrawer } from "../../woreda/members/MemberImportDrawer";
import { useAuthStore } from "../../../store/authStore";

const API_BASE_URL = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "http://localhost:4000").replace(/\/$/, "");

function getStoredAuthToken() { return localStorage.getItem(AUTH_TOKEN_KEY) || ""; }

function memberPhotoUrl(photoFileId?: string | null) {
  if (!photoFileId) return "";
  const token = getStoredAuthToken();
  const query = token ? `?inline=true&token=${encodeURIComponent(token)}` : "?inline=true";
  return `${API_BASE_URL}/files/${photoFileId}/download${query}`;
}

type MemberRecord = {
  id: string; memberCode?: string | null; fanId?: string | null; ppId?: string | null;
  firstName?: string | null; fatherName?: string | null; grandfatherName?: string | null;
  gender?: string | null; dateOfBirth?: string | null; phone?: string | null; email?: string | null;
  hibretId?: string | null; familyId?: string | null; membershipStatus?: string | null;
  registrationType?: string | null; membershipYear?: number | string | null;
  partyRole?: string | null; educationLevel?: string | null; fieldOfStudy?: string | null;
  workplace?: string | null; workType?: string | null; workExperienceYears?: number | string | null;
  zone?: string | null; kebele?: string | null; ethnicity?: string | null; healthStatus?: string | null;
  photoFileId?: string | null; hibretName?: string | null; familyName?: string | null;
  hibret?: { id?: string | null; name?: string | null } | null;
  family?: { id?: string | null; name?: string | null } | null;
};

type HibretRecord = { id: string; name: string; };

type MembersResponse = {
  members?: MemberRecord[]; data?: MemberRecord[]; items?: MemberRecord[];
  pagination?: { total: number; page: number; pageSize: number; totalPages: number; hasNextPage: boolean; hasPreviousPage: boolean; };
};

type MembersRegistryPageProps = {
  title?: string; subtitle?: string; memberDetailBasePath?: string; scopeHibretId?: string;
  showHibretFilter?: boolean; showAddButton?: boolean; showImportButton?: boolean;
  controlBarLeading?: ReactNode;
};

type MemberActionModal = "add" | null;

type MemberForm = {
  memberCode: string; fanId: string; ppId: string; firstName: string; fatherName: string; grandfatherName: string;
  gender: string; dateOfBirth: string; phone: string; email: string; hibretId: string; familyId: string;
  membershipStatus: string; registrationType: string; membershipYear: string; partyRole: string;
  educationLevel: string; fieldOfStudy: string; workplace: string; workType: string;
  workExperienceYears: string; zone: string; kebele: string; ethnicity: string; healthStatus: string; photoFileId: string;
};

type FilterOption = { value: string; label: string; count: number; };
type FilterGroup = { key: string; label: string; options: FilterOption[]; };

const blankMemberForm: MemberForm = {
  memberCode: "", fanId: "", ppId: "", firstName: "", fatherName: "", grandfatherName: "", gender: "ወንድ",
  dateOfBirth: "", phone: "", email: "", hibretId: "", familyId: "", membershipStatus: "ዕጩ አባል",
  registrationType: "እንደ አዲስ የተመዘገበ", membershipYear: "", partyRole: "", educationLevel: "",
  fieldOfStudy: "", workplace: "", workType: "የመንግስት ሰራተኛ", workExperienceYears: "", zone: "",
  kebele: "", ethnicity: "", healthStatus: "ጤነኛ", photoFileId: "",
};

function textValue(value?: string | number | null) { return String(value ?? "").trim(); }
function lowerValue(value?: string | number | null) { return textValue(value).toLowerCase(); }

function extractMembers(payload: MembersResponse | MemberRecord[]) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.members)) return payload.members;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.data)) return payload.data;
  return [];
}

function extractHibrets(payload: unknown): HibretRecord[] {
  const value = payload as { hibrets?: HibretRecord[]; items?: HibretRecord[]; data?: HibretRecord[] } | HibretRecord[];
  if (Array.isArray(value)) return value;
  if (Array.isArray(value.hibrets)) return value.hibrets;
  if (Array.isArray(value.items)) return value.items;
  if (Array.isArray(value.data)) return value.data;
  return [];
}

function fullName(member: MemberRecord) {
  return [member.firstName, member.fatherName, member.grandfatherName].map(textValue).filter(Boolean).join(" ");
}

function initials(member: MemberRecord) {
  return [member.firstName, member.fatherName].map(textValue).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "M";
}

function hibretName(member: MemberRecord) { return textValue(member.hibret?.name) || textValue(member.hibretName) || "-"; }
function ppDisplay(member: MemberRecord) { return textValue(member.ppId) || "-"; }
function ppKanbanLine(member: MemberRecord) {
  const r = textValue(member.ppId); if (!r || r === "-") return "PP/—";
  const d = r.replace(/\D/g, ""); return d.length >= 4 ? `PP/${d}` : `PP/${r}`;
}

function fanDisplay(member: MemberRecord) {
  const v = textValue(member.fanId); if (!v) return "-";
  const d = v.replace(/\D/g, ""); return d.length === 16 ? d.replace(/(\d{4})(?=\d)/g, "$1 ").trim() : v;
}

function normalizeGender(v?: string | null) {
  const c = lowerValue(v); if (c === "male") return "ወንድ"; if (c === "female") return "ሴት"; return textValue(v) || "-";
}

function normalizeMember(m: MemberRecord): MemberRecord {
  return { ...m, hibret: m.hibret ?? (m.hibretId || m.hibretName ? { id: m.hibretId ?? "", name: m.hibretName ?? "Unassigned" } : null), family: m.family ?? (m.familyId || m.familyName ? { id: m.familyId ?? "", name: m.familyName ?? "Unassigned" } : null) };
}

function numericOrUndefined(v: string) { const c = v.trim(); if (!c) return undefined; const p = Number(c); return Number.isNaN(p) ? undefined : p; }

export function MembersRegistryPage({
  scopeHibretId, showAddButton = true, showImportButton = true, controlBarLeading, memberDetailBasePath = "/woreda/members"
}: MembersRegistryPageProps) {
  const navigate = useNavigate(); const location = useLocation(); const { user } = useAuthStore();
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [, setHibrets] = useState<HibretRecord[]>([]);
  const [filterCounts, setFilterCounts] = useState<Record<string, Record<string, number>>>({});
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false);
  const [error, setError] = useState(""); const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "cards">("cards");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0); const [filters, setFilters] = useState<Record<string, string>>({});
  const [memberActionModal, setMemberActionModal] = useState<MemberActionModal>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [memberForm, setMemberForm] = useState<MemberForm>({ ...blankMemberForm, hibretId: scopeHibretId ?? "" });
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  const privileges = user?.privileges ?? [];
  const canAccessAll = privileges.includes("*");
  const can = (p: string) => canAccessAll || privileges.includes(p);

  async function loadMembers() {
    setLoading(true); setError("");
    try {
      const p = new URLSearchParams(); p.set("page", page.toString()); p.set("pageSize", pageSize.toString());
      Object.entries(filters).forEach(([k, v]) => { if (v) p.set(k === 'fanStatus' ? 'fanStatus' : k, v); });
      if (debouncedQuery) p.set("search", debouncedQuery);
      if (scopeHibretId) p.set("hibretId", scopeHibretId);
      const res = await apiClient.get<MembersResponse | MemberRecord[]>(`/members?${p.toString()}`);
      const d = res.data;
      if (Array.isArray(d)) { setMembers(d.map(normalizeMember)); setTotalCount(d.length); }
      else { const items = extractMembers(d); setMembers(items.map(normalizeMember)); setTotalCount(d.pagination?.total || items.length); }
    } catch { setError("Unable to load members."); } finally { setLoading(false); }
  }

  async function loadHibrets() { try { const res = await apiClient.get("/hibrets"); setHibrets(extractHibrets(res.data)); } catch {} }

  async function loadFilterCounts() {
    try {
      const p = new URLSearchParams(); if (debouncedQuery) p.set("search", debouncedQuery); if (scopeHibretId) p.set("hibretId", scopeHibretId);
      const res = await apiClient.get<any>(`/members/filter-counts?${p.toString()}`).catch(async () => {
         const op = await apiClient.get<any>(`/members/filter-options?${p.toString()}`);
         const opts = op.data.options || op.data;
         const tr: any = { total: opts.total || 0 };
         if (opts.gender) { tr.gender = {}; opts.gender.forEach((i: any) => tr.gender[i.value] = i.count); }
         return { data: tr };
      });
      const { total: _, ...fd } = res.data; setFilterCounts(fd);
    } catch { setFilterCounts({}); }
  }

  useEffect(() => { const t = setTimeout(() => setDebouncedQuery(query), 500); return () => clearTimeout(t); }, [query]);
  useEffect(() => { loadMembers(); }, [page, pageSize, filters, debouncedQuery, scopeHibretId]);
  useEffect(() => { loadHibrets(); }, []);
  useEffect(() => { loadFilterCounts(); }, [debouncedQuery, scopeHibretId, filters]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = totalCount === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(totalCount, safePage * pageSize);

  const filterGroups = useMemo(() => {
    const groups: FilterGroup[] = [];
    const build = (key: string, label: string) => {
      if (filterCounts[key]) {
        const options = Object.entries(filterCounts[key]).map(([v, c]) => ({ value: v, label: v === "ወንድ" ? "Male" : v === "ሴት" ? "Female" : v, count: c })).filter(o => o.count > 0).sort((a, b) => b.count - a.count);
        if (options.length > 0) groups.push({ key, label, options });
      }
    };
    build("gender", "Gender"); build("fanStatus", "Fayda Status"); build("workType", "Work Group"); build("educationLevel", "Education"); build("healthStatus", "Health"); build("membershipStatus", "Member Status");
    return groups;
  }, [filterCounts]);

  async function saveMember(e: FormEvent) {
    e.preventDefault(); setSaving(true); setError("");
    try {
      const payload = { ...memberForm, memberCode: memberForm.memberCode || memberForm.ppId || undefined, membershipYear: numericOrUndefined(memberForm.membershipYear), workExperienceYears: numericOrUndefined(memberForm.workExperienceYears), hibretId: scopeHibretId || memberForm.hibretId || undefined };
      await apiClient.post("/members", payload); setMemberActionModal(null); await loadMembers();
    } catch (err: any) { setError(err?.response?.data?.message || "Error saving member."); } finally { setSaving(false); }
  }

  return (
    <div className="flex flex-col gap-6">
      {error && <div className="aw-panel !bg-[var(--aw-danger-bg)] !border-[var(--aw-danger)] px-4 py-3 text-sm font-black text-[var(--aw-danger)]">{error}</div>}

      <section className="aw-toolbar shadow-soft !p-4">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
          {controlBarLeading}
          <div className="aw-search-wrap flex-1 max-w-md">
            <Search size={16} className="text-[var(--aw-muted)]" />
            <input type="text" className="aw-search-input" placeholder="Search population registry..." value={query} onChange={e => setQuery(e.target.value)} />
          </div>
          <button type="button" onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)} className="aw-btn aw-btn-outline lg:hidden"><SlidersHorizontal size={16}/>Filters</button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
           <div className="flex bg-[var(--aw-bg)] p-1 rounded-xl border border-[var(--aw-border-soft)] mr-2">
             <button onClick={() => setViewMode('cards')} className={["p-2 rounded-lg transition-all", viewMode === 'cards' ? "bg-[var(--aw-surface)] text-[var(--aw-primary)] shadow-sm" : "text-[var(--aw-muted)]"].join(" ")}><Grid3X3 size={18}/></button>
             <button onClick={() => setViewMode('table')} className={["p-2 rounded-lg transition-all", viewMode === 'table' ? "bg-[var(--aw-surface)] text-[var(--aw-primary)] shadow-sm" : "text-[var(--aw-muted)]"].join(" ")}><List size={18}/></button>
           </div>

           {can("member.create") && (
             <div className="flex gap-2">
               {showImportButton && <button onClick={() => setIsImportOpen(true)} className="aw-btn aw-btn-outline"><Upload size={16}/>Import</button>}
               {showAddButton && <button onClick={() => setMemberActionModal("add")} className="aw-btn aw-btn-primary"><UserPlus size={16}/>Add Member</button>}
             </div>
           )}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">
        <aside className={["aw-panel flex flex-col gap-1 p-2 transition-all", mobileFiltersOpen ? "block" : "hidden lg:block"].join(" ")}>
          <header className="px-4 py-3 border-b border-[var(--aw-border-soft)] mb-2">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--aw-primary)]">Registry Filters</h3>
          </header>
          <div className="flex flex-col gap-6 p-2 overflow-y-auto max-h-[70vh] aw-seamless-scroll">
            {filterGroups.map(g => (
              <div key={g.key} className="space-y-1">
                <p className="px-3 text-[10px] font-black uppercase text-[var(--aw-muted)] tracking-wider mb-2">{g.label}</p>
                <button onClick={() => setFilters({...filters, [g.key]: ''})} className={["w-full flex justify-between items-center px-3 py-2 rounded-xl text-xs font-bold transition-all", !filters[g.key] ? "bg-[var(--aw-primary-soft)]/30 text-[var(--aw-primary)]" : "text-[var(--aw-muted)] hover:bg-[var(--aw-bg)]"].join(" ")}>
                  <span>All</span><span>{totalCount}</span>
                </button>
                {g.options.map(o => (
                  <button key={o.value} onClick={() => setFilters({...filters, [g.key]: o.value})} className={["w-full flex justify-between items-center px-3 py-2 rounded-xl text-xs font-bold transition-all", filters[g.key] === o.value ? "bg-[var(--aw-primary-soft)]/30 text-[var(--aw-primary)]" : "text-[var(--aw-muted)] hover:bg-[var(--aw-bg)]"].join(" ")}>
                    <span className="truncate mr-2">{o.label}</span><span>{o.count}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </aside>

        <main className="min-w-0 space-y-6">
          <div className="aw-panel shadow-soft overflow-hidden">
            <header className="aw-panel-header !bg-transparent !border-none !pt-6 !px-6">
              <div>
                 <h2 className="aw-panel-title">Member List</h2>
                 <p className="text-xs font-bold text-[var(--aw-muted)] mt-1">Showing {start}-{end} of {totalCount} members.</p>
              </div>
              <div className="flex items-center gap-3">
                <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))} className="aw-filter-select !min-h-[34px] !text-xs">
                  <option value={20}>20 / page</option>
                  <option value={50}>50 / page</option>
                  <option value={100}>100 / page</option>
                </select>
                <div className="flex items-center gap-1">
                  <button disabled={safePage <= 1} onClick={() => setPage(p => p - 1)} className="aw-btn aw-btn-outline !min-h-[34px] !px-2 disabled:opacity-30"><ChevronLeft size={16}/></button>
                  <button disabled={safePage >= totalPages} onClick={() => setPage(p => p + 1)} className="aw-btn aw-btn-outline !min-h-[34px] !px-2 disabled:opacity-30"><ChevronRight size={16}/></button>
                </div>
              </div>
            </header>

            {loading ? <div className="p-20 text-center font-bold text-[var(--aw-muted)]">Fetching registry entries...</div> : members.length === 0 ? (
              <div className="p-20 text-center flex flex-col items-center gap-4 text-[var(--aw-muted)]"><Search size={48} strokeWidth={1}/><p className="font-bold">No members found matching these criteria.</p></div>
            ) : viewMode === 'cards' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 p-6">
                {members.map(m => (
                  <button key={m.id} onClick={() => navigate(`${memberDetailBasePath}/${m.id}?returnTo=${encodeURIComponent(location.pathname+location.search)}`)} className="flex items-center gap-4 p-4 rounded-2xl border border-[var(--aw-border-soft)] hover:border-[var(--aw-primary)] transition-all text-left bg-[var(--aw-surface)] group hover:shadow-md">
                    <div className="h-14 w-14 rounded-xl overflow-hidden bg-[var(--aw-bg)] border border-[var(--aw-border-soft)] flex-shrink-0">
                      {m.photoFileId ? <img src={memberPhotoUrl(m.photoFileId)} className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center font-black text-[var(--aw-primary)] bg-[var(--aw-primary-soft)]/20">{initials(m)}</div>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-black text-[var(--aw-text)] truncate">{fullName(m)}</p>
                      <p className="text-[10px] font-bold text-[var(--aw-primary)] mt-1 uppercase tracking-wider">{ppKanbanLine(m)}</p>
                      <div className="flex items-center gap-2 mt-1 opacity-70">
                        <img src="/Prosperity_Party_logo.png" className="h-3 w-3 object-contain" />
                        <span className="text-[10px] font-bold truncate">{fanDisplay(m)}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="aw-table-wrapper !border-none !rounded-none">
                <table className="aw-table aw-table-to-cards">
                  <thead>
                    <tr><th>Name</th><th>PP ID</th><th>FAN ID</th><th>Gender</th><th>Hibret</th><th className="text-right">Action</th></tr>
                  </thead>
                  <tbody>
                    {members.map(m => (
                      <tr key={m.id} className="hover:!bg-[var(--aw-bg)] cursor-pointer" onClick={() => navigate(`${memberDetailBasePath}/${m.id}?returnTo=${encodeURIComponent(location.pathname+location.search)}`)}>
                        <td data-label="Name" className="font-black">{fullName(m)}</td>
                        <td data-label="PP" className="font-bold text-[var(--aw-primary)]">{ppDisplay(m)}</td>
                        <td data-label="FAN" className="font-bold text-[var(--aw-muted)]">{fanDisplay(m)}</td>
                        <td data-label="Gender" className="font-bold text-[var(--aw-muted)]">{normalizeGender(m.gender)}</td>
                        <td data-label="Hibret" className="font-bold text-[var(--aw-muted)]">{hibretName(m)}</td>
                        <td className="text-right"><button className="text-[10px] font-black uppercase text-[var(--aw-primary)] hover:underline">View Profile</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {memberActionModal === 'add' && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[var(--aw-overlay-scrim-strong)] backdrop-blur-sm" onClick={() => setMemberActionModal(null)} />
          <form onSubmit={saveMember} className="relative aw-panel w-full max-w-4xl shadow-2xl !rounded-3xl border-none max-h-[95dvh] flex flex-col">
            <header className="aw-panel-header !rounded-t-3xl !py-6">
              <h2 className="text-xl font-black">Register Member</h2>
              <button type="button" onClick={() => setMemberActionModal(null)} className="aw-btn aw-btn-outline !min-h-[36px] !px-2 !rounded-xl"><X size={18}/></button>
            </header>
            <div className="p-8 overflow-y-auto aw-seamless-scroll flex-1">
               <div className="aw-form-grid">
                  <div className="aw-form-field"><label className="aw-form-label">First Name</label><input required className="aw-input" value={memberForm.firstName} onChange={e => setMemberForm({...memberForm, firstName: e.target.value})} /></div>
                  <div className="aw-form-field"><label className="aw-form-label">Father Name</label><input required className="aw-input" value={memberForm.fatherName} onChange={e => setMemberForm({...memberForm, fatherName: e.target.value})} /></div>
                  <div className="aw-form-field"><label className="aw-form-label">Grandfather</label><input required className="aw-input" value={memberForm.grandfatherName} onChange={e => setMemberForm({...memberForm, grandfatherName: e.target.value})} /></div>
                  <div className="aw-form-field"><label className="aw-form-label">PP ID</label><input required className="aw-input" value={memberForm.ppId} onChange={e => setMemberForm({...memberForm, ppId: e.target.value})} /></div>
                  <div className="aw-form-field"><label className="aw-form-label">FAN ID</label><input className="aw-input" value={memberForm.fanId} onChange={e => setMemberForm({...memberForm, fanId: e.target.value})} /></div>
                  <div className="aw-form-field"><label className="aw-form-label">Gender</label><select className="aw-filter-select" value={memberForm.gender} onChange={e => setMemberForm({...memberForm, gender: e.target.value})}><option value="ወንድ">Male</option><option value="ሴት">Female</option></select></div>
                  <div className="aw-form-field"><label className="aw-form-label">Phone</label><input className="aw-input" value={memberForm.phone} onChange={e => setMemberForm({...memberForm, phone: e.target.value})} /></div>
                  <div className="aw-form-field"><label className="aw-form-label">Email</label><input type="email" className="aw-input" value={memberForm.email} onChange={e => setMemberForm({...memberForm, email: e.target.value})} /></div>
               </div>
            </div>
            <div className="p-6 bg-[var(--aw-surface-muted)] flex justify-end gap-3 rounded-b-3xl">
              <button type="button" onClick={() => setMemberActionModal(null)} className="aw-btn aw-btn-outline !bg-white">Cancel</button>
              <button type="submit" disabled={saving} className="aw-btn aw-btn-primary min-w-[140px]">{saving ? "Saving..." : "Save Registry"}</button>
            </div>
          </form>
        </div>
      )}

      <MemberImportDrawer isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} onImported={loadMembers} />
    </div>
  );
}

export default MembersRegistryPage;
