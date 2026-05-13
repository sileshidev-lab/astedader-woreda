import { useEffect, useMemo, useRef, useState } from "react";
import { BarController, BarElement, CategoryScale, Chart, LinearScale, Tooltip } from "chart.js";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Image as ImageIcon,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { apiClient } from "../../../services/apiClient";
import {
  downloadAuthenticatedExport,
  getAuthenticatedExportUrl,
  getFileDownloadUrl,
  getFilePreviewUrl,
  getFileViewUrl,
} from "../../../services/announcementService";
import type { HibretReport } from "../../../services/hibretService";
import { useAuthStore } from "../../../store/authStore";

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

type ReviewDecision = "approved" | "rejected" | "changes_requested";
type ReviewTab = "report" | "attendance";
type ReviewAttachment = HibretReport["attachments"][number];
type AttendanceStatus = "present" | "absent" | "excused";

type WoredaReportAttendance = {
  announcement: {
    id: string;
    title: string;
    attendanceRequired: boolean;
    status: string;
  };
  hibret: {
    id: string;
    name: string;
  };
  summary: {
    total: number;
    marked: number;
    unmarked: number;
    present: number;
    absent: number;
    excused: number;
    attendanceRate: number;
    completionRate: number;
  };
  members: Array<{
    memberId: string;
    memberCode?: string | null;
    fanId?: string | null;
    ppId?: string | null;
    name: string;
    gender?: string | null;
    phone?: string | null;
    status: AttendanceStatus | null;
    note?: string | null;
    recordedAt?: string | null;
  }>;
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function bytesToMb(value?: number) {
  if (!value) return "";
  return `${(value / 1024 / 1024).toFixed(2)} MB`;
}

function isImage(mimeType: string) {
  return mimeType.startsWith("image/");
}

function compactMime(mimeType: string) {
  const [type, subtype] = mimeType.split("/");
  if (!subtype) return mimeType;
  if (type === "image") return "Image";
  if (subtype.includes("pdf")) return "PDF";
  if (subtype.includes("markdown")) return "Markdown";
  if (subtype.includes("msword") || subtype.includes("wordprocessingml")) return "Word";
  return subtype.toUpperCase();
}

function statusLabel(value?: string | null) {
  if (!value) return "Pending";
  if (value === "changes_requested") return "Changes requested";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function statusClass(value?: string | null) {
  if (value === "approved") {
    return "border-[var(--aw-success)] bg-[var(--aw-success-bg)] text-[var(--aw-success)]";
  }
  if (value === "submitted") {
    return "border-[var(--aw-primary)] bg-[var(--aw-primary-soft)] text-[var(--aw-primary)]";
  }
  if (value === "changes_requested") {
    return "border-[var(--aw-warning)] bg-[var(--aw-warning-bg)] text-[var(--aw-warning)]";
  }
  if (value === "rejected") {
    return "border-[var(--aw-danger)] bg-[var(--aw-danger-bg)] text-[var(--aw-danger)]";
  }
  return "border-[var(--aw-border)] bg-[var(--aw-surface-muted)] text-[var(--aw-muted)]";
}

function openDownload(url: string, index: number) {
  window.setTimeout(() => {
    window.open(url, "_blank", "noopener,noreferrer");
  }, index * 160);
}

function downloadAttachments(attachments: HibretReport["attachments"]) {
  attachments.forEach((a, i) => {
    openDownload(getFileDownloadUrl(a.file.id), i);
  });
}

function StatusPill({ value, prefix }: { value?: string | null; prefix?: string }) {
  return (
    <span className={["inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider", statusClass(value)].join(" ")}>
      {prefix ? `${prefix}: ` : ""}
      {statusLabel(value)}
    </span>
  );
}

function CompactStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="aw-stat-card !p-3">
      <p className="aw-stat-label !text-[9px]">
        {label}
      </p>
      <p className="aw-stat-value !text-lg !mt-1">
        {value}
      </p>
    </div>
  );
}

