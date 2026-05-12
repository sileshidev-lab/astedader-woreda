import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  ChevronDown,
  Download,
  Eye,
  FilePlus2,
  Filter,
  Search,
  Upload,
} from "lucide-react";
import {
  attachFilesToAnnouncement,
  createAnnouncement,
  downloadAuthenticatedExport,
  getAnnouncements,
  getHibrets,
  type PaginationMeta,
  type WoredaAnnouncementsSummary,
  uploadAnnouncementFile,
} from "../../../services/announcementService";
import type {
  Announcement,
  AnnouncementStatus,
  AnnouncementType,
  HibretOption,
} from "../../../types/announcement";
import { useAuthStore } from "../../../stores/authStore";
import { EmptyState } from "../../../components/ui/EmptyState";
import { LoadingState } from "../../../components/ui/LoadingState";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/shadcn/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/shadcn/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/shadcn/dropdown-menu";
import { Checkbox } from "@/components/ui/shadcn/checkbox";
import { statusToBadgeVariant } from "@/lib/badge";

type StatusFilter = "all" | AnnouncementStatus;
type TypeFilter = "all" | AnnouncementType;
type DateFilter = "all" | "week" | "month" | "last_30_days" | "custom";

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

function normalizeDisplayText(value: string) {
  return value.replace(/\bConfrence\b/gi, "Conference").replace(/\bMontly\b/gi, "Monthly");
}

