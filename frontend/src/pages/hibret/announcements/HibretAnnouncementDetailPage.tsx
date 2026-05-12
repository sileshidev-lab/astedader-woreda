import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  Download,
  ExternalLink,
  FileText,
  Save,
  Send,
  UploadCloud,
  Users,
} from "lucide-react";
import {
  attachHibretReportFiles,
  getHibretAnnouncement,
  getHibretAttendance,
  saveHibretAttendance,
  saveHibretReport,
  submitHibretReport,
  uploadReportFile,
} from "../../../services/hibretService";
import type {
  AttendanceStatus,
  HibretAttendance,
} from "../../../services/hibretService";
import type { Announcement, AnnouncementType } from "../../../types/announcement";
import {
  getFileDownloadUrl,
  getFileViewUrl,
} from "../../../services/announcementService";
import { LoadingState } from "../../../components/ui/LoadingState";
import { ErrorState } from "../../../components/ui/ErrorState";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/shadcn/card";
import { Button } from "@/components/ui/shadcn/button";
import { Badge } from "@/components/ui/shadcn/badge";
import { Input } from "@/components/ui/shadcn/input";
import { Textarea } from "@/components/ui/shadcn/textarea";
import { Label } from "@/components/ui/shadcn/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/shadcn/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/shadcn/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/shadcn/table";
import { statusToBadgeVariant } from "@/lib/badge";

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
  other: "Other",
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

function getReportStatus(report?: LocalReport) {
  if (!report) return "Not started";
  return report.status || "draft";
}

function getReviewStatus(report?: LocalReport) {
  return report?.reviewDecision || "Pending";
}

