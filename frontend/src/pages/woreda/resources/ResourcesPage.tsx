import { useEffect, useState } from "react";
import { Download, Eye, FileText, Search, SlidersHorizontal, Plus, Upload, X, Settings } from "lucide-react";
import {
  createResource,
  getResources,
  updateResource,
  uploadResourceFile,
} from "../../../services/contentService";
import type { ResourceItem } from "../../../services/contentService";
import { getFileDownloadUrl } from "../../../services/announcementService";
import { useAuthStore } from "../../../store/authStore";

function readableFileName(value?: string | null) {
  const text = String(value || "").trim(); if (!text) return "-";
  try { const repaired = decodeURIComponent(escape(text)); if (repaired && !repaired.includes("")) return repaired; } catch { /* ignore */ }
  return text;
}

function statusClass(status: string) {
  if (status === "published") return "rounded-full border border-[var(--aw-success)]/20 bg-[var(--aw-success-bg)] px-2.5 py-0.5 text-[10px] font-black uppercase text-[var(--aw-success)]";
  if (status === "archived") return "rounded-full border border-[var(--aw-border)] bg-[var(--aw-surface-muted)] px-2.5 py-0.5 text-[10px] font-black uppercase text-[var(--aw-muted)]";
  return "rounded-full border border-[var(--aw-primary)]/20 bg-[var(--aw-primary-soft)] px-2.5 py-0.5 text-[10px] font-black uppercase text-[var(--aw-primary)]";
}

