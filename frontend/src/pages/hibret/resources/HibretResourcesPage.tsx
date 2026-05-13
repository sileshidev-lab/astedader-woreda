import { useEffect, useMemo, useState } from "react";
import { Download, Eye, FileText, FolderOpen, Search, SlidersHorizontal } from "lucide-react";
import { getHibretResources } from "../../../services/hibretPortalService";
import type { ResourceItem } from "../../../services/contentService";
import { getFileDownloadUrl } from "../../../services/announcementService";

function formatDate(v?: string | null) { return v ? new Date(v).toLocaleString() : "-"; }

export function HibretResourcesPage() {
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [searchText, setSearchText] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadResources() {
    setIsLoading(true); setError("");
    try { const data = await getHibretResources(); setResources(data.resources); }
    catch { setError("Unable to load library contents."); }
    finally { setIsLoading(false); }
  }

  useEffect(() => { void loadResources(); }, []);

  const categories = useMemo(() => Array.from(new Set(resources.map((i) => i.category).filter(Boolean))).sort(), [resources]);

  const filteredResources = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return resources.filter((r) => {
      if (categoryFilter && r.category !== categoryFilter) return false;
      if (!q) return true;
      return [r.title, r.description, r.category, r.file?.originalName].some(f => f?.toLowerCase().includes(q));
    });
  }, [categoryFilter, resources, searchText]);

  return (
    <div className="flex flex-col gap-6">
      {error && <div className="aw-panel !bg-[var(--aw-danger-bg)] !border-[var(--aw-danger)] px-4 py-3 text-sm font-black text-[var(--aw-danger)]">{error}</div>}

      <section className="aw-panel shadow-soft">
        <header className="aw-panel-header !bg-[var(--aw-surface)] !py-6">
          <div className="min-w-0">
             <h2 className="aw-panel-title">Resource Library</h2>
             <p className="text-xs font-bold text-[var(--aw-muted)] mt-1">Official materials and guides shared by Woreda administration.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
             <div className="aw-search-wrap !min-h-[38px]">
                <Search size={14} className="text-[var(--aw-muted)]" />
                <input type="text" className="aw-search-input" placeholder="Search resources..." value={searchText} onChange={e => setSearchText(e.target.value)} />
             </div>
             <button type="button" onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)} className="aw-btn aw-btn-outline lg:hidden"><SlidersHorizontal size={14}/>Filters</button>
             <select className={["aw-filter-select !min-h-[38px]", mobileFiltersOpen ? "block" : "hidden lg:block"].join(" ")} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                <option value="">All Categories</option>
                {categories.map(c => <option key={c} value={c || ''}>{c}</option>)}
             </select>
          </div>
        </header>

        <div className="p-6">
          {isLoading ? (
             <div className="py-20 text-center font-bold text-[var(--aw-muted)]">Fetching library...</div>
          ) : filteredResources.length === 0 ? (
             <div className="py-20 text-center flex flex-col items-center gap-4 text-[var(--aw-muted)]"><FolderOpen size={48} strokeWidth={1}/><p className="font-bold">No resources found matching your search.</p></div>
          ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredResources.map((item) => (
                  <article key={item.id} className="aw-panel !rounded-2xl p-5 flex flex-col h-full hover:border-[var(--aw-primary)] transition-all">
                    <div className="flex items-start justify-between mb-4">
                       <div className="h-10 w-10 rounded-xl bg-[var(--aw-primary-soft)]/20 flex items-center justify-center text-[var(--aw-primary)]"><FileText size={20}/></div>
                       <span className="rounded-full border border-[var(--aw-success)]/20 bg-[var(--aw-success-bg)] px-2.5 py-0.5 text-[10px] font-black uppercase text-[var(--aw-success)]">Official</span>
                    </div>
                    <h3 className="text-base font-black text-[var(--aw-text)] mb-2 line-clamp-1">{item.title}</h3>
                    <p className="text-sm font-medium text-[var(--aw-muted)] line-clamp-2 flex-1 mb-4 leading-relaxed">{item.description || "No description provided."}</p>

                    <div className="flex flex-col gap-2 mb-5">
                       {item.category && <span className="text-[10px] font-black uppercase tracking-wider bg-[var(--aw-bg)] px-2 py-1 rounded-lg border border-[var(--aw-border-soft)] w-fit">{item.category}</span>}
                       <p className="text-[10px] font-bold text-[var(--aw-muted)] uppercase tracking-wider">Shared {formatDate(item.publishedAt || item.createdAt)}</p>
                    </div>

                    {item.fileId && (
                      <div className="flex gap-2 pt-4 border-t border-[var(--aw-border-soft)]">
                         <button onClick={() => window.open(getFileDownloadUrl(item.fileId!) + "&inline=true", "_blank")} className="aw-btn aw-btn-outline !min-h-[34px] !px-3 !text-xs flex-1"><Eye size={14}/>View</button>
                         <a href={getFileDownloadUrl(item.fileId)} className="aw-btn aw-btn-outline !min-h-[34px] !px-3 !text-xs flex-1"><Download size={14}/>Get</a>
                      </div>
                    )}
                 </article>
                ))}
             </div>
          )}
        </div>
      </section>
    </div>
  );
}
