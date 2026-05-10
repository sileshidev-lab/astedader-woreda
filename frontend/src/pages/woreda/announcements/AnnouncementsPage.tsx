import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { createPortal } from "react-dom";
import {
  ChevronDown,
  Download,
  Eye,
  FilePlus2,
  Filter,
  Search,
  Upload,
  X,
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

function statusBadgeClass(status: AnnouncementStatus) {
  if (status === "published") {
    return "border-[var(--aw-magenta)]/25 bg-[var(--aw-magenta-bg)] text-[var(--aw-magenta)]";
  }

  if (status === "draft") {
    return "border-[var(--aw-yellow)]/40 bg-[var(--aw-yellow-bg)] text-[var(--aw-yellow-text)]";
  }

  return "border-[var(--aw-primary)]/20 bg-[var(--aw-primary-soft)] text-[var(--aw-primary)]";
}

function KpiCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "blue" | "yellow" | "pink" | "muted";
}) {
  const toneClass = {
    blue: {
      soft: "bg-[var(--aw-primary-soft)]",
      value: "text-[var(--aw-primary)]",
      bar: "bg-[var(--aw-primary)]",
    },
    yellow: {
      soft: "bg-[var(--aw-yellow-bg)]",
      value: "text-[var(--aw-yellow-text)]",
      bar: "bg-[var(--aw-yellow)]",
    },
    pink: {
      soft: "bg-[var(--aw-magenta-bg)]",
      value: "text-[var(--aw-magenta)]",
      bar: "bg-[var(--aw-magenta)]",
    },
    muted: {
      soft: "bg-[var(--aw-surface-muted)]",
      value: "text-[var(--aw-muted)]",
      bar: "bg-[var(--aw-muted)]",
    },
  }[tone];

  return (
    <article className="relative overflow-hidden rounded-3xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] p-5 shadow-sm">
      <div className={`absolute right-0 top-0 h-24 w-24 rounded-bl-full ${toneClass.soft}`} />

      <div className="relative">
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--aw-muted)]">
          {label}
        </p>
        <p className={`mt-2 text-[clamp(1.75rem,2.7vw,2.5rem)] font-black leading-none ${toneClass.value}`}>
          {value}
        </p>
      </div>

      <div className={`relative mt-5 h-1.5 rounded-full ${toneClass.bar}`} />
    </article>
  );
}

