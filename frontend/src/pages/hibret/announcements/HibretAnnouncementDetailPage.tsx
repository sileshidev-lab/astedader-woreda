import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import {ArrowLeft,
  ExternalLink,
  FileText,
  Save,
  Send,
  UploadCloud,
  Users,
  Download} from "lucide-react";
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

type FileInfo = {
  id: string;
  originalName: string;
  storedName?: string;
  mimeType: string;
  sizeBytes?: number;
  category?: string | null;
  createdAt?: string;
};

type FileAttachment = {
  id: string;
  file: FileInfo;
};

type LocalReport = {
  id: string;
  title?: string;
  summary?: string | null;
  body?: string;
  status?: string;
  submittedAt?: string | null;
  reviewDecision?: string | null;
  reviewComment?: string | null;
  attachments?: FileAttachment[];
};

type AttendanceDraftRow = {
  memberId: string;
  status: AttendanceStatus | null;
  note: string;
};

const typeLabels: Record<AnnouncementType, string> = {
  meeting: "Meeting",
  conference: "Conference",
  trend_report: "Trend Report",
  other: "Other"
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function bytesToMb(value?: number) {
  if (!value) return "";
  return `${(value / 1024 / 1024).toFixed(2)} MB`;
}

function isImageFile(file?: FileInfo | null) {
  if (!file) return false;

  const mime = file.mimeType || "";
  const name = (file.originalName || "").toLowerCase();

  return (
    mime.startsWith("image/") ||
    name.endsWith(".png") ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".webp") ||
    name.endsWith(".gif")
  );
}

