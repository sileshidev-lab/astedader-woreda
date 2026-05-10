import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Download,
  ExternalLink,
  FileText,
  Package,
  Send,
  Users,
  XCircle,
} from "lucide-react";
import {
  closeAnnouncement,
  downloadAuthenticatedExport,
  getAnnouncement,
  getFileDownloadUrl,
  getFileViewUrl,
  publishAnnouncement,
} from "../../../services/announcementService";
import type { Announcement, AnnouncementType } from "../../../types/announcement";

const typeLabels: Record<AnnouncementType, string> = {
  meeting: "Meeting",
  conference: "Conference",
  trend_report: "Trend Report",
  other: "Other",
};

type WoredaAnnouncementDetailTab = "targets" | "summary";

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function formatShortDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

function statusLabel(value: string) {
  if (value === "published") return "Active";
  return value.charAt(0).toUpperCase() + value.slice(1).replace("_", " ");
}

function reviewLabel(value?: string | null) {
  if (!value) return "Pending";
  return value.charAt(0).toUpperCase() + value.slice(1).replace("_", " ");
}

function statusBadgeClass(status: string) {
  if (status === "published") {
    return "border-[var(--aw-magenta)]/25 bg-[var(--aw-magenta-bg)] text-[var(--aw-magenta)]";
  }

  if (status === "closed") {
    return "border-[var(--aw-primary)]/20 bg-[var(--aw-primary-soft)] text-[var(--aw-primary)]";
  }

  return "border-[var(--aw-yellow)]/40 bg-[var(--aw-yellow-bg)] text-[var(--aw-yellow-text)]";
}

