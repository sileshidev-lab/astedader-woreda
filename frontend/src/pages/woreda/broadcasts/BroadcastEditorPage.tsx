import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ImagePlus,
  Monitor,
  Save,
  Settings2,
  Smartphone,
  Plus,
  FileText
} from "lucide-react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import LinkExtension from "@tiptap/extension-link";
import ImageExtension from "@tiptap/extension-image";
import Youtube from "@tiptap/extension-youtube";
import Placeholder from "@tiptap/extension-placeholder";
import {
  createBroadcast,
  getBroadcast,
  updateBroadcast,
  uploadBroadcastFile,
} from "../../../services/contentService";
import type { FileInfo } from "../../../services/contentService";
import {
  extractCoverMarker,
  fileInlineUrl,
  makeCoverMarker,
  removeCoverMarkers,
  rewriteBodyFileUrls,
} from "../../shared/content/broadcastUtils";

export function BroadcastEditorPage() {
  const navigate = useNavigate();
  const { broadcastId } = useParams();
  const isEditMode = Boolean(broadcastId);

  const [title, setTitle] = useState("");
  const [summaryText, setSummaryText] = useState("");
  const [targetRoles, setTargetRoles] = useState<string[]>(["HIBRET_ADMIN", "MEMBER"]);
  const [coverFileId, setCoverFileId] = useState<string | null>(null);
  const [coverFileName, setCoverFileName] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<FileInfo[]>([]);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [isSettingsOpen, setIsSettingsOpen] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [bodyHtml, setBodyHtml] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit,
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-[var(--aw-primary)] underline underline-offset-4 font-bold" },
      }),
      ImageExtension.configure({
        HTMLAttributes: { class: "my-8 rounded-2xl border border-[var(--aw-border-soft)] shadow-md" },
      }),
      Youtube.configure({ controls: true, nocookie: true }),
      Placeholder.configure({ placeholder: "Write the official article body here..." }),
    ],
    content: "",
    onUpdate({ editor }) { setBodyHtml(editor.getHTML()); },
    editorProps: {
      attributes: { class: "aw-article-editor min-h-[400px] max-w-none bg-[var(--aw-surface)] px-8 py-8 text-[var(--aw-text)] outline-none focus:outline-none" },
      handleDrop(_view, event) {
        const file = event.dataTransfer?.files?.[0];
        if (file && file.type.startsWith("image/")) { event.preventDefault(); void insertUploadedImage(file); return true; }
        return false;
      },
    },
  });

  async function loadBroadcast() {
    if (!broadcastId || !editor) return;
    setError("");
    try {
      const data = await getBroadcast(broadcastId);
      const remoteCover = extractCoverMarker(data.bodyHtml);
      const cleanBody = removeCoverMarkers(data.bodyHtml || "");
      setTitle(data.title); setSummaryText(data.summary || ""); setTargetRoles(data.targetRoles || ["HIBRET_ADMIN", "MEMBER"]); setCoverFileId(data.coverFileId || null); setCoverFileName(data.coverFileId ? "Uploaded photo" : ""); setCoverUrl(remoteCover); setUploadedFiles(data.attachments.map((i) => i.file)); setBodyHtml(cleanBody); editor.commands.setContent(cleanBody);
    } catch { setError("Unable to load article data."); }
  }

  useEffect(() => { if (editor && broadcastId) void loadBroadcast(); }, [editor, broadcastId]);

  const previewHtml = useMemo(() => rewriteBodyFileUrls(bodyHtml), [bodyHtml]);
  const heroImageUrl = coverFileId ? fileInlineUrl(coverFileId) : coverUrl;

  async function uploadFile(file?: File, purpose: "cover" | "attachment" | "inlineImage" = "attachment") {
    if (!file) return null;
    setIsUploading(true); setError("");
    try {
      const uploaded = await uploadBroadcastFile(file);
      setUploadedFiles((cur) => cur.some((i) => i.id === uploaded.id) ? cur : [...cur, uploaded]);
      if (purpose === "cover") { setCoverFileId(uploaded.id); setCoverUrl(""); setCoverFileName(uploaded.originalName); }
      return uploaded;
    } catch { setError("Upload failed."); return null; }
    finally { setIsUploading(false); }
  }

  async function insertUploadedImage(file?: File) {
    if (!file || !editor) return;
    const uploaded = await uploadFile(file, "inlineImage");
    if (uploaded) editor.chain().focus().setImage({ src: fileInlineUrl(uploaded.id), alt: uploaded.originalName }).run();
  }

  async function saveBroadcast() {
    if (!editor) return;
    setError(""); setMessage("");
    if (!title.trim()) { setError("Title is required."); return; }
    const bodyForSave = coverUrl.trim() ? `${makeCoverMarker(coverUrl.trim())}${editor.getHTML()}` : editor.getHTML();
    const payload = { title: title.trim(), summary: summaryText.trim(), bodyHtml: bodyForSave, targetRoles, fileIds: uploadedFiles.map((f) => f.id), coverFileId };
    try {
      if (isEditMode && broadcastId) { await updateBroadcast(broadcastId, payload); setMessage("Changes saved."); }
      else { const res = await createBroadcast(payload); navigate(`/woreda/broadcasts/${res.id}/edit`, { replace: true }); }
    } catch { setError("Failed to save broadcast."); }
  }

  return (
    <div className="flex flex-col gap-6">
      {error && <div className="aw-panel !bg-[var(--aw-danger-bg)] !border-[var(--aw-danger)] px-4 py-3 text-sm font-black text-[var(--aw-danger)]">{error}</div>}
      {message && <div className="aw-panel !bg-[var(--aw-primary-soft)]/20 !border-[var(--aw-primary)] px-4 py-3 text-sm font-black text-[var(--aw-primary)]">{message}</div>}

      <header className="aw-panel !rounded-3xl shrink-0 overflow-hidden shadow-soft">
        <div className="h-1.5 bg-gradient-to-r from-[var(--aw-primary)] via-[var(--aw-yellow)] to-[var(--aw-magenta)]" />
        <div className="flex flex-col gap-4 p-6 sm:p-7 xl:flex-row xl:items-center xl:justify-between bg-[var(--aw-surface)]">
          <div className="min-w-0">
             <div className="flex items-center gap-3 mb-2">
                <Link to="/woreda/broadcasts" className="aw-btn aw-btn-outline !min-h-[34px] !px-3 !rounded-xl !text-xs"><ArrowLeft size={14}/>Archive</Link>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--aw-primary)]">Broadcast Studio</span>
             </div>
             <h1 className="text-2xl font-black tracking-tight">{isEditMode ? "Edit Official Article" : "Compose New Article"}</h1>
          </div>
          <div className="flex gap-3">
             <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className="aw-btn aw-btn-outline"><Settings2 size={18}/><span>{isSettingsOpen ? 'Hide' : 'Settings'}</span></button>
             <button onClick={saveBroadcast} disabled={isUploading} className="aw-btn aw-btn-primary min-w-[140px] shadow-lg"><Save size={18}/><span>{isUploading ? 'Uploading...' : 'Save Draft'}</span></button>
          </div>
        </div>
      </header>

      <div className={["grid gap-6 flex-1 items-start", isSettingsOpen ? "xl:grid-cols-[1fr_400px_320px]" : "xl:grid-cols-[1fr_1fr]"].join(" ")}>
        <section className="aw-panel shadow-soft flex flex-col h-full overflow-hidden">
          <header className="aw-panel-header !bg-transparent border-none pt-6 px-6">
             <h2 className="aw-panel-title">Write Article</h2>
          </header>
          <div className="p-6 space-y-4">
             <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Main article title..." className="aw-input !text-xl !font-black !min-h-[56px] w-full" />
             <textarea value={summaryText} onChange={e => setSummaryText(e.target.value)} placeholder="Short excerpt for social feed..." className="aw-input !min-h-[80px] !py-3 w-full font-medium" />
          </div>
          <div className="flex gap-1 p-2 bg-[var(--aw-surface-muted)] border-y border-[var(--aw-border-soft)] flex-wrap">
             <button onClick={() => editor?.chain().focus().toggleBold().run()} className="aw-btn aw-btn-outline !min-h-[32px] !px-3 !text-xs !bg-white">B</button>
             <button onClick={() => editor?.chain().focus().toggleItalic().run()} className="aw-btn aw-btn-outline !min-h-[32px] !px-3 !text-xs !bg-white italic">I</button>
             <button onClick={() => editor?.chain().focus().toggleHeading({level:2}).run()} className="aw-btn aw-btn-outline !min-h-[32px] !px-3 !text-xs !bg-white">H2</button>
             <button onClick={() => editor?.chain().focus().toggleBulletList().run()} className="aw-btn aw-btn-outline !min-h-[32px] !px-3 !text-xs !bg-white">List</button>
             <label className="aw-btn aw-btn-outline !min-h-[32px] !px-3 !text-xs !bg-white cursor-pointer"><ImagePlus size={14}/><input type="file" className="hidden" accept="image/*" onChange={e => void insertUploadedImage(e.target.files?.[0])}/></label>
          </div>
          <div className="flex-1 bg-white">
             <EditorContent editor={editor} />
          </div>
        </section>

        <section className="aw-panel shadow-soft flex flex-col h-full overflow-hidden">
          <header className="aw-panel-header !bg-transparent border-none pt-6 px-6">
             <h2 className="aw-panel-title">Article Preview</h2>
             <div className="flex bg-[var(--aw-bg)] p-1 rounded-xl border border-[var(--aw-border-soft)]">
                <button onClick={() => setPreviewMode('desktop')} className={["p-1.5 rounded-lg", previewMode === 'desktop' ? "bg-white shadow-sm text-[var(--aw-primary)]" : "text-[var(--aw-muted)]"].join(" ")}><Monitor size={16}/></button>
                <button onClick={() => setPreviewMode('mobile')} className={["p-1.5 rounded-lg", previewMode === 'mobile' ? "bg-white shadow-sm text-[var(--aw-primary)]" : "text-[var(--aw-muted)]"].join(" ")}><Smartphone size={16}/></button>
             </div>
          </header>
          <div className="flex-1 bg-[var(--aw-surface-muted)] p-6 overflow-y-auto aw-seamless-scroll flex justify-center">
             <div className={["aw-panel bg-white shadow-xl !rounded-2xl overflow-hidden h-fit transition-all", previewMode === 'mobile' ? "max-w-[340px]" : "max-w-[800px]"].join(" ")}>
                {heroImageUrl ? <img src={heroImageUrl} className="aspect-video w-full object-cover" /> : <div className="aspect-video w-full bg-[var(--aw-bg)] flex items-center justify-center text-[var(--aw-muted)]"><ImagePlus size={40} strokeWidth={1}/></div>}
                <div className="p-8">
                   <p className="text-[10px] font-black uppercase text-[var(--aw-primary)] tracking-widest mb-2">Government Communication</p>
                   <h1 className="text-2xl font-black mb-4 leading-tight">{title || 'Your Article Title'}</h1>
                   <p className="text-sm font-bold text-[var(--aw-muted)] mb-8 leading-relaxed italic">{summaryText || 'Add a summary to see it here.'}</p>
                   <div className="aw-article-preview prose prose-slate max-w-none text-base leading-loose" dangerouslySetInnerHTML={{__html: previewHtml}} />
                </div>
             </div>
          </div>
        </section>

        {isSettingsOpen && (
          <aside className="space-y-6">
            <div className="aw-panel p-6 space-y-6">
               <h3 className="font-black text-sm uppercase tracking-widest border-b border-[var(--aw-border-soft)] pb-3 text-[var(--aw-primary)]">Visibility</h3>
               <div className="space-y-2">
                 <label className="flex items-center gap-3 p-3 rounded-xl border border-[var(--aw-border-soft)] hover:bg-[var(--aw-bg)] cursor-pointer">
                   <input type="checkbox" checked={targetRoles.includes('HIBRET_ADMIN')} onChange={e => e.target.checked ? setTargetRoles([...targetRoles, 'HIBRET_ADMIN']) : setTargetRoles(targetRoles.filter(r => r !== 'HIBRET_ADMIN'))} />
                   <span className="text-xs font-bold">Hibret Admins</span>
                 </label>
                 <label className="flex items-center gap-3 p-3 rounded-xl border border-[var(--aw-border-soft)] hover:bg-[var(--aw-bg)] cursor-pointer">
                   <input type="checkbox" checked={targetRoles.includes('MEMBER')} onChange={e => e.target.checked ? setTargetRoles([...targetRoles, 'MEMBER']) : setTargetRoles(targetRoles.filter(r => r !== 'MEMBER'))} />
                   <span className="text-xs font-bold">Portal Members</span>
                 </label>
               </div>
            </div>

            <div className="aw-panel p-6 space-y-6">
               <h3 className="font-black text-sm uppercase tracking-widest border-b border-[var(--aw-border-soft)] pb-3 text-[var(--aw-primary)]">Featured Media</h3>
               <div className="space-y-4">
                  <label className="aw-btn aw-btn-outline !bg-[var(--aw-bg)] !border-dashed !border-2 w-full !h-32 flex-col gap-3">
                     <ImagePlus size={24}/>
                     <span className="text-xs font-bold text-center">{isUploading ? 'Uploading...' : coverFileName || 'Upload Cover Image'}</span>
                     <input type="file" className="hidden" accept="image/*" onChange={e => void uploadFile(e.target.files?.[0], 'cover')} />
                  </label>
                  <div className="aw-form-field">
                     <label className="aw-form-label">Or paste Image URL</label>
                     <input className="aw-input !min-h-[38px] !text-xs" value={coverUrl} onChange={e => setCoverUrl(e.target.value)} placeholder="https://..." />
                  </div>
               </div>
            </div>

            <div className="aw-panel p-6 space-y-6">
               <h3 className="font-black text-sm uppercase tracking-widest border-b border-[var(--aw-border-soft)] pb-3 text-[var(--aw-primary)]">Attachments</h3>
               <label className="aw-btn aw-btn-outline w-full gap-3">
                  <Plus size={16}/>
                  <span className="text-xs font-bold">Add document</span>
                  <input type="file" className="hidden" onChange={e => void uploadFile(e.target.files?.[0], 'attachment')} />
               </label>
               <div className="space-y-2 max-h-[200px] overflow-y-auto aw-seamless-scroll">
                  {uploadedFiles.map(f => (
                    <div key={f.id} className="p-3 rounded-lg border border-[var(--aw-border-soft)] bg-[var(--aw-bg)] flex items-center gap-3">
                       <FileText size={16} className="text-[var(--aw-muted)]"/>
                       <span className="text-xs font-bold truncate flex-1">{f.originalName}</span>
                    </div>
                  ))}
               </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