function statusWord(value?: string | null) {
  if (!value) return "-";
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusTextClass(value?: string | null) {
  if (value === "approved" || value === "present" || value === "published") {
    return "text-woreda-success";
  }

  if (value === "rejected" || value === "absent") {
    return "text-woreda-danger";
  }

  if (value === "submitted" || value === "draft") {
    return "text-woreda-primary";
  }

  if (value === "changes_requested" || value === "excused") {
    return "text-woreda-yellowText";
  }

  return "text-woreda-textMuted";
}

function typeTextClass(type: AnnouncementType) {
  if (type === "meeting") return "text-woreda-primary";
  if (type === "conference") return "text-woreda-magenta";
  if (type === "trend_report") return "text-woreda-yellowText";
  return "text-woreda-textMuted";
}

function getReportStatus(report?: LocalReport) {
  if (!report) return "Not started";
  return report.status || "draft";
}

function getReviewStatus(report?: LocalReport) {
  return report?.reviewDecision || "Pending";
}

function tabClass(active: boolean) {
  return [
    "min-h-11 border-b-2 px-4 py-3 text-sm font-black uppercase tracking-[0.1em] transition",
    active
      ? "border-woreda-yellow bg-woreda-surface text-woreda-primary"
      : "border-transparent bg-woreda-surfaceLow text-woreda-textMuted hover:text-woreda-primary",
  ].join(" ");
}

export function HibretAnnouncementDetailPage() {
  const { announcementId } = useParams();

  const [activeTab, setActiveTab] = useState<ActiveTab>("report");
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [attendance, setAttendance] = useState<HibretAttendance | null>(null);
  const [attendanceRows, setAttendanceRows] = useState<Record<string, AttendanceDraftRow>>({});
  const [attendanceSearch, setAttendanceSearch] = useState("");
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState<"all" | AttendanceStatus | "unmarked">("all");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [localImageUrls, setLocalImageUrls] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const report = useMemo(
    () => announcement?.reports?.[0] as LocalReport | undefined,
    [announcement]
  );

  const canEdit =
    (!report && announcement?.status === "published") ||
    report?.status === "draft" ||
    report?.status === "changes_requested";

  const canSubmit =
    Boolean(report) &&
    (report?.status === "draft" || report?.status === "changes_requested");

  const reportAttachments = report?.attachments ?? [];
  const directiveAttachments = (announcement?.attachments ?? []) as FileAttachment[];

  const attendanceSummary = useMemo(() => {
    const rows = Object.values(attendanceRows);

    return {
      total: attendance?.members.length ?? 0,
      marked: rows.filter((row) => row.status).length,
      present: rows.filter((row) => row.status === "present").length,
      absent: rows.filter((row) => row.status === "absent").length,
      excused: rows.filter((row) => row.status === "excused").length
};
  }, [attendance?.members.length, attendanceRows]);

  const attendanceComplete = useMemo(() => {
    if (!announcement?.attendanceRequired) return true;
    if (!attendance) return false;
    if (attendanceSummary.total === 0) return true;

    return attendanceSummary.marked >= attendanceSummary.total;
  }, [announcement?.attendanceRequired, attendance, attendanceSummary.marked, attendanceSummary.total]);

  const attendanceLocked = Boolean(
    report?.submittedAt ||
      report?.status === "submitted" ||
      report?.status === "approved" ||
      report?.status === "rejected" ||
      report?.status === "changes_requested"
  );

  const filteredAttendanceMembers = useMemo(() => {
    const query = attendanceSearch.trim().toLowerCase();
    const members = attendance?.members ?? [];

    return members.filter((member) => {
      const row = attendanceRows[member.memberId];

      if (attendanceStatusFilter === "unmarked" && row?.status) return false;
      if (
        attendanceStatusFilter !== "all" &&
        attendanceStatusFilter !== "unmarked" &&
        row?.status !== attendanceStatusFilter
      ) {
        return false;
      }

      if (!query) return true;

      return [member.name, member.memberCode, member.gender, member.phone, row?.note]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [attendance?.members, attendanceRows, attendanceSearch, attendanceStatusFilter]);

  async function loadAttendance(currentAnnouncementId: string) {
    const data = await getHibretAttendance(currentAnnouncementId);
    setAttendance(data);

    const nextRows: Record<string, AttendanceDraftRow> = {};
    data.members.forEach((member) => {
      nextRows[member.memberId] = {
        memberId: member.memberId,
        status: member.status,
        note: member.note || ""
};
    });

    setAttendanceRows(nextRows);
  }

  async function loadAnnouncement() {
    if (!announcementId) return;

    setIsLoading(true);
    setError("");

    try {
      const data = await getHibretAnnouncement(announcementId);
      setAnnouncement(data);

      const currentReport = data.reports?.[0] as LocalReport | undefined;
      setTitle(currentReport?.title || data.title || "");
      setSummary(currentReport?.summary || "");
      setBody(currentReport?.body || "");

      if (data.attendanceRequired) {
        await loadAttendance(announcementId);
      }
    } catch {
      setError("Unable to load directive.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadAnnouncement();

    return () => {
      Object.values(localImageUrls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [announcementId]);

  function handleFileSelection(files: FileList | null) {
    const nextFiles = Array.from(files ?? []);
    setSelectedFiles(nextFiles);

    Object.values(localImageUrls).forEach((url) => URL.revokeObjectURL(url));

    const nextUrls: Record<string, string> = {};
    nextFiles.forEach((file) => {
      if (file.type.startsWith("image/")) {
        nextUrls[file.name] = URL.createObjectURL(file);
      }
    });

    setLocalImageUrls(nextUrls);
  }

  function setAttendanceStatus(memberId: string, status: AttendanceStatus) {
    setAttendanceRows((current) => ({
      ...current,
      [memberId]: {
        memberId,
        status,
        note: current[memberId]?.note || ""
}
}));
  }

  function setAttendanceNote(memberId: string, note: string) {
    setAttendanceRows((current) => ({
      ...current,
      [memberId]: {
        memberId,
        status: current[memberId]?.status ?? null,
        note
}
}));
  }

  async function handleSaveAttendance() {
    if (!announcementId || !attendance) return;

    if (attendanceLocked) {
      setError("Attendance is locked after this report has been submitted to Woreda.");
      return;
    }

    setIsSavingAttendance(true);
    setError("");
    setMessage("");

    try {
      const records = Object.values(attendanceRows).filter(
        (row): row is AttendanceDraftRow & { status: AttendanceStatus } => Boolean(row.status)
      );

      const saved = await saveHibretAttendance(
        announcementId,
        records.map((row) => ({
          memberId: row.memberId,
          status: row.status,
          note: row.note || null
}))
      );

      setAttendance(saved);

      const nextRows: Record<string, AttendanceDraftRow> = {};
      saved.members.forEach((member) => {
        nextRows[member.memberId] = {
          memberId: member.memberId,
          status: member.status,
          note: member.note || ""
};
      });

      setAttendanceRows(nextRows);
      setMessage("Attendance saved successfully.");
    } catch {
      setError("Unable to save attendance.");
    } finally {
      setIsSavingAttendance(false);
    }
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!announcementId) return;

    setIsSaving(true);
    setError("");
    setMessage("");

    try {
      const savedReport = await saveHibretReport(announcementId, {
        title,
        summary: summary || null,
        body
});

      if (selectedFiles.length) {
        const uploadedFiles = await Promise.all(
          selectedFiles.map((file) => uploadReportFile(file))
        );

        await attachHibretReportFiles(
          savedReport.id,
          uploadedFiles.map((file) => file.id)
        );

        setSelectedFiles([]);
        setLocalImageUrls({});
      }

      setMessage("Report saved successfully.");
      await loadAnnouncement();
    } catch {
      setError("Unable to save report.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSubmit() {
    if (!report || !announcementId) return;

    if (announcement?.attendanceRequired && !attendanceComplete) {
      setError("Complete attendance for all Hibret members before submitting this report.");
      setActiveTab("attendance");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setMessage("");

    try {
      if (announcement?.attendanceRequired && attendance) {
        const records = Object.values(attendanceRows).filter(
          (row): row is AttendanceDraftRow & { status: AttendanceStatus } =>
            Boolean(row.status)
        );

        if (records.length < attendance.summary.total) {
          setError("Every Hibret member must be marked before submitting.");
          setActiveTab("attendance");
          setIsSubmitting(false);
          return;
        }

        await saveHibretAttendance(
          announcementId,
          records.map((row) => ({
            memberId: row.memberId,
            status: row.status,
            note: row.note || null
}))
        );
      }

      await submitHibretReport(report.id);
      setMessage("Report submitted to Woreda.");
      await loadAnnouncement();
    } catch {
      setError("Unable to submit report.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <section className="aw-design-page border border-woreda-border/70 bg-woreda-surface p-5 shadow-none">
        <p className="text-sm font-semibold text-woreda-textMuted">
          Loading directive.
        </p>
      </section>
    );
  }

  if (!announcement) {
    return (
      <section className="border border-woreda-border/70 bg-woreda-surface p-5 shadow-none">
        <p className="text-sm font-semibold text-woreda-textMuted">
          Directive not found.
        </p>
      </section>
    );
  }

  return (
    <section className="aw-design-page aw-design-directives aw-design-detail aw-stitch-page aw-stitch-detail space-y-5">
      {error ? (
        <div className="border border-woreda-danger bg-woreda-dangerBg px-4 py-3 text-sm font-semibold text-woreda-danger">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="border border-woreda-success/20 bg-woreda-successBg px-4 py-3 text-sm font-semibold text-woreda-success">
          {message}
        </div>
      ) : null}

      <div className="border border-woreda-border/70 bg-woreda-surface shadow-none">
        <div className="flex flex-col gap-4 border-b border-woreda-border bg-woreda-surfaceLow px-5 py-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link
              to="/hibret/announcements"
              className="mb-3 inline-flex min-h-10 items-center justify-center gap-2 border border-woreda-border bg-woreda-surface px-4 py-2 text-sm font-bold text-woreda-text hover:border-woreda-primary hover:text-woreda-primary"
            >
              <ArrowLeft size={16} />
              Back
            </Link>

            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-woreda-textMuted">
              Assigned directive
            </p>
            <h1 className="mt-1 max-w-5xl text-3xl font-black leading-tight text-woreda-text">
              {announcement.title}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-bold uppercase tracking-[0.08em]">
              <span className={typeTextClass(announcement.type)}>
                {typeLabels[announcement.type]}
              </span>
              <span className="text-woreda-danger">
                Deadline: {formatDate(announcement.deadline)}
              </span>
              {announcement.attendanceRequired ? (
                <span className="text-woreda-yellowText">Attendance required</span>
              ) : null}
              <span className={statusTextClass(report?.status)}>
                Report: {statusWord(getReportStatus(report))}
              </span>
              <span className={statusTextClass(report?.reviewDecision)}>
                Review: {statusWord(getReviewStatus(report))}
              </span>
            </div>
          </div>

        </div>

        <div className="grid gap-0 border-b border-woreda-border md:grid-cols-4">
          <ProgressStep label="Published" done />
          <ProgressStep label="Attendance" done={!announcement.attendanceRequired || attendanceComplete} />
          <ProgressStep label="Submitted" done={Boolean(report?.submittedAt || report?.status === "submitted" || report?.status === "approved")} />
          <ProgressStep label={statusWord(getReviewStatus(report))} done={Boolean(report?.reviewDecision)} />
        </div>

        <div className="flex flex-wrap border-b border-woreda-border bg-woreda-surfaceLow">
          <button
            type="button"
            onClick={() => setActiveTab("report")}
            className={tabClass(activeTab === "report")}
          >
            Report
          </button>

          {announcement.attendanceRequired ? (
            <button
              type="button"
              onClick={() => setActiveTab("attendance")}
              className={tabClass(activeTab === "attendance")}
            >
              Attendance
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => setActiveTab("directive")}
            className={tabClass(activeTab === "directive")}
          >
            Directive
          </button>
        </div>
      </div>

      {activeTab === "report" ? (
        <ReportTab
          title={title}
          summary={summary}
          body={body}
          canEdit={canEdit}
          canSubmit={canSubmit}
          report={report}
          reportAttachments={reportAttachments}
          selectedFiles={selectedFiles}
          localImageUrls={localImageUrls}
          isSaving={isSaving}
          isSubmitting={isSubmitting}
          attendanceComplete={attendanceComplete}
          onTitle={setTitle}
          onSummary={setSummary}
          onBody={setBody}
          onFileSelection={handleFileSelection}
          onSave={handleSave}
          onSubmit={handleSubmit}
        />
      ) : null}

      {activeTab === "attendance" && announcement.attendanceRequired ? (
        <AttendanceTab
          attendance={attendance}
          attendanceRows={attendanceRows}
          filteredMembers={filteredAttendanceMembers}
          searchText={attendanceSearch}
          statusFilter={attendanceStatusFilter}
          summary={attendanceSummary}
          isSaving={isSavingAttendance}
          attendanceLocked={attendanceLocked}
          onSearch={setAttendanceSearch}
          onStatusFilter={setAttendanceStatusFilter}
          onClear={() => {
            setAttendanceSearch("");
            setAttendanceStatusFilter("all");
          }}
          onStatus={setAttendanceStatus}
          onNote={setAttendanceNote}
          onSave={handleSaveAttendance}
        />
      ) : null}

      {activeTab === "directive" ? (
        <DirectiveTab
          instructions={announcement.instructions || ""}
          attachments={directiveAttachments}
        />
      ) : null}
    </section>
  );
}

function ProgressStep({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="border-b border-woreda-border bg-woreda-surface px-4 py-2.5 md:border-b-0 md:border-r last:md:border-r-0">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-woreda-textMuted">
        {label}
      </p>
      <p className={`mt-0.5 text-xs font-black uppercase tracking-[0.08em] ${done ? "text-woreda-success" : "text-woreda-textMuted"}`}>
        {done ? "Complete" : "Pending"}
      </p>
    </div>
  );
}

function ReportTab({
  title,
  summary,
  body,
  canEdit,
  canSubmit,
  report,
  reportAttachments,
  selectedFiles,
  localImageUrls,
  isSaving,
  isSubmitting,
  attendanceComplete,
  onTitle,
  onSummary,
  onBody,
  onFileSelection,
  onSave,
  onSubmit
}: {
  title: string;
  summary: string;
  body: string;
  canEdit: boolean;
  canSubmit: boolean;
  report?: LocalReport;
  reportAttachments: FileAttachment[];
  selectedFiles: File[];
  localImageUrls: Record<string, string>;
  isSaving: boolean;
  isSubmitting: boolean;
  attendanceComplete: boolean;
  onTitle: (value: string) => void;
  onSummary: (value: string) => void;
  onBody: (value: string) => void;
  onFileSelection: (files: FileList | null) => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="detail-layout">
      <form onSubmit={onSave} className="space-y-5">
        <section className="border border-woreda-border/70 bg-woreda-surface shadow-none">
          <div className="flex flex-col gap-3 border-b border-woreda-border bg-woreda-surfaceLow px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-black text-woreda-text">
                Hibret final report workspace
              </h2>
              <p className="mt-1 text-sm text-woreda-textMuted">
                Prepare the official Hibret response, attach report media, then submit to Woreda.
              </p>
            </div>

            <span className={`text-xs font-black uppercase tracking-[0.12em] ${statusTextClass(report?.status)}`}>
              {statusWord(getReportStatus(report))}
            </span>
          </div>

          <div className="p-5">
            <div className="max-w-[min(60rem,100%)] space-y-4">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-woreda-textMuted">
                  Report title
                </span>
                <input
                  value={title}
                  onChange={(event) => onTitle(event.target.value)}
                  disabled={!canEdit}
                  placeholder="Enter report title"
                  className="mt-2 min-h-11 w-full border border-woreda-border bg-woreda-surface px-3 py-2 text-sm font-semibold outline-none focus:border-woreda-primary disabled:bg-woreda-surfaceLow"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-woreda-textMuted">
                  Executive summary
                </span>
                <textarea
                  value={summary}
                  onChange={(event) => onSummary(event.target.value)}
                  disabled={!canEdit}
                  rows={5}
                  placeholder="Enter the short executive summary."
                  className="mt-2 w-full border border-woreda-border bg-woreda-surface px-3 py-2 text-sm leading-6 outline-none focus:border-woreda-primary disabled:bg-woreda-surfaceLow"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-woreda-textMuted">
                  Full report body
                </span>
                <textarea
                  value={body}
                  onChange={(event) => onBody(event.target.value)}
                  disabled={!canEdit}
                  rows={12}
                  placeholder="Enter the full official Hibret report."
                  className="mt-2 w-full border border-woreda-border bg-woreda-surface px-3 py-2 text-sm leading-6 outline-none focus:border-woreda-primary disabled:bg-woreda-surfaceLow"
                />
              </label>

              {canEdit ? (
                <label className="flex cursor-pointer flex-col items-center justify-center border border-dashed border-woreda-border bg-woreda-surfaceLow px-4 py-8 text-center hover:border-woreda-primary">
                  <UploadCloud size={28} className="text-woreda-primary" />
                  <span className="mt-2 text-sm font-black text-woreda-text">
                    Upload report media or files
                  </span>
                  <span className="mt-1 text-xs font-semibold text-woreda-textMuted">
                    Images, PDF, Word, Excel, PowerPoint, text, and other files are allowed.
                  </span>
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(event) => onFileSelection(event.target.files)}
                  />
                </label>
              ) : null}

              {selectedFiles.length > 0 ? (
                <div className="border border-woreda-border bg-woreda-surfaceLow p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-woreda-textMuted">
                    Selected files
                  </p>
                  <div className="form-grid mt-3">
                    {selectedFiles.map((file) => (
                      <div key={file.name} className="border border-woreda-border bg-woreda-surface p-3">
                        {file.type.startsWith("image/") && localImageUrls[file.name] ? (
                          <img
                            src={localImageUrls[file.name]}
                            alt={file.name}
                            className="mb-3 h-36 w-full object-contain"
                          />
                        ) : (
                          <FileText className="mb-3 text-woreda-primary" size={28} />
                        )}
                        <p className="break-all text-sm font-bold text-woreda-text">{file.name}</p>
                        <p className="mt-1 text-xs font-semibold text-woreda-textMuted">
                          {file.type || "Unknown file"} {bytesToMb(file.size)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap justify-end gap-2 border-t border-woreda-border pt-4">
                {canEdit ? (
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex min-h-10 items-center gap-2 border border-woreda-primary bg-woreda-primary px-4 py-2 text-sm font-bold text-white hover:bg-woreda-sidebar disabled:opacity-60"
                  >
                    <Save size={16} />
                    {isSaving ? "Saving..." : "Save Draft"}
                  </button>
                ) : null}

                {canSubmit ? (
                  <button
                    type="button"
                    onClick={onSubmit}
                    disabled={isSubmitting || !attendanceComplete}
                    className="inline-flex min-h-10 items-center gap-2 border border-woreda-success bg-woreda-success px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Send size={16} />
                    {isSubmitting ? "Submitting..." : "Submit to Woreda"}
                  </button>
                ) : null}
              </div>

              {!canEdit ? (
                <p className="border border-woreda-border bg-woreda-surfaceLow px-4 py-3 text-sm font-semibold text-woreda-textMuted">
                  This report has been submitted to Woreda. Editing is locked unless Woreda requests changes.
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <MediaSection
          title="Report downloads"
          description="Download the submitted report and all attached report media as an official package."
          attachments={reportAttachments}
          report={report}
        />
      </form>

      <section className="h-fit border border-woreda-border/70 bg-woreda-surface p-5 shadow-none xl:sticky xl:top-6">
        <h2 className="text-lg font-black text-woreda-text">Report status</h2>
        <div className="mt-4 space-y-3">
          <InfoLine label="Report" value={statusWord(getReportStatus(report))} />
          <InfoLine label="Woreda review" value={statusWord(getReviewStatus(report))} />
          <InfoLine label="Submitted" value={formatDate(report?.submittedAt)} />
        </div>
      </section>
    </div>
  );
}

function AttendanceTab({
  attendance,
  attendanceRows,
  filteredMembers,
  searchText,
  statusFilter,
  summary,
  isSaving,
  attendanceLocked,
  onSearch,
  onStatusFilter,
  onClear,
  onStatus,
  onNote,
  onSave
}: {
  attendance: HibretAttendance | null;
  attendanceRows: Record<string, AttendanceDraftRow>;
  filteredMembers: HibretAttendance["members"];
  searchText: string;
  statusFilter: "all" | AttendanceStatus | "unmarked";
  summary: { total: number; marked: number; present: number; absent: number; excused: number };
  isSaving: boolean;
  attendanceLocked: boolean;
  onSearch: (value: string) => void;
  onStatusFilter: (value: "all" | AttendanceStatus | "unmarked") => void;
  onClear: () => void;
  onStatus: (memberId: string, status: AttendanceStatus) => void;
  onNote: (memberId: string, note: string) => void;
  onSave: () => void;
}) {
  return (
    <section className="flex min-h-0 flex-col overflow-hidden border border-woreda-border/70 bg-woreda-surface shadow-none md:max-h-[calc(var(--aw-viewport-block)-190px)]">
      <div className="flex flex-col gap-3 border-b border-woreda-border bg-woreda-surfaceLow px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-black text-woreda-text">Hibret member attendance</h2>
          <p className="mt-1 text-sm text-woreda-textMuted">
            Mark member attendance before submitting the final Hibret report.
          </p>
        </div>

        <button
          type="button"
          onClick={onSave}
          disabled={isSaving || attendanceLocked}
          className="inline-flex min-h-10 items-center gap-2 border border-woreda-primary bg-woreda-primary px-4 py-2 text-sm font-bold text-white hover:bg-woreda-sidebar disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save size={16} />
          {attendanceLocked ? "Attendance Locked" : isSaving ? "Saving..." : "Save Attendance"}
        </button>
      </div>

      {attendanceLocked ? (
        <div className="border-b border-woreda-border bg-woreda-surfaceLow px-5 py-3 text-sm font-bold text-woreda-textMuted">
          Attendance has been submitted to Woreda and is now read-only.
        </div>
      ) : null}

      <div className="grid gap-0 border-b border-woreda-border md:grid-cols-5">
        <AttendanceMetric label="Members" value={summary.total} />
        <AttendanceMetric label="Marked" value={summary.marked} />
        <AttendanceMetric label="Present" value={summary.present} />
        <AttendanceMetric label="Absent" value={summary.absent} />
        <AttendanceMetric label="Excused" value={summary.excused} />
      </div>

      <div className="grid gap-3 border-b border-woreda-border bg-woreda-surfaceLow px-5 py-4 xl:grid-cols-[minmax(0,1fr)_minmax(10rem,14rem)_auto]">
        <input
          value={searchText}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Search member, code, phone, or note"
          className="min-h-10 border border-woreda-border bg-woreda-surface px-3 py-2 text-sm outline-none focus:border-woreda-primary"
        />

        <select
          value={statusFilter}
          onChange={(event) => onStatusFilter(event.target.value as "all" | AttendanceStatus | "unmarked")}
          className="min-h-10 border border-woreda-border bg-woreda-surface px-3 py-2 text-sm outline-none focus:border-woreda-primary"
        >
          <option value="all">All statuses</option>
          <option value="present">Present</option>
          <option value="absent">Absent</option>
          <option value="excused">Excused</option>
          <option value="unmarked">Unmarked</option>
        </select>

        <button
          type="button"
          onClick={onClear}
          className="min-h-10 border border-woreda-border bg-woreda-surface px-4 py-2 text-sm font-bold text-woreda-text hover:border-woreda-primary hover:text-woreda-primary"
        >
          Clear
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {!attendance || filteredMembers.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Users size={32} className="mx-auto text-woreda-textMuted" />
            <p className="mt-3 text-sm font-semibold text-woreda-textMuted">No members found.</p>
          </div>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-woreda-surfaceLow text-[11px] uppercase tracking-[0.16em] text-woreda-textMuted">
              <tr>
                <th className="border-b border-woreda-border px-4 py-3">Member</th>
                <th className="border-b border-woreda-border px-4 py-3">Code</th>
                <th className="border-b border-woreda-border px-4 py-3">Status</th>
                <th className="border-b border-woreda-border px-4 py-3">Note</th>
              </tr>
            </thead>

            <tbody>
              {filteredMembers.map((member) => {
                const row = attendanceRows[member.memberId] ?? {
                  memberId: member.memberId,
                  status: member.status,
                  note: member.note || ""
};

                return (
                  <tr key={member.memberId} className="hover:bg-woreda-surfaceLow">
                    <td className="border-b border-woreda-borderLight/50 px-4 py-3">
                      <p className="font-black text-woreda-text">{member.name}</p>
                      <p className="mt-1 text-xs font-semibold text-woreda-textMuted">
                        {member.gender || "-"} · {member.phone || "-"}
                      </p>
                    </td>

                    <td className="border-b border-woreda-borderLight/50 px-4 py-3 text-woreda-textMuted">
                      {member.memberCode || "-"}
                    </td>

                    <td className="border-b border-woreda-borderLight/50 px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {(["present", "absent", "excused"] as AttendanceStatus[]).map((status) => (
                          <button
                            key={status}
                            type="button"
                            onClick={() => onStatus(member.memberId, status)}
                            disabled={attendanceLocked}
                            className={[
                              "border px-3 py-1.5 text-xs font-black uppercase tracking-[0.08em] disabled:cursor-not-allowed disabled:opacity-60",
                              statusButtonClass(row.status, status),
                            ].join(" ")}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    </td>

                    <td className="border-b border-woreda-borderLight/50 px-4 py-3">
                      <input
                        value={row.note}
                        onChange={(event) => onNote(member.memberId, event.target.value)}
                        disabled={attendanceLocked}
                        placeholder="Optional note"
                        className="min-h-9 w-full border border-woreda-border bg-woreda-surface px-3 py-2 text-sm outline-none focus:border-woreda-primary disabled:bg-woreda-surfaceLow disabled:text-woreda-textMuted"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

function DirectiveTab({
  instructions,
  attachments
}: {
  instructions: string;
  attachments: FileAttachment[];
}) {
  return (
    <section className="detail-layout">
      <div className="border border-woreda-border/70 bg-woreda-surface shadow-none">
        <div className="border-b border-woreda-border bg-woreda-surfaceLow px-5 py-4">
          <h2 className="text-lg font-black text-woreda-text">Woreda directive</h2>
          <p className="mt-1 text-sm text-woreda-textMuted">
            Review the directive instructions and original files from Woreda.
          </p>
        </div>

        <div className="p-5">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-woreda-textMuted">
            Instructions
          </p>
          <div className="mt-3 max-w-[min(51.25rem,100%)] whitespace-pre-wrap border border-woreda-border bg-woreda-surfaceLow p-4 text-sm leading-7 text-woreda-text">
            {instructions || "No instructions"}
          </div>
        </div>
      </div>

      <div className="border border-woreda-border/70 bg-woreda-surface shadow-none">
        <div className="border-b border-woreda-border bg-woreda-surfaceLow px-5 py-4">
          <h2 className="text-lg font-black text-woreda-text">Directive attachments</h2>
          <p className="mt-1 text-sm text-woreda-textMuted">
            {attachments.length} files attached by Woreda.
          </p>
        </div>

        <div className="space-y-3 p-5">
          {attachments.length === 0 ? (
            <p className="border border-dashed border-woreda-border bg-woreda-surfaceLow px-3 py-8 text-center text-sm font-semibold text-woreda-textMuted">
              No directive attachments.
            </p>
          ) : (
            attachments.map((attachment) => (
              <CompactFileCard key={attachment.id} attachment={attachment} />
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function statusButtonClass(current: AttendanceStatus | null, status: AttendanceStatus) {
  if (current === status) {
    if (status === "present") return "border-woreda-success bg-woreda-success text-white";
    if (status === "absent") return "border-woreda-danger bg-woreda-danger text-white";
    return "border-woreda-yellow bg-woreda-yellow text-white";
  }

  return "border-woreda-border bg-woreda-surface text-woreda-textMuted hover:border-woreda-primary hover:text-woreda-primary";
}

function metricTone(label: string) {
  if (label === "Present") return "text-woreda-success";
  if (label === "Absent") return "text-woreda-danger";
  if (label === "Excused") return "text-woreda-yellowText";
  if (label === "Marked") return "text-woreda-primary";
  return "text-woreda-text";
}

function AttendanceMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-b border-woreda-border bg-woreda-surface px-4 py-3 md:border-b-0 md:border-r last:md:border-r-0">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-woreda-textMuted">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-black ${metricTone(label)}`}>{value}</p>
    </div>
  );
}

function MediaSection({
  title,
  description,
  attachments,
  report
}: {
  title: string;
  description: string;
  attachments: FileAttachment[];
  report?: LocalReport;
}) {
  const images = attachments.filter((attachment) => isImageFile(attachment.file));
  const docs = attachments.filter((attachment) => !isImageFile(attachment.file));

  return (
    <section className="border border-woreda-border/70 bg-woreda-surface shadow-none">
      <div className="flex flex-col gap-3 border-b border-woreda-border bg-woreda-surfaceLow px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-black text-woreda-text">{title}</h2>
          <p className="mt-1 text-sm text-woreda-textMuted">{description}</p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-bold text-woreda-textMuted">
          <span className="border border-woreda-border bg-woreda-surface px-2.5 py-1">
            {attachments.length} files
          </span>
          <span className="border border-woreda-border bg-woreda-surface px-2.5 py-1">
            {images.length} media
          </span>
          <span className="border border-woreda-border bg-woreda-surface px-2.5 py-1">
            {docs.length} documents
          </span>
        </div>
      </div>

      <div className="p-5">
        <div className="form-grid">
          {report ? (
            <>
            </>
          ) : (
            <p className="border border-dashed border-woreda-border bg-woreda-surfaceLow px-4 py-8 text-center text-sm font-semibold text-woreda-textMuted md:col-span-2">
              Save the report first before exporting.
            </p>
          )}
        </div>

        <p className="mt-3 text-xs font-semibold leading-5 text-woreda-textMuted">
          The package includes the report, attendance CSV, media files, and document attachments in separate folders.
        </p>

        <div className="hidden">
          {images.map((attachment) => (
            <ImageFileCard key={attachment.id} attachment={attachment} />
          ))}
          {docs.map((attachment) => (
            <DocumentFileCard key={attachment.id} attachment={attachment} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ImageFileCard({ attachment }: { attachment: FileAttachment }) {
  const file = attachment.file;

  return (
    <article className="group overflow-hidden border border-woreda-border bg-woreda-surfaceLow">
      <div className="relative h-48 bg-[color-mix(in_srgb,var(--text)_5%,transparent)]">
        <img
          src={getFileViewUrl(file.id)}
          alt={file.originalName}
          className="h-full w-full object-contain"
        />

        <div className="absolute inset-0 flex items-end justify-between gap-2 bg-transparent p-3 opacity-0 transition group-hover:bg-[var(--overlay-scrim)] group-hover:opacity-100">
          <a
            href={getFileViewUrl(file.id)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-9 items-center gap-2 border border-white/40 bg-white px-3 py-2 text-xs font-black text-woreda-primary"
          >
            <ExternalLink size={14} />
            View
          </a>
          <a
            href={getFileDownloadUrl(file.id)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-9 items-center gap-2 border border-white/40 bg-white px-3 py-2 text-xs font-black text-woreda-text"
          >
            <Download size={14} />
            Download
          </a>
        </div>
      </div>

      <div className="p-3">
        <p className="line-clamp-2 break-all text-sm font-bold text-woreda-text">
          {file.originalName}
        </p>
        <p className="mt-1 text-xs font-semibold text-woreda-textMuted">
          {file.mimeType} {bytesToMb(file.sizeBytes)}
        </p>
      </div>
    </article>
  );
}

function DocumentFileCard({ attachment }: { attachment: FileAttachment }) {
  const file = attachment.file;

  return (
    <article className="flex gap-3 border border-woreda-border bg-woreda-surfaceLow p-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-woreda-primary/20 bg-woreda-primarySoft text-woreda-primary">
        <FileText size={24} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="break-all text-sm font-black text-woreda-text">
          {file.originalName}
        </p>
        <p className="mt-1 text-xs font-semibold text-woreda-textMuted">
          {file.mimeType} {bytesToMb(file.sizeBytes)}
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <FileActions file={file} />
        </div>
      </div>
    </article>
  );
}

function CompactFileCard({ attachment }: { attachment: FileAttachment }) {
  const file = attachment.file;

  return (
    <div className="border border-woreda-border bg-woreda-surfaceLow p-2.5">
      {isImageFile(file) ? (
        <img
          src={getFileViewUrl(file.id)}
          alt={file.originalName}
          className="mb-2 h-24 w-full object-contain"
        />
      ) : (
        <FileText className="mb-2 text-woreda-primary" size={24} />
      )}

      <p className="break-all text-sm font-bold text-woreda-text">{file.originalName}</p>
      <p className="mt-1 text-xs font-semibold text-woreda-textMuted">
        {file.mimeType} {bytesToMb(file.sizeBytes)}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <FileActions file={file} />
      </div>
    </div>
  );
}

function FileActions({ file }: { file: FileInfo }) {
  return (
    <>
      <a
        href={getFileViewUrl(file.id)}
        target="_blank"
        rel="noreferrer"
        className="inline-flex min-h-8 items-center gap-1.5 border border-woreda-primary/30 bg-transparent px-2.5 py-1.5 text-xs font-bold text-woreda-primary hover:bg-woreda-primarySoft"
      >
        <ExternalLink size={13} />
        View
      </a>
      <a
        href={getFileDownloadUrl(file.id)}
        target="_blank"
        rel="noreferrer"
        className="inline-flex min-h-8 items-center gap-1.5 border border-woreda-border bg-transparent px-2.5 py-1.5 text-xs font-bold text-woreda-text hover:border-woreda-primary hover:text-woreda-primary"
      >
        <Download size={13} />
        Download
      </a>
    </>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-woreda-border bg-woreda-surfaceLow p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-woreda-textMuted">
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-woreda-text">{value}</p>
    </div>
  );
}
