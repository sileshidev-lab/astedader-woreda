import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Eye, Search } from "lucide-react";
import {
  getHibretAnnouncements,
  type HibretAnnouncementsSummary,
} from "../../../services/hibretService";
import type { Announcement, AnnouncementType } from "../../../types/announcement";
import type { PaginationMeta } from "../../../services/announcementService";
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
import { Label } from "@/components/ui/shadcn/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/shadcn/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/shadcn/table";
import { statusToBadgeVariant } from "@/lib/badge";

type StatusFilter = "all" | "draft" | "published" | "closed";
type TypeFilter = "all" | AnnouncementType;

const typeLabels: Record<AnnouncementType, string> = {
  meeting: "Meeting",
  conference: "Conference",
  trend_report: "Trend Report",
  other: "Other",
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
}

function reportStatus(announcement: Announcement) {
  const report = announcement.reports?.[0];
  if (!report) return "Not started";
  return report.status || "draft";
}

function reviewStatus(announcement: Announcement) {
  const report = announcement.reports?.[0];
  if (!report?.reviewDecision) return "Pending";
  return report.reviewDecision;
}

function labelize(value: string) {
  if (value === "changes_requested") return "Changes requested";
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function StatTile({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "success" | "warning";
}) {
  const labelToneClass =
    tone === "success"
      ? "text-[var(--aw-success)]"
      : tone === "warning"
        ? "text-[var(--aw-warning)]"
        : "text-muted-foreground";

  return (
    <Card>
      <CardHeader className="px-4 py-3">
        <span
          className={`text-[11px] font-medium uppercase tracking-[0.06em] ${labelToneClass}`}
        >
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

export function HibretAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [summary, setSummary] = useState<HibretAnnouncementsSummary>({
    assigned: 0,
    submitted: 0,
    pending: 0,
    approved: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchText, setSearchText] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  async function loadData() {
    setIsLoading(true);
    setError("");

    try {
      const data = await getHibretAnnouncements({
        page,
        pageSize,
        search: searchText || undefined,
        type: typeFilter,
        status: statusFilter,
      });
      setAnnouncements(data.announcements);
      setPagination(data.pagination);
      setSummary(data.summary);
    } catch {
      setError("Unable to load assigned directives.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, searchText, typeFilter, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [searchText, typeFilter, statusFilter]);

  return (
    <section className="flex min-h-0 flex-1 flex-col space-y-6">
      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Assigned directives" value={summary.assigned} />
        <StatTile label="Submitted reports" value={summary.submitted} tone="success" />
        <StatTile label="Pending" value={summary.pending} tone="warning" />
        <StatTile label="Approved" value={summary.approved} tone="success" />
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold">Directive list</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Search, filter, and review directives assigned to this Hibret.
            </CardDescription>
          </div>
          <div className="ml-auto flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                type="search"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search directive title..."
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="type-filter" className="text-xs text-muted-foreground">
                Type
              </Label>
              <Select
                value={typeFilter}
                onValueChange={(value) => setTypeFilter(value as TypeFilter)}
              >
                <SelectTrigger id="type-filter">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="conference">Conference</SelectItem>
                  <SelectItem value="trend_report">Trend Report</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="status-filter" className="text-xs text-muted-foreground">
                Status
              </Label>
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as StatusFilter)}
              >
                <SelectTrigger id="status-filter">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                size="default"
                onClick={() => {
                  setSearchText("");
                  setTypeFilter("all");
                  setStatusFilter("all");
                }}
              >
                Clear filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold">
              {pagination.total} directives
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Showing {announcements.length} directives currently loaded for this Hibret.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>My report</TableHead>
                <TableHead>Woreda review</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    Loading announcements...
                  </TableCell>
                </TableRow>
              ) : announcements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-16 text-center">
                    <div className="mx-auto max-w-md space-y-1.5">
                      <p className="text-base font-semibold text-foreground">
                        No directives found
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Adjust filters and try again.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                announcements.map((announcement) => {
                  const myReport = reportStatus(announcement);
                  const review = reviewStatus(announcement);
                  return (
                    <TableRow key={announcement.id}>
                      <TableCell className="max-w-[360px]">
                        <Link
                          to={`/hibret/announcements/${announcement.id}`}
                          className="line-clamp-2 text-sm font-medium text-foreground hover:text-primary"
                        >
                          {announcement.title}
                        </Link>
                        {announcement.attendanceRequired ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Attendance required
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {typeLabels[announcement.type]}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusToBadgeVariant(announcement.status)}>
                          {labelize(announcement.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDate(announcement.deadline)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusToBadgeVariant(myReport)}>
                          {labelize(myReport)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusToBadgeVariant(review)}>
                          {labelize(review)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="outline" size="sm">
                          <Link
                            to={`/hibret/announcements/${announcement.id}`}
                            className="inline-flex items-center gap-1.5"
                          >
                            <Eye aria-hidden />
                            Open
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardContent className="border-t border-border pt-4">
          <div className="flex flex-col gap-3 text-xs font-medium text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>
              Page {pagination.page} of {pagination.totalPages} · {pagination.total} total
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={String(pageSize)}
                onValueChange={(value) => {
                  setPageSize(Number(value));
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 / page</SelectItem>
                  <SelectItem value="20">20 / page</SelectItem>
                  <SelectItem value="50">50 / page</SelectItem>
                  <SelectItem value="100">100 / page</SelectItem>
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!pagination.hasPreviousPage}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!pagination.hasNextPage}
                onClick={() =>
                  setPage((current) => Math.min(pagination.totalPages, current + 1))
                }
                className="inline-flex items-center gap-1.5"
              >
                Next
                <ArrowRight aria-hidden />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
