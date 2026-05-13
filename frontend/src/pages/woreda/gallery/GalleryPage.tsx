import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Archive,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Images,
  Search,
  X,
  RefreshCw
} from "lucide-react";
import {
  getGalleryReportAlbum,
  getGalleryReportAlbums,
} from "../../../services/galleryService";
import type { GalleryAlbum, GalleryAttachment } from "../../../services/galleryService";
import {
  getFileDownloadUrl,
  getFilePreviewUrl,
  getFileViewUrl,
} from "../../../services/announcementService";
import { apiClient } from "../../../services/apiClient";

type ReviewFilter = "all" | "pending" | "approved" | "rejected" | "changes_requested";
type MediaFilter = "all" | "media" | "documents";

function bytesToMb(v?: number) { return v ? `${(v / 1024 / 1024).toFixed(2)} MB` : ""; }
function isMedia(m: string) { return m.startsWith("image/") || m.startsWith("video/"); }
function isImage(m: string) { return m.startsWith("image/"); }

function statusClass(s?: string | null) {
  if (s === "approved") return "rounded-full border border-[var(--aw-success)]/20 bg-[var(--aw-success-bg)] px-2.5 py-0.5 text-[10px] font-black uppercase text-[var(--aw-success)]";
  if (s === "rejected") return "rounded-full border border-[var(--aw-danger)]/20 bg-[var(--aw-danger-bg)] px-2.5 py-0.5 text-[10px] font-black uppercase text-[var(--aw-danger)]";
  if (s === "changes_requested") return "rounded-full border border-[var(--aw-warning)] bg-[var(--aw-warning-bg)] px-2.5 py-0.5 text-[10px] font-black uppercase text-[var(--aw-warning)]";
  return "rounded-full border border-[var(--aw-border)] bg-[var(--aw-surface-muted)] px-2.5 py-0.5 text-[10px] font-black uppercase text-[var(--aw-muted)]";
}