export function HibretAnnouncementDetailPage() {
  const { announcementId } = useParams();

  const [activeTab, setActiveTab] = useState<ActiveTab>("report");
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [attendance, setAttendance] = useState<HibretAttendance | null>(null);
  const [attendanceRows, setAttendanceRows] = useState<Record<string, AttendanceDraftRow>>({});
  const [attendanceSearch, setAttendanceSearch] = useState("");
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState<
    "all" | AttendanceStatus | "unmarked"
  >("all");
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

  const report = useMemo(
    () => announcement?.reports?.[0] as LocalReport | undefined,
    [announcement],
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
      excused: rows.filter((row) => row.status === "excused").length,
    };
  }, [attendance?.members.length, attendanceRows]);

  const attendanceComplete = useMemo(() => {
    if (!announcement?.attendanceRequired) return true;
    if (!attendance) return false;
    if (attendanceSummary.total === 0) return true;

    return attendanceSummary.marked >= attendanceSummary.total;
  }, [
    announcement?.attendanceRequired,
    attendance,
    attendanceSummary.marked,
    attendanceSummary.total,
  ]);

  const attendanceLocked = Boolean(
    report?.submittedAt ||
      report?.status === "submitted" ||
      report?.status === "approved" ||
      report?.status === "rejected" ||
      report?.status === "changes_requested",
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
        note: member.note || "",
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        note: current[memberId]?.note || "",
      },
    }));
  }

  function setAttendanceNote(memberId: string, note: string) {
    setAttendanceRows((current) => ({
      ...current,
      [memberId]: {
        memberId,
        status: current[memberId]?.status ?? null,
        note,
      },
    }));
  }

  async function handleSaveAttendance() {
    if (!announcementId || !attendance) return;

    if (attendanceLocked) {
      toast.error("Attendance is locked after this report has been submitted to Woreda.");
      return;
    }

    setIsSavingAttendance(true);

    try {
      const records = Object.values(attendanceRows).filter(
        (row): row is AttendanceDraftRow & { status: AttendanceStatus } => Boolean(row.status),
      );

      const saved = await saveHibretAttendance(
        announcementId,
        records.map((row) => ({
          memberId: row.memberId,
          status: row.status,
          note: row.note || null,
        })),
      );

      setAttendance(saved);

      const nextRows: Record<string, AttendanceDraftRow> = {};
      saved.members.forEach((member) => {
        nextRows[member.memberId] = {
          memberId: member.memberId,
          status: member.status,
          note: member.note || "",
        };
      });

      setAttendanceRows(nextRows);
      toast.success("Attendance saved successfully.");
    } catch {
      toast.error("Unable to save attendance.");
    } finally {
      setIsSavingAttendance(false);
    }
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!announcementId) return;

    setIsSaving(true);

    try {
      const savedReport = await saveHibretReport(announcementId, {
        title,
        summary: summary || null,
        body,
      });

      if (selectedFiles.length) {
        const uploadedFiles = await Promise.all(
          selectedFiles.map((file) => uploadReportFile(file)),
        );

        await attachHibretReportFiles(
          savedReport.id,
          uploadedFiles.map((file) => file.id),
        );

        setSelectedFiles([]);
        setLocalImageUrls({});
      }

      toast.success("Report saved successfully.");
      await loadAnnouncement();
    } catch {
      toast.error("Unable to save report.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSubmit() {
    if (!report || !announcementId) return;

    if (announcement?.attendanceRequired && !attendanceComplete) {
      toast.error("Complete attendance for all Hibret members before submitting this report.");
      setActiveTab("attendance");
      return;
    }

    setIsSubmitting(true);

    try {
      if (announcement?.attendanceRequired && attendance) {
        const records = Object.values(attendanceRows).filter(
          (row): row is AttendanceDraftRow & { status: AttendanceStatus } =>
            Boolean(row.status),
        );

        if (records.length < attendance.summary.total) {
          toast.error("Every Hibret member must be marked before submitting.");
          setActiveTab("attendance");
          setIsSubmitting(false);
          return;
        }

        await saveHibretAttendance(
          announcementId,
          records.map((row) => ({
            memberId: row.memberId,
            status: row.status,
            note: row.note || null,
          })),
        );
      }

      await submitHibretReport(report.id);
      toast.success("Report submitted to Woreda.");
      await loadAnnouncement();
    } catch {
      toast.error("Unable to submit report.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <LoadingState label="Loading directive..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadAnnouncement} />;
  }

  if (!announcement) {
    return <ErrorState message="Directive not found." />;
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <Button asChild variant="outline" size="sm">
              <Link
                to="/hibret/announcements"
                className="inline-flex items-center gap-1.5"
              >
                <ArrowLeft aria-hidden />
                Back
              </Link>
            </Button>
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Assigned directive
            </p>
            <CardTitle className="text-base font-semibold">{announcement.title}</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="muted">{typeLabels[announcement.type]}</Badge>
              <Badge variant="destructive">
                Deadline: {formatDate(announcement.deadline)}
              </Badge>
              {announcement.attendanceRequired ? (
                <Badge variant="warning">Attendance required</Badge>
              ) : null}
              <Badge variant={statusToBadgeVariant(report?.status)}>
                Report: {statusWord(getReportStatus(report))}
              </Badge>
              <Badge variant={statusToBadgeVariant(report?.reviewDecision)}>
                Review: {statusWord(getReviewStatus(report))}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <ProgressStep label="Published" done />
            <ProgressStep
              label="Attendance"
              done={!announcement.attendanceRequired || attendanceComplete}
            />
            <ProgressStep
              label="Submitted"
              done={Boolean(
                report?.submittedAt ||
                  report?.status === "submitted" ||
                  report?.status === "approved",
              )}
            />
            <ProgressStep
              label={statusWord(getReviewStatus(report))}
              done={Boolean(report?.reviewDecision)}
            />
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ActiveTab)}>
        <TabsList>
          <TabsTrigger value="report">Report</TabsTrigger>
          {announcement.attendanceRequired ? (
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
          ) : null}
          <TabsTrigger value="directive">Directive</TabsTrigger>
        </TabsList>

        <TabsContent value="report">
          <ReportTab
            title={title}
            summary={summary}
            body={body}
            canEdit={Boolean(canEdit)}
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
        </TabsContent>

        {announcement.attendanceRequired ? (
          <TabsContent value="attendance">
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
          </TabsContent>
        ) : null}

        <TabsContent value="directive">
          <DirectiveTab
            instructions={announcement.instructions || ""}
            attachments={directiveAttachments}
          />
        </TabsContent>
      </Tabs>
    </section>
  );
}

