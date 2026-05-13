import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { ImageIcon, X, Save } from "lucide-react";
import { apiClient } from "../../../services/apiClient";
import { getApiBaseUrl } from "../../../services/runtimeConfig";
import type {
  MemberFormOptions,
  MemberPayload,
  WoredaMember,
} from "../../../services/woredaMemberService";

type MemberFormDrawerProps = {
  title: string;
  isOpen: boolean;
  member?: WoredaMember | null;
  options: MemberFormOptions;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (payload: MemberPayload) => Promise<void>;
};

const emptyForm: MemberPayload = {
  memberCode: "", fanId: "", ppId: "", firstName: "", fatherName: "", grandfatherName: "",
  gender: "ወንድ", dateOfBirth: "", phone: "", email: "", hibretId: "", familyId: "",
  membershipStatus: "ዕጩ አባል", registrationType: "እንደ አዲስ የተመዘገበ",
  membershipYear: null, partyRole: "", educationLevel: "", fieldOfStudy: "",
  workplace: "", workType: "የመንግስት ሰራተኛ", workExperienceYears: null,
  zone: "", kebele: "", ethnicity: "", healthStatus: "ጤነኛ", photoFileId: "",
};

function toDateInput(v?: string | null) { return v ? v.slice(0, 10) : ""; }
function nullIfEmpty(v: unknown) { const t = String(v ?? "").trim(); return t === "" ? null : t; }
function intOrNull(v: unknown) { const p = Number(v); return (v === "" || !Number.isFinite(p)) ? null : p; }

function fileUrl(id?: string | null) {
  if (!id) return "";
  const api = getApiBaseUrl(); const tok = localStorage.getItem("astedader_woreda_token");
  const q = tok ? `?token=${encodeURIComponent(tok)}&inline=true` : "?inline=true";
  return `${api}/files/${id}/download${q}`;
}

