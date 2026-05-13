import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Download,
  Eye,
  FileText,
  Save,
  Send,
  UploadCloud,
  CheckCircle2,
  Clock
} from "lucide-react";
import {
  attachHibretReportFiles,
  getHibretAnnouncement,
  getHibretAttendance,
  saveHibretAttendance,
  saveHibretReport,
  submitHibretReport,
  uploadReportFile
} from "../../../services/hibretService";
import type {
  AttendanceStatus,
  HibretAttendance
} from "../../../services/hibretService";
import type { Announcement, AnnouncementType } from "../../../types/announcement";
import {
  getFileDownloadUrl,
  getFileViewUrl
} from "../../../services/announcementService";

type ActiveTab = "report" | "attendance" | "directive";
type FileInfo = { id: string; originalName: string; mimeType: string; sizeBytes?: number; };
type FileAttachment = { id: string; file: FileInfo; };
type LocalReport = { id: string; title?: string; summary?: string | null; body?: string; status?: string; submittedAt?: string | null; reviewDecision?: string | null; reviewComment?: string | null; attachments?: FileAttachment[]; };
type AttendanceDraftRow = { memberId: string; status: AttendanceStatus | null; note: string; };

const typeLabels: Record<AnnouncementType, string> = { meeting: "Meeting", conference: "Conference", trend_report: "Trend Report", other: "Other" };

function formatDate(v?: string | null) { return v ? new Date(v).toLocaleString() : "-"; }

function statusClass(s: string) {
  const c = s.toLowerCase();
  if (["approved", "submitted", "active", "present"].includes(c)) return "rounded-full border border-[var(--aw-success)]/20 bg-[var(--aw-success-bg)] px-2.5 py-0.5 text-[10px] font-black uppercase text-[var(--aw-success)]";
  if (["rejected", "absent", "closed"].includes(c)) return "rounded-full border border-[var(--aw-danger)]/20 bg-[var(--aw-danger-bg)] px-2.5 py-0.5 text-[10px] font-black uppercase text-[var(--aw-danger)]";
  if (["changes_requested", "excused"].includes(c)) return "rounded-full border border-[var(--aw-warning)] bg-[var(--aw-warning-bg)] px-2.5 py-0.5 text-[10px] font-black uppercase text-[var(--aw-warning)]";
  return "rounded-full border border-[var(--aw-border)] bg-[var(--aw-surface-muted)] px-2.5 py-0.5 text-[10px] font-black uppercase text-[var(--aw-muted)]";
}