export function AnnouncementsPage() {
  const { t } = useTranslation();

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
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [error, setError] = useState("");

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
    setError("");

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
      setError(t("announcements.errors.load"));
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
    setError("");

    if (!targetHibretIds.length) {
      setError(t("announcements.errors.targetRequired"));
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
      await loadData();
    } catch {
      setError(t("announcements.errors.create"));
    } finally {
      setIsCreating(false);
    }
  }

  function openCreateDrawer() {
    resetForm();
    setDrawerOpen(true);
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-5">
      {error ? (
        <div className="shrink-0 rounded-2xl border border-[var(--aw-danger)] bg-[var(--aw-danger-bg)] px-4 py-3 text-sm font-bold text-[var(--aw-danger)]">
          {error}
        </div>
      ) : null}

      <div className="grid shrink-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label={t("announcements.kpi.total")} value={summary.total} tone="blue" />
        <KpiCard label={t("announcements.kpi.active")} value={summary.published} tone="yellow" />
        <KpiCard label={t("announcements.kpi.draft")} value={summary.draft} tone="pink" />
        <KpiCard label={t("announcements.kpi.closed")} value={summary.closed} tone="muted" />
      </div>

      <section className="shrink-0 rounded-3xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-lg font-black text-[var(--aw-text)]">
              {t("announcements.listTitle", { defaultValue: "Directive List" })}
            </h2>
            <p className="mt-1 text-sm font-semibold text-[var(--aw-muted)]">
              {t("announcements.listDescription", {
                defaultValue: "Search, filter, and review Woreda directives.",
              })}
            </p>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <label className="flex min-h-11 min-w-0 items-center gap-2 rounded-2xl border border-[var(--aw-border-soft)] bg-[var(--aw-bg)] px-3 focus-within:border-[var(--aw-primary)] focus-within:ring-2 focus-within:ring-[var(--aw-primary)]/15 sm:min-w-[280px]">
              <Search size={18} className="shrink-0 text-[var(--aw-muted)]" />
              <input
                type="search"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder={t("announcements.searchPlaceholder")}
                className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm font-semibold text-[var(--aw-text)] outline-none placeholder:text-[var(--aw-muted)] focus:ring-0"
              />
            </label>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] px-4 text-sm font-black text-[var(--aw-text)] shadow-sm hover:border-[var(--aw-primary)] hover:text-[var(--aw-primary)] md:hidden"
                onClick={() => setMobileFiltersOpen((open) => !open)}
                aria-expanded={mobileFiltersOpen}
                aria-controls="announcement-filters"
              >
                <Filter size={16} />
                {t("common.filters")}
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setExportDropdownOpen((open) => !open)}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] px-4 text-sm font-black text-[var(--aw-primary)] shadow-sm hover:bg-[var(--aw-primary-soft)]"
                >
                  <Download size={16} />
                  {t("announcements.export")}
                  <ChevronDown
                    size={16}
                    className={exportDropdownOpen ? "rotate-180 transition" : "transition"}
                  />
                </button>

                {exportDropdownOpen ? (
                  <div className="absolute right-0 top-[calc(100%+8px)] z-[100] w-[min(240px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] shadow-xl">
                    <button
                      type="button"
                      className="block w-full px-4 py-3 text-left text-sm font-bold text-[var(--aw-text)] hover:bg-[var(--aw-surface-muted)]"
                      onClick={() => {
                        downloadAuthenticatedExport("/announcements/export.pdf?lang=en");
                        setExportDropdownOpen(false);
                      }}
                    >
                      English
                    </button>
                    <button
                      type="button"
                      className="block w-full px-4 py-3 text-left text-sm font-bold text-[var(--aw-text)] hover:bg-[var(--aw-surface-muted)]"
                      onClick={() => {
                        downloadAuthenticatedExport("/announcements/export.pdf?lang=am");
                        setExportDropdownOpen(false);
                      }}
                    >
                      አማርኛ
                    </button>
                    <button
                      type="button"
                      className="block w-full px-4 py-3 text-left text-sm font-bold text-[var(--aw-text)] hover:bg-[var(--aw-surface-muted)]"
                      onClick={() => {
                        downloadAuthenticatedExport("/announcements/export.pdf?lang=om");
                        setExportDropdownOpen(false);
                      }}
                    >
                      Afaan Oromoo
                    </button>
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                onClick={openCreateDrawer}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[var(--aw-primary)] bg-[var(--aw-primary)] px-4 text-sm font-black text-white shadow-sm hover:bg-[var(--aw-primary-dark)]"
              >
                <FilePlus2 size={16} />
                <span className="hidden sm:inline">{t("announcements.newDirective")}</span>
                <span className="sm:hidden">{t("common.create")}</span>
              </button>
            </div>
          </div>
        </div>

        <div
          id="announcement-filters"
          className={[
            "mt-4 gap-2",
            mobileFiltersOpen ? "grid grid-cols-1 sm:grid-cols-2" : "hidden",
            "md:flex md:flex-wrap",
          ].join(" ")}
        >
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}
            className="min-h-11 min-w-[140px] rounded-2xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] px-3 text-sm font-bold text-[var(--aw-text)] outline-none focus:border-[var(--aw-primary)]"
          >
            <option value="all">{t("announcements.filters.typeAll")}</option>
            <option value="meeting">{t("announcements.type.meeting")}</option>
            <option value="conference">{t("announcements.type.conference")}</option>
            <option value="trend_report">{t("announcements.type.trend_report")}</option>
            <option value="other">{t("announcements.type.other")}</option>
          </select>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            className="min-h-11 min-w-[140px] rounded-2xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] px-3 text-sm font-bold text-[var(--aw-text)] outline-none focus:border-[var(--aw-primary)]"
          >
            <option value="all">{t("announcements.filters.statusAll")}</option>
            <option value="published">{t("announcements.status.active")}</option>
            <option value="draft">{t("announcements.status.draft")}</option>
            <option value="closed">{t("announcements.status.closed")}</option>
          </select>

          <select
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value as DateFilter)}
            className="min-h-11 min-w-[150px] rounded-2xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] px-3 text-sm font-bold text-[var(--aw-text)] outline-none focus:border-[var(--aw-primary)]"
          >
            <option value="all">{t("announcements.filters.timeAll")}</option>
            <option value="week">{t("announcements.filters.thisWeek")}</option>
            <option value="month">{t("announcements.filters.thisMonth")}</option>
            <option value="last_30_days">{t("announcements.filters.last30")}</option>
            <option value="custom">{t("announcements.filters.custom")}</option>
          </select>

          {dateFilter === "custom" ? (
            <>
              <input
                type="date"
                value={customFrom}
                onChange={(event) => setCustomFrom(event.target.value)}
                className="min-h-11 rounded-2xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] px-3 text-sm font-bold text-[var(--aw-text)] outline-none focus:border-[var(--aw-primary)]"
                aria-label={t("announcements.filters.from")}
              />
              <input
                type="date"
                value={customTo}
                onChange={(event) => setCustomTo(event.target.value)}
                className="min-h-11 rounded-2xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] px-3 text-sm font-bold text-[var(--aw-text)] outline-none focus:border-[var(--aw-primary)]"
                aria-label={t("announcements.filters.to")}
              />
            </>
          ) : null}
        </div>
      </section>

      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] shadow-sm">
        <div className="flex shrink-0 flex-col gap-3 border-b border-[var(--aw-border-soft)] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <h2 className="text-lg font-black text-[var(--aw-text)]">
              {pagination.total} {t("sidebar.announcements")}
            </h2>
            <p className="text-sm font-semibold text-[var(--aw-muted)]">
              {t("announcements.mobileHint", {
                defaultValue: "Swipe cards on mobile. Table view appears on wider screens.",
              })}
            </p>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="grid gap-3 p-4 md:hidden">
            {isLoading ? (
              <div className="rounded-3xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface-muted)] px-4 py-8 text-sm font-semibold text-[var(--aw-muted)]">
                {t("common.loading")}...
              </div>
            ) : announcements.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-[var(--aw-border-soft)] bg-[var(--aw-surface-muted)] px-4 py-10 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--aw-primary)] text-white">
                  <FilePlus2 size={22} />
                </div>
                <h3 className="mt-4 text-lg font-black text-[var(--aw-text)]">
                  {t("announcements.emptyTitle")}
                </h3>
                <p className="mt-2 text-sm font-semibold text-[var(--aw-muted)]">
                  {t("announcements.emptyDescription")}
                </p>
              </div>
            ) : (
              announcements.map((announcement) => (
                <article
                  key={announcement.id}
                  className="overflow-hidden rounded-3xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] shadow-sm"
                >
                  <div className="bg-gradient-to-br from-[var(--aw-primary-soft)] to-[var(--aw-yellow-bg)] px-4 py-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--aw-muted)]">
                      {typeLabel(announcement.type, t)}
                    </p>
                    <Link
                      to={`/woreda/announcements/${announcement.id}`}
                      className="mt-1 line-clamp-2 text-base font-black text-[var(--aw-primary-dark)]"
                    >
                      {normalizeDisplayText(announcement.title)}
                    </Link>
                  </div>

                  <div className="grid gap-3 p-4 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-bold text-[var(--aw-muted)]">
                        {t("announcements.table.status")}
                      </span>
                      <span
                        className={[
                          "inline-flex rounded-full border px-3 py-1 text-xs font-black",
                          statusBadgeClass(announcement.status),
                        ].join(" ")}
                      >
                        {statusLabel(announcement.status, t)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <span className="font-bold text-[var(--aw-muted)]">
                        {t("announcements.table.deadline")}
                      </span>
                      <span className="font-black text-[var(--aw-text)]">
                        {formatDate(announcement.deadline)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <span className="font-bold text-[var(--aw-muted)]">
                        {t("announcements.table.hibrets")}
                      </span>
                      <span className="font-black text-[var(--aw-text)]">
                        {announcement.targets.length}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <span className="font-bold text-[var(--aw-muted)]">
                        {t("announcements.table.reports")}
                      </span>
                      <span className="font-black text-[var(--aw-text)]">
                        {announcement.reports.length}
                      </span>
                    </div>

                    <Link
                      to={`/woreda/announcements/${announcement.id}`}
                      className="mt-1 inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl bg-[var(--aw-primary)] px-4 text-sm font-black text-white hover:bg-[var(--aw-primary-dark)]"
                    >
                      <Eye size={16} />
                      {t("common.open")}
                    </Link>
                  </div>
                </article>
              ))
            )}
          </div>

          <div className="hidden h-full overflow-x-auto md:block">
            <table className="w-[max(100%,880px)] border-collapse text-left">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-[var(--aw-border-soft)] bg-[var(--aw-surface-muted)] text-[11px] font-black uppercase tracking-[0.1em] text-[var(--aw-muted)]">
                  <th className="px-5 py-4">{t("announcements.table.title")}</th>
                  <th className="px-5 py-4">{t("announcements.table.type")}</th>
                  <th className="px-5 py-4">{t("announcements.table.status")}</th>
                  <th className="px-5 py-4">{t("announcements.table.deadline")}</th>
                  <th className="px-5 py-4 text-right">{t("announcements.table.hibrets")}</th>
                  <th className="px-5 py-4 text-right">{t("announcements.table.reports")}</th>
                  <th className="px-5 py-4 text-center">{t("announcements.table.action")}</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[var(--aw-border-soft)] text-sm text-[var(--aw-text)]">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-sm font-semibold text-[var(--aw-muted)]">
                      {t("common.loading")}...
                    </td>
                  </tr>
                ) : announcements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center">
                      <div className="mx-auto max-w-md">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--aw-primary)] text-white">
                          <FilePlus2 size={22} />
                        </div>
                        <h3 className="mt-4 text-lg font-black text-[var(--aw-text)]">
                          {t("announcements.emptyTitle")}
                        </h3>
                        <p className="mt-2 text-sm font-semibold text-[var(--aw-muted)]">
                          {t("announcements.emptyDescription")}
                        </p>
                        <button
                          type="button"
                          onClick={openCreateDrawer}
                          className="mt-4 inline-flex min-h-10 items-center rounded-2xl bg-[var(--aw-primary)] px-4 text-sm font-black text-white hover:bg-[var(--aw-primary-dark)]"
                        >
                          {t("announcements.newDirective")}
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  announcements.map((announcement) => (
                    <tr
                      key={announcement.id}
                      className="transition hover:bg-[var(--aw-primary-soft)]/50"
                    >
                      <td className="max-w-[360px] px-5 py-4">
                        <Link
                          to={`/woreda/announcements/${announcement.id}`}
                          className="line-clamp-2 font-black text-[var(--aw-primary-dark)] hover:text-[var(--aw-primary)]"
                        >
                          {normalizeDisplayText(announcement.title)}
                        </Link>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 font-bold text-[var(--aw-muted)]">
                        {typeLabel(announcement.type, t)}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={[
                            "inline-flex rounded-full border px-3 py-1 text-xs font-black",
                            statusBadgeClass(announcement.status),
                          ].join(" ")}
                        >
                          {statusLabel(announcement.status, t)}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 font-semibold text-[var(--aw-muted)]">
                        {formatDate(announcement.deadline)}
                      </td>

                      <td className="px-5 py-4 text-right font-black">
                        {announcement.targets.length}
                      </td>

                      <td className="px-5 py-4 text-right font-black">
                        {announcement.reports.length}
                      </td>

                      <td className="px-5 py-4 text-center">
                        <Link
                          to={`/woreda/announcements/${announcement.id}`}
                          className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl bg-[var(--aw-primary)] px-3 text-xs font-black text-white hover:bg-[var(--aw-primary-dark)]"
                        >
                          <Eye size={15} />
                          {t("common.open")}
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="shrink-0 border-t border-[var(--aw-border-soft)] bg-[var(--aw-surface)] p-4">
          <div className="flex flex-col gap-3 text-xs font-bold text-[var(--aw-muted)] sm:flex-row sm:items-center sm:justify-between">
            <span>
              {t("announcements.pagination.page")} {pagination.page}{" "}
              {t("announcements.pagination.of")} {pagination.totalPages} ·{" "}
              {pagination.total} {t("announcements.pagination.total")}
            </span>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
                className="min-h-10 rounded-xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] px-3 text-sm font-bold text-[var(--aw-text)]"
              >
                <option value={10}>10 / {t("announcements.pagination.pageSize")}</option>
                <option value={20}>20 / {t("announcements.pagination.pageSize")}</option>
                <option value={50}>50 / {t("announcements.pagination.pageSize")}</option>
                <option value={100}>100 / {t("announcements.pagination.pageSize")}</option>
              </select>

              <button
                type="button"
                disabled={!pagination.hasPreviousPage}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="min-h-10 rounded-xl border border-[var(--aw-border-soft)] px-3 text-sm font-black text-[var(--aw-text)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("common.previous")}
              </button>

              <button
                type="button"
                disabled={!pagination.hasNextPage}
                onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}
                className="min-h-10 rounded-xl border border-[var(--aw-border-soft)] px-3 text-sm font-black text-[var(--aw-text)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("common.next")}
              </button>
            </div>
          </div>
        </div>
      </section>

      {drawerOpen
        ? createPortal(
            <div className="fixed inset-0 z-[2147483647] overflow-hidden">
              <button
                type="button"
                className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
                aria-label={t("common.cancel")}
                onClick={() => setDrawerOpen(false)}
              />

              <form
                onSubmit={handleCreate}
                className="absolute inset-0 flex h-full w-full flex-col bg-[var(--aw-surface)] shadow-xl sm:inset-y-0 sm:left-auto sm:right-0 sm:w-[min(540px,96vw)]"
              >
                <header className="shrink-0 border-b border-[var(--aw-border-soft)] bg-[var(--aw-surface-muted)] px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--aw-muted)]">
                        {t("announcements.drawer.eyebrow")}
                      </p>
                      <h2 className="mt-1 text-xl font-black text-[var(--aw-text)]">
                        {t("announcements.drawer.title")}
                      </h2>
                      <p className="mt-1 text-sm font-semibold text-[var(--aw-muted)]">
                        {t("announcements.drawer.description")}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setDrawerOpen(false)}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--aw-primary)] text-white hover:bg-[var(--aw-primary-dark)]"
                      aria-label={t("common.cancel")}
                    >
                      <X size={18} />
                    </button>
                  </div>
                </header>

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
                  <label className="block">
                    <span className="text-sm font-black text-[var(--aw-text)]">
                      {t("announcements.form.title")}
                    </span>
                    <input
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      required
                      className="mt-2 w-full rounded-2xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] px-3 py-3 text-sm font-semibold text-[var(--aw-text)] outline-none focus:border-[var(--aw-primary)]"
                    />
                  </label>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-sm font-black text-[var(--aw-text)]">
                        {t("announcements.form.type")}
                      </span>
                      <select
                        value={type}
                        onChange={(event) => setType(event.target.value as AnnouncementType)}
                        className="mt-2 w-full rounded-2xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] px-3 py-3 text-sm font-semibold text-[var(--aw-text)] outline-none focus:border-[var(--aw-primary)]"
                      >
                        <option value="meeting">{t("announcements.type.meeting")}</option>
                        <option value="conference">{t("announcements.type.conference")}</option>
                        <option value="trend_report">{t("announcements.type.trend_report")}</option>
                        <option value="other">{t("announcements.type.other")}</option>
                      </select>
                    </label>

                    <label className="block">
                      <span className="text-sm font-black text-[var(--aw-text)]">
                        {t("announcements.form.deadline")}
                      </span>
                      <input
                        value={deadline}
                        onChange={(event) => setDeadline(event.target.value)}
                        type="datetime-local"
                        className="mt-2 w-full rounded-2xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] px-3 py-3 text-sm font-semibold text-[var(--aw-text)] outline-none focus:border-[var(--aw-primary)]"
                      />
                    </label>
                  </div>

                  <label className="block">
                    <span className="text-sm font-black text-[var(--aw-text)]">
                      {t("announcements.form.instructions")}
                    </span>
                    <textarea
                      value={instructions}
                      onChange={(event) => setInstructions(event.target.value)}
                      required
                      rows={5}
                      className="mt-2 w-full resize-y rounded-2xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] px-3 py-3 text-sm font-semibold leading-6 text-[var(--aw-text)] outline-none focus:border-[var(--aw-primary)]"
                    />
                  </label>

                  <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface-muted)] px-3 py-3 text-sm font-black text-[var(--aw-text)]">
                    <input
                      checked={attendanceRequired}
                      onChange={(event) => setAttendanceRequired(event.target.checked)}
                      type="checkbox"
                      className="h-4 w-4 shrink-0"
                    />
                    {t("announcements.form.attendanceRequired")}
                  </label>

                  <label className="block">
                    <span className="text-sm font-black text-[var(--aw-text)]">
                      {t("announcements.form.attachments")}
                    </span>
                    <div className="mt-2 flex items-center gap-2 rounded-2xl border border-dashed border-[var(--aw-border-soft)] bg-[var(--aw-surface-muted)] px-3 py-3">
                      <Upload size={18} className="text-[var(--aw-muted)]" />
                      <input
                        onChange={(event) => setSelectedFiles(Array.from(event.target.files ?? []))}
                        type="file"
                        multiple
                        className="min-w-0 flex-1 text-sm font-semibold text-[var(--aw-text)]"
                      />
                    </div>

                    {selectedFiles.length ? (
                      <div className="mt-3 rounded-2xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface-muted)] p-3">
                        <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--aw-muted)]">
                          {t("announcements.form.selectedFiles")}
                        </p>
                        <ul className="mt-2 space-y-1 text-sm font-semibold text-[var(--aw-text)]">
                          {selectedFiles.map((file) => (
                            <li key={`${file.name}-${file.size}`} className="truncate">
                              {file.name}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </label>

                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-sm font-black text-[var(--aw-text)]">
                        {t("announcements.form.targetHibrets")}
                      </span>
                      <button
                        type="button"
                        onClick={toggleAllHibrets}
                        className="min-h-9 rounded-xl border border-[var(--aw-border-soft)] px-3 text-xs font-black text-[var(--aw-text)] hover:border-[var(--aw-primary)] hover:text-[var(--aw-primary)]"
                      >
                        {targetHibretIds.length === hibrets.length
                          ? t("announcements.form.unselectAll")
                          : t("announcements.form.selectAll")}
                      </button>
                    </div>

                    <input
                      value={hibretSearch}
                      onChange={(event) => setHibretSearch(event.target.value)}
                      placeholder={t("announcements.form.searchHibrets")}
                      className="mb-2 w-full rounded-2xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] px-3 py-3 text-sm font-semibold text-[var(--aw-text)] outline-none focus:border-[var(--aw-primary)]"
                    />

                    <div className="max-h-64 overflow-auto rounded-2xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)]">
                      {filteredHibrets.map((hibret) => (
                        <label
                          key={hibret.id}
                          className="flex cursor-pointer gap-3 border-b border-[var(--aw-border-soft)] px-3 py-2.5 text-sm font-semibold last:border-b-0 hover:bg-[var(--aw-surface-muted)]"
                        >
                          <input
                            checked={targetHibretIds.includes(hibret.id)}
                            onChange={() => toggleHibret(hibret.id)}
                            type="checkbox"
                            className="mt-1 h-4 w-4 shrink-0"
                          />
                          <span className="leading-6 text-[var(--aw-text)]">{hibret.name}</span>
                        </label>
                      ))}
                    </div>

                    <p className="mt-3 inline-flex rounded-2xl border border-[var(--aw-primary)] bg-[var(--aw-surface)] px-3 py-2 text-sm font-black text-[var(--aw-primary)]">
                      {t("announcements.form.selected")} {targetHibretIds.length} / {hibrets.length}
                    </p>
                  </div>
                </div>

                <footer className="shrink-0 border-t border-[var(--aw-border-soft)] bg-[var(--aw-surface-muted)] px-5 py-4">
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="min-h-11 w-full rounded-2xl bg-[var(--aw-primary)] px-4 text-sm font-black text-white hover:bg-[var(--aw-primary-dark)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isCreating ? t("announcements.form.creating") : t("announcements.form.create")}
                  </button>
                </footer>
              </form>
            </div>,
            document.body,
          )
        : null}
    </section>
  );
}