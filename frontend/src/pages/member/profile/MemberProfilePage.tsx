import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  Edit3,
  GraduationCap,
  IdCard,
  MapPin,
  ShieldCheck,
  X,
} from "lucide-react";
import { useAuthStore } from "../../../store/authStore";
import {
  getMyMemberProfile,
  updateMyMemberProfile,
} from "../../../services/woredaMemberService";
import type {
  MyMemberProfileUpdatePayload,
  WoredaMember,
} from "../../../services/woredaMemberService";

function inputValue(v: unknown) {
  if (v === null || v === undefined || v === "-") return "";
  if (typeof v === "string" && v.includes("T")) return v.slice(0, 10);
  return String(v);
}
function formatDate(v?: string | null) { return v ? new Date(v).toLocaleDateString() : "-"; }
function isMissing(v: unknown) { return v === null || v === undefined || v === "" || v === "-"; }

export function MemberProfilePage() {
  const { user } = useAuthStore();
  const [member, setMember] = useState<WoredaMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState<MyMemberProfileUpdatePayload>({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadProfile() {
    setIsLoading(true); setError("");
    try {
      const data = await getMyMemberProfile(); setMember(data);
      setEditForm({
        firstName: inputValue(data.firstName), fatherName: inputValue(data.fatherName), grandfatherName: inputValue(data.grandfatherName),
        gender: inputValue(data.gender), phone: inputValue(data.phone), email: inputValue(data.email),
        dateOfBirth: inputValue(data.dateOfBirth), registrationType: inputValue(data.registrationType),
        membershipYear: inputValue(data.membershipYear), partyRole: inputValue(data.partyRole),
        educationLevel: inputValue(data.educationLevel), fieldOfStudy: inputValue(data.fieldOfStudy),
        workplace: inputValue(data.workplace), workType: inputValue(data.workType),
        workExperienceYears: inputValue(data.workExperienceYears), zone: inputValue(data.zone),
        kebele: inputValue(data.kebele), ethnicity: inputValue(data.ethnicity), healthStatus: inputValue(data.healthStatus),
      });
    } catch { setError("Unable to load profile."); } finally { setIsLoading(false); }
  }

  useEffect(() => { void loadProfile(); }, []);

  const fullName = useMemo(() => [member?.firstName, member?.fatherName, member?.grandfatherName].filter(Boolean).join(" ") || "Member Profile", [member]);
  const missingFields = useMemo(() => {
    if (!member) return [];
    return [
      ["Birthday", member.dateOfBirth], ["Phone", member.phone], ["Education", member.educationLevel],
      ["Workplace", member.workplace], ["Zone", member.zone], ["Kebele", member.kebele], ["Health", member.healthStatus]
    ].filter(([, v]) => isMissing(v)).map(([l]) => String(l));
  }, [member]);

  async function handleSaveProfile(e: FormEvent) {
    e.preventDefault(); setIsSaving(true); setMessage(""); setError("");
    try { const up = await updateMyMemberProfile(editForm); setMember(up); setIsEditOpen(false); setMessage("Profile updated."); }
    catch { setError("Update failed."); } finally { setIsSaving(false); }
  }

  if (isLoading) return <div className="aw-panel p-10 text-center font-bold text-[var(--aw-muted)]">Fetching your profile...</div>;

  return (
    <div className="flex flex-col gap-6">
      {error && <div className="aw-panel !bg-[var(--aw-danger-bg)] !border-[var(--aw-danger)] px-4 py-3 text-sm font-black text-[var(--aw-danger)]">{error}</div>}
      {message && <div className="aw-panel !bg-[var(--aw-primary-soft)]/20 !border-[var(--aw-primary)] px-4 py-3 text-sm font-black text-[var(--aw-primary)]">{message}</div>}

      <header className="aw-panel !rounded-3xl shrink-0 overflow-hidden shadow-soft">
        <div className="border-b border-[var(--aw-border-soft)] bg-[var(--aw-surface)] p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-6">
               <div className="h-20 w-20 rounded-2xl bg-[var(--aw-primary)] flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-[var(--aw-primary)]/20">
                  {member?.firstName?.[0]}{member?.fatherName?.[0]}
               </div>
               <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--aw-primary)] mb-1">Official Member Profile</p>
                  <h1 className="text-3xl font-black tracking-tight">{fullName}</h1>
                  <div className="flex items-center gap-3 mt-2 text-sm font-bold text-[var(--aw-muted)]">
                     <span className="flex items-center gap-1.5"><ShieldCheck size={16} className="text-[var(--aw-primary)]"/>{member?.hibretName || 'Unassigned Unit'}</span>
                     <span className="text-[var(--aw-border)]">•</span>
                     <span>{member?.familyName || 'No Family Unit'}</span>
                  </div>
               </div>
            </div>
            <button onClick={() => setIsEditOpen(true)} className="aw-btn aw-btn-primary !min-h-[46px] !px-6 shadow-lg"><Edit3 size={18}/>Edit Profile</button>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 bg-[var(--aw-surface-muted)]">
           <div className="p-4 text-center border-r border-[var(--aw-border-soft)]"><p className="text-[10px] font-black uppercase text-[var(--aw-muted)] mb-1">Profile Health</p><p className="text-xl font-black text-[var(--aw-primary)]">{member?.profileCompletion}%</p></div>
           <div className="p-4 text-center border-r border-[var(--aw-border-soft)]"><p className="text-[10px] font-black uppercase text-[var(--aw-muted)] mb-1">Member Code</p><p className="text-xl font-black">{member?.memberCode || '—'}</p></div>
           <div className="p-4 text-center border-r border-[var(--aw-border-soft)]"><p className="text-[10px] font-black uppercase text-[var(--aw-muted)] mb-1">PP ID</p><p className="text-xl font-black">{member?.ppId || '—'}</p></div>
           <div className="p-4 text-center"><p className="text-[10px] font-black uppercase text-[var(--aw-muted)] mb-1">Joined</p><p className="text-xl font-black">{member?.membershipYear || '—'}</p></div>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 items-start">
         <div className="space-y-6">
            <section className="aw-panel p-6 shadow-soft">
               <h2 className="text-lg font-black flex items-center gap-2 mb-6"><IdCard size={20} className="text-[var(--aw-primary)]"/>Personal Identity</h2>
               <div className="aw-form-grid !grid-cols-1 md:!grid-cols-2 lg:!grid-cols-3">
                  <DetailLine label="Full Name" value={fullName} />
                  <DetailLine label="Gender" value={member?.gender} />
                  <DetailLine label="Date of Birth" value={formatDate(member?.dateOfBirth)} />
                  <DetailLine label="FAN Identifier" value={member?.fanId} />
                  <DetailLine label="Ethnicity" value={member?.ethnicity} />
                  <DetailLine label="Health Status" value={member?.healthStatus} />
               </div>
            </section>

            <section className="aw-panel p-6 shadow-soft">
               <h2 className="text-lg font-black flex items-center gap-2 mb-6"><GraduationCap size={20} className="text-[var(--aw-primary)]"/>Professional & Educational</h2>
               <div className="aw-form-grid !grid-cols-1 md:!grid-cols-2 lg:!grid-cols-3">
                  <DetailLine label="Education Level" value={member?.educationLevel} />
                  <DetailLine label="Field of Study" value={member?.fieldOfStudy} />
                  <DetailLine label="Current Workplace" value={member?.workplace} />
                  <DetailLine label="Employment Type" value={member?.workType} />
                  <DetailLine label="Experience" value={member?.workExperienceYears ? `${member.workExperienceYears} Years` : null} />
               </div>
            </section>

            <section className="aw-panel p-6 shadow-soft">
               <h2 className="text-lg font-black flex items-center gap-2 mb-6"><MapPin size={20} className="text-[var(--aw-primary)]"/>Residential Location</h2>
               <div className="aw-form-grid !grid-cols-1 md:!grid-cols-2 lg:!grid-cols-3">
                  <DetailLine label="Region / Zone" value={member?.zone} />
                  <DetailLine label="Kebele" value={member?.kebele} />
               </div>
            </section>
         </div>

         <aside className="space-y-6">
            <section className="aw-panel p-6 shadow-soft">
               <h3 className="font-black text-sm uppercase tracking-widest border-b border-[var(--aw-border-soft)] pb-3 text-[var(--aw-primary)] mb-6">Contact Info</h3>
               <div className="space-y-4">
                  <DetailLine label="Phone Number" value={member?.phone} />
                  <DetailLine label="Email Address" value={member?.email || user?.email} />
               </div>
            </section>

            <section className="aw-panel p-6 shadow-soft">
               <h3 className="font-black text-sm uppercase tracking-widest border-b border-[var(--aw-border-soft)] pb-3 text-[var(--aw-primary)] mb-6">Completeness</h3>
               <div className="mb-6">
                  <div className="flex justify-between items-end mb-2">
                     <span className="text-2xl font-black">{member?.profileCompletion}%</span>
                  </div>
                  <div className="h-2 bg-[var(--aw-bg)] rounded-full overflow-hidden border border-[var(--aw-border-soft)]">
                     <div className="h-full bg-[var(--aw-primary)] rounded-full" style={{ width: `${member?.profileCompletion}%` }} />
                  </div>
               </div>
               {missingFields.length > 0 && (
                 <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase text-[var(--aw-muted)]">Missing Fields</p>
                    <div className="flex flex-wrap gap-2">
                       {missingFields.map(f => <span key={f} className="text-[10px] font-bold bg-[var(--aw-bg)] px-2 py-1 rounded border border-[var(--aw-border-soft)]">{f}</span>)}
                    </div>
                 </div>
               )}
            </section>

            <section className="aw-panel p-6 shadow-soft">
               <h3 className="font-black text-sm uppercase tracking-widest border-b border-[var(--aw-border-soft)] pb-3 text-[var(--aw-primary)] mb-4">Recent Activity</h3>
               {member?.attendance?.length ? (
                 <div className="space-y-3">
                    {member.attendance.slice(0, 4).map(at => (
                      <div key={at.id} className="p-3 bg-[var(--aw-bg)] rounded-xl border border-[var(--aw-border-soft)]">
                         <p className="text-xs font-black line-clamp-1">{at.announcementTitle}</p>
                         <div className="flex justify-between items-center mt-2">
                            <span className="text-[10px] font-bold text-[var(--aw-muted)] uppercase tracking-wider">{formatDate(at.recordedAt)}</span>
                            <span className="text-[10px] font-black uppercase text-[var(--aw-primary)]">{at.status}</span>
                         </div>
                      </div>
                    ))}
                 </div>
               ) : <p className="text-xs font-bold text-[var(--aw-muted)] text-center py-4">No activity history.</p>}
            </section>
         </aside>
      </div>

      {isEditOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[var(--aw-overlay-scrim-strong)] backdrop-blur-sm" onClick={() => setIsEditOpen(false)} />
          <form onSubmit={handleSaveProfile} className="relative aw-panel w-full max-w-4xl shadow-2xl !rounded-3xl border-none flex flex-col max-h-[90dvh]">
            <header className="aw-panel-header !rounded-t-3xl !py-6">
              <h2 className="text-xl font-black">Update Profile</h2>
              <button type="button" onClick={() => setIsEditOpen(false)} className="aw-btn aw-btn-outline !min-h-[36px] !px-2 !rounded-xl"><X size={18}/></button>
            </header>
            <div className="p-8 space-y-8 overflow-y-auto aw-seamless-scroll flex-1">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
                  <div className="space-y-6">
                     <p className="text-xs font-black uppercase tracking-widest text-[var(--aw-primary)] border-b border-[var(--aw-border-soft)] pb-2">Identity</p>
                     <div className="aw-form-field"><label className="aw-form-label">First Name</label><input className="aw-input" value={editForm.firstName || ""} onChange={e => setEditForm({...editForm, firstName: e.target.value})} /></div>
                     <div className="aw-form-field"><label className="aw-form-label">Father Name</label><input className="aw-input" value={editForm.fatherName || ""} onChange={e => setEditForm({...editForm, fatherName: e.target.value})} /></div>
                     <div className="aw-form-field"><label className="aw-form-label">Grandfather</label><input className="aw-input" value={editForm.grandfatherName || ""} onChange={e => setEditForm({...editForm, grandfatherName: e.target.value})} /></div>
                     <div className="aw-form-field"><label className="aw-form-label">Gender</label><select className="aw-filter-select" value={editForm.gender || ""} onChange={e => setEditForm({...editForm, gender: e.target.value})}><option value="male">Male</option><option value="female">Female</option></select></div>
                  </div>
                  <div className="space-y-6">
                     <p className="text-xs font-black uppercase tracking-widest text-[var(--aw-primary)] border-b border-[var(--aw-border-soft)] pb-2">Contact & Bio</p>
                     <div className="aw-form-field"><label className="aw-form-label">Phone</label><input className="aw-input" value={editForm.phone || ""} onChange={e => setEditForm({...editForm, phone: e.target.value})} /></div>
                     <div className="aw-form-field"><label className="aw-form-label">Email</label><input className="aw-input" value={editForm.email || ""} onChange={e => setEditForm({...editForm, email: e.target.value})} /></div>
                     <div className="aw-form-field"><label className="aw-form-label">Birth Date</label><input type="date" className="aw-input" value={editForm.dateOfBirth || ""} onChange={e => setEditForm({...editForm, dateOfBirth: e.target.value})} /></div>
                  </div>
               </div>
            </div>
            <div className="p-6 bg-[var(--aw-surface-muted)] flex justify-end gap-3 rounded-b-3xl">
              <button type="button" onClick={() => setIsEditOpen(false)} className="aw-btn aw-btn-outline !bg-white">Cancel</button>
              <button type="submit" disabled={isSaving} className="aw-btn aw-btn-primary min-w-[140px]">{isSaving ? "Saving..." : "Save Changes"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function DetailLine({ label, value }: { label: string; value: unknown }) {
  const missing = isMissing(value);
  return (
    <div className="py-2">
      <p className="text-[10px] font-black uppercase tracking-wider text-[var(--aw-muted)] mb-1">{label}</p>
      <p className={["text-sm font-bold", missing ? "text-[var(--aw-muted)] italic font-normal" : "text-[var(--aw-text)]"].join(" ")}>{missing ? "Not recorded" : String(value)}</p>
    </div>
  );
}