export function ResourcesPage() {
  const { user } = useAuthStore();
  const privileges = user?.privileges ?? [];
  const canAccessAll = privileges.includes("*");
  const can = (p: string) => canAccessAll || privileges.includes(p);

  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [summary, setSummary] = useState({ total: 0, published: 0, drafts: 0, archived: 0 });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<ResourceItem | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [fileId, setFileId] = useState("");
  const [fileName, setFileName] = useState("");
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [targetRoles, setTargetRoles] = useState<string[]>(["HIBRET_ADMIN", "MEMBER"]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadResources() {
    setIsLoading(true); setError("");
    try {
      const data = await getResources();
      setResources(data.resources);
      setSummary(data.summary);
    } catch { setError("Unable to load library resources."); }
    finally { setIsLoading(false); }
  }

  useEffect(() => { void loadResources(); }, []);

  async function handleFile(file?: File) {
    if (!file) return;
    setIsUploadingFile(true); setError("");
    try {
      const uploaded = await uploadResourceFile(file);
      setFileId(uploaded.id); setFileName(readableFileName(uploaded.originalName));
    } catch { setError("File upload failed."); }
    finally { setIsUploadingFile(false); }
  }

  async function saveResource() {
    setError("");
    try {
      const payload = { title, description, category, fileId: fileId || null, targetRoles };
      if (editing) await updateResource(editing.id, payload);
      else await createResource(payload);
      setIsFormOpen(false); await loadResources();
    } catch { setError("Failed to save resource."); }
  }

  function openEdit(item: ResourceItem) {
    setEditing(item);
    setTitle(item.title);
    setDescription(item.description || "");
    setCategory(item.category || "");
    setFileId(item.fileId || "");
    setFileName(item.file?.originalName || "");
    setTargetRoles(item.targetRoles);
    setIsFormOpen(true);
  }

  const categories = Array.from(new Set(resources.map((i) => i.category).filter(Boolean))).sort();

  const filteredResources = resources.filter((r) => {
    if (categoryFilter && r.category !== categoryFilter) return false;
    const q = searchText.trim().toLowerCase();
    if (!q) return true;
    return [r.title, r.description, r.category, r.file?.originalName].some(f => f?.toLowerCase().includes(q));
  });

  const [searchText, setSearchText] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      {error && <div className="aw-panel !bg-[var(--aw-danger-bg)] !border-[var(--aw-danger)] px-4 py-3 text-sm font-black text-[var(--aw-danger)]">{error}</div>}

      <div className="aw-stat-grid !grid-cols-2 md:!grid-cols-4">
        <div className="aw-stat-card"><p className="aw-stat-label">Total Resources</p><p className="aw-stat-value">{summary.total}</p></div>
        <div className="aw-stat-card"><p className="aw-stat-label">Published</p><p className="aw-stat-value text-[var(--aw-success)]">{summary.published}</p></div>
        <div className="aw-stat-card"><p className="aw-stat-label">Drafts</p><p className="aw-stat-value text-[var(--aw-primary)]">{summary.drafts}</p></div>
        <div className="aw-stat-card"><p className="aw-stat-label">Archived</p><p className="aw-stat-value text-[var(--aw-muted)]">{summary.archived}</p></div>
      </div>

      <section className="aw-panel shadow-soft">
        <header className="aw-panel-header !bg-[var(--aw-surface)] !py-6">
          <div className="min-w-0">
             <h2 className="aw-panel-title">Resource Library</h2>
             <p className="text-xs font-bold text-[var(--aw-muted)] mt-1">Official documents, guides, and shared materials.</p>
          </div>
          {can("resource.create") && <button onClick={() => { setEditing(null); setTitle(""); setDescription(""); setCategory(""); setFileId(""); setFileName(""); setIsFormOpen(true); }} className="aw-btn aw-btn-primary"><Plus size={16}/>Add Resource</button>}
        </header>

        <div className="aw-toolbar !border-none !rounded-none !bg-[var(--aw-surface-muted)] !p-4">
           <div className="aw-search-wrap !bg-[var(--aw-surface)] flex-1 max-w-md">
             <Search size={14} className="text-[var(--aw-muted)]" />
             <input type="text" className="aw-search-input" placeholder="Search library..." value={searchText} onChange={e => setSearchText(e.target.value)} />
           </div>
           <button type="button" onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)} className="aw-btn aw-btn-outline lg:hidden"><SlidersHorizontal size={14}/>Filters</button>
           <select className={["aw-filter-select !min-h-[38px]", mobileFiltersOpen ? "block" : "hidden lg:block"].join(" ")} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                <option value="">All Categories</option>
                {categories.map(c => <option key={c} value={c || ''}>{c}</option>)}
           </select>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="py-20 text-center font-bold text-[var(--aw-muted)]">Fetching library...</div>
          ) : filteredResources.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center gap-4 text-[var(--aw-muted)]"><FileText size={48} strokeWidth={1}/><p className="font-bold">No resources found matching your search.</p></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
               {filteredResources.map((item) => (
                 <article key={item.id} className="aw-panel !rounded-2xl p-5 flex flex-col h-full hover:border-[var(--aw-primary)] transition-all">
                    <div className="flex items-start justify-between mb-4">
                       <div className="h-10 w-10 rounded-xl bg-[var(--aw-primary-soft)]/20 flex items-center justify-center text-[var(--aw-primary)]"><FileText size={20}/></div>
                       <span className={statusClass(item.status)}>{item.status}</span>
                    </div>
                    <h3 className="text-base font-black text-[var(--aw-text)] mb-2 line-clamp-1">{item.title}</h3>
                    <p className="text-sm font-medium text-[var(--aw-muted)] line-clamp-2 flex-1 mb-4 leading-relaxed">{item.description || "No description provided."}</p>

                    <div className="flex items-center gap-2 mb-5">
                       {item.category && <span className="text-[10px] font-black uppercase tracking-wider bg-[var(--aw-surface-muted)] px-2 py-1 rounded-lg border border-[var(--aw-border-soft)]">{item.category}</span>}
                    </div>

                    <div className="flex gap-2 pt-4 border-t border-[var(--aw-border-soft)]">
                       {item.fileId && (
                         <>
                           <button onClick={() => window.open(getFileDownloadUrl(item.fileId!) + "&inline=true", "_blank")} className="aw-btn aw-btn-outline !min-h-[34px] !px-3 !text-xs flex-1"><Eye size={14}/>View</button>
                           <a href={getFileDownloadUrl(item.fileId)} className="aw-btn aw-btn-outline !min-h-[34px] !px-3 !text-xs flex-1"><Download size={14}/>Get</a>
                         </>
                       )}
                       {can("resource.update") && (
                         <button onClick={() => openEdit(item)} className="aw-btn aw-btn-outline !min-h-[34px] !px-2"><Settings size={14}/></button>
                       )}
                    </div>
                 </article>
               ))}
            </div>
          )}
        </div>
      </section>

      {isFormOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[var(--aw-overlay-scrim-strong)] backdrop-blur-sm" onClick={() => setIsFormOpen(false)} />
          <form onSubmit={(e) => { e.preventDefault(); void saveResource(); }} className="relative aw-panel w-full max-w-2xl shadow-2xl !rounded-3xl border-none flex flex-col max-h-[90dvh]">
            <header className="aw-panel-header !rounded-t-3xl !py-6">
              <h2 className="text-xl font-black">{editing ? "Edit Resource" : "Create Resource"}</h2>
              <button type="button" onClick={() => setIsFormOpen(false)} className="aw-btn aw-btn-outline !min-h-[36px] !px-2 !rounded-xl"><X size={18}/></button>
            </header>
            <div className="p-8 space-y-6 overflow-y-auto aw-seamless-scroll flex-1">
               <div className="aw-form-field"><label className="aw-form-label">Resource Title</label><input required className="aw-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. 2024 Administrative Guide" /></div>
               <div className="aw-form-field"><label className="aw-form-label">Description</label><textarea className="aw-input !min-h-[100px] !py-3" value={description} onChange={e => setDescription(e.target.value)} placeholder="Explain the purpose of this resource..." /></div>
               <div className="aw-form-grid">
                  <div className="aw-form-field"><label className="aw-form-label">Category</label><input className="aw-input" value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Legal, Health..." /></div>
                  <div className="aw-form-field">
                    <label className="aw-form-label">Access Roles</label>
                    <div className="flex gap-4 mt-2">
                       <label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={targetRoles.includes('HIBRET_ADMIN')} onChange={e => e.target.checked ? setTargetRoles([...targetRoles, 'HIBRET_ADMIN']) : setTargetRoles(targetRoles.filter(r => r !== 'HIBRET_ADMIN'))}/> Hibret</label>
                       <label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={targetRoles.includes('MEMBER')} onChange={e => e.target.checked ? setTargetRoles([...targetRoles, 'MEMBER']) : setTargetRoles(targetRoles.filter(r => r !== 'MEMBER'))}/> Member</label>
                    </div>
                  </div>
               </div>
               <div className="aw-panel !bg-[var(--aw-surface-muted)] p-6 border-dashed border-2">
                  <label className="flex flex-col items-center gap-3 cursor-pointer">
                    <Upload size={32} className="text-[var(--aw-primary)]" />
                    <span className="font-bold text-sm text-[var(--aw-text)]">{isUploadingFile ? "Uploading..." : fileName || "Click to upload resource file"}</span>
                    <input type="file" className="hidden" onChange={e => void handleFile(e.target.files?.[0])} />
                  </label>
               </div>
            </div>
            <div className="p-6 bg-[var(--aw-surface-muted)] flex justify-end gap-3 rounded-b-3xl">
              <button type="button" onClick={() => setIsFormOpen(false)} className="aw-btn aw-btn-outline !bg-white">Cancel</button>
              <button type="submit" disabled={isUploadingFile} className="aw-btn aw-btn-primary min-w-[140px]">{editing ? "Update Resource" : "Create Resource"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