function AttendanceVerticalChart({ attendance }: { attendance: WoredaReportAttendance }) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  const total = Math.max(attendance.summary.total, 1);

  const bars = useMemo(
    () => [
      {
        key: "present",
        label: "Present",
        value: attendance.summary.present,
        percent: Math.round((attendance.summary.present / total) * 100),
        color: "#0d6e4d",
        border: "#084c36",
      },
      {
        key: "absent",
        label: "Absent",
        value: attendance.summary.absent,
        percent: Math.round((attendance.summary.absent / total) * 100),
        color: "#ba1a1a",
        border: "#7d1111",
      },
      {
        key: "excused",
        label: "Excused",
        value: attendance.summary.excused,
        percent: Math.round((attendance.summary.excused / total) * 100),
        color: "#ffd100",
        border: "#8a6d00",
      },
      {
        key: "unmarked",
        label: "Unmarked",
        value: attendance.summary.unmarked,
        percent: Math.round((attendance.summary.unmarked / total) * 100),
        color: "#70787f",
        border: "#4c545a",
      },
    ],
    [attendance.summary, total]
  );

  useEffect(() => {
    const canvas = chartRef.current;
    if (!canvas) return;
    const rootStyles = getComputedStyle(document.documentElement);
    const muted = rootStyles.getPropertyValue("--aw-muted").trim() || "#70787f";
    const borderSoft = rootStyles.getPropertyValue("--aw-border-soft").trim() || "rgba(112, 120, 127, 0.14)";

    chartInstance.current?.destroy();
    Chart.getChart(canvas)?.destroy();

    chartInstance.current = new Chart(canvas, {
      type: "bar",
      data: {
        labels: bars.map((bar) => bar.label),
        datasets: [
          {
            data: bars.map((bar) => bar.value),
            backgroundColor: bars.map((bar) => bar.color),
            borderColor: bars.map((bar) => bar.border),
            borderWidth: 1,
            borderRadius: 8,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = typeof context.parsed.y === "number" ? context.parsed.y : 0;
                const percent = Math.round((value / total) * 100);
                return ` ${value} members (${percent}%)`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            border: { color: borderSoft },
            ticks: {
              color: muted,
              font: { size: 12, weight: 700 },
              autoSkip: false,
            },
          },
          y: {
            beginAtZero: true,
            suggestedMax: total,
            grid: { color: borderSoft, lineWidth: 1 },
            border: { display: false },
            ticks: {
              precision: 0,
              color: muted,
              font: { size: 11, weight: 600 },
              stepSize: Math.max(1, Math.ceil(total / 5)),
            },
          },
        },
      },
    });

    return () => {
      chartInstance.current?.destroy();
      chartInstance.current = null;
      Chart.getChart(canvas)?.destroy();
    };
  }, [bars, total]);

  return (
    <section className="aw-panel p-4 sm:p-6">
      <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-lg font-black text-[var(--aw-text)]">Attendance distribution</h3>
          <p className="text-sm font-semibold text-[var(--aw-muted)]">Hibret member participation summary.</p>
        </div>
      </div>
      <div className="mb-6 flex flex-wrap gap-x-6 gap-y-2">
        {bars.map((bar) => (
          <span key={bar.key} className="flex items-center gap-2 text-xs font-bold text-[var(--aw-muted)]">
            <span className="h-3 w-3 rounded-full shrink-0" style={{ background: bar.color }} aria-hidden="true" />
            {bar.label}: {bar.value} ({bar.percent}%)
          </span>
        ))}
      </div>
      <div className="relative h-[280px] w-full">
        <canvas ref={chartRef} role="img" aria-label="Attendance Bar Chart" />
      </div>
    </section>
  );
}

