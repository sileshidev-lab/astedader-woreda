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
  X,
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
    return "border-[var(--aw-primary)] bg-[color:color-mix(in_srgb,var(--aw-primary)_12%,var(--aw-surface))] text-[var(--aw-primary)]";
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

function StatusPill({ value, prefix }: { value?: string | null; prefix?: string }) {
  return (
    <span className={["inline-flex rounded-full border px-2.5 py-1 text-xs font-black", statusClass(value)].join(" ")}>
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
    <div className="rounded-2xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface-muted)] px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-[0.1em] text-[var(--aw-muted)]">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-black text-[var(--aw-text)]">
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
        color: "#8a6d00",
        border: "#5f4b00",
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
            borderRadius: 2,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value =
                  typeof context.parsed.y === "number" ? context.parsed.y : 0;
                const percent = Math.round((value / total) * 100);
                return ` ${value} members (${percent}%)`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
            border: {
              color: borderSoft,
            },
            ticks: {
              color: muted,
              font: {
                size: 12,
                weight: 700,
              },
              autoSkip: false,
            },
          },
          y: {
            beginAtZero: true,
            suggestedMax: total,
            grid: {
              color: borderSoft,
              lineWidth: 1,
            },
            border: {
              display: false,
            },
            ticks: {
              precision: 0,
              color: muted,
              font: {
                size: 11,
                weight: 600,
              },
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
    <section className="rounded-3xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] p-3 shadow-sm sm:p-4">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-base font-black text-[var(--aw-text)]">
            Attendance chart
          </h3>
          <p className="text-sm font-semibold text-[var(--aw-muted)]">
            Member attendance distribution for this Hibret.
          </p>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {bars.map((bar) => (
          <span
            key={bar.key}
            className="flex items-center gap-1.5 text-xs font-semibold text-[var(--aw-muted)]"
          >
            <span
              className="h-2.5 w-2.5 shrink-0"
              style={{ background: bar.color }}
              aria-hidden="true"
            />
            {bar.label} {bar.value} — {bar.percent}%
          </span>
        ))}
      </div>

      <div className="relative h-[clamp(210px,30dvh,320px)] w-full">
        <canvas
          ref={chartRef}
          role="img"
          aria-label={`Bar chart showing attendance: ${bars
            .map((bar) => `${bar.label} ${bar.value}`)
            .join(", ")}`}
        />
      </div>
    </section>
  );
}

function AttendanceStatusBadge({ status }: { status: AttendanceStatus | null }) {
  if (status === "present") {
    return (
      <span className="inline-flex border border-[var(--aw-success)] bg-[var(--aw-success-bg)] px-2.5 py-1 text-xs font-black text-[var(--aw-success)]">
        Present
      </span>
    );
  }

  if (status === "absent") {
    return (
      <span className="inline-flex border border-[var(--aw-danger)] bg-[var(--aw-danger-bg)] px-2.5 py-1 text-xs font-black text-[var(--aw-danger)]">
        Absent
      </span>
    );
  }

  if (status === "excused") {
    return (
      <span className="inline-flex border border-[var(--aw-warning)] bg-[var(--aw-warning-bg)] px-2.5 py-1 text-xs font-black text-[var(--aw-warning)]">
        Excused
      </span>
    );
  }

  return (
    <span className="inline-flex border border-[var(--aw-border)] bg-[var(--aw-surface-muted)] px-2.5 py-1 text-xs font-black text-[var(--aw-muted)]">
      Unmarked
    </span>
  );
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
    <article
      className={[
        "group overflow-hidden border bg-[var(--aw-surface)] transition hover:border-[var(--aw-primary)]",
        selected ? "border-[var(--aw-primary)]" : "border-[var(--aw-border-soft)]",
      ].join(" ")}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-[var(--aw-sidebar)]">
        {image ? (
          <img
            src={previewUrl || getFileViewUrl(attachment.file.id)}
            alt=""
            className="h-full w-full object-contain p-2"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[var(--aw-surface-muted)] text-[var(--aw-muted)]">
            <FileText size={42} className="text-[var(--aw-primary)]" />
            <span className="max-w-[75%] truncate text-xs font-black uppercase">
              {attachment.file.mimeType.split("/").pop() || "file"}
            </span>
          </div>
        )}

        <label
          className={[
            "absolute left-2 top-2 flex h-8 w-8 cursor-pointer items-center justify-center border border-[var(--aw-border)] bg-[var(--aw-surface)] text-[var(--aw-text)] transition",
            selected ? "opacity-100" : "opacity-100 sm:opacity-0 sm:group-hover:opacity-100",
          ].join(" ")}
        >
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelected}
            className="h-4 w-4 accent-[var(--aw-primary)]"
            aria-label={`Select ${attachment.file.originalName}`}
          />
        </label>

        {attachment.file.sizeBytes ? (
          <span className="absolute right-2 top-2 bg-[var(--aw-sidebar)] px-2 py-1 text-xs font-black text-white">
            {bytesToMb(attachment.file.sizeBytes)}
          </span>
        ) : null}

        <div className="absolute inset-x-0 bottom-0 flex items-center justify-end gap-2 bg-black/45 p-2 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
          <button
            type="button"
            onClick={onOpen}
            className="inline-flex min-h-9 items-center gap-2 bg-[var(--aw-surface)] px-3 text-xs font-black text-[var(--aw-text)] hover:bg-[var(--aw-primary)] hover:text-white"
            title="View"
          >
            <Eye size={15} />
            View
          </button>

          <a
            href={getFileDownloadUrl(attachment.file.id)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-9 items-center gap-2 bg-[var(--aw-surface)] px-3 text-xs font-black text-[var(--aw-text)] hover:bg-[var(--aw-primary)] hover:text-white"
            title="Download"
          >
            <Download size={15} />
            Download
          </a>
        </div>
      </div>

      <div className="p-3">
        <p className="truncate text-xs font-black text-[var(--aw-text)]" title={attachment.file.originalName}>
          {attachment.file.originalName}
        </p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="truncate text-xs font-semibold text-[var(--aw-muted)]">
            {compactMime(attachment.file.mimeType)}
          </p>
          {attachment.file.sizeBytes ? (
            <span className="shrink-0 text-[11px] font-semibold text-[var(--aw-muted)]">
              {bytesToMb(attachment.file.sizeBytes)}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function AttendanceTab({
  attendance,
  isLoading,
  required,
}: {
  attendance: WoredaReportAttendance | null;
  isLoading: boolean;
  required: boolean;
}) {
  if (!required) {
    return (
      <section className="border border-[var(--aw-border-soft)] bg-[var(--aw-surface)]">
        <header className="border-b border-[var(--aw-border-soft)] bg-[var(--aw-surface-muted)] p-4">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--aw-muted)]">
            Attendance
          </p>
          <h2 className="mt-1 text-lg font-black text-[var(--aw-text)]">
            Attendance not required
          </h2>
          <p className="mt-1 text-sm font-semibold text-[var(--aw-muted)]">
            This directive was submitted without a required attendance record.
          </p>
        </header>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] p-4">
        <p className="text-sm font-bold text-[var(--aw-muted)]">Loading attendance summary.</p>
      </section>
    );
  }

  if (!attendance) {
    return (
      <section className="border border-[var(--aw-border-soft)] bg-[var(--aw-surface)]">
        <header className="border-b border-[var(--aw-border-soft)] bg-[var(--aw-surface-muted)] p-4">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--aw-muted)]">
            Required attendance
          </p>
          <h2 className="mt-1 text-lg font-black text-[var(--aw-text)]">
            Attendance records unavailable
          </h2>
          <p className="mt-1 text-sm font-semibold text-[var(--aw-muted)]">
            Attendance records could not be loaded.
          </p>
        </header>
      </section>
    );
  }

  return (
    <section className="flex min-h-0 flex-col gap-3">
      <AttendanceVerticalChart attendance={attendance} />

      <div className="border-t border-[var(--aw-border-soft)]">
        <div className="hidden min-h-0 flex-1 overflow-auto md:block">
          <table className="w-[max(100%,840px)] border-collapse text-left">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-[var(--aw-border-soft)] bg-[var(--aw-surface-muted)] text-[11px] font-black uppercase tracking-[0.08em] text-[var(--aw-muted)]">
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Member Code</th>
                <th className="px-4 py-3">FAN ID</th>
                <th className="px-4 py-3">PP ID</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Note</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[var(--aw-border-soft)] text-sm text-[var(--aw-text)]">
              {attendance.members.map((member) => (
                <tr key={member.memberId} className="hover:bg-[var(--aw-surface-muted)]">
                  <td className="px-4 py-3 font-black">{member.name}</td>
                  <td className="px-4 py-3 font-semibold text-[var(--aw-muted)]">
                    {member.memberCode || "—"}
                  </td>
                  <td className="px-4 py-3 font-semibold text-[var(--aw-muted)]">
                    {member.fanId || "—"}
                  </td>
                  <td className="px-4 py-3 font-semibold text-[var(--aw-muted)]">
                    {member.ppId || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <AttendanceStatusBadge status={member.status} />
                  </td>
                  <td className="px-4 py-3 font-semibold text-[var(--aw-muted)]">
                    {member.note || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 md:hidden">
          {attendance.members.map((member) => (
            <article
              key={member.memberId}
              className="border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-black text-[var(--aw-text)]">{member.name}</h3>
                  <p className="mt-1 text-xs font-semibold text-[var(--aw-muted)]">
                    {member.memberCode || member.fanId || member.ppId || "No code"}
                  </p>
                </div>
                <AttendanceStatusBadge status={member.status} />
              </div>

              {member.note ? (
                <p className="mt-2 text-xs font-semibold text-[var(--aw-muted)]">{member.note}</p>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function WoredaReportReviewPage() {
  const { announcementId, hibretId } = useParams();
  const [searchParams] = useSearchParams();

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

  async function loadReport() {
    if (!announcementId || !hibretId) return;

    setIsLoading(true);
    setError("");

    try {
      const response = await apiClient.get<{ report: HibretReport }>(
        `/woreda/announcements/${announcementId}/hibrets/${hibretId}/report`
      );

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
      const response = await apiClient.get<{ attendance: WoredaReportAttendance }>(
        `/woreda/announcements/${announcementId}/hibrets/${hibretId}/attendance`
      );

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
      const response = await apiClient.post<{ report: HibretReport }>(
        `/woreda/reports/${report.id}/review`,
        {
          decision,
          comment: comment || null,
        }
      );

      setReport(response.data.report);
    } catch {
      setError("Unable to submit review decision.");
    } finally {
      setIsReviewing(false);
    }
  }

  useEffect(() => {
    void loadReport();
  }, [announcementId, hibretId]);

  useEffect(() => {
    if (report?.announcement?.attendanceRequired) {
      void loadAttendance();
      return;
    }

    setAttendance(null);
  }, [report?.announcement?.attendanceRequired, announcementId, hibretId]);

  useEffect(() => {
    const imageAttachments =
      report?.attachments?.filter((attachment) => attachment.file.mimeType.startsWith("image/")) ?? [];

    if (!imageAttachments.length) {
      setImagePreviewUrls({});
      return;
    }

    let cancelled = false;
    const objectUrls: string[] = [];

    async function loadImagePreviews() {
      const entries = await Promise.all(
        imageAttachments.map(async (attachment) => {
          const response = await apiClient.get<Blob>(
            `/files/${attachment.file.id}/download?inline=true`,
            { responseType: "blob" }
          );

          const objectUrl = URL.createObjectURL(response.data);
          objectUrls.push(objectUrl);

          return [attachment.file.id, objectUrl] as const;
        })
      );

      if (!cancelled) {
        setImagePreviewUrls(Object.fromEntries(entries));
      }
    }

    void loadImagePreviews();

    return () => {
      cancelled = true;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [report?.attachments]);

  const canReview = report?.status === "submitted";
  const reviewedAt = report?.reviewedAt ? formatDate(report.reviewedAt) : null;

  const selectedAttachments = useMemo(() => {
    if (!report) return [];
    const selected = new Set(selectedAttachmentIds);
    return report.attachments.filter((attachment) => selected.has(attachment.id));
  }, [report, selectedAttachmentIds]);

  const imageAttachments = useMemo(
    () => report?.attachments.filter((attachment) => isImage(attachment.file.mimeType)) ?? [],
    [report]
  );
  const documentAttachments = useMemo(
    () => report?.attachments.filter((attachment) => !isImage(attachment.file.mimeType)) ?? [],
    [report]
  );

  function toggleAttachmentSelection(attachmentId: string) {
    setSelectedAttachmentIds((current) =>
      current.includes(attachmentId)
        ? current.filter((id) => id !== attachmentId)
        : [...current, attachmentId]
    );
  }

  function toggleSelectAllAttachments() {
    if (!report) return;

    if (selectedAttachmentIds.length === report.attachments.length) {
      setSelectedAttachmentIds([]);
      return;
    }

    setSelectedAttachmentIds(report.attachments.map((attachment) => attachment.id));
  }

  function downloadAttachments(attachments: ReviewAttachment[]) {
    attachments.forEach((attachment, index) => {
      openDownload(getFileDownloadUrl(attachment.file.id), index);
    });
  }

  if (isLoading) {
    return (
      <section className="border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] p-5">
        <p className="text-sm font-semibold text-[var(--aw-muted)]">Loading report.</p>
      </section>
    );
  }

  if (error && !report) {
    return (
      <section className="border border-[var(--aw-danger)] bg-[var(--aw-danger-bg)] p-5">
        <p className="text-sm font-semibold text-[var(--aw-danger)]">{error}</p>
      </section>
    );
  }

  if (!report) {
    return (
      <section className="border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] p-5">
        <p className="text-sm font-semibold text-[var(--aw-muted)]">Report not found.</p>
      </section>
    );
  }

  return (
    <section
      className="aw-report-review-page aw-ultrawide-guard aw-mobile-natural-scroll flex min-h-0 flex-1 flex-col gap-4 overflow-hidden"
    >
      {error ? (
        <div className="shrink-0 border border-[var(--aw-danger)] bg-[var(--aw-danger-bg)] px-4 py-3 text-sm font-bold text-[var(--aw-danger)]">
          {error}
        </div>
      ) : null}

      <section className="shrink-0 overflow-hidden rounded-3xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] shadow-sm">
        <div className="border-b border-[var(--aw-border-soft)] bg-[var(--aw-surface)] p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to={backTo}
                  className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-[var(--aw-border)] bg-[var(--aw-surface)] px-3 text-xs font-black text-[var(--aw-text)] hover:border-[var(--aw-primary)] hover:text-[var(--aw-primary)]"
                >
                  <ArrowLeft size={15} />
                  {backLabel}
                </Link>

                <span className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--aw-muted)]">
                  Hibret report review
                </span>
              </div>

              <div className="mt-2 flex min-w-0 flex-col gap-2 xl:flex-row xl:items-center">
                <h1 className="min-w-0 flex-1 break-words text-[clamp(1.15rem,1rem+0.8vw,1.65rem)] font-black leading-tight text-[var(--aw-text)]">
                  {report.title}
                </h1>

                <div className="flex shrink-0 flex-wrap gap-2">
                  <StatusPill value={report.status} />
                  <StatusPill value={report.reviewDecision} prefix="Review" />
                </div>
              </div>

              <p className="mt-1 break-words text-sm font-semibold text-[var(--aw-muted)]">
                {report.hibret.name} · {report.announcement.title}
              </p>

              {activeTab === "attendance" ? (
                <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
                  <CompactStat
                    label="Members"
                    value={attendance?.summary.total ?? "—"}
                  />
                  <CompactStat
                    label="Marked"
                    value={attendance?.summary.marked ?? "—"}
                  />
                  <CompactStat
                    label="Attendance Rate"
                    value={attendance ? `${attendance.summary.attendanceRate}%` : "—"}
                  />
                  <CompactStat
                    label="Completion"
                    value={attendance ? `${attendance.summary.completionRate}%` : "—"}
                  />
                </div>
              ) : null}
            </div>

            {activeTab === "attendance" ? (
              <div className="flex shrink-0 flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    downloadAuthenticatedExport(
                      `/woreda/announcements/${announcementId}/hibrets/${hibretId}/attendance.csv`
                    )
                  }
                  className="inline-flex min-h-9 w-fit items-center gap-2 rounded-xl border border-[var(--aw-border)] bg-[var(--aw-surface)] px-3 text-xs font-black text-[var(--aw-primary)] hover:border-[var(--aw-primary)]"
                >
                  <Download size={15} />
                  Export Attendance CSV
                </button>

                <button
                  type="button"
                  onClick={() =>
                    downloadAuthenticatedExport(
                      `/woreda/announcements/${announcementId}/hibrets/${hibretId}/attendance.xlsx`
                    )
                  }
                  className="inline-flex min-h-9 w-fit items-center gap-2 rounded-xl border border-[var(--aw-primary)] bg-[var(--aw-primary)] px-3 text-xs font-black text-white hover:bg-[var(--aw-primary-dark)]"
                >
                  <Download size={15} />
                  Export Attendance Excel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => downloadAuthenticatedExport(`/woreda/reports/${report.id}/export.zip`)}
                className="inline-flex min-h-9 w-fit shrink-0 items-center gap-2 rounded-xl border border-[var(--aw-primary)] bg-[var(--aw-primary)] px-3 text-xs font-black text-white hover:bg-[var(--aw-primary-dark)]"
              >
                <Download size={15} />
                Export Report
              </button>
            )}
          </div>

          {activeTab === "report" ? (
            <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
              <CompactStat label="Submitted" value={formatDate(report.submittedAt)} />
              <CompactStat label="Reviewed" value={formatDate(report.reviewedAt)} />
              <CompactStat label="Files" value={report.attachments.length} />
              <CompactStat label="Reviews" value={report.reviews.length} />
            </div>
          ) : null}
        </div>

        <div className="flex border-t border-[var(--aw-border-soft)] bg-[var(--aw-surface)]">
          <button
            type="button"
            onClick={() => setActiveTab("report")}
            className={[
              "min-h-11 border-r border-[var(--aw-border-soft)] px-4 text-sm font-black",
              activeTab === "report"
                ? "bg-[var(--aw-primary)] text-white"
                : "text-[var(--aw-text)] hover:bg-[var(--aw-surface-muted)]",
            ].join(" ")}
          >
            Report
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("attendance")}
            className={[
              "min-h-11 px-4 text-sm font-black",
              activeTab === "attendance"
                ? "bg-[var(--aw-primary)] text-white"
                : "text-[var(--aw-text)] hover:bg-[var(--aw-surface-muted)]",
            ].join(" ")}
          >
            Attendance
          </button>
        </div>
      </section>

      {activeTab === "report" ? (
        <div className="aw-report-review-body aw-detail-grid-responsive min-h-0 flex-1 overflow-y-auto pr-1">
          <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-3xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] shadow-sm">
            <header className="border-b border-[var(--aw-border-soft)] bg-[var(--aw-surface-muted)] p-4">
              <h2 className="text-lg font-black text-[var(--aw-text)]">Report details</h2>
              <p className="mt-1 text-sm font-semibold text-[var(--aw-muted)]">
                Submitted Hibret report body, summary, attachments, and media.
              </p>
            </header>

            <div className="space-y-5 p-4">
              <section>
                <p className="text-sm font-black text-[var(--aw-text)]">Summary</p>
                <div className="mt-2 border border-[var(--aw-border-soft)] bg-[var(--aw-surface-muted)] p-4 text-sm font-semibold leading-7 text-[var(--aw-text)]">
                  {report.summary || "No summary provided."}
                </div>
              </section>

              <section>
                <p className="text-sm font-black text-[var(--aw-text)]">Report body</p>
                <div className="mt-2 border border-[var(--aw-border-soft)] bg-[var(--aw-surface-muted)] p-4 text-sm font-semibold leading-7 text-[var(--aw-text)]">
                  <p className="whitespace-pre-wrap">{report.body}</p>
                </div>
              </section>

              <section>
                <div className="mb-3 flex flex-col gap-3 border-b border-[var(--aw-border-soft)] pb-3 md:flex-row md:items-end md:justify-between">
                  <div>
                    <h2 className="text-lg font-black text-[var(--aw-text)]">Attachments and media</h2>
                    <p className="mt-1 text-sm font-semibold text-[var(--aw-muted)]">
                      View, select, or download submitted report files.
                    </p>
                  </div>

                  {report.attachments.length ? (
                    <a
                      href={getAuthenticatedExportUrl(`/woreda/reports/${report.id}/attachments.zip`)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-10 w-fit items-center gap-2 border border-[var(--aw-primary)] bg-[var(--aw-primary)] px-4 text-xs font-black text-white hover:bg-[var(--aw-primary-dark)]"
                    >
                      <Download size={14} />
                      Download all
                    </a>
                  ) : null}
                </div>

                {report.attachments.length === 0 ? (
                  <div className="border border-dashed border-[var(--aw-border)] bg-[var(--aw-surface-muted)] px-4 py-8 text-center text-sm font-semibold text-[var(--aw-muted)]">
                    <ImageIcon className="mx-auto mb-2" size={30} />
                    No report attachments or media uploaded.
                  </div>
                ) : (
                  <>
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={toggleSelectAllAttachments}
                        className="min-h-9 rounded-xl border border-[var(--aw-border)] bg-[var(--aw-surface)] px-3 text-xs font-black text-[var(--aw-text)] hover:border-[var(--aw-primary)] hover:text-[var(--aw-primary)]"
                      >
                        {selectedAttachmentIds.length === report.attachments.length ? "Deselect all" : "Select all"}
                      </button>

                      <button
                        type="button"
                        disabled={selectedAttachments.length === 0}
                        onClick={() => downloadAttachments(selectedAttachments)}
                        className="min-h-9 rounded-xl border border-[var(--aw-border)] bg-[var(--aw-surface)] px-3 text-xs font-black text-[var(--aw-text)] hover:border-[var(--aw-primary)] hover:text-[var(--aw-primary)] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Download selected ({selectedAttachments.length})
                      </button>
                    </div>

                    {imageAttachments.length ? (
                      <div>
                        <p className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-[var(--aw-muted)]">
                          Media ({imageAttachments.length})
                        </p>
                        <div className="aw-media-grid-responsive">
                          {imageAttachments.map((attachment) => {
                            const previewUrl =
                              imagePreviewUrls[attachment.file.id] || getFileViewUrl(attachment.file.id);

                            return (
                              <AttachmentCard
                                key={attachment.id}
                                attachment={attachment}
                                previewUrl={previewUrl}
                                selected={selectedAttachmentIds.includes(attachment.id)}
                                onToggleSelected={() => toggleAttachmentSelection(attachment.id)}
                                onOpen={() => setViewerFile(attachment)}
                              />
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    {documentAttachments.length ? (
                      <div className="mt-4">
                        <p className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-[var(--aw-muted)]">
                          Submitted files ({documentAttachments.length})
                        </p>
                        <div className="overflow-x-auto border border-[var(--aw-border-soft)]">
                          <table className="w-[max(100%,640px)] border-collapse text-left">
                            <thead>
                              <tr className="border-b border-[var(--aw-border-soft)] bg-[var(--aw-surface-muted)] text-[11px] font-black uppercase tracking-[0.1em] text-[var(--aw-muted)]">
                                <th className="px-3 py-2">File</th>
                                <th className="px-3 py-2">Type</th>
                                <th className="px-3 py-2">Size</th>
                                <th className="px-3 py-2 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {documentAttachments.map((attachment) => (
                                <tr
                                  key={attachment.id}
                                  className="border-b border-[var(--aw-border-soft)] last:border-b-0 hover:bg-[var(--aw-surface-muted)]"
                                >
                                  <td className="px-3 py-2.5">
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        checked={selectedAttachmentIds.includes(attachment.id)}
                                        onChange={() => toggleAttachmentSelection(attachment.id)}
                                        className="h-4 w-4 accent-[var(--aw-primary)]"
                                        aria-label={`Select ${attachment.file.originalName}`}
                                      />
                                      <span className="truncate text-sm font-semibold text-[var(--aw-text)]">
                                        {attachment.file.originalName}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-3 py-2.5 text-xs font-semibold text-[var(--aw-muted)]">
                                    {compactMime(attachment.file.mimeType)}
                                  </td>
                                  <td className="px-3 py-2.5 text-xs font-semibold text-[var(--aw-muted)]">
                                    {bytesToMb(attachment.file.sizeBytes) || "—"}
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <div className="flex justify-end gap-2">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          window.open(getFilePreviewUrl(attachment.file.id), "_blank", "noopener,noreferrer")
                                        }
                                        className="inline-flex min-h-8 items-center gap-1.5 border border-[var(--aw-border)] bg-[var(--aw-surface)] px-2.5 text-xs font-black text-[var(--aw-text)] hover:border-[var(--aw-primary)] hover:text-[var(--aw-primary)]"
                                      >
                                        <Eye size={13} />
                                        View
                                      </button>
                                      <a
                                        href={getFileDownloadUrl(attachment.file.id)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex min-h-8 items-center gap-1.5 border border-[var(--aw-border)] bg-[var(--aw-surface)] px-2.5 text-xs font-black text-[var(--aw-text)] hover:border-[var(--aw-primary)] hover:text-[var(--aw-primary)]"
                                      >
                                        <Download size={13} />
                                        Download
                                      </a>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : null}
                  </>
                )}
              </section>
            </div>
          </section>

          <aside className="min-h-0 space-y-4">
            <section className="rounded-3xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] shadow-sm">
              <header className="border-b border-[var(--aw-border-soft)] bg-[var(--aw-surface-muted)] p-4">
                <h2 className="text-lg font-black text-[var(--aw-text)]">Review decision</h2>
                <p className="mt-1 text-sm font-semibold text-[var(--aw-muted)]">
                  Approve, reject, or request changes.
                </p>
              </header>

              <div className="space-y-4 p-4">
                <label className="block">
                  <span className="text-sm font-black text-[var(--aw-text)]">Review comment</span>
                  <textarea
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    rows={5}
                    disabled={!canReview}
                    className="mt-2 w-full resize-y border border-[var(--aw-border)] bg-[var(--aw-surface)] px-3 py-2.5 text-sm font-semibold text-[var(--aw-text)] outline-none focus:border-[var(--aw-primary)] disabled:opacity-60"
                  />
                </label>

                {canReview ? (
                  <div className="grid gap-2">
                    <button
                      type="button"
                      disabled={isReviewing}
                      onClick={() => reviewReport("approved")}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--aw-success)] bg-[var(--aw-success)] px-3 text-sm font-black text-white disabled:opacity-60"
                    >
                      <CheckCircle2 size={16} />
                      Approve
                    </button>

                    <button
                      type="button"
                      disabled={isReviewing}
                      onClick={() => reviewReport("changes_requested")}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--aw-warning)] bg-[var(--aw-warning-bg)] px-3 text-sm font-black text-[var(--aw-warning)] disabled:opacity-60"
                    >
                      <RotateCcw size={16} />
                      Request Changes
                    </button>

                    <button
                      type="button"
                      disabled={isReviewing}
                      onClick={() => reviewReport("rejected")}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--aw-danger)] bg-[var(--aw-danger)] px-3 text-sm font-black text-white disabled:opacity-60"
                    >
                      <XCircle size={16} />
                      Reject
                    </button>
                  </div>
                ) : (
                  <div className="border border-[var(--aw-border)] bg-[var(--aw-surface-muted)] px-4 py-3 text-sm font-bold text-[var(--aw-muted)]">
                    {report.reviewDecision
                      ? `This report was already reviewed as ${statusLabel(report.reviewDecision)}${reviewedAt ? ` on ${reviewedAt}` : ""}.`
                      : "This report is not ready for review."}
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] shadow-sm">
              <header className="border-b border-[var(--aw-border-soft)] bg-[var(--aw-surface-muted)] p-4">
                <h2 className="text-lg font-black text-[var(--aw-text)]">Review history</h2>
              </header>

              <div className="p-4">
                {report.reviews.length === 0 ? (
                  <div className="py-6 text-sm font-semibold italic text-[var(--aw-muted)]">
                    — No review history yet —
                  </div>
                ) : (
                  <div className="space-y-0">
                    {report.reviews.map((review, index) => (
                      <div key={review.id} className="relative flex gap-3 pb-5 last:pb-0">
                        <div className="flex flex-col items-center">
                          <span
                            className={[
                              "mt-1 h-3 w-3 border",
                              review.decision === "approved"
                                ? "border-[var(--aw-success)] bg-[var(--aw-success)]"
                                : review.decision === "rejected"
                                  ? "border-[var(--aw-danger)] bg-[var(--aw-danger)]"
                                  : "border-[var(--aw-warning)] bg-[var(--aw-warning)]",
                            ].join(" ")}
                          />
                          {index < report.reviews.length - 1 ? (
                            <span className="mt-1 h-full w-px bg-[var(--aw-border)]" />
                          ) : null}
                        </div>

                        <div className="min-w-0 flex-1">
                          <StatusPill value={review.decision} />
                          <p className="mt-2 text-sm font-semibold text-[var(--aw-text)]">
                            {review.comment || (
                              <span className="italic text-[var(--aw-muted)]">
                                — No comments available —
                              </span>
                            )}
                          </p>
                          <p className="mt-1 text-xs font-semibold text-[var(--aw-muted)]">
                            {formatDate(review.createdAt)}
                          </p>
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
        <div className="aw-report-review-body min-h-0 flex-1 overflow-y-auto pr-1">
          <AttendanceTab
            attendance={attendance}
            isLoading={isAttendanceLoading}
            required={Boolean(report.announcement.attendanceRequired)}
          />
        </div>
      )}

      {viewerFile ? (
        <div className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/70 p-3 sm:p-5">
          <div className="flex max-h-[calc(100dvh-24px)] w-full max-w-[min(96rem,calc(100vw-24px))] flex-col border border-[var(--aw-border)] bg-[var(--aw-surface)]">
            <div className="flex shrink-0 flex-col gap-3 border-b border-[var(--aw-border-soft)] bg-[var(--aw-surface-muted)] p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-[var(--aw-text)]">
                  {viewerFile.file.originalName}
                </p>
                <p className="mt-1 text-xs font-semibold text-[var(--aw-muted)]">
                  {viewerFile.file.mimeType}
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                <a
                  href={getFileDownloadUrl(viewerFile.file.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-[var(--aw-border)] bg-[var(--aw-surface)] px-3 text-xs font-black text-[var(--aw-text)] hover:border-[var(--aw-primary)] hover:text-[var(--aw-primary)]"
                >
                  <Download size={14} />
                  Download
                </a>

                <button
                  type="button"
                  onClick={() => setViewerFile(null)}
                  className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-[var(--aw-border)] bg-[var(--aw-surface)] px-3 text-xs font-black text-[var(--aw-text)] hover:border-[var(--aw-danger)] hover:text-[var(--aw-danger)]"
                >
                  <X size={14} />
                  Close
                </button>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-[var(--aw-sidebar)] p-3">
              {isImage(viewerFile.file.mimeType) ? (
                <img
                  src={imagePreviewUrls[viewerFile.file.id] || getFileViewUrl(viewerFile.file.id)}
                  alt=""
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <iframe
                  src={getFilePreviewUrl(viewerFile.file.id)}
                  title={viewerFile.file.originalName}
                  className="h-[75dvh] w-full bg-white"
                />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