export function MemberFormDrawer({ title, isOpen, member, options, isSaving, onClose, onSubmit }: MemberFormDrawerProps) {
  const [form, setForm] = useState<MemberPayload>(emptyForm);
  const [error, setError] = useState("");
  const [uping, setUping] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (member) setForm({ ...member, dateOfBirth: toDateInput(member.dateOfBirth), hibretId: member.hibretId || "", familyId: member.familyId || "" });
    else setForm({ ...emptyForm, hibretId: options.hibrets[0]?.id || "" });
    setError("");
  }, [isOpen, member, options.hibrets]);

  const families = useMemo(() => options.families.filter(f => f.hibretId === form.hibretId), [form.hibretId, options.families]);

  if (!isOpen) return null;

  async function handlePhoto(file?: File | null) {
    if (!file) return; setUping(true); setError("");
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await apiClient.post<{ file: { id: string } }>("/files/upload/member", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setForm({ ...form, photoFileId: res.data.file.id });
    } catch { setError("Photo upload failed."); } finally { setUping(false); }
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-end">
      <div className="absolute inset-0 bg-[var(--aw-overlay-scrim-strong)] backdrop-blur-sm" onClick={onClose} />
      <form onSubmit={(e: FormEvent) => { e.preventDefault(); onSubmit({ ...form, firstName: String(form.firstName).trim(), fatherName: String(form.fatherName).trim(), grandfatherName: nullIfEmpty(form.grandfatherName), membershipYear: intOrNull(form.membershipYear), workExperienceYears: intOrNull(form.workExperienceYears) }); }} className="relative aw-panel h-full w-full max-w-4xl shadow-2xl !rounded-none border-none flex flex-col">
        <header className="aw-panel-header !py-7 !px-8 !bg-[var(--aw-surface)]">
          <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--aw-primary)] mb-1">Population Registry</p><h2 className="text-2xl font-black">{title}</h2></div>
          <button type="button" onClick={onClose} className="aw-btn aw-btn-outline !min-h-[36px] !px-2"><X size={20}/></button>
        </header>

        <div className="flex-1 overflow-y-auto aw-seamless-scroll p-8 space-y-10">
           {error && <div className="aw-panel !bg-[var(--aw-danger-bg)] !border-[var(--aw-danger)] p-4 text-xs font-black text-[var(--aw-danger)]">{error}</div>}

           <section>
              <h3 className="font-black text-sm uppercase tracking-widest border-b border-[var(--aw-border-soft)] pb-3 text-[var(--aw-primary)] mb-6">Profile Photo</h3>
              <div className="flex items-center gap-6">
                 <div className="h-24 w-24 rounded-2xl bg-[var(--aw-bg)] border border-[var(--aw-border-soft)] flex items-center justify-center overflow-hidden shadow-inner flex-shrink-0">
                    {form.photoFileId ? <img src={fileUrl(form.photoFileId)} className="h-full w-full object-cover" /> : <ImageIcon size={32} className="text-[var(--aw-muted)]" />}
                 </div>
                 <div className="space-y-3">
                    <label className="aw-btn aw-btn-outline !bg-white cursor-pointer"><UploadCloud size={16}/><span>{uping ? 'Uploading...' : 'Choose Image'}</span><input type="file" className="hidden" accept="image/*" onChange={e => handlePhoto(e.target.files?.[0])} /></label>
                    <p className="text-[10px] font-bold text-[var(--aw-muted)] uppercase tracking-wider">Accepted formats: JPG, PNG, WebP. Max 2MB.</p>
                 </div>
              </div>
           </section>

           <section>
              <h3 className="font-black text-sm uppercase tracking-widest border-b border-[var(--aw-border-soft)] pb-3 text-[var(--aw-primary)] mb-6">Identity & Personal</h3>
              <div className="aw-form-grid">
                 <div className="aw-form-field"><label className="aw-form-label">First Name</label><input required className="aw-input" value={form.firstName || ''} onChange={e => setForm({...form, firstName: e.target.value})} /></div>
                 <div className="aw-form-field"><label className="aw-form-label">Father Name</label><input required className="aw-input" value={form.fatherName || ''} onChange={e => setForm({...form, fatherName: e.target.value})} /></div>
                 <div className="aw-form-field"><label className="aw-form-label">Grandfather</label><input className="aw-input" value={form.grandfatherName || ''} onChange={e => setForm({...form, grandfatherName: e.target.value})} /></div>
                 <div className="aw-form-field"><label className="aw-form-label">Gender</label><select className="aw-filter-select" value={form.gender || 'ወንድ'} onChange={e => setForm({...form, gender: e.target.value})}><option value="ወንድ">Male (ወንድ)</option><option value="ሴት">Female (ሴት)</option></select></div>
                 <div className="aw-form-field"><label className="aw-form-label">Birth Date</label><input type="date" className="aw-input" value={form.dateOfBirth || ''} onChange={e => setForm({...form, dateOfBirth: e.target.value})} /></div>
                 <div className="aw-form-field"><label className="aw-form-label">Ethnicity</label><input className="aw-input" value={form.ethnicity || ''} onChange={e => setForm({...form, ethnicity: e.target.value})} /></div>
              </div>
           </section>

           <section>
              <h3 className="font-black text-sm uppercase tracking-widest border-b border-[var(--aw-border-soft)] pb-3 text-[var(--aw-primary)] mb-6">Unit & Assignment</h3>
              <div className="aw-form-grid">
                 <div className="aw-form-field"><label className="aw-form-label">System Code</label><input className="aw-input" placeholder="Member Code" value={form.memberCode || ''} onChange={e => setForm({...form, memberCode: e.target.value})} /></div>
                 <div className="aw-form-field"><label className="aw-form-label">PP ID</label><input className="aw-input" placeholder="Party ID" value={form.ppId || ''} onChange={e => setForm({...form, ppId: e.target.value})} /></div>
                 <div className="aw-form-field"><label className="aw-form-label">FAN ID</label><input className="aw-input" placeholder="Fayda ID" value={form.fanId || ''} onChange={e => setForm({...form, fanId: e.target.value})} /></div>
                 <div className="aw-form-field"><label className="aw-form-label">Assigned Hibret</label><select required className="aw-filter-select" value={form.hibretId || ''} onChange={e => setForm({...form, hibretId: e.target.value, familyId: ""})}><option value="">Select Unit...</option>{options.hibrets.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}</select></div>
                 <div className="aw-form-field"><label className="aw-form-label">Assigned Family</label><select className="aw-filter-select" value={form.familyId || ''} onChange={e => setForm({...form, familyId: e.target.value})}><option value="">Unassigned</option>{families.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select></div>
              </div>
           </section>

           <section>
              <h3 className="font-black text-sm uppercase tracking-widest border-b border-[var(--aw-border-soft)] pb-3 text-[var(--aw-primary)] mb-6">Employment & Contact</h3>
              <div className="aw-form-grid">
                 <div className="aw-form-field"><label className="aw-form-label">Phone Number</label><input className="aw-input" value={form.phone || ''} onChange={e => setForm({...form, phone: e.target.value})} /></div>
                 <div className="aw-form-field"><label className="aw-form-label">Email Address</label><input type="email" className="aw-input" value={form.email || ''} onChange={e => setForm({...form, email: e.target.value})} /></div>
                 <div className="aw-form-field"><label className="aw-form-label">Workplace</label><input className="aw-input" value={form.workplace || ''} onChange={e => setForm({...form, workplace: e.target.value})} /></div>
                 <div className="aw-form-field"><label className="aw-form-label">Experience (Years)</label><input type="number" className="aw-input" value={form.workExperienceYears || ''} onChange={e => setForm({...form, workExperienceYears: e.target.value as any})} /></div>
              </div>
           </section>
        </div>

        <div className="p-6 bg-[var(--aw-surface-muted)] flex justify-end gap-3 border-t border-[var(--aw-border-soft)]">
          <button type="button" onClick={onClose} className="aw-btn aw-btn-outline !bg-white">Cancel</button>
          <button type="submit" disabled={isSaving || uping} className="aw-btn aw-btn-primary min-w-[140px] shadow-lg"><Save size={18}/>{isSaving ? 'Saving...' : 'Commit Record'}</button>
        </div>
      </form>
    </div>
  );
}

function UploadCloud(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M12 12v9"/><path d="m16 16-4-4-4 4"/></svg>;
}

export default MemberFormDrawer;