function AttendanceStatusBadge({ status }: { status: AttendanceStatus | null }) {
  if (status === "present") return <span className="inline-flex border border-[var(--aw-success)] bg-[var(--aw-success-bg)] px-2.5 py-1 text-[10px] font-black uppercase text-[var(--aw-success)]">Present</span>;
  if (status === "absent") return <span className="inline-flex border border-[var(--aw-danger)] bg-[var(--aw-danger-bg)] px-2.5 py-1 text-[10px] font-black uppercase text-[var(--aw-danger)]">Absent</span>;
  if (status === "excused") return <span className="inline-flex border border-[var(--aw-warning)] bg-[var(--aw-warning-bg)] px-2.5 py-1 text-[10px] font-black uppercase text-[var(--aw-warning)]">Excused</span>;
  return <span className="inline-flex border border-[var(--aw-border)] bg-[var(--aw-surface-muted)] px-2.5 py-1 text-[10px] font-black uppercase text-[var(--aw-muted)]">Unmarked</span>;
}

function AttachmentCard({
  attachment,
  previewUrl,
  selected,
  onToggleSelected,
  onOpen,
}: {
  attachment: ReviewAttachment;
  previewUrl?: string;
  selected: boolean;
  onToggleSelected: () => void;
  onOpen: () => void;
}) {
  const image = isImage(attachment.file.mimeType);

  return (
    <article className={["group overflow-hidden rounded-2xl border transition-all hover:shadow-lg", selected ? "border-[var(--aw-primary)] ring-2 ring-[var(--aw-primary)]/10" : "border-[var(--aw-border-soft)] bg-[var(--aw-surface)]"].join(" ")}>
      <div className="relative aspect-[16/10] overflow-hidden bg-[var(--aw-bg)]">
        {image ? (
          <img src={previewUrl || getFileViewUrl(attachment.file.id)} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[var(--aw-surface-muted)] text-[var(--aw-muted)]">
            <FileText size={48} className="text-[var(--aw-primary)]" />
            <span className="max-w-[80%] truncate text-[10px] font-black uppercase tracking-widest">{compactMime(attachment.file.mimeType)}</span>
          </div>
        )}
        <label className={["absolute left-3 top-3 flex h-6 w-6 cursor-pointer items-center justify-center rounded-lg border border-[var(--aw-border)] bg-[var(--aw-surface)] text-[var(--aw-text)] transition-opacity", selected ? "opacity-100" : "opacity-100 sm:opacity-0 sm:group-hover:opacity-100"].join(" ")}>
          <input type="checkbox" checked={selected} onChange={onToggleSelected} className="h-4 w-4 accent-[var(--aw-primary)]" aria-label="Select attachment" />
        </label>
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-black/60 p-3 opacity-0 transition-opacity group-hover:opacity-100">
          <button type="button" onClick={onOpen} className="aw-btn aw-btn-primary !min-h-[36px] !px-3 !text-xs"><Eye size={14} />View</button>
          <a href={getFileDownloadUrl(attachment.file.id)} target="_blank" rel="noreferrer" className="aw-btn aw-btn-outline !min-h-[36px] !px-3 !text-xs !bg-white"><Download size={14} />Get</a>
        </div>
      </div>
      <div className="p-4">
        <p className="truncate text-sm font-bold text-[var(--aw-text)]" title={attachment.file.originalName}>{attachment.file.originalName}</p>
        <div className="mt-1 flex items-center justify-between gap-2 text-[11px] font-bold text-[var(--aw-muted)] uppercase tracking-wider">
          <span>{compactMime(attachment.file.mimeType)}</span>
          <span>{bytesToMb(attachment.file.sizeBytes)}</span>
        </div>
      </div>
    </article>
  );
}