function startOfWeek(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = copy.getDate() - day + (day === 0 ? -6 : 1);
  copy.setDate(diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function resolveDateRange(dateFilter: DateFilter, customFrom: string, customTo: string) {
  const now = new Date();

  if (dateFilter === "week") {
    return {
      dateFrom: startOfWeek(now).toISOString().slice(0, 10),
      dateTo: now.toISOString().slice(0, 10),
    };
  }

  if (dateFilter === "month") {
    return {
      dateFrom: startOfMonth(now).toISOString().slice(0, 10),
      dateTo: now.toISOString().slice(0, 10),
    };
  }

  if (dateFilter === "last_30_days") {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    return {
      dateFrom: thirtyDaysAgo.toISOString().slice(0, 10),
      dateTo: now.toISOString().slice(0, 10),
    };
  }

  if (dateFilter === "custom") {
    return {
      dateFrom: customFrom || undefined,
      dateTo: customTo || undefined,
    };
  }

  return {};
}

function statusLabel(status: AnnouncementStatus, t: (key: string) => string) {
  if (status === "published") return t("announcements.status.active");
  if (status === "draft") return t("announcements.status.draft");
  return t("announcements.status.closed");
}

function typeLabel(type: AnnouncementType, t: (key: string) => string) {
  return t(`announcements.type.${type}`);
}

function KpiTile({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 px-4 py-3">
        <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
          {label}
        </span>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        <p className="text-2xl font-semibold tabular-nums leading-none tracking-tight text-foreground">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

export function AnnouncementsPage() {
  const { t } = useTranslation();
  const { hasPrivilege } = useAuthStore();
  const canExport = hasPrivilege("announcement.export") || hasPrivilege("report.export");

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [hibrets, setHibrets] = useState<HibretOption[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [summary, setSummary] = useState<WoredaAnnouncementsSummary>({
    total: 0,
    draft: 0,
    published: 0,
    closed: 0,
    pendingReports: 0,
    submissionRate: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const [searchText, setSearchText] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [title, setTitle] = useState("");
  const [type, setType] = useState<AnnouncementType>("meeting");
  const [instructions, setInstructions] = useState("");
  const [deadline, setDeadline] = useState("");
  const [attendanceRequired, setAttendanceRequired] = useState(false);
  const [targetHibretIds, setTargetHibretIds] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [hibretSearch, setHibretSearch] = useState("");

  async function loadData() {
    setIsLoading(true);

    try {
      const { dateFrom, dateTo } = resolveDateRange(dateFilter, customFrom, customTo);

      const announcementsResponse = await getAnnouncements({
        page,
        pageSize,
        search: searchText.trim() || undefined,
        type: typeFilter === "all" ? undefined : typeFilter,
        status: statusFilter === "all" ? undefined : statusFilter,
        dateFrom,
        dateTo,
      });

      setAnnouncements(announcementsResponse.announcements);
      setPagination(announcementsResponse.pagination);
      setSummary(announcementsResponse.summary);

      if (!hibrets.length) {
        const hibretData = await getHibrets();
        setHibrets(hibretData);
      }
    } catch {
      toast.error(t("announcements.errors.load"));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, searchText, typeFilter, statusFilter, dateFilter, customFrom, customTo]);

  useEffect(() => {
    setPage(1);
  }, [searchText, typeFilter, statusFilter, dateFilter, customFrom, customTo]);

  const filteredHibrets = useMemo(() => {
    const query = hibretSearch.trim().toLowerCase();
    if (!query) return hibrets;
    return hibrets.filter((hibret) => hibret.name.toLowerCase().includes(query));
  }, [hibrets, hibretSearch]);

  function resetForm() {
    setTitle("");
    setType("meeting");
    setInstructions("");
    setDeadline("");
    setAttendanceRequired(false);
    setTargetHibretIds([]);
    setSelectedFiles([]);
    setHibretSearch("");
  }

  function toggleHibret(hibretId: string) {
    setTargetHibretIds((current) =>
      current.includes(hibretId)
        ? current.filter((id) => id !== hibretId)
        : [...current, hibretId],
    );
  }

  function toggleAllHibrets() {
    if (targetHibretIds.length === hibrets.length) {
      setTargetHibretIds([]);
      return;
    }

    setTargetHibretIds(hibrets.map((hibret) => hibret.id));
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!targetHibretIds.length) {
      toast.error(t("announcements.errors.targetRequired"));
      return;
    }

    setIsCreating(true);

    try {
      const announcement = await createAnnouncement({
        title: title.trim(),
        type,
        instructions: instructions.trim(),
        deadline: deadline ? new Date(deadline).toISOString() : null,
        attendanceRequired,
        targetHibretIds,
      });

      if (selectedFiles.length) {
        const uploadedFiles = await Promise.all(
          selectedFiles.map((file) => uploadAnnouncementFile(file)),
        );

        await attachFilesToAnnouncement(
          announcement.id,
          uploadedFiles.map((file) => file.id),
        );
      }

      resetForm();
      setDrawerOpen(false);
      toast.success(t("announcements.form.create"));
      await loadData();
    } catch {
      toast.error(t("announcements.errors.create"));
    } finally {
      setIsCreating(false);
    }
  }

  function openCreateDrawer() {
    resetForm();
    setDrawerOpen(true);
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label={t("announcements.kpi.total")} value={summary.total} />
        <KpiTile label={t("announcements.kpi.active")} value={summary.published} />
        <KpiTile label={t("announcements.kpi.draft")} value={summary.draft} />
        <KpiTile label={t("announcements.kpi.closed")} value={summary.closed} />
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-1">
            <CardTitle>
              {t("announcements.listTitle", { defaultValue: "Directive List" })}
            </CardTitle>
            <CardDescription>
              {t("announcements.listDescription", {
                defaultValue: "Search, filter, and review Woreda directives.",
              })}
            </CardDescription>
          </div>

          <div className="flex flex-col gap-2 lg:flex-row lg:items-center xl:ml-auto">
            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                type="search"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder={t("announcements.searchPlaceholder")}
                className="pl-9 sm:min-w-[260px]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="default"
                className="md:hidden"
                onClick={() => setMobileFiltersOpen((open) => !open)}
                aria-expanded={mobileFiltersOpen}
                aria-controls="announcement-filters"
              >
                <Filter aria-hidden />
                {t("common.filters")}
              </Button>

              {canExport ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" size="default">
                      <Download aria-hidden />
                      {t("announcements.export")}
                      <ChevronDown aria-hidden />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem
                      onSelect={() =>
                        downloadAuthenticatedExport("/announcements/export.csv")
                      }
                    >
                      CSV (Directives)
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() =>
                        downloadAuthenticatedExport(
                          "/announcements/export.pdf?lang=en",
                        )
                      }
                    >
                      PDF (English)
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() =>
                        downloadAuthenticatedExport(
                          "/announcements/export.pdf?lang=am",
                        )
                      }
                    >
                      PDF (አማርኛ)
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() =>
                        downloadAuthenticatedExport(
                          "/announcements/export.pdf?lang=om",
                        )
                      }
                    >
                      PDF (Afaan Oromoo)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}

              <Button type="button" variant="default" size="default" onClick={openCreateDrawer}>
                <FilePlus2 aria-hidden />
                <span className="hidden sm:inline">{t("announcements.newDirective")}</span>
                <span className="sm:hidden">{t("common.create")}</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent
          id="announcement-filters"
          className={[
            "gap-2 pt-0",
            mobileFiltersOpen ? "grid grid-cols-1 sm:grid-cols-2" : "hidden",
            "md:flex md:flex-wrap",
          ].join(" ")}
        >
          <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as TypeFilter)}>
            <SelectTrigger className="min-w-[160px] md:w-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("announcements.filters.typeAll")}</SelectItem>
              <SelectItem value="meeting">{t("announcements.type.meeting")}</SelectItem>
              <SelectItem value="conference">{t("announcements.type.conference")}</SelectItem>
              <SelectItem value="trend_report">{t("announcements.type.trend_report")}</SelectItem>
              <SelectItem value="other">{t("announcements.type.other")}</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as StatusFilter)}
          >
            <SelectTrigger className="min-w-[160px] md:w-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("announcements.filters.statusAll")}</SelectItem>
              <SelectItem value="published">{t("announcements.status.active")}</SelectItem>
              <SelectItem value="draft">{t("announcements.status.draft")}</SelectItem>
              <SelectItem value="closed">{t("announcements.status.closed")}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={dateFilter} onValueChange={(value) => setDateFilter(value as DateFilter)}>
            <SelectTrigger className="min-w-[160px] md:w-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("announcements.filters.timeAll")}</SelectItem>
              <SelectItem value="week">{t("announcements.filters.thisWeek")}</SelectItem>
              <SelectItem value="month">{t("announcements.filters.thisMonth")}</SelectItem>
              <SelectItem value="last_30_days">{t("announcements.filters.last30")}</SelectItem>
              <SelectItem value="custom">{t("announcements.filters.custom")}</SelectItem>
            </SelectContent>
          </Select>

          {dateFilter === "custom" ? (
            <>
              <Input
                type="date"
                value={customFrom}
                onChange={(event) => setCustomFrom(event.target.value)}
                aria-label={t("announcements.filters.from")}
                className="md:w-auto"
              />
              <Input
                type="date"
                value={customTo}
                onChange={(event) => setCustomTo(event.target.value)}
                aria-label={t("announcements.filters.to")}
                className="md:w-auto"
              />
            </>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle>
              {pagination.total} {t("sidebar.announcements")}
            </CardTitle>
            <CardDescription>
              {t("announcements.mobileHint", {
                defaultValue: "Swipe cards on mobile. Table view appears on wider screens.",
              })}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 px-0 pb-0 pt-0">
          <div className="grid gap-3 px-5 pb-3 md:hidden">
            {isLoading ? (
              <LoadingState label={`${t("common.loading")}...`} />
            ) : announcements.length === 0 ? (
              <EmptyState
                title={t("announcements.emptyTitle")}
                message={t("announcements.emptyDescription")}
              />
            ) : (
              announcements.map((announcement) => (
                <Card key={announcement.id}>
                  <CardHeader className="gap-1 px-4 py-3">
                    <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                      {typeLabel(announcement.type, t)}
                    </p>
                    <Link
                      to={`/woreda/announcements/${announcement.id}`}
                      className="line-clamp-2 text-sm font-semibold text-foreground hover:text-primary"
                    >
                      {normalizeDisplayText(announcement.title)}
                    </Link>
                  </CardHeader>
                  <CardContent className="grid gap-2 px-4 pb-4 pt-0 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs text-muted-foreground">
                        {t("announcements.table.status")}
                      </span>
                      <Badge variant={statusToBadgeVariant(announcement.status)}>
                        {statusLabel(announcement.status, t)}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs text-muted-foreground">
                        {t("announcements.table.deadline")}
                      </span>
                      <span className="text-sm text-foreground">
                        {formatDate(announcement.deadline)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs text-muted-foreground">
                        {t("announcements.table.hibrets")}
                      </span>
                      <span className="text-sm text-foreground">
                        {announcement.targets.length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs text-muted-foreground">
                        {t("announcements.table.reports")}
                      </span>
                      <span className="text-sm text-foreground">
                        {announcement.reports.length}
                      </span>
                    </div>

                    <Button asChild variant="default" size="sm" className="mt-2">
                      <Link
                        to={`/woreda/announcements/${announcement.id}`}
                        className="inline-flex items-center gap-2"
                      >
                        <Eye aria-hidden />
                        {t("common.open")}
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-[0.04em] text-muted-foreground">
                    {t("announcements.table.title")}
                  </th>
                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-[0.04em] text-muted-foreground">
                    {t("announcements.table.type")}
                  </th>
                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-[0.04em] text-muted-foreground">
                    {t("announcements.table.status")}
                  </th>
                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-[0.04em] text-muted-foreground">
                    {t("announcements.table.deadline")}
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-[0.04em] text-muted-foreground">
                    {t("announcements.table.hibrets")}
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-[0.04em] text-muted-foreground">
                    {t("announcements.table.reports")}
                  </th>
                  <th className="px-5 py-3 text-center text-xs font-medium uppercase tracking-[0.04em] text-muted-foreground">
                    {t("announcements.table.action")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-sm text-muted-foreground">
                      {t("common.loading")}...
                    </td>
                  </tr>
                ) : announcements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-10">
                      <EmptyState
                        title={t("announcements.emptyTitle")}
                        message={t("announcements.emptyDescription")}
                        action={
                          <Button type="button" variant="default" size="sm" onClick={openCreateDrawer}>
                            {t("announcements.newDirective")}
                          </Button>
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  announcements.map((announcement) => (
                    <tr key={announcement.id} className="transition-colors hover:bg-muted/40">
                      <td className="max-w-[360px] px-5 py-3">
                        <Link
                          to={`/woreda/announcements/${announcement.id}`}
                          className="line-clamp-2 text-sm font-medium text-foreground hover:text-primary"
                        >
                          {normalizeDisplayText(announcement.title)}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-sm text-muted-foreground">
                        {typeLabel(announcement.type, t)}
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={statusToBadgeVariant(announcement.status)}>
                          {statusLabel(announcement.status, t)}
                        </Badge>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-sm text-muted-foreground">
                        {formatDate(announcement.deadline)}
                      </td>
                      <td className="px-5 py-3 text-right text-sm tabular-nums">
                        {announcement.targets.length}
                      </td>
                      <td className="px-5 py-3 text-right text-sm tabular-nums">
                        {announcement.reports.length}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <Button asChild variant="outline" size="sm">
                          <Link
                            to={`/woreda/announcements/${announcement.id}`}
                            className="inline-flex items-center gap-1.5"
                          >
                            <Eye aria-hidden />
                            {t("common.open")}
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-border px-5 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>
              {t("announcements.pagination.page")} {pagination.page}{" "}
              {t("announcements.pagination.of")} {pagination.totalPages} ·{" "}
              {pagination.total} {t("announcements.pagination.total")}
            </span>

            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={String(pageSize)}
                onValueChange={(value) => {
                  setPageSize(Number(value));
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-auto px-2 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 / {t("announcements.pagination.pageSize")}</SelectItem>
                  <SelectItem value="20">20 / {t("announcements.pagination.pageSize")}</SelectItem>
                  <SelectItem value="50">50 / {t("announcements.pagination.pageSize")}</SelectItem>
                  <SelectItem value="100">100 / {t("announcements.pagination.pageSize")}</SelectItem>
                </SelectContent>
              </Select>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!pagination.hasPreviousPage}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                {t("common.previous")}
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!pagination.hasNextPage}
                onClick={() =>
                  setPage((current) => Math.min(pagination.totalPages, current + 1))
                }
              >
                {t("common.next")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-[540px]"
        >
          <form onSubmit={handleCreate} className="flex h-full flex-col">
            <SheetHeader className="border-b border-border bg-muted/30">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                {t("announcements.drawer.eyebrow")}
              </p>
              <SheetTitle>{t("announcements.drawer.title")}</SheetTitle>
              <SheetDescription>{t("announcements.drawer.description")}</SheetDescription>
            </SheetHeader>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ann-title">
                  {t("announcements.form.title")}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="ann-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ann-type">{t("announcements.form.type")}</Label>
                  <Select value={type} onValueChange={(value) => setType(value as AnnouncementType)}>
                    <SelectTrigger id="ann-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="meeting">{t("announcements.type.meeting")}</SelectItem>
                      <SelectItem value="conference">{t("announcements.type.conference")}</SelectItem>
                      <SelectItem value="trend_report">{t("announcements.type.trend_report")}</SelectItem>
                      <SelectItem value="other">{t("announcements.type.other")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ann-deadline">{t("announcements.form.deadline")}</Label>
                  <Input
                    id="ann-deadline"
                    value={deadline}
                    onChange={(event) => setDeadline(event.target.value)}
                    type="datetime-local"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ann-instructions">
                  {t("announcements.form.instructions")}
                  <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="ann-instructions"
                  value={instructions}
                  onChange={(event) => setInstructions(event.target.value)}
                  required
                  rows={5}
                />
              </div>

              <label className="flex cursor-pointer items-center gap-3 rounded-md border border-border bg-muted/30 px-3 py-3 text-sm text-foreground">
                <Checkbox
                  checked={attendanceRequired}
                  onCheckedChange={(checked) => setAttendanceRequired(Boolean(checked))}
                />
                <span>{t("announcements.form.attendanceRequired")}</span>
              </label>

              <div className="flex flex-col gap-1.5">
                <Label>{t("announcements.form.attachments")}</Label>
                <div className="flex items-center gap-2 rounded-md border border-dashed border-border bg-muted/30 px-3 py-3">
                  <Upload size={18} className="text-muted-foreground" aria-hidden />
                  <input
                    onChange={(event) =>
                      setSelectedFiles(Array.from(event.target.files ?? []))
                    }
                    type="file"
                    multiple
                    className="min-w-0 flex-1 bg-transparent text-sm text-foreground"
                  />
                </div>
                {selectedFiles.length ? (
                  <div className="rounded-md border border-border bg-muted/30 p-3">
                    <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                      {t("announcements.form.selectedFiles")}
                    </p>
                    <ul className="mt-2 space-y-1 text-sm text-foreground">
                      {selectedFiles.map((file) => (
                        <li key={`${file.name}-${file.size}`} className="truncate">
                          {file.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <Label>{t("announcements.form.targetHibrets")}</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={toggleAllHibrets}
                  >
                    {targetHibretIds.length === hibrets.length
                      ? t("announcements.form.unselectAll")
                      : t("announcements.form.selectAll")}
                  </Button>
                </div>

                <Input
                  value={hibretSearch}
                  onChange={(event) => setHibretSearch(event.target.value)}
                  placeholder={t("announcements.form.searchHibrets")}
                />

                <div className="max-h-64 overflow-auto rounded-md border border-border">
                  {filteredHibrets.map((hibret) => (
                    <label
                      key={hibret.id}
                      className="flex cursor-pointer items-center gap-3 border-b border-border px-3 py-2.5 text-sm last:border-b-0 hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={targetHibretIds.includes(hibret.id)}
                        onCheckedChange={() => toggleHibret(hibret.id)}
                      />
                      <span className="text-foreground">{hibret.name}</span>
                    </label>
                  ))}
                </div>

                <Badge variant="default" className="w-fit">
                  {t("announcements.form.selected")} {targetHibretIds.length} / {hibrets.length}
                </Badge>
              </div>
            </div>

            <div className="border-t border-border bg-muted/30 px-6 py-4">
              <Button
                type="submit"
                variant="default"
                size="default"
                disabled={isCreating}
                className="w-full"
              >
                {isCreating
                  ? t("announcements.form.creating")
                  : t("announcements.form.create")}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </section>
  );
}