export function AnnouncementDetailPage() {
  const [activeTab, setActiveTab] = useState<WoredaAnnouncementDetailTab>("targets");
  const { announcementId } = useParams();

  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadAnnouncement() {
    if (!announcementId) return;

    setIsLoading(true);
    setError("");

    try {
      const data = await getAnnouncement(announcementId);
      setAnnouncement(data);
    } catch {
      setError("Unable to load announcement.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePublish() {
    if (!announcementId) return;

    setIsActionLoading(true);
    setError("");

    try {
      await publishAnnouncement(announcementId);
      await loadAnnouncement();
    } catch {
      setError("Unable to publish announcement.");
    } finally {
      setIsActionLoading(false);
    }
  }

  async function handleClose() {
    if (!announcementId) return;

    setIsActionLoading(true);
    setError("");

    try {
      await closeAnnouncement(announcementId);
      await loadAnnouncement();
    } catch {
      setError("Unable to close announcement.");
    } finally {
      setIsActionLoading(false);
    }
  }

  useEffect(() => {
    void loadAnnouncement();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [announcementId]);

  const reportByHibretId = useMemo(() => {
    const map = new Map<string, Announcement["reports"][number]>();

    announcement?.reports.forEach((report) => {
      map.set(report.hibretId, report);
    });

    return map;
  }, [announcement]);

  const submittedReports =
    announcement?.reports.filter((report) => report.submittedAt).length ?? 0;

  const targetCount = announcement?.targets.length ?? 0;
  const pendingReports = Math.max(targetCount - submittedReports, 0);

  const reviewedReports =
    announcement?.reports.filter((report) => Boolean(report.reviewDecision)).length ?? 0;

  if (isLoading) {
    return (
      <section className="flex min-h-[260px] items-center rounded-3xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] p-5 shadow-sm">
        <p className="text-sm font-semibold text-[var(--aw-muted)]">
          Loading announcement details.
        </p>
      </section>
    );
  }

  if (error || !announcement) {
    return (
      <section className="rounded-3xl border border-[var(--aw-danger)] bg-[var(--aw-danger-bg)] p-5 shadow-sm">
        <p className="text-sm font-semibold text-[var(--aw-danger)]">
          {error || "Announcement not found."}
        </p>
      </section>
    );
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto">
      {error ? (
        <div className="shrink-0 rounded-2xl border border-[var(--aw-danger)] bg-[var(--aw-danger-bg)] px-4 py-3 text-sm font-semibold text-[var(--aw-danger)]">
          {error}
        </div>
      ) : null}

      <section className="shrink-0 overflow-hidden rounded-3xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] shadow-sm">
        <div className="flex flex-col gap-4 border-b border-[var(--aw-border-soft)] bg-[var(--aw-surface)] p-4 sm:p-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <Link
              to="/woreda/announcements"
              className="inline-flex min-h-10 items-center gap-2 rounded-2xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] px-3 text-sm font-black text-[var(--aw-text)] shadow-sm hover:border-[var(--aw-primary)] hover:text-[var(--aw-primary)]"
            >
              <ArrowLeft size={16} />
              Back to Directives
            </Link>

            <p className="mt-5 text-[11px] font-black uppercase tracking-[0.16em] text-[var(--aw-muted)]">
              Woreda Directive
            </p>

            <h1 className="mt-1 max-w-5xl text-[clamp(1.25rem,2vw,1.9rem)] font-black leading-tight text-[var(--aw-text)]">
              {announcement.title}
            </h1>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex rounded-full border border-[var(--aw-border-soft)] bg-[var(--aw-surface-muted)] px-3 py-1 text-xs font-black text-[var(--aw-text)]">
                {typeLabels[announcement.type]}
              </span>

              <span
                className={[
                  "inline-flex rounded-full border px-3 py-1 text-xs font-black",
                  statusBadgeClass(announcement.status),
                ].join(" ")}
              >
                {statusLabel(announcement.status)}
              </span>

            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            {announcement.status === "published" ? (
              <button
                type="button"
                className="inline-flex min-h-10 items-center gap-2 rounded-2xl bg-[var(--aw-magenta)] px-4 text-sm font-black text-white shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handleClose}
                disabled={isActionLoading}
              >
                <XCircle size={16} />
                {isActionLoading ? "Closing..." : "Close"}
              </button>
            ) : null}

            {announcement.status === "draft" ? (
              <button
                type="button"
                className="inline-flex min-h-10 items-center gap-2 rounded-2xl bg-[var(--aw-primary)] px-4 text-sm font-black text-white shadow-sm hover:bg-[var(--aw-primary-dark)] disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handlePublish}
                disabled={isActionLoading}
              >
                <Send size={16} />
                {isActionLoading ? "Publishing..." : "Publish"}
              </button>
            ) : null}

            <button
              type="button"
              className="inline-flex min-h-10 items-center gap-2 rounded-2xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] px-4 text-sm font-black text-[var(--aw-primary)] shadow-sm hover:bg-[var(--aw-primary-soft)]"
              onClick={() =>
                downloadAuthenticatedExport(`/announcements/${announcement.id}/reports.pdf?lang=en`)
              }
            >
              <Download size={16} />
              Report EN
            </button>

            <button
              type="button"
              className="inline-flex min-h-10 items-center gap-2 rounded-2xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] px-4 text-sm font-black text-[var(--aw-primary)] shadow-sm hover:bg-[var(--aw-primary-soft)]"
              onClick={() =>
                downloadAuthenticatedExport(`/announcements/${announcement.id}/reports.pdf?lang=am`)
              }
            >
              <Download size={16} />
              Report AM
            </button>

            <button
              type="button"
              className="inline-flex min-h-10 items-center gap-2 rounded-2xl bg-[var(--aw-primary)] px-4 text-sm font-black text-white shadow-sm hover:bg-[var(--aw-primary-dark)]"
              onClick={() =>
                downloadAuthenticatedExport(`/announcements/${announcement.id}/export.zip`)
              }
            >
              <Package size={16} />
              Export Package
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 divide-y divide-[var(--aw-border-soft)] sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
          <StatCard
            label="Hibrets"
            value={targetCount}
            sub="Total assigned"
            icon={Users}
            tone="blue"
          />
          <StatCard
            label="Submitted Reports"
            value={submittedReports}
            sub="Submitted"
            icon={CheckCircle2}
            tone="green"
          />
          <StatCard
            label="Pending Reports"
            value={pendingReports}
            sub="Not yet submitted"
            icon={ClipboardList}
            tone="yellow"
          />
          <StatCard
            label="Reviewed"
            value={reviewedReports}
            sub="Completed reviews"
            icon={FileText}
            tone="pink"
          />
        </div>

        <div className="flex border-t border-[var(--aw-border-soft)] bg-[var(--aw-surface)] p-2">
          <button
            type="button"
            onClick={() => setActiveTab("targets")}
            className={[
              "min-h-11 rounded-2xl px-4 text-sm font-black transition",
              activeTab === "targets"
                ? "bg-[var(--aw-primary)] text-white shadow-sm"
                : "text-[var(--aw-text)] hover:bg-[var(--aw-surface-muted)]",
            ].join(" ")}
          >
            Hibrets
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("summary")}
            className={[
              "min-h-11 rounded-2xl px-4 text-sm font-black transition",
              activeTab === "summary"
                ? "bg-[var(--aw-primary)] text-white shadow-sm"
                : "text-[var(--aw-text)] hover:bg-[var(--aw-surface-muted)]",
            ].join(" ")}
          >
            Directive Summary
          </button>
        </div>
      </section>

      {activeTab === "targets" ? (
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] shadow-sm">
          <div className="shrink-0 border-b border-[var(--aw-border-soft)] bg-[var(--aw-surface)] p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-black text-[var(--aw-text)]">Hibrets</h2>
                <p className="mt-1 text-sm font-semibold text-[var(--aw-muted)]">
                  Submitted Hibrets can be opened for directive report review.
                </p>
              </div>

              <span className="w-fit rounded-2xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface-muted)] px-3 py-2 text-xs font-black text-[var(--aw-muted)]">
                {submittedReports} submitted / {targetCount} listed
              </span>
            </div>
          </div>

          <div className="hidden min-h-0 flex-1 overflow-auto md:block">
            <table className="w-[max(100%,900px)] border-collapse text-left">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-[var(--aw-border-soft)] bg-[var(--aw-surface-muted)] text-[11px] font-black uppercase tracking-[0.1em] text-[var(--aw-muted)]">
                  <th className="px-5 py-4">Hibret</th>
                  <th className="px-5 py-4">Submission</th>
                  <th className="px-5 py-4">Submitted At</th>
                  <th className="px-5 py-4">Review</th>
                  <th className="px-5 py-4 text-right">Report</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[var(--aw-border-soft)] text-sm text-[var(--aw-text)]">
                {announcement.targets.map((target) => {
                  const report = reportByHibretId.get(target.hibretId);
                  const submitted = Boolean(report?.submittedAt);

                  return (
                    <tr
                      key={target.id}
                      className="transition hover:bg-[var(--aw-primary-soft)]/50"
                    >
                      <td className="max-w-[360px] px-5 py-4 font-black">
                        <span className="line-clamp-2">{target.hibret.name}</span>
                      </td>

                      <td className="px-5 py-4">
                        <SubmissionBadge submitted={submitted} />
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 font-semibold text-[var(--aw-muted)]">
                        {report?.submittedAt ? formatDate(report.submittedAt) : "—"}
                      </td>

                      <td className="px-5 py-4">
                        <ReviewBadge value={report?.reviewDecision} />
                      </td>

                      <td className="px-5 py-4 text-right">
                        {submitted ? (
                          <Link
                            to={`/woreda/announcements/${announcement.id}/hibrets/${target.hibretId}/report`}
                            className="inline-flex min-h-9 items-center justify-center rounded-xl bg-[var(--aw-primary)] px-3 text-xs font-black text-white hover:bg-[var(--aw-primary-dark)]"
                          >
                            Review Report
                          </Link>
                        ) : (
                          <span className="inline-flex min-h-9 items-center rounded-xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface-muted)] px-3 text-xs font-black text-[var(--aw-muted)]">
                            Not submitted
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto p-4 md:hidden">
            {announcement.targets.map((target) => {
              const report = reportByHibretId.get(target.hibretId);
              const submitted = Boolean(report?.submittedAt);

              return (
                <article
                  key={target.id}
                  className="rounded-3xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] p-4 shadow-sm"
                >
                  <h3 className="font-black text-[var(--aw-text)]">{target.hibret.name}</h3>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <SubmissionBadge submitted={submitted} />
                    <ReviewBadge value={report?.reviewDecision} />
                  </div>

                  <p className="mt-3 text-xs font-semibold text-[var(--aw-muted)]">
                    Submitted at: {report?.submittedAt ? formatShortDate(report.submittedAt) : "—"}
                  </p>

                  <div className="mt-4">
                    {submitted ? (
                      <Link
                        to={`/woreda/announcements/${announcement.id}/hibrets/${target.hibretId}/report`}
                        className="inline-flex min-h-10 items-center justify-center rounded-2xl bg-[var(--aw-primary)] px-4 text-sm font-black text-white"
                      >
                        Review Report
                      </Link>
                    ) : (
                      <span className="inline-flex min-h-10 items-center rounded-2xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface-muted)] px-4 text-sm font-black text-[var(--aw-muted)]">
                        Not submitted
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {activeTab === "summary" ? (
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] shadow-sm">
          <div className="shrink-0 border-b border-[var(--aw-border-soft)] bg-[var(--aw-surface)] p-4 sm:p-5">
            <h2 className="text-lg font-black text-[var(--aw-text)]">Directive Summary</h2>
            <p className="mt-1 text-sm font-semibold text-[var(--aw-muted)]">
              Main details, instructions, and attached files.
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoCard label="Deadline" value={formatDate(announcement.deadline)} />
              <InfoCard label="Attachments" value={String(announcement.attachments.length)} />
            </div>

            <div className="mt-5">
              <p className="text-sm font-black text-[var(--aw-text)]">Instructions</p>
              <div className="mt-2 rounded-3xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface-muted)] p-4 text-sm font-semibold leading-7 text-[var(--aw-text)]">
                <p className="whitespace-pre-wrap">{announcement.instructions}</p>
              </div>
            </div>

            <div className="mt-5">
              <p className="text-sm font-black text-[var(--aw-text)]">Attachments</p>

              <div className="mt-3 grid gap-3">
                {announcement.attachments.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-[var(--aw-border-soft)] bg-[var(--aw-surface-muted)] px-4 py-8 text-center text-sm font-semibold text-[var(--aw-muted)]">
                    No attachments uploaded for this directive.
                  </div>
                ) : (
                  announcement.attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="rounded-3xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface-muted)] p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="break-all text-sm font-black text-[var(--aw-text)]">
                            {attachment.file.originalName}
                          </p>
                          <p className="mt-1 text-xs font-semibold text-[var(--aw-muted)]">
                            {attachment.file.mimeType}
                          </p>
                        </div>

                        <div className="flex shrink-0 flex-wrap gap-2">
                          <a
                            href={getFileViewUrl(attachment.file.id)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-[var(--aw-primary)] bg-[var(--aw-surface)] px-3 text-xs font-black text-[var(--aw-primary)] hover:bg-[var(--aw-primary)] hover:text-white"
                          >
                            <ExternalLink size={14} />
                            View
                          </a>

                          <a
                            href={getFileDownloadUrl(attachment.file.id)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] px-3 text-xs font-black text-[var(--aw-text)] hover:border-[var(--aw-primary)] hover:text-[var(--aw-primary)]"
                          >
                            <Download size={14} />
                            Download
                          </a>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </section>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  sub: string;
  icon: typeof Users;
  tone: "blue" | "green" | "yellow" | "pink";
}) {
  const toneClass = {
    blue: {
      soft: "bg-[var(--aw-primary-soft)]",
      icon: "bg-[var(--aw-primary)] text-white",
      bar: "bg-[var(--aw-primary)]",
    },
    green: {
      soft: "bg-[var(--aw-success-bg)]",
      icon: "bg-[var(--aw-success)] text-white",
      bar: "bg-[var(--aw-success)]",
    },
    yellow: {
      soft: "bg-[var(--aw-yellow-bg)]",
      icon: "bg-[var(--aw-yellow)] text-[var(--aw-primary-strong)]",
      bar: "bg-[var(--aw-yellow)]",
    },
    pink: {
      soft: "bg-[var(--aw-magenta-bg)]",
      icon: "bg-[var(--aw-magenta)] text-white",
      bar: "bg-[var(--aw-magenta)]",
    },
  }[tone];

  return (
    <article className="relative overflow-hidden p-5">
      <div className={`absolute right-0 top-0 h-20 w-20 rounded-bl-full ${toneClass.soft}`} />

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--aw-muted)]">
            {label}
          </p>
          <p className="mt-2 text-3xl font-black leading-none text-[var(--aw-text)]">
            {value}
          </p>
          <p className="mt-2 text-xs font-semibold text-[var(--aw-muted)]">{sub}</p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${toneClass.icon}`}
        >
          <Icon size={19} />
        </div>
      </div>

      <div className={`relative mt-4 h-1.5 rounded-full ${toneClass.bar}`} />
    </article>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-3xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface-muted)] p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.1em] text-[var(--aw-muted)]">
        {label}
      </p>
      <p className="mt-2 text-sm font-black text-[var(--aw-text)]">{value}</p>
    </article>
  );
}

function SubmissionBadge({ submitted }: { submitted: boolean }) {
  return (
    <span
      className={[
        "inline-flex rounded-full border px-3 py-1 text-xs font-black",
        submitted
          ? "border-[var(--aw-success)]/30 bg-[var(--aw-success-bg)] text-[var(--aw-success)]"
          : "border-[var(--aw-border-soft)] bg-[var(--aw-surface-muted)] text-[var(--aw-muted)]",
      ].join(" ")}
    >
      {submitted ? "Submitted" : "Not Submitted"}
    </span>
  );
}

function ReviewBadge({ value }: { value?: string | null }) {
  return (
    <span
      className={[
        "inline-flex rounded-full border px-3 py-1 text-xs font-black",
        value === "approved"
          ? "border-[var(--aw-success)]/30 bg-[var(--aw-success-bg)] text-[var(--aw-success)]"
          : value === "rejected"
            ? "border-[var(--aw-danger)]/30 bg-[var(--aw-danger-bg)] text-[var(--aw-danger)]"
            : value === "changes_requested"
              ? "border-[var(--aw-yellow)]/40 bg-[var(--aw-yellow-bg)] text-[var(--aw-yellow-text)]"
              : "border-[var(--aw-border-soft)] bg-[var(--aw-surface-muted)] text-[var(--aw-muted)]",
      ].join(" ")}
    >
      {reviewLabel(value)}
    </span>
  );
}