function ProgressStep({ label, done }: { label: string; done: boolean }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </p>
        <p
          className={`mt-2 text-sm font-medium uppercase tracking-[0.05em] ${
            done ? "text-[var(--aw-success)]" : "text-muted-foreground"
          }`}
        >
          {done ? "Complete" : "Pending"}
        </p>
        <div
          className={`mt-3 h-1.5 rounded-full ${
            done ? "bg-[var(--aw-success)]" : "bg-muted"
          }`}
        />
      </CardContent>
    </Card>
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
  onSubmit,
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
    <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
      <form onSubmit={onSave} className="space-y-6">
        <Card>
          <CardHeader className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base font-semibold">
                Hibret final report workspace
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Prepare the official Hibret response, attach report media, then submit to
                Woreda.
              </CardDescription>
            </div>
            <Badge variant={statusToBadgeVariant(report?.status)}>
              {statusWord(getReportStatus(report))}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="report-title">
                Report title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="report-title"
                value={title}
                onChange={(event) => onTitle(event.target.value)}
                disabled={!canEdit}
                placeholder="Enter report title"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="report-summary">Executive summary</Label>
              <Textarea
                id="report-summary"
                value={summary}
                onChange={(event) => onSummary(event.target.value)}
                disabled={!canEdit}
                rows={5}
                placeholder="Enter the short executive summary."
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="report-body">
                Full report body <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="report-body"
                value={body}
                onChange={(event) => onBody(event.target.value)}
                disabled={!canEdit}
                rows={12}
                placeholder="Enter the full official Hibret report."
              />
            </div>

            {canEdit ? (
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-border bg-muted/30 px-4 py-8 text-center hover:border-primary">
                <UploadCloud
                  aria-hidden
                  className="size-7 text-primary"
                />
                <span className="mt-2 text-sm font-medium text-foreground">
                  Upload report media or files
                </span>
                <span className="mt-1 text-xs text-muted-foreground">
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
              <Card className="bg-muted/30">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">Selected files</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {selectedFiles.map((file) => (
                      <div
                        key={file.name}
                        className="rounded-md border border-border bg-card p-3"
                      >
                        {file.type.startsWith("image/") && localImageUrls[file.name] ? (
                          <img
                            src={localImageUrls[file.name]}
                            alt={file.name}
                            className="mb-3 h-36 w-full object-contain"
                          />
                        ) : (
                          <FileText className="mb-3 size-7 text-primary" aria-hidden />
                        )}
                        <p className="break-all text-sm font-medium text-foreground">
                          {file.name}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {file.type || "Unknown file"} {bytesToMb(file.size)}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : null}

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
              {canEdit ? (
                <Button
                  type="submit"
                  variant="default"
                  size="default"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2"
                >
                  <Save aria-hidden />
                  {isSaving ? "Saving..." : "Save draft"}
                </Button>
              ) : null}

              {canSubmit ? (
                <Button
                  type="button"
                  variant="success"
                  size="default"
                  onClick={onSubmit}
                  disabled={isSubmitting || !attendanceComplete}
                  className="inline-flex items-center gap-2"
                >
                  <Send aria-hidden />
                  {isSubmitting ? "Submitting..." : "Submit to Woreda"}
                </Button>
              ) : null}
            </div>

            {!canEdit ? (
              <p className="rounded-md border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                This report has been submitted to Woreda. Editing is locked unless Woreda
                requests changes.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <MediaSection
          title="Report downloads"
          description="Download the submitted report and all attached report media as an official package."
          attachments={reportAttachments}
          report={report}
        />
      </form>

      <Card className="xl:sticky xl:top-6">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Report status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <InfoLine label="Report" value={statusWord(getReportStatus(report))} />
          <InfoLine label="Woreda review" value={statusWord(getReviewStatus(report))} />
          <InfoLine label="Submitted" value={formatDate(report?.submittedAt)} />
        </CardContent>
      </Card>
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
  onSave,
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
    <Card>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold">Hibret member attendance</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Mark member attendance before submitting the final Hibret report.
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="default"
          size="default"
          onClick={onSave}
          disabled={isSaving || attendanceLocked}
          className="ml-auto inline-flex items-center gap-2"
        >
          <Save aria-hidden />
          {attendanceLocked
            ? "Attendance locked"
            : isSaving
              ? "Saving..."
              : "Save attendance"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {attendanceLocked ? (
          <p className="rounded-md border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            Attendance has been submitted to Woreda and is now read-only.
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <AttendanceMetric label="Members" value={summary.total} />
          <AttendanceMetric label="Marked" value={summary.marked} tone="info" />
          <AttendanceMetric label="Present" value={summary.present} tone="success" />
          <AttendanceMetric label="Absent" value={summary.absent} tone="danger" />
          <AttendanceMetric label="Excused" value={summary.excused} tone="warning" />
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(10rem,14rem)_auto]">
          <Input
            value={searchText}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search member, code, phone, or note"
          />
          <Select
            value={statusFilter}
            onValueChange={(value) =>
              onStatusFilter(value as "all" | AttendanceStatus | "unmarked")
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="present">Present</SelectItem>
              <SelectItem value="absent">Absent</SelectItem>
              <SelectItem value="excused">Excused</SelectItem>
              <SelectItem value="unmarked">Unmarked</SelectItem>
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" size="default" onClick={onClear}>
            Clear
          </Button>
        </div>

        {!attendance || filteredMembers.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Users className="mx-auto size-8 text-muted-foreground" aria-hidden />
            <p className="mt-3 text-sm text-muted-foreground">No members found.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.map((member) => {
                const row = attendanceRows[member.memberId] ?? {
                  memberId: member.memberId,
                  status: member.status,
                  note: member.note || "",
                };

                return (
                  <TableRow key={member.memberId}>
                    <TableCell>
                      <p className="font-medium text-foreground">{member.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {member.gender || "-"} · {member.phone || "-"}
                      </p>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {member.memberCode || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        {(["present", "absent", "excused"] as AttendanceStatus[]).map(
                          (status) => (
                            <Button
                              key={status}
                              type="button"
                              size="sm"
                              variant={
                                row.status === status
                                  ? status === "present"
                                    ? "success"
                                    : status === "absent"
                                      ? "destructive"
                                      : "default"
                                  : "outline"
                              }
                              onClick={() => onStatus(member.memberId, status)}
                              disabled={attendanceLocked}
                            >
                              {labelize(status)}
                            </Button>
                          ),
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={row.note}
                        onChange={(event) => onNote(member.memberId, event.target.value)}
                        disabled={attendanceLocked}
                        placeholder="Optional note"
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function DirectiveTab({
  instructions,
  attachments,
}: {
  instructions: string;
  attachments: FileAttachment[];
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Woreda directive</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Review the directive instructions and original files from Woreda.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
            Instructions
          </p>
          <div className="mt-3 whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-4 text-sm leading-7 text-foreground">
            {instructions || "No instructions"}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Directive attachments</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            {attachments.length} files attached by Woreda.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {attachments.length === 0 ? (
            <p className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-8 text-center text-sm text-muted-foreground">
              No directive attachments.
            </p>
          ) : (
            attachments.map((attachment) => (
              <CompactFileCard key={attachment.id} attachment={attachment} />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function labelize(value: string) {
  if (value === "changes_requested") return "Changes requested";
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function AttendanceMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "info" | "success" | "danger" | "warning";
}) {
  const toneClass =
    tone === "success"
      ? "text-[var(--aw-success)]"
      : tone === "danger"
        ? "text-[var(--aw-danger)]"
        : tone === "warning"
          ? "text-[var(--aw-warning)]"
          : tone === "info"
            ? "text-[var(--aw-info)]"
            : "text-foreground";

  return (
    <Card>
      <CardContent className="p-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </p>
        <p className={`mt-1 text-2xl font-semibold tabular-nums ${toneClass}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function MediaSection({
  title,
  description,
  attachments,
  report,
}: {
  title: string;
  description: string;
  attachments: FileAttachment[];
  report?: LocalReport;
}) {
  const images = attachments.filter((attachment) => isImageFile(attachment.file));
  const docs = attachments.filter((attachment) => !isImageFile(attachment.file));

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            {description}
          </CardDescription>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Badge variant="muted">{attachments.length} files</Badge>
          <Badge variant="muted">{images.length} media</Badge>
          <Badge variant="muted">{docs.length} documents</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {!report ? (
          <p className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
            Save the report first before exporting.
          </p>
        ) : null}

        <p className="mt-3 text-xs text-muted-foreground">
          The package includes the report, attendance CSV, media files, and document
          attachments in separate folders.
        </p>

        <div className="hidden">
          {images.map((attachment) => (
            <ImageFileCard key={attachment.id} attachment={attachment} />
          ))}
          {docs.map((attachment) => (
            <DocumentFileCard key={attachment.id} attachment={attachment} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ImageFileCard({ attachment }: { attachment: FileAttachment }) {
  const file = attachment.file;

  return (
    <article className="group overflow-hidden rounded-md border border-border bg-muted/30">
      <div className="relative h-48 bg-muted">
        <img
          src={getFileViewUrl(file.id)}
          alt={file.originalName}
          className="h-full w-full object-contain"
        />
        <div className="absolute inset-0 flex items-end justify-between gap-2 p-3 opacity-0 transition group-hover:opacity-100">
          <Button asChild variant="outline" size="sm">
            <a
              href={getFileViewUrl(file.id)}
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
              href={getFileDownloadUrl(file.id)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5"
            >
              <Download aria-hidden />
              Download
            </a>
          </Button>
        </div>
      </div>
      <div className="p-3">
        <p className="line-clamp-2 break-all text-sm font-medium text-foreground">
          {file.originalName}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {file.mimeType} {bytesToMb(file.sizeBytes)}
        </p>
      </div>
    </article>
  );
}

function DocumentFileCard({ attachment }: { attachment: FileAttachment }) {
  const file = attachment.file;

  return (
    <article className="flex gap-3 rounded-md border border-border bg-muted/30 p-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <FileText aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="break-all text-sm font-medium text-foreground">{file.originalName}</p>
        <p className="mt-1 text-xs text-muted-foreground">
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
    <div className="rounded-md border border-border bg-muted/30 p-3">
      {isImageFile(file) ? (
        <img
          src={getFileViewUrl(file.id)}
          alt={file.originalName}
          className="mb-2 h-24 w-full object-contain"
        />
      ) : (
        <FileText className="mb-2 size-6 text-primary" aria-hidden />
      )}
      <p className="break-all text-sm font-medium text-foreground">{file.originalName}</p>
      <p className="mt-1 text-xs text-muted-foreground">
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
      <Button asChild variant="outline" size="sm">
        <a
          href={getFileViewUrl(file.id)}
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
          href={getFileDownloadUrl(file.id)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5"
        >
          <Download aria-hidden />
          Download
        </a>
      </Button>
    </>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 p-3">
      <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