export function WoredaReportReviewPage() {
  const { announcementId, hibretId } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<ReviewTab>("report");
  const [report, setReport] = useState<HibretReport | null>(null);
  const [attendance, setAttendance] = useState<WoredaReportAttendance | null>(null);
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(false);
  const [comment, setComment] = useState("");
  const [imagePreviewUrls, setImagePreviewUrls] = useState<Record<string, string>>({});
  const [viewerFile, setViewerFile] = useState<ReviewAttachment | null>(null);
  const [selectedAttachmentIds, setSelectedAttachmentIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReviewing, setIsReviewing] = useState(false);
  const [error, setError] = useState("");

  const returnTo = searchParams.get("returnTo");
  const backTo = returnTo || `/woreda/announcements/${announcementId}`;
  const backLabel = returnTo?.startsWith("/woreda/hibrets") ? "Back to Hibret" : "Back to Directive";

  const privileges = user?.privileges ?? [];
  const canReview = report?.status === "submitted" && (privileges.includes("*") || privileges.includes("report.review"));

  async function loadReport() {
    if (!announcementId || !hibretId) return;
    setIsLoading(true);
    setError("");
    try {
      const response = await apiClient.get<{ report: HibretReport }>(`/woreda/announcements/${announcementId}/hibrets/${hibretId}/report`);
      setReport(response.data.report);
      setComment(response.data.report.reviewComment || "");
      setSelectedAttachmentIds([]);
    } catch {
      setError("Unable to load Hibret report.");
    } finally {
      setIsLoading(false);
    }
  }

  async function loadAttendance() {
    if (!announcementId || !hibretId) return;
    setIsAttendanceLoading(true);
    try {
      const response = await apiClient.get<{ attendance: WoredaReportAttendance }>(`/woreda/announcements/${announcementId}/hibrets/${hibretId}/attendance`);
      setAttendance(response.data.attendance);
    } catch {
      setAttendance(null);
    } finally {
      setIsAttendanceLoading(false);
    }
  }

  async function reviewReport(decision: ReviewDecision) {
    if (!report) return;
    setIsReviewing(true);
    setError("");
    try {
      const response = await apiClient.post<{ report: HibretReport }>(`/woreda/reports/${report.id}/review`, { decision, comment: comment || null });
      setReport(response.data.report);
    } catch {
      setError("Unable to submit review decision.");
    } finally {
      setIsReviewing(false);
    }
  }

  useEffect(() => { void loadReport(); }, [announcementId, hibretId]);
  useEffect(() => {
    if (report?.announcement?.attendanceRequired) { void loadAttendance(); }
    else { setAttendance(null); }
  }, [report?.announcement?.attendanceRequired, announcementId, hibretId]);

  useEffect(() => {
    const imageAttachments = report?.attachments?.filter((attachment) => isImage(attachment.file.mimeType)) ?? [];
    if (!imageAttachments.length) { setImagePreviewUrls({}); return; }
    let cancelled = false;
    const objectUrls: string[] = [];
    async function loadImagePreviews() {
      const entries = await Promise.all(imageAttachments.map(async (attachment) => {
        const response = await apiClient.get<Blob>(`/files/${attachment.file.id}/download?inline=true`, { responseType: "blob" });
        const objectUrl = URL.createObjectURL(response.data);
        objectUrls.push(objectUrl);
        return [attachment.file.id, objectUrl] as const;
      }));
      if (!cancelled) { setImagePreviewUrls(Object.fromEntries(entries)); }
    }
    void loadImagePreviews();
    return () => { cancelled = true; objectUrls.forEach((url) => URL.revokeObjectURL(url)); };
  }, [report?.attachments]);

  const selectedAttachments = useMemo(() => {
    if (!report) return [];
    const selected = new Set(selectedAttachmentIds);
    return report.attachments.filter((attachment) => selected.has(attachment.id));
  }, [report, selectedAttachmentIds]);

  const imageAttachments = useMemo(() => report?.attachments.filter((attachment) => isImage(attachment.file.mimeType)) ?? [], [report]);
  const documentAttachments = useMemo(() => report?.attachments.filter((attachment) => !isImage(attachment.file.mimeType)) ?? [], [report]);

  if (isLoading) return <section className="aw-panel p-8 text-center font-bold text-[var(--aw-muted)]">Loading report data...</section>;
  if (error && !report) return <section className="aw-panel p-8 border-[var(--aw-danger)] bg-[var(--aw-danger-bg)] text-[var(--aw-danger)] font-bold">{error}</section>;
  if (!report) return <section className="aw-panel p-8 text-center font-bold text-[var(--aw-muted)]">Report not found.</section>;

  return (
    <div className="aw-responsive-shell flex-1 flex flex-col gap-6 overflow-hidden">
      {error && <div className="aw-panel !bg-[var(--aw-danger-bg)] !border-[var(--aw-danger)] px-4 py-3 text-sm font-black text-[var(--aw-danger)]">{error}</div>}

      <header className="aw-panel !rounded-3xl shrink-0 overflow-hidden shadow-soft">
        <div className="border-b border-[var(--aw-border-soft)] bg-[var(--aw-surface)] p-5 sm:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <Link to={backTo} className="aw-btn aw-btn-outline !min-h-[36px] !px-3 !rounded-xl !text-xs"><ArrowLeft size={14} />{backLabel}</Link>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--aw-muted)]">Report review portal</span>
              </div>
              <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-center">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--aw-text)] truncate">{report.title}</h1>
                <div className="flex shrink-0 gap-2">
                  <StatusPill value={report.status} />
                  <StatusPill value={report.reviewDecision} prefix="Review" />
                </div>
              </div>
              <p className="mt-2 text-sm font-bold text-[var(--aw-muted)]">{report.hibret.name} · {report.announcement.title}</p>
              {activeTab === "attendance" && (
                <div className="mt-6 aw-stat-grid !grid-cols-2 md:!grid-cols-4">
                  <CompactStat label="Members" value={attendance?.summary.total ?? "—"} />
                  <CompactStat label="Marked" value={attendance?.summary.marked ?? "—"} />
                  <CompactStat label="Attendance Rate" value={attendance ? `${attendance.summary.attendanceRate}%` : "—"} />
                  <CompactStat label="Completion" value={attendance ? `${attendance.summary.completionRate}%` : "—"} />
                </div>
              )}
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {activeTab === "attendance" ? (
                <>
                  <button type="button" onClick={() => downloadAuthenticatedExport(`/woreda/announcements/${announcementId}/hibrets/${hibretId}/attendance.csv`)} className="aw-btn aw-btn-outline !text-[var(--aw-primary)]"><Download size={16} />CSV</button>
                  <button type="button" onClick={() => downloadAuthenticatedExport(`/woreda/announcements/${announcementId}/hibrets/${hibretId}/attendance.xlsx`)} className="aw-btn aw-btn-primary"><Download size={16} />Excel</button>
                </>
              ) : (
                <button type="button" onClick={() => downloadAuthenticatedExport(`/woreda/reports/${report.id}/export.zip`)} className="aw-btn aw-btn-primary"><Download size={16} />Export zip</button>
              )}
            </div>
          </div>
          {activeTab === "report" && (
            <div className="mt-6 aw-stat-grid !grid-cols-2 md:!grid-cols-4">
              <CompactStat label="Submitted" value={formatDate(report.submittedAt)} />
              <CompactStat label="Reviewed" value={formatDate(report.reviewedAt)} />
              <CompactStat label="Attachments" value={report.attachments.length} />
              <CompactStat label="Review count" value={report.reviews.length} />
            </div>
          )}
        </div>
        <nav className="flex bg-[var(--aw-surface-muted)]">
          <button type="button" onClick={() => setActiveTab("report")} className={["flex-1 min-h-[52px] text-xs font-black uppercase tracking-widest border-r border-[var(--aw-border-soft)] transition-colors", activeTab === "report" ? "bg-[var(--aw-primary)] text-white" : "text-[var(--aw-muted)] hover:bg-[var(--aw-bg)]"].join(" ")}>Report body</button>
          <button type="button" onClick={() => setActiveTab("attendance")} className={["flex-1 min-h-[52px] text-xs font-black uppercase tracking-widest transition-colors", activeTab === "attendance" ? "bg-[var(--aw-primary)] text-white" : "text-[var(--aw-muted)] hover:bg-[var(--aw-bg)]"].join(" ")}>Member attendance</button>
        </nav>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto aw-seamless-scroll">
        {activeTab === "report" ? (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start pb-8">
            <div className="space-y-6 min-w-0">
              <section className="aw-panel">
                <header className="aw-panel-header">
                  <div>
                    <h2 className="aw-panel-title">Report content</h2>
                    <p className="text-xs font-bold text-[var(--aw-muted)] mt-1">Submitted Hibret report detail.</p>
                  </div>
                </header>
                <div className="p-6 sm:p-8 space-y-8">
                  <div className="aw-panel !border-none !bg-[var(--aw-bg)] p-6">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--aw-primary)] mb-3">Executive Summary</p>
                    <div className="text-base font-medium leading-relaxed text-[var(--aw-text)]">{report.summary || "No summary provided."}</div>
                  </div>
                  <div className="px-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--aw-primary)] mb-4">Detailed Body</p>
                    <div className="text-base font-medium leading-relaxed text-[var(--aw-text)] whitespace-pre-wrap">{report.body}</div>
                  </div>
                </div>
              </section>

              <section className="aw-panel">
                <header className="aw-panel-header !py-6">
                  <div className="min-w-0">
                    <h2 className="aw-panel-title">Report media & files</h2>
                    <p className="text-xs font-bold text-[var(--aw-muted)] mt-1">Files attached to this submission.</p>
                  </div>
                  {report.attachments.length > 0 && (
                    <a href={getAuthenticatedExportUrl(`/woreda/reports/${report.id}/attachments.zip`)} className="aw-btn aw-btn-primary !min-h-[36px] !rounded-xl !text-xs"><Download size={14} />Get all</a>
                  )}
                </header>
                <div className="p-6">
                  {report.attachments.length === 0 ? (
                    <div className="aw-panel !border-dashed !bg-[var(--aw-surface-muted)] py-16 flex flex-col items-center justify-center gap-4 text-[var(--aw-muted)]">
                      <ImageIcon size={48} strokeWidth={1} />
                      <p className="font-bold">No media or documents provided.</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center gap-2 mb-6">
                        <button type="button" onClick={() => setSelectedAttachmentIds(selectedAttachmentIds.length === report.attachments.length ? [] : report.attachments.map(a => a.id))} className="aw-btn aw-btn-outline !min-h-[34px] !px-3 !text-[11px] uppercase tracking-wider">{selectedAttachmentIds.length === report.attachments.length ? "Deselect all" : "Select all"}</button>
                        <button type="button" disabled={selectedAttachments.length === 0} onClick={() => downloadAttachments(selectedAttachments)} className="aw-btn aw-btn-outline !min-h-[34px] !px-3 !text-[11px] uppercase tracking-wider disabled:opacity-30">Download ({selectedAttachments.length})</button>
                      </div>
                      {imageAttachments.length > 0 && (
                        <div className="mb-10">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--aw-muted)] mb-4">Media files ({imageAttachments.length})</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                            {imageAttachments.map((a) => <AttachmentCard key={a.id} attachment={a} previewUrl={imagePreviewUrls[a.file.id]} selected={selectedAttachmentIds.includes(a.id)} onToggleSelected={() => setSelectedAttachmentIds(s => s.includes(a.id) ? s.filter(id => id !== a.id) : [...s, a.id])} onOpen={() => setViewerFile(a)} />)}
                          </div>
                        </div>
                      )}
                      {documentAttachments.length > 0 && (
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--aw-muted)] mb-4">Documents ({documentAttachments.length})</p>
                          <div className="aw-table-wrapper overflow-hidden">
                            <table className="aw-table !border-none">
                              <thead>
                                <tr>
                                  <th className="!py-4 w-12"><input type="checkbox" checked={documentAttachments.every(a => selectedAttachmentIds.includes(a.id))} onChange={(e) => {
                                    const ids = documentAttachments.map(a => a.id);
                                    if(e.target.checked) setSelectedAttachmentIds(s => Array.from(new Set([...s, ...ids])));
                                    else setSelectedAttachmentIds(s => s.filter(id => !ids.includes(id)));
                                  }} className="h-4 w-4 rounded accent-[var(--aw-primary)]" /></th>
                                  <th>File name</th>
                                  <th>Format</th>
                                  <th>Size</th>
                                  <th className="text-right">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {documentAttachments.map((a) => (
                                  <tr key={a.id} className="hover:!bg-[var(--aw-surface-muted)]">
                                    <td className="w-12"><input type="checkbox" checked={selectedAttachmentIds.includes(a.id)} onChange={() => setSelectedAttachmentIds(s => s.includes(a.id) ? s.filter(id => id !== a.id) : [...s, a.id])} className="h-4 w-4 rounded accent-[var(--aw-primary)]" /></td>
                                    <td className="font-bold">{a.file.originalName}</td>
                                    <td className="font-bold text-[var(--aw-muted)]">{compactMime(a.file.mimeType)}</td>
                                    <td className="font-bold text-[var(--aw-muted)]">{bytesToMb(a.file.sizeBytes)}</td>
                                    <td className="text-right">
                                      <div className="flex justify-end gap-2">
                                        <button type="button" onClick={() => window.open(getFilePreviewUrl(a.file.id), "_blank")} className="aw-btn aw-btn-outline !min-h-[32px] !px-3 !text-[11px] !rounded-lg hover:!bg-[var(--aw-bg)]"><Eye size={12}/> View</button>
                                        <a href={getFileDownloadUrl(a.file.id)} className="aw-btn aw-btn-outline !min-h-[32px] !px-3 !text-[11px] !rounded-lg hover:!bg-[var(--aw-bg)]"><Download size={12}/> Get</a>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </section>
            </div>

            <aside className="space-y-6">
              <section className="aw-panel">
                <header className="aw-panel-header">
                  <h2 className="aw-panel-title">Review action</h2>
                </header>
                <div className="p-5 space-y-5">
                  <label className="block">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[var(--aw-muted)]">Internal comment</span>
                    <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={5} disabled={!canReview} className="aw-input !min-h-[120px] w-full mt-2 !py-3 resize-none font-medium disabled:opacity-50" placeholder="Type internal review notes here..." />
                  </label>
                  {canReview ? (
                    <div className="grid gap-3 pt-2">
                      <button type="button" disabled={isReviewing} onClick={() => reviewReport("approved")} className="aw-btn !bg-[var(--aw-success)] !border-[var(--aw-success)] text-white shadow-lg shadow-[var(--aw-success)]/10"><CheckCircle2 size={18}/> Approve report</button>
                      <button type="button" disabled={isReviewing} onClick={() => reviewReport("changes_requested")} className="aw-btn !bg-[var(--aw-warning)] !border-[var(--aw-warning)] text-white shadow-lg shadow-[var(--aw-warning)]/10"><RotateCcw size={18}/> Request changes</button>
                      <button type="button" disabled={isReviewing} onClick={() => reviewReport("rejected")} className="aw-btn !bg-[var(--aw-danger)] !border-[var(--aw-danger)] text-white shadow-lg shadow-[var(--aw-danger)]/10"><XCircle size={18}/> Reject submission</button>
                    </div>
                  ) : (
                    <div className="aw-panel !bg-[var(--aw-bg)] !border-none p-4 text-xs font-bold leading-relaxed text-[var(--aw-muted)]">
                      {report.reviewDecision ? `Review finalized as ${statusLabel(report.reviewDecision)} on ${formatDate(report.reviewedAt)}.` : "Submission is not in a reviewable state."}
                    </div>
                  )}
                </div>
              </section>

              <section className="aw-panel">
                <header className="aw-panel-header">
                  <h2 className="aw-panel-title">Decision history</h2>
                </header>
                <div className="p-5">
                  {report.reviews.length === 0 ? (
                    <p className="text-xs font-bold italic text-[var(--aw-muted)] py-4 text-center">No history available.</p>
                  ) : (
                    <div className="space-y-6">
                      {report.reviews.map((rv, idx) => (
                        <div key={rv.id} className="relative flex gap-4">
                          <div className="flex flex-col items-center">
                            <span className={["mt-1 h-3 w-3 rounded-full border-2", rv.decision === "approved" ? "border-[var(--aw-success)] bg-[var(--aw-success)]" : rv.decision === "rejected" ? "border-[var(--aw-danger)] bg-[var(--aw-danger)]" : "border-[var(--aw-warning)] bg-[var(--aw-warning)]"].join(" ")} />
                            {idx < report.reviews.length - 1 && <span className="mt-2 h-full w-[2px] bg-[var(--aw-border-soft)] rounded-full" />}
                          </div>
                          <div className="min-w-0 flex-1 pb-4">
                            <div className="flex items-center gap-2 mb-2"><StatusPill value={rv.decision} /></div>
                            <p className="text-sm font-medium text-[var(--aw-text)] leading-relaxed">{rv.comment || <span className="italic text-[var(--aw-muted)]">No comment recorded.</span>}</p>
                            <p className="mt-2 text-[10px] font-black uppercase tracking-wider text-[var(--aw-muted)]">{formatDate(rv.createdAt)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </aside>
          </div>
        ) : (
          <div className="pb-10 space-y-6">
            {!report.announcement.attendanceRequired ? (
              <section className="aw-panel p-10 flex flex-col items-center justify-center text-center gap-3">
                <ImageIcon size={48} className="text-[var(--aw-muted)]" strokeWidth={1}/>
                <h2 className="text-xl font-black">Attendance not required</h2>
                <p className="text-sm font-bold text-[var(--aw-muted)]">This directive was submitted without a participation mandate.</p>
              </section>
            ) : isAttendanceLoading ? (
              <section className="aw-panel p-10 font-bold text-[var(--aw-muted)] text-center">Crunching attendance metrics...</section>
            ) : attendance ? (
              <>
                <AttendanceVerticalChart attendance={attendance} />
                <section className="aw-panel overflow-hidden">
                  <header className="aw-panel-header">
                    <h2 className="aw-panel-title">Member registry</h2>
                  </header>
                  <div className="aw-table-wrapper !border-none !rounded-none">
                    <table className="aw-table aw-table-to-cards">
                      <thead>
                        <tr>
                          <th>Full name</th>
                          <th>System codes</th>
                          <th>Attendance</th>
                          <th>Internal note</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendance.members.map((m) => (
                          <tr key={m.memberId} className="hover:!bg-[var(--aw-bg)]">
                            <td data-label="Member" className="font-black text-[var(--aw-text)]">{m.name}</td>
                            <td data-label="Codes" className="font-bold text-[var(--aw-muted)]">{[m.memberCode, m.fanId, m.ppId].filter(Boolean).join(" · ") || "—"}</td>
                            <td data-label="Status"><AttendanceStatusBadge status={m.status} /></td>
                            <td data-label="Note" className="font-medium text-[var(--aw-text)]">{m.note || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            ) : (
              <section className="aw-panel p-10 text-center font-bold text-[var(--aw-danger)]">Unable to fetch participation records.</section>
            )}
          </div>
        )}
      </main>

      {viewerFile && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[var(--aw-overlay-scrim-strong)] backdrop-blur-sm" onClick={() => setViewerFile(null)} />
          <div className="relative aw-panel w-full max-w-6xl max-h-[92dvh] flex flex-col shadow-2xl !rounded-3xl border-none">
            <header className="aw-panel-header !rounded-t-3xl !py-5">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--aw-primary)] mb-1">File preview</p>
                <h2 className="text-base font-black truncate">{viewerFile.file.originalName}</h2>
              </div>
              <div className="flex gap-2">
                <a href={getFileDownloadUrl(viewerFile.file.id)} className="aw-btn aw-btn-primary !min-h-[36px] !px-4 !text-xs">Download</a>
                <button type="button" onClick={() => setViewerFile(null)} className="aw-btn aw-btn-outline !min-h-[36px] !px-4 !text-xs !bg-white">Close</button>
              </div>
            </header>
            <div className="flex-1 bg-[var(--aw-bg)] overflow-auto flex items-center justify-center p-2 sm:p-6 min-h-0">
              {isImage(viewerFile.file.mimeType) ? (
                <img src={imagePreviewUrls[viewerFile.file.id] || getFileViewUrl(viewerFile.file.id)} alt="" className="max-h-full max-w-full object-contain shadow-2xl rounded-lg" />
              ) : (
                <iframe src={getFilePreviewUrl(viewerFile.file.id)} title="Preview" className="h-full w-full bg-white rounded-xl shadow-inner border border-[var(--aw-border-soft)]" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