export function GalleryPage() {
  const [albums, setAlbums] = useState<GalleryAlbum[]>([]);
  const [hibrets, setHibrets] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<GalleryAlbum | null>(null);
  const [viewerAttachment, setViewerAttachment] = useState<GalleryAttachment | null>(null);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState({ albums: 0, mediaFiles: 0, documentFiles: 0, approvedAlbums: 0, pendingReviewAlbums: 0 });

  const [searchText, setSearchText] = useState("");
  const [hibretFilter, setHibretFilter] = useState("all");
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("all");
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>("all");
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const [isLoading, setIsLoading] = useState(true);
  const [isAlbumLoading, setIsAlbumLoading] = useState(false);
  const [error, setError] = useState("");

  const filterParams = useMemo(() => ({
    search: searchText.trim() || undefined,
    hibretId: hibretFilter === "all" ? undefined : hibretFilter,
    reviewStatus: reviewFilter === "all" ? undefined : reviewFilter,
    mediaType: mediaFilter === "all" ? undefined : mediaFilter,
  }), [searchText, hibretFilter, reviewFilter, mediaFilter]);

  async function loadAlbums() {
    setIsLoading(true); setError("");
    try {
      const data = await getGalleryReportAlbums(filterParams);
      setAlbums(data.albums); setHibrets(data.hibrets); setSummary(data.summary);
    } catch { setError("Unable to load album index."); }
    finally { setIsLoading(false); }
  }

  async function openAlbum(album: GalleryAlbum) {
    setIsAlbumLoading(true);
    try { const data = await getGalleryReportAlbum(album.reportId); setSelectedAlbum(data); }
    catch { setError("Unable to load album details."); }
    finally { setIsAlbumLoading(false); }
  }

  useEffect(() => { void loadAlbums(); }, [filterParams]);
  useEffect(() => { setPage(1); }, [searchText, hibretFilter, reviewFilter, mediaFilter]);

  useEffect(() => {
    const files = [...albums.map(a => a.coverFile).filter(Boolean), ...(selectedAlbum?.attachments.map(a => a.file) ?? [])]
      .filter((f): f is NonNullable<typeof f> => Boolean(f && isImage(f.mimeType)));
    if (!files.length) { setPreviewUrls({}); return; }
    let cancelled = false; const objectUrls: string[] = [];
    async function loadPreviews() {
      const unique = Array.from(new Map(files.map(f => [f.id, f])).values());
      const entries = await Promise.all(unique.map(async (f) => {
        const res = await apiClient.get<Blob>(`/files/${f.id}/download?inline=true`, { responseType: "blob" });
        const url = URL.createObjectURL(res.data); objectUrls.push(url); return [f.id, url] as const;
      }));
      if (!cancelled) setPreviewUrls(Object.fromEntries(entries));
    }
    void loadPreviews();
    return () => { cancelled = true; objectUrls.forEach(u => URL.revokeObjectURL(u)); };
  }, [albums, selectedAlbum]);

  const totalPages = Math.max(1, Math.ceil(albums.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedAlbums = albums.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="flex flex-col gap-6">
      {error && <div className="aw-panel !bg-[var(--aw-danger-bg)] !border-[var(--aw-danger)] px-4 py-3 text-sm font-black text-[var(--aw-danger)]">{error}</div>}

      <div className="aw-stat-grid !grid-cols-2 md:!grid-cols-5">
        <div className="aw-stat-card"><p className="aw-stat-label">Report Albums</p><p className="aw-stat-value">{summary.albums}</p></div>
        <div className="aw-stat-card"><p className="aw-stat-label">Media Files</p><p className="aw-stat-value text-[var(--aw-primary)]">{summary.mediaFiles}</p></div>
        <div className="aw-stat-card"><p className="aw-stat-label">Documents</p><p className="aw-stat-value text-[var(--aw-magenta)]">{summary.documentFiles}</p></div>
        <div className="aw-stat-card"><p className="aw-stat-label">Approved</p><p className="aw-stat-value text-[var(--aw-success)]">{summary.approvedAlbums}</p></div>
        <div className="aw-stat-card"><p className="aw-stat-label">Pending</p><p className="aw-stat-value text-[var(--aw-muted)]">{summary.pendingReviewAlbums}</p></div>
      </div>

      <section className="aw-panel shadow-soft">
        <header className="aw-panel-header !bg-[var(--aw-surface)] !py-6">
          <div className="min-w-0">
             <h2 className="aw-panel-title">Report Media Gallery</h2>
             <p className="text-xs font-bold text-[var(--aw-muted)] mt-1">Archive of media and attachments from submitted Hibret reports.</p>
          </div>
          <button onClick={() => void loadAlbums()} className="aw-btn aw-btn-outline !min-h-[38px] !px-3"><RefreshCw size={16}/></button>
        </header>

        <div className="aw-toolbar !border-none !rounded-none !bg-[var(--aw-surface-muted)] !p-4">
           <div className="aw-search-wrap !bg-[var(--aw-surface)] flex-1 max-w-md">
             <Search size={14} className="text-[var(--aw-muted)]" />
             <input type="text" className="aw-search-input" placeholder="Search albums or directives..." value={searchText} onChange={e => setSearchText(e.target.value)} />
           </div>
           <div className="flex flex-wrap gap-2">
             <select className="aw-filter-select" value={hibretFilter} onChange={e => setHibretFilter(e.target.value)}><option value="all">All Hibrets</option>{hibrets.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}</select>
             <select className="aw-filter-select" value={reviewFilter} onChange={e => setReviewFilter(e.target.value as ReviewFilter)}><option value="all">All status</option><option value="pending">Pending</option><option value="approved">Approved</option></select>
             <select className="aw-filter-select" value={mediaFilter} onChange={e => setMediaFilter(e.target.value as MediaFilter)}><option value="all">All files</option><option value="media">Media only</option><option value="documents">Docs only</option></select>
           </div>
        </div>

        <div className="p-6">
          {isLoading ? (
             <div className="py-20 text-center font-bold text-[var(--aw-muted)]">Building gallery...</div>
          ) : albums.length === 0 ? (
             <div className="py-20 text-center flex flex-col items-center gap-4 text-[var(--aw-muted)]"><Images size={48} strokeWidth={1}/><p className="font-bold">No report albums match your filters.</p></div>
          ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                {paginatedAlbums.map(a => {
                  const cover = a.coverFile && isImage(a.coverFile.mimeType) ? previewUrls[a.coverFile.id] || getFileViewUrl(a.coverFile.id) : null;
                  return (
                    <article key={a.reportId} className="aw-panel !rounded-2xl overflow-hidden hover:border-[var(--aw-primary)] transition-all cursor-pointer group" onClick={() => openAlbum(a)}>
                       <div className="aspect-[16/10] bg-[var(--aw-primary-darkest)] relative flex items-center justify-center">
                          {cover ? <img src={cover} className="h-full w-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" /> : <Archive size={40} className="text-white/20" />}
                          <div className="absolute top-3 right-3 bg-black/60 backdrop-blur px-2 py-1 rounded text-[10px] font-black text-white uppercase tracking-wider">{a.attachmentCount} items</div>
                          <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                             <p className="text-xs font-black text-[var(--aw-yellow)] uppercase tracking-[0.1em]">{a.hibretName}</p>
                          </div>
                       </div>
                       <div className="p-5 space-y-3">
                          <h3 className="text-sm font-black text-[var(--aw-text)] line-clamp-1">{a.reportTitle}</h3>
                          <p className="text-xs font-bold text-[var(--aw-muted)] line-clamp-1">{a.directiveTitle}</p>
                          <div className="flex flex-wrap gap-2 pt-1">
                             <span className={statusClass(a.reviewDecision)}>{a.reviewDecision || 'pending'}</span>
                             <span className="text-[10px] font-black uppercase text-[var(--aw-muted)] bg-[var(--aw-bg)] px-2 py-0.5 rounded border border-[var(--aw-border-soft)]">{a.mediaCount} Media</span>
                          </div>
                       </div>
                    </article>
                  );
                })}
             </div>
          )}
        </div>

        <footer className="aw-panel-header !bg-[var(--aw-surface-muted)] !border-none !py-4">
          <p className="text-xs font-bold text-[var(--aw-muted)]">Page {safePage} of {totalPages} · {albums.length} Albums</p>
          <div className="flex items-center gap-2">
            <button disabled={safePage <= 1} onClick={() => setPage(p => p - 1)} className="aw-btn aw-btn-outline !min-h-[34px] !px-2 disabled:opacity-30"><ChevronLeft size={16}/></button>
            <button disabled={safePage >= totalPages} onClick={() => setPage(p => p + 1)} className="aw-btn aw-btn-outline !min-h-[34px] !px-2 disabled:opacity-30"><ChevronRight size={16}/></button>
          </div>
        </footer>
      </section>

      {selectedAlbum && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-end">
          <div className="absolute inset-0 bg-[var(--aw-overlay-scrim-strong)] backdrop-blur-sm" onClick={() => setSelectedAlbum(null)} />
          <aside className="relative aw-panel h-full w-full max-w-5xl shadow-2xl !rounded-none border-none flex flex-col">
            <header className="aw-panel-header !py-7 !px-8 !bg-[var(--aw-surface)]">
              <div className="min-w-0">
                <div className="flex items-center gap-3 mb-1"><h2 className="text-2xl font-black truncate">{selectedAlbum.reportTitle}</h2><span className={statusClass(selectedAlbum.reviewDecision)}>{selectedAlbum.reviewDecision || 'pending'}</span></div>
                <p className="text-sm font-bold text-[var(--aw-muted)]">{selectedAlbum.hibretName} · {selectedAlbum.directiveTitle}</p>
              </div>
              <div className="flex gap-2">
                <Link to={`/woreda/announcements/${selectedAlbum.announcementId}/hibrets/${selectedAlbum.hibretId}/report`} className="aw-btn aw-btn-outline !min-h-[38px] !px-4 !text-xs uppercase tracking-wider"><ExternalLink size={14}/>Open Report</Link>
                <button onClick={() => setSelectedAlbum(null)} className="aw-btn aw-btn-outline !min-h-[38px] !px-2"><X size={20}/></button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto aw-seamless-scroll p-8 space-y-10">
              {isAlbumLoading ? <div className="py-20 text-center font-bold text-[var(--aw-muted)]">Loading album contents...</div> : (
                <>
                  <section>
                    <div className="flex items-center justify-between border-b border-[var(--aw-border-soft)] pb-4 mb-6">
                       <h3 className="text-lg font-black">Report Media <span className="text-[var(--aw-muted)] ml-2 text-sm">({selectedAlbum.attachments.filter(at => isMedia(at.file.mimeType)).length})</span></h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                       {selectedAlbum.attachments.filter(at => isMedia(at.file.mimeType)).map(at => (
                         <div key={at.id} className="aw-panel !rounded-xl overflow-hidden border-[var(--aw-border-soft)] hover:border-[var(--aw-primary)] transition-all group">
                            <div className="aspect-square bg-[var(--aw-bg)] relative flex items-center justify-center">
                               {isImage(at.file.mimeType) ? <img src={previewUrls[at.file.id] || getFileViewUrl(at.file.id)} className="h-full w-full object-cover" /> : <ImageIcon size={40} className="text-[var(--aw-muted)]" />}
                               <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                                  <button onClick={() => setViewerAttachment(at)} className="aw-btn aw-btn-primary !min-h-[34px] !px-3 !text-xs">View</button>
                                  <a href={getFileDownloadUrl(at.file.id)} className="aw-btn aw-btn-outline !bg-white !min-h-[34px] !px-3 !text-xs">Get</a>
                               </div>
                            </div>
                            <div className="p-3">
                               <p className="text-xs font-bold text-[var(--aw-text)] truncate">{at.file.originalName}</p>
                               <p className="text-[10px] font-bold text-[var(--aw-muted)] mt-1">{bytesToMb(at.file.sizeBytes)}</p>
                            </div>
                         </div>
                       ))}
                    </div>
                  </section>

                  <section>
                    <div className="flex items-center justify-between border-b border-[var(--aw-border-soft)] pb-4 mb-6">
                       <h3 className="text-lg font-black">Documents <span className="text-[var(--aw-muted)] ml-2 text-sm">({selectedAlbum.attachments.filter(at => !isMedia(at.file.mimeType)).length})</span></h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       {selectedAlbum.attachments.filter(at => !isMedia(at.file.mimeType)).map(at => (
                         <div key={at.id} className="aw-panel !rounded-xl p-4 flex items-center gap-4 hover:border-[var(--aw-primary)] transition-all">
                            <div className="h-10 w-10 rounded-lg bg-[var(--aw-surface-muted)] flex items-center justify-center text-[var(--aw-primary)]"><FileText size={20}/></div>
                            <div className="min-w-0 flex-1">
                               <p className="text-sm font-bold text-[var(--aw-text)] truncate">{at.file.originalName}</p>
                               <p className="text-[10px] font-black uppercase text-[var(--aw-muted)] mt-0.5">{at.file.mimeType.split('/')[1] || 'DOC'} · {bytesToMb(at.file.sizeBytes)}</p>
                            </div>
                            <div className="flex gap-2">
                               <button onClick={() => window.open(getFilePreviewUrl(at.file.id), "_blank")} className="aw-btn aw-btn-outline !min-h-[32px] !px-3 !text-[11px]">View</button>
                               <a href={getFileDownloadUrl(at.file.id)} className="aw-btn aw-btn-outline !min-h-[32px] !px-3 !text-[11px]">Get</a>
                            </div>
                         </div>
                       ))}
                    </div>
                  </section>
                </>
              )}
            </div>
          </aside>
        </div>
      )}

      {viewerAttachment && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setViewerAttachment(null)} />
          <div className="relative w-full max-w-6xl max-h-[90dvh] flex flex-col">
            <header className="flex justify-between items-center gap-4 mb-4 text-white">
               <div className="min-w-0">
                  <h2 className="font-black truncate">{viewerAttachment.file.originalName}</h2>
                  <p className="text-xs font-bold opacity-60 uppercase tracking-widest">{viewerAttachment.file.mimeType} · {bytesToMb(viewerAttachment.file.sizeBytes)}</p>
               </div>
               <div className="flex gap-2">
                  <a href={getFileDownloadUrl(viewerAttachment.file.id)} className="aw-btn aw-btn-primary !min-h-[36px] !px-4">Download</a>
                  <button onClick={() => setViewerAttachment(null)} className="aw-btn aw-btn-outline !bg-white/10 !text-white !border-white/20 !min-h-[36px] !px-2"><X size={20}/></button>
               </div>
            </header>
            <div className="flex-1 overflow-hidden flex items-center justify-center min-h-0 bg-black/40 rounded-3xl border border-white/10">
               {isImage(viewerAttachment.file.mimeType) ? (
                 <img src={previewUrls[viewerAttachment.file.id] || getFileViewUrl(viewerAttachment.file.id)} className="max-h-full max-w-full object-contain shadow-2xl" />
               ) : (
                 <iframe src={getFilePreviewUrl(viewerAttachment.file.id)} title="Preview" className="h-full w-full bg-white rounded-2xl" />
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