export function HibretAnnouncementDetailPage() {
  const { announcementId } = useParams();
  const [activeTab, setActiveTab] = useState<ActiveTab>("report");
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [attendance, setAttendance] = useState<HibretAttendance | null>(null);
  const [attendanceRows, setAttendanceRows] = useState<Record<string, AttendanceDraftRow>>({});
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const report = useMemo(() => announcement?.reports?.[0] as LocalReport | undefined, [announcement]);
  const canEdit = (!report && announcement?.status === "published") || report?.status === "draft" || report?.status === "changes_requested";
  const reportAttachments = report?.attachments ?? [];

  async function loadData() {
    if (!announcementId) return;
    setIsLoading(true); setError("");
    try {
      const data = await getHibretAnnouncement(announcementId);
      setAnnouncement(data);
      const curReport = data.reports?.[0] as LocalReport | undefined;
      setTitle(curReport?.title || data.title || "");
      setSummary(curReport?.summary || "");
      setBody(curReport?.body || "");
      if (data.attendanceRequired) {
        const att = await getHibretAttendance(announcementId);
        setAttendance(att);
        const rows: Record<string, AttendanceDraftRow> = {};
        att.members.forEach(m => rows[m.memberId] = { memberId: m.memberId, status: m.status, note: m.note || "" });
        setAttendanceRows(rows);
      }
    } catch { setError("Unable to load directive details."); }
    finally { setIsLoading(false); }
  }

  useEffect(() => { void loadData(); }, [announcementId]);

  async function handleSaveReport(e: FormEvent) {
    e.preventDefault(); if (!announcementId) return;
    setIsSaving(true); setError(""); setMessage("");
    try {
      const saved = await saveHibretReport(announcementId, { title, summary: summary || null, body });
      if (selectedFiles.length) {
        const up = await Promise.all(selectedFiles.map(f => uploadReportFile(f)));
        await attachHibretReportFiles(saved.id, up.map(f => f.id));
        setSelectedFiles([]);
      }
      setMessage("Report draft saved."); await loadData();
    } catch { setError("Failed to save report."); } finally { setIsSaving(false); }
  }

  async function handleSubmitReport() {
    if (!report || !announcementId) return;
    setIsSubmitting(true); setError("");
    try {
      if (announcement?.attendanceRequired && attendance) {
        const recs = Object.values(attendanceRows).filter(r => !!r.status);
        if (recs.length < attendance.members.length) {
           setError("Please mark attendance for all members before submitting.");
           setActiveTab("attendance"); setIsSubmitting(false); return;
        }
        await saveHibretAttendance(announcementId, recs.map(r => ({ memberId: r.memberId, status: r.status!, note: r.note || null })));
      }
      await submitHibretReport(report.id); setMessage("Report submitted successfully."); await loadData();
    } catch { setError("Submission failed."); } finally { setIsSubmitting(false); }
  }

  async function handleSaveAttendance() {
    if (!announcementId || !attendance) return;
    setIsSavingAttendance(true);
    try {
      const recs = Object.values(attendanceRows).filter((r): r is AttendanceDraftRow & { status: AttendanceStatus } => !!r.status);
      await saveHibretAttendance(announcementId, recs.map(r => ({ memberId: r.memberId, status: r.status, note: r.note || null })));
      setMessage("Attendance records updated."); await loadData();
    } catch { setError("Failed to save attendance."); } finally { setIsSavingAttendance(false); }
  }

  if (isLoading) return <div className="aw-panel p-10 text-center font-bold text-[var(--aw-muted)]">Fetching directive...</div>;
  if (!announcement) return <div className="aw-panel p-10 text-center font-bold text-[var(--aw-danger)]">Directive not found.</div>;

  return (
    <div className="flex flex-col gap-6">
      {error && <div className="aw-panel !bg-[var(--aw-danger-bg)] !border-[var(--aw-danger)] px-4 py-3 text-sm font-black text-[var(--aw-danger)]">{error}</div>}
      {message && <div className="aw-panel !bg-[var(--aw-primary-soft)]/20 !border-[var(--aw-primary)] px-4 py-3 text-sm font-black text-[var(--aw-primary)]">{message}</div>}

      <header className="aw-panel !rounded-3xl shrink-0 overflow-hidden shadow-soft">
        <div className="border-b border-[var(--aw-border-soft)] bg-[var(--aw-surface)] p-5 sm:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3 mb-4">
                <Link to="/hibret/announcements" className="aw-btn aw-btn-outline !min-h-[34px] !px-3 !rounded-xl !text-xs"><ArrowLeft size={14}/>Back</Link>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--aw-primary)]">Directive workspace</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--aw-text)]">{announcement.title}</h1>
              <div className="flex flex-wrap items-center gap-4 mt-4">
                 <span className="text-[10px] font-black uppercase tracking-wider text-[var(--aw-muted)] bg-[var(--aw-bg)] px-2 py-1 rounded-lg border border-[var(--aw-border-soft)]">{typeLabels[announcement.type]}</span>
                 <span className="text-[10px] font-black uppercase tracking-wider text-[var(--aw-danger)] bg-[var(--aw-danger-bg)] px-2 py-1 rounded-lg border border-[var(--aw-danger)]/20">Deadline: {formatDate(announcement.deadline)}</span>
                 {announcement.attendanceRequired && <span className="text-[10px] font-black uppercase tracking-wider text-[var(--aw-primary)] bg-[var(--aw-primary-soft)]/30 px-2 py-1 rounded-lg border border-[var(--aw-primary)]/20">Mandatory Attendance</span>}
              </div>
            </div>
            <div className="flex flex-col gap-3">
               <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase text-[var(--aw-muted)]">Report Status</p>
                    <p className="text-sm font-black">{report?.status || 'Not Started'}</p>
                  </div>
                  <span className={statusClass(report?.status || 'pending')}> {report?.status || 'pending'} </span>
               </div>
            </div>
          </div>
        </div>
        <nav className="flex bg-[var(--aw-surface-muted)]">
          <button onClick={() => setActiveTab('report')} className={["flex-1 min-h-[52px] text-xs font-black uppercase tracking-widest border-r border-[var(--aw-border-soft)] transition-colors", activeTab === 'report' ? "bg-[var(--aw-primary)] text-white" : "text-[var(--aw-muted)] hover:bg-[var(--aw-bg)]"].join(" ")}>Submission</button>
          {announcement.attendanceRequired && <button onClick={() => setActiveTab('attendance')} className={["flex-1 min-h-[52px] text-xs font-black uppercase tracking-widest border-r border-[var(--aw-border-soft)] transition-colors", activeTab === 'attendance' ? "bg-[var(--aw-primary)] text-white" : "text-[var(--aw-muted)] hover:bg-[var(--aw-bg)]"].join(" ")}>Attendance</button>}
          <button onClick={() => setActiveTab('directive')} className={["flex-1 min-h-[52px] text-xs font-black uppercase tracking-widest transition-colors", activeTab === 'directive' ? "bg-[var(--aw-primary)] text-white" : "text-[var(--aw-muted)] hover:bg-[var(--aw-bg)]"].join(" ")}>Instructions</button>
        </nav>
      </header>

      <main className="min-h-0 flex-1">
        {activeTab === 'report' && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
             <section className="aw-panel shadow-soft">
                <header className="aw-panel-header !bg-transparent !border-none pt-6 px-6">
                   <h2 className="aw-panel-title">Write Report</h2>
                </header>
                <form onSubmit={handleSaveReport} className="p-6 space-y-6">
                   <div className="aw-form-field"><label className="aw-form-label">Report Title</label><input disabled={!canEdit} className="aw-input" value={title} onChange={e => setTitle(e.target.value)} /></div>
                   <div className="aw-form-field"><label className="aw-form-label">Executive Summary</label><textarea disabled={!canEdit} className="aw-input !min-h-[100px] !py-3" value={summary} onChange={e => setSummary(e.target.value)} /></div>
                   <div className="aw-form-field"><label className="aw-form-label">Detailed Content</label><textarea disabled={!canEdit} className="aw-input !min-h-[300px] !py-3" value={body} onChange={e => setBody(e.target.value)} /></div>

                   {canEdit && (
                     <div className="aw-panel !bg-[var(--aw-bg)] p-8 border-dashed border-2 flex flex-col items-center gap-4">
                        <UploadCloud size={40} className="text-[var(--aw-primary)]" />
                        <div className="text-center">
                           <p className="font-black text-sm">Drop media files or click to browse</p>
                           <p className="text-xs font-bold text-[var(--aw-muted)] mt-1">Photos and documents supporting your report</p>
                        </div>
                        <input type="file" multiple className="hidden" id="report-files" onChange={e => setSelectedFiles(Array.from(e.target.files || []))} />
                        <button type="button" onClick={() => document.getElementById('report-files')?.click()} className="aw-btn aw-btn-outline !bg-white">Choose Files</button>
                        {selectedFiles.length > 0 && <p className="text-xs font-black text-[var(--aw-primary)]">{selectedFiles.length} files staged for upload</p>}
                     </div>
                   )}

                   {canEdit && (
                     <div className="flex justify-end gap-3 pt-6 border-t border-[var(--aw-border-soft)]">
                        <button type="submit" disabled={isSaving} className="aw-btn aw-btn-outline !min-h-[44px] !px-6"><Save size={18}/>{isSaving ? 'Saving...' : 'Save Draft'}</button>
                        <button type="button" onClick={handleSubmitReport} disabled={isSubmitting} className="aw-btn aw-btn-primary !min-h-[44px] !px-8 shadow-lg shadow-[var(--aw-success)]/10"><Send size={18}/>{isSubmitting ? 'Submitting...' : 'Submit to Woreda'}</button>
                     </div>
                   )}
                </form>
             </section>

             <aside className="space-y-6">
                <section className="aw-panel p-6 shadow-soft">
                   <h3 className="font-black text-sm uppercase tracking-widest border-b border-[var(--aw-border-soft)] pb-3 text-[var(--aw-primary)] mb-6">Status Tracker</h3>
                   <div className="space-y-6">
                      <div className="flex gap-4"><div className="h-8 w-8 rounded-full bg-[var(--aw-success-bg)] flex items-center justify-center text-[var(--aw-success)] flex-shrink-0"><CheckCircle2 size={18}/></div><div><p className="text-xs font-black uppercase text-[var(--aw-muted)]">Published</p><p className="text-sm font-bold">Directive Received</p></div></div>
                      <div className="flex gap-4"><div className={["h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0", report?.submittedAt ? "bg-[var(--aw-success-bg)] text-[var(--aw-success)]" : "bg-[var(--aw-bg)] text-[var(--aw-muted)]"].join(" ")}>{report?.submittedAt ? <CheckCircle2 size={18}/> : <Clock size={18}/>}</div><div><p className="text-xs font-black uppercase text-[var(--aw-muted)]">Submission</p><p className="text-sm font-bold">{report?.submittedAt ? 'Sent to Woreda' : 'Awaiting Report'}</p></div></div>
                      <div className="flex gap-4"><div className={["h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0", report?.reviewDecision ? "bg-[var(--aw-success-bg)] text-[var(--aw-success)]" : "bg-[var(--aw-bg)] text-[var(--aw-muted)]"].join(" ")}>{report?.reviewDecision ? <CheckCircle2 size={18}/> : <Clock size={18}/>}</div><div><p className="text-xs font-black uppercase text-[var(--aw-muted)]">Review</p><p className="text-sm font-bold">{report?.reviewDecision || 'Pending Decision'}</p></div></div>
                   </div>
                </section>

                <section className="aw-panel p-6 shadow-soft">
                   <h3 className="font-black text-sm uppercase tracking-widest border-b border-[var(--aw-border-soft)] pb-3 text-[var(--aw-primary)] mb-4">Report Files</h3>
                   {reportAttachments.length === 0 ? <p className="text-xs font-bold text-[var(--aw-muted)] text-center py-4">No attachments uploaded.</p> : (
                     <div className="space-y-2">
                        {reportAttachments.map(a => (
                          <div key={a.id} className="p-3 rounded-xl border border-[var(--aw-border-soft)] bg-[var(--aw-bg)] flex items-center justify-between gap-3">
                             <div className="min-w-0 flex-1"><p className="text-xs font-black truncate">{a.file.originalName}</p></div>
                             <div className="flex gap-1"><button onClick={() => window.open(getFileViewUrl(a.file.id), '_blank')} className="p-1.5 text-[var(--aw-primary)] hover:bg-white rounded-lg transition-colors"><Eye size={14}/></button><a href={getFileDownloadUrl(a.file.id)} className="p-1.5 text-[var(--aw-muted)] hover:bg-white rounded-lg transition-colors"><Download size={14}/></a></div>
                          </div>
                        ))}
                     </div>
                   )}
                </section>
             </aside>
          </div>
        )}

        {activeTab === 'attendance' && attendance && (
          <div className="flex flex-col gap-6">
             <div className="aw-stat-grid !grid-cols-2 md:!grid-cols-5">
               <div className="aw-stat-card"><p className="aw-stat-label">Total Members</p><p className="aw-stat-value">{attendance.members.length}</p></div>
               <div className="aw-stat-card"><p className="aw-stat-label">Marked</p><p className="aw-stat-value text-[var(--aw-primary)]">{Object.values(attendanceRows).filter(r => !!r.status).length}</p></div>
               <div className="aw-stat-card"><p className="aw-stat-label">Present</p><p className="aw-stat-value text-[var(--aw-success)]">{Object.values(attendanceRows).filter(r => r.status === 'present').length}</p></div>
               <div className="aw-stat-card"><p className="aw-stat-label">Absent</p><p className="aw-stat-value text-[var(--aw-danger)]">{Object.values(attendanceRows).filter(r => r.status === 'absent').length}</p></div>
               <div className="aw-stat-card"><p className="aw-stat-label">Excused</p><p className="aw-stat-value text-[var(--aw-warning)]">{Object.values(attendanceRows).filter(r => r.status === 'excused').length}</p></div>
             </div>

             <section className="aw-panel shadow-soft">
                <header className="aw-panel-header !bg-[var(--aw-surface)] !py-6">
                   <div><h2 className="aw-panel-title">Mandatory Participation Registry</h2><p className="text-xs font-bold text-[var(--aw-muted)] mt-1">Mark attendance for all unit members before final submission.</p></div>
                   {!report?.submittedAt && <button disabled={isSavingAttendance} onClick={handleSaveAttendance} className="aw-btn aw-btn-primary !min-h-[38px] !px-5 shadow-lg"><Save size={16}/>{isSavingAttendance ? 'Saving...' : 'Save Registry'}</button>}
                </header>
                <div className="aw-table-wrapper !border-none !rounded-none">
                  <table className="aw-table aw-table-to-cards">
                    <thead><tr><th>Member name</th><th>Gender</th><th>Status Selection</th><th>Internal Note</th></tr></thead>
                    <tbody>
                       {attendance.members.map(m => {
                         const r = attendanceRows[m.memberId] || { status: null, note: "" };
                         return (
                           <tr key={m.memberId}>
                             <td data-label="Member"><p className="font-black">{m.name}</p><p className="text-[10px] font-bold text-[var(--aw-muted)] uppercase mt-1">{m.memberCode || 'No Code'}</p></td>
                             <td data-label="Gender" className="font-bold text-[var(--aw-muted)]">{m.gender}</td>
                             <td data-label="Attendance">
                               <div className="flex gap-1">
                                  {(['present', 'absent', 'excused'] as AttendanceStatus[]).map(s => (
                                    <button key={s} disabled={!!report?.submittedAt} onClick={() => setAttendanceRows({...attendanceRows, [m.memberId]: { ...r, status: r.status === s ? null : s }})} className={["px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider transition-all", r.status === s ? (s === 'present' ? 'bg-[var(--aw-success)] border-[var(--aw-success)] text-white' : s === 'absent' ? 'bg-[var(--aw-danger)] border-[var(--aw-danger)] text-white' : 'bg-[var(--aw-warning)] border-[var(--aw-warning)] text-white') : "bg-white border-[var(--aw-border-soft)] text-[var(--aw-muted)] hover:border-[var(--aw-primary)]"].join(" ")}>{s}</button>
                                  ))}
                               </div>
                             </td>
                             <td data-label="Note"><input disabled={!!report?.submittedAt} className="aw-input !min-h-[36px] !text-xs !bg-[var(--aw-bg)]" placeholder="Add note..." value={r.note} onChange={e => setAttendanceRows({...attendanceRows, [m.memberId]: {...r, note: e.target.value}})} /></td>
                           </tr>
                         );
                       })}
                    </tbody>
                  </table>
                </div>
             </section>
          </div>
        )}

        {activeTab === 'directive' && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 items-start">
             <section className="aw-panel p-8 shadow-soft">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--aw-primary)] mb-4">Official Instructions</p>
                <div className="prose prose-slate max-w-none text-base font-medium leading-loose text-[var(--aw-text)] whitespace-pre-wrap">{announcement.instructions || 'No specific instructions provided.'}</div>
             </section>
             <section className="aw-panel p-6 shadow-soft">
                <h3 className="font-black text-sm uppercase tracking-widest border-b border-[var(--aw-border-soft)] pb-3 text-[var(--aw-primary)] mb-4">Mandate Attachments</h3>
                {announcement.attachments.length === 0 ? <p className="text-xs font-bold text-[var(--aw-muted)] text-center py-4">No files attached.</p> : (
                  <div className="space-y-3">
                     {announcement.attachments.map(a => (
                       <div key={a.id} className="p-4 rounded-xl border border-[var(--aw-border-soft)] bg-[var(--aw-bg)] flex items-center gap-4">
                          <FileText size={24} className="text-[var(--aw-primary)] flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                             <p className="text-sm font-black truncate">{a.file.originalName}</p>
                             <div className="flex gap-3 mt-2">
                                <button onClick={() => window.open(getFileViewUrl(a.file.id), '_blank')} className="text-[10px] font-black uppercase text-[var(--aw-primary)] hover:underline">View</button>
                                <a href={getFileDownloadUrl(a.file.id)} className="text-[10px] font-black uppercase text-[var(--aw-muted)] hover:underline">Download</a>
                             </div>
                          </div>
                       </div>
                     ))}
                  </div>
                )}
             </section>
          </div>
        )}
      </main>
    </div>
  );
}
