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
import { toast } from "sonner";
import {
  closeAnnouncement,
  downloadAuthenticatedExport,
  getAnnouncement,
  getFileDownloadUrl,
  getFileViewUrl,
  publishAnnouncement,
} from "../../../services/announcementService";
import type { Announcement, AnnouncementType } from "../../../types/announcement";
import { useAuthStore } from "../../../stores/authStore";
import { ErrorState } from "../../../components/ui/ErrorState";
import { LoadingState } from "../../../components/ui/LoadingState";
import { EmptyState } from "../../../components/ui/EmptyState";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/shadcn/card";
import { Button } from "@/components/ui/shadcn/button";
import { Badge } from "@/components/ui/shadcn/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/shadcn/tabs";
import { statusToBadgeVariant } from "@/lib/badge";

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

function StatTile({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: number;
  sub: string;
  icon: typeof Users;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 py-4">
      <div className="min-w-0 space-y-1">
        <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
          {label}
        </p>
        <p className="text-2xl font-semibold tabular-nums leading-none tracking-tight text-foreground">
          {value}
        </p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
      <Icon size={18} className="shrink-0 text-muted-foreground" aria-hidden />
    </div>
  );
}

export function AnnouncementDetailPage() {
  const [activeTab, setActiveTab] = useState<WoredaAnnouncementDetailTab>("targets");
  const { announcementId } = useParams();
  const { hasPrivilege } = useAuthStore();
  const canExport = hasPrivilege("announcement.export") || hasPrivilege("report.export");

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

    try {
      await publishAnnouncement(announcementId);
      toast.success("Directive published");
      await loadAnnouncement();
    } catch {
      toast.error("Unable to publish announcement.");
    } finally {
      setIsActionLoading(false);
    }
  }

  async function handleClose() {
    if (!announcementId) return;

    setIsActionLoading(true);

    try {
      await closeAnnouncement(announcementId);
      toast.success("Directive closed");
      await loadAnnouncement();
    } catch {
      toast.error("Unable to close announcement.");
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
    return <LoadingState label="Loading announcement details." />;
  }

  if (error || !announcement) {
    return (
      <ErrorState
        message={error || "Announcement not found."}
        onRetry={loadAnnouncement}
      />
    );
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col space-y-6 overflow-y-auto">
      <Card>
        <CardHeader className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 space-y-3">
            <Button asChild variant="outline" size="sm">
              <Link to="/woreda/announcements" className="inline-flex items-center gap-2">
                <ArrowLeft aria-hidden />
                Back to Directives
              </Link>
            </Button>

            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Woreda Directive
              </p>
              <CardTitle className="mt-1 text-xl leading-tight">
                {announcement.title}
              </CardTitle>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{typeLabels[announcement.type]}</Badge>
              <Badge variant={statusToBadgeVariant(announcement.status)}>
                {statusLabel(announcement.status)}
              </Badge>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 xl:ml-auto">
            {announcement.status === "published" ? (
              <Button
                type="button"
                variant="destructive"
                size="default"
                onClick={handleClose}
                disabled={isActionLoading}
              >
                <XCircle aria-hidden />
                {isActionLoading ? "Closing..." : "Close"}
              </Button>
            ) : null}

            {announcement.status === "draft" ? (
              <Button
                type="button"
                variant="default"
                size="default"
                onClick={handlePublish}
                disabled={isActionLoading}
              >
                <Send aria-hidden />
                {isActionLoading ? "Publishing..." : "Publish"}
              </Button>
            ) : null}

            {canExport ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  onClick={() =>
                    downloadAuthenticatedExport(
                      `/announcements/${announcement.id}/reports.csv`,
                    )
                  }
                >
                  <Download aria-hidden />
                  Reports CSV
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  onClick={() =>
                    downloadAuthenticatedExport(
                      `/announcements/${announcement.id}/reports.pdf?lang=en`,
                    )
                  }
                >
                  <Download aria-hidden />
                  Report PDF (EN)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  onClick={() =>
                    downloadAuthenticatedExport(
                      `/announcements/${announcement.id}/reports.pdf?lang=am`,
                    )
                  }
                >
                  <Download aria-hidden />
                  Report PDF (AM)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  onClick={() =>
                    downloadAuthenticatedExport(
                      `/announcements/${announcement.id}/reports.pdf?lang=om`,
                    )
                  }
                >
                  <Download aria-hidden />
                  Report PDF (OM)
                </Button>
                <Button
                  type="button"
                  variant="default"
                  size="default"
                  onClick={() =>
                    downloadAuthenticatedExport(
                      `/announcements/${announcement.id}/export.zip`,
                    )
                  }
                >
                  <Package aria-hidden />
                  Export Package
                </Button>
              </>
            ) : null}
          </div>
        </CardHeader>

        <CardContent className="grid grid-cols-1 divide-y divide-border border-t border-border px-0 py-0 sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
          <StatTile label="Hibrets" value={targetCount} sub="Total assigned" icon={Users} />
          <StatTile
            label="Submitted Reports"
            value={submittedReports}
            sub="Submitted"
            icon={CheckCircle2}
          />
          <StatTile
            label="Pending Reports"
            value={pendingReports}
            sub="Not yet submitted"
            icon={ClipboardList}
          />
          <StatTile
            label="Reviewed"
            value={reviewedReports}
            sub="Completed reviews"
            icon={FileText}
          />
        </CardContent>
      </Card>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as WoredaAnnouncementDetailTab)}
        className="flex min-h-0 flex-1 flex-col"
      >
        <TabsList className="self-start">
          <TabsTrigger value="targets">Hibrets</TabsTrigger>
          <TabsTrigger value="summary">Directive Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="targets" className="mt-4 flex min-h-0 flex-1 flex-col">
          <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-1">
                <CardTitle>Hibrets</CardTitle>
                <CardDescription>
                  Submitted Hibrets can be opened for directive report review.
                </CardDescription>
              </div>
              <Badge variant="muted">
                {submittedReports} submitted / {targetCount} listed
              </Badge>
            </CardHeader>

            <CardContent className="hidden min-h-0 flex-1 overflow-auto px-0 pt-0 md:block">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-5 py-3 text-xs font-medium uppercase tracking-[0.04em] text-muted-foreground">
                      Hibret
                    </th>
                    <th className="px-5 py-3 text-xs font-medium uppercase tracking-[0.04em] text-muted-foreground">
                      Submission
                    </th>
                    <th className="px-5 py-3 text-xs font-medium uppercase tracking-[0.04em] text-muted-foreground">
                      Submitted At
                    </th>
                    <th className="px-5 py-3 text-xs font-medium uppercase tracking-[0.04em] text-muted-foreground">
                      Review
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-[0.04em] text-muted-foreground">
                      Report
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border text-foreground">
                  {announcement.targets.map((target) => {
                    const report = reportByHibretId.get(target.hibretId);
                    const submitted = Boolean(report?.submittedAt);

                    return (
                      <tr key={target.id} className="transition-colors hover:bg-muted/40">
                        <td className="max-w-[360px] px-5 py-3 text-sm font-medium">
                          <span className="line-clamp-2">{target.hibret.name}</span>
                        </td>
                        <td className="px-5 py-3">
                          <Badge variant={submitted ? "success" : "muted"}>
                            {submitted ? "Submitted" : "Not Submitted"}
                          </Badge>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-sm text-muted-foreground">
                          {report?.submittedAt ? formatDate(report.submittedAt) : "—"}
                        </td>
                        <td className="px-5 py-3">
                          <Badge variant={statusToBadgeVariant(report?.reviewDecision)}>
                            {reviewLabel(report?.reviewDecision)}
                          </Badge>
                        </td>
                        <td className="px-5 py-3 text-right">
                          {submitted ? (
                            <Button asChild variant="default" size="sm">
                              <Link
                                to={`/woreda/announcements/${announcement.id}/hibrets/${target.hibretId}/report`}
                              >
                                Review Report
                              </Link>
                            </Button>
                          ) : (
                            <Badge variant="muted">Not submitted</Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>

            <CardContent className="grid min-h-0 flex-1 gap-3 overflow-y-auto px-5 py-4 md:hidden">
              {announcement.targets.map((target) => {
                const report = reportByHibretId.get(target.hibretId);
                const submitted = Boolean(report?.submittedAt);

                return (
                  <Card key={target.id}>
                    <CardContent className="space-y-3 px-4 py-4">
                      <h3 className="text-sm font-semibold text-foreground">
                        {target.hibret.name}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={submitted ? "success" : "muted"}>
                          {submitted ? "Submitted" : "Not Submitted"}
                        </Badge>
                        <Badge variant={statusToBadgeVariant(report?.reviewDecision)}>
                          {reviewLabel(report?.reviewDecision)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Submitted at:{" "}
                        {report?.submittedAt ? formatShortDate(report.submittedAt) : "—"}
                      </p>
                      {submitted ? (
                        <Button asChild variant="default" size="sm">
                          <Link
                            to={`/woreda/announcements/${announcement.id}/hibrets/${target.hibretId}/report`}
                          >
                            Review Report
                          </Link>
                        </Button>
                      ) : (
                        <Badge variant="muted">Not submitted</Badge>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary" className="mt-4 flex min-h-0 flex-1 flex-col">
          <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <CardHeader>
              <CardTitle>Directive Summary</CardTitle>
              <CardDescription>
                Main details, instructions, and attached files.
              </CardDescription>
            </CardHeader>

            <CardContent className="min-h-0 flex-1 space-y-5 overflow-y-auto">
              <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                  <CardContent className="space-y-1 px-4 py-3">
                    <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                      Deadline
                    </p>
                    <p className="text-sm font-medium text-foreground">
                      {formatDate(announcement.deadline)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="space-y-1 px-4 py-3">
                    <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                      Attachments
                    </p>
                    <p className="text-sm font-medium text-foreground">
                      {announcement.attachments.length}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold text-foreground">
                  Instructions
                </h3>
                <div className="rounded-md border border-border bg-muted/30 p-4 text-sm leading-relaxed text-foreground">
                  <p className="whitespace-pre-wrap">{announcement.instructions}</p>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Attachments</h3>
                {announcement.attachments.length === 0 ? (
                  <EmptyState
                    title="No attachments"
                    message="No attachments uploaded for this directive."
                  />
                ) : (
                  <div className="grid gap-3">
                    {announcement.attachments.map((attachment) => (
                      <Card key={attachment.id}>
                        <CardContent className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 space-y-1">
                            <p className="break-all text-sm font-medium text-foreground">
                              {attachment.file.originalName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {attachment.file.mimeType}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-wrap items-center gap-2">
                            <Button asChild variant="outline" size="sm">
                              <a
                                href={getFileViewUrl(attachment.file.id)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5"
                              >
                                <ExternalLink aria-hidden />
                                View
                              </a>
                            </Button>
                            <Button asChild variant="outline" size="sm">
                              <a
                                href={getFileDownloadUrl(attachment.file.id)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5"
                              >
                                <Download aria-hidden />
                                Download
                              </a>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </section>
  );
}
