import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpen, CalendarDays, Eye, FileText, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { getBroadcasts } from "../../../services/contentService";
import type { Broadcast } from "../../../services/contentService";
import {
  broadcastImageUrl,
  filePreviewUrl,
  formatBroadcastDate,
  formatBroadcastDateTime,
  rewriteBodyFileUrls,
  stripHtml,
  visibleAttachments,
} from "./broadcastUtils";

type PublishedBroadcastsPageProps = { title: string; subtitle: string; };

export function PublishedBroadcastsPage({ title, subtitle }: PublishedBroadcastsPageProps) {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [selected, setSelected] = useState<Broadcast | null>(null);
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);

  async function loadBroadcasts() {
    setIsLoading(true);
    try {
      const data = await getBroadcasts();
      setBroadcasts(data.broadcasts.filter((i) => i.status === "published"));
    } catch { console.error("Broadcasts load failed."); }
    finally { setIsLoading(false); }
  }

  useEffect(() => { void loadBroadcasts(); }, []);

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return broadcasts.filter((i) => !q || [i.title, i.summary, stripHtml(i.bodyHtml)].some(f => f?.toLowerCase().includes(q)));
  }, [broadcasts, searchText]);

  useEffect(() => { setPage(1); }, [searchText]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  if (selected) {
    const html = rewriteBodyFileUrls(selected.bodyHtml);
    const atts = visibleAttachments(selected);
    const pub = selected.publishedAt || selected.createdAt;
    const hero = broadcastImageUrl(selected);

    return (
      <div className="flex-1 flex flex-col gap-6">
        <nav className="aw-panel p-4 flex items-center">
           <button onClick={() => setSelected(null)} className="aw-btn aw-btn-outline !min-h-[36px] !px-4"><ArrowLeft size={16}/>Back to Archive</button>
        </nav>
        <article className="aw-panel !rounded-3xl overflow-hidden shadow-soft">
           {hero && !brokenImages[selected.id] ? <img src={hero} className="w-full aspect-[21/9] object-cover border-b border-[var(--aw-border-soft)]" onError={() => setBrokenImages({...brokenImages, [selected.id]: true})} /> : <div className="w-full aspect-[21/9] bg-[var(--aw-primary-soft)]/20 border-b border-[var(--aw-border-soft)] flex items-center justify-center text-[var(--aw-primary)]"><BookOpen size={64} strokeWidth={1}/></div>}
           <div className="p-8 sm:p-12 max-w-4xl mx-auto">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--aw-primary)] mb-2">Official Broadcast</p>
              <h1 className="text-3xl sm:text-4xl font-black mb-6 leading-tight text-[var(--aw-text)]">{selected.title}</h1>
              <div className="flex items-center gap-4 text-xs font-bold text-[var(--aw-muted)] mb-10 border-y border-[var(--aw-border-soft)] py-4">
                 <span className="flex items-center gap-1.5"><CalendarDays size={14}/>{formatBroadcastDate(pub)}</span>
                 <span className="text-[var(--aw-border)]">•</span>
                 <span className="uppercase tracking-wider">5 min read</span>
              </div>
              {selected.summary && <p className="text-lg font-bold text-[var(--aw-muted)] mb-10 leading-relaxed italic">{selected.summary}</p>}
              <div className="aw-article-preview prose prose-slate max-w-none text-base leading-loose" dangerouslySetInnerHTML={{ __html: html }} />

              {atts.length > 0 && (
                <div className="mt-12 pt-8 border-t border-[var(--aw-border-soft)]">
                   <h3 className="font-black text-lg mb-6 flex items-center gap-2"><FileText size={20} className="text-[var(--aw-primary)]" />Supporting Documents</h3>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {atts.map(a => (
                        <a key={a.id} href={filePreviewUrl(a.file.id)} target="_blank" className="p-4 rounded-2xl border border-[var(--aw-border-soft)] bg-[var(--aw-bg)] flex items-center justify-between hover:border-[var(--aw-primary)] transition-all group">
                           <div className="min-w-0 flex-1"><p className="text-sm font-black truncate">{a.file.originalName}</p><p className="text-[10px] font-bold text-[var(--aw-muted)] uppercase mt-1">Open PDF / Document</p></div>
                           <div className="p-2 bg-white rounded-lg border border-[var(--aw-border-soft)] group-hover:text-[var(--aw-primary)]"><Eye size={16}/></div>
                        </a>
                      ))}
                   </div>
                </div>
              )}
           </div>
        </article>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="aw-panel !py-8 !px-8 !bg-[var(--aw-surface)] shadow-soft">
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="min-w-0">
               <h1 className="text-2xl font-black">{title}</h1>
               <p className="text-sm font-bold text-[var(--aw-muted)] mt-1">{subtitle}</p>
            </div>
            <div className="aw-search-wrap !bg-[var(--aw-bg)] flex-1 max-w-md">
               <Search size={16} className="text-[var(--aw-muted)]" />
               <input type="text" className="aw-search-input" placeholder="Search archive..." value={searchText} onChange={e => setSearchText(e.target.value)} />
            </div>
         </div>
      </header>

      <div className="p-1">
        {isLoading ? <div className="py-20 text-center font-bold text-[var(--aw-muted)]">Opening archives...</div> : filtered.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center gap-4 text-[var(--aw-muted)]"><BookOpen size={48} strokeWidth={1}/><p className="font-bold">No broadcasts found.</p></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
             {paginated.map((item, idx) => {
               const hero = broadcastImageUrl(item);
               return (
                 <article key={item.id} className="aw-panel !rounded-2xl overflow-hidden hover:border-[var(--aw-primary)] transition-all cursor-pointer group flex flex-col h-full bg-[var(--aw-surface)]" onClick={() => setSelected(item)}>
                    <div className="aspect-[16/10] bg-[var(--aw-primary-soft)]/20 relative flex items-center justify-center overflow-hidden">
                       {hero && !brokenImages[item.id] ? <img src={hero} className="h-full w-full object-cover group-hover:scale-105 transition-transform" onError={() => setBrokenImages({...brokenImages, [item.id]: true})} /> : <BookOpen size={40} className="text-[var(--aw-primary)]/20" />}
                       {(safePage === 1 && idx === 0) && <div className="absolute top-3 left-3 bg-[var(--aw-yellow)] text-[var(--aw-yellow-text)] text-[9px] font-black uppercase px-2 py-0.5 rounded shadow-sm">Latest</div>}
                       <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur px-2 py-1 rounded text-[10px] font-black text-white">{formatBroadcastDate(item.publishedAt || item.createdAt)}</div>
                    </div>
                    <div className="p-6 flex flex-col flex-1">
                       <h3 className="text-base font-black text-[var(--aw-text)] mb-3 line-clamp-2">{item.title}</h3>
                       <p className="text-sm font-medium text-[var(--aw-muted)] line-clamp-2 flex-1 mb-6 leading-relaxed">{item.summary || stripHtml(item.bodyHtml)}</p>
                       <div className="pt-4 border-t border-[var(--aw-border-soft)] flex justify-between items-center">
                          <span className="text-[10px] font-black text-[var(--aw-muted)] uppercase tracking-wider">{formatBroadcastDateTime(item.publishedAt || item.createdAt)}</span>
                          <span className="text-[10px] font-black uppercase text-[var(--aw-primary)] flex items-center gap-1">Read Post <ChevronRight size={12}/></span>
                       </div>
                    </div>
                 </article>
               );
             })}
          </div>
        )}
      </div>

      <footer className="aw-panel-header !bg-[var(--aw-surface-muted)] !rounded-2xl !py-4 shadow-sm">
        <p className="text-xs font-bold text-[var(--aw-muted)]">Page {safePage} of {totalPages} · {filtered.length} Posts</p>
        <div className="flex items-center gap-2">
          <button disabled={safePage <= 1} onClick={() => setPage(p => p - 1)} className="aw-btn aw-btn-outline !min-h-[34px] !px-2 disabled:opacity-30"><ChevronLeft size={16}/></button>
          <button disabled={safePage >= totalPages} onClick={() => setPage(p => p + 1)} className="aw-btn aw-btn-outline !min-h-[34px] !px-2 disabled:opacity-30"><ChevronRight size={16}/></button>
        </div>
      </footer>
    </div>
  );
}
