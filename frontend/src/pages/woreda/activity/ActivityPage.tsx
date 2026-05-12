import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getActivity, getActivitySummary, type ActivityLogItem } from "../../../services/activityService";
import { ErrorState } from "../../../components/ui/ErrorState";
import { LoadingState } from "../../../components/ui/LoadingState";
import { SearchInput } from "../../../components/ui/SearchInput";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/shadcn/card";
import { Button } from "@/components/ui/shadcn/button";
import { Input } from "@/components/ui/shadcn/input";
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

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function KpiTile({ label, value }: { label: string; value: number | string }) {
  return (
    <Card>
      <CardHeader className="px-4 py-3">
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

export function ActivityPage() {
  const [search, setSearch] = useState("");
  const [actorRole, setActorRole] = useState("");
  const [operation, setOperation] = useState("");
  const [targetType, setTargetType] = useState("");
  const [activity, setActivity] = useState<ActivityLogItem[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load(page = 1) {
    setIsLoading(true);
    setError(null);
    try {
      const [summaryData, activityData] = await Promise.all([
        getActivitySummary(),
        getActivity({
          page,
          pageSize: 25,
          ...(search ? { search } : {}),
          ...(actorRole ? { actorRole } : {}),
          ...(operation ? { operation } : {}),
          ...(targetType ? { targetType } : {}),
        }),
      ]);
      setSummary(summaryData);
      setActivity(activityData.activity || []);
      setPagination(activityData.pagination);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Unable to load activity.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiTile label="Events total" value={summary?.summary?.total ?? "-"} />
        <KpiTile label="Events today" value={summary?.summary?.today ?? "-"} />
        <KpiTile label="Recent loaded" value={activity.length} />
        <KpiTile label="Pages" value={pagination?.totalPages ?? "-"} />
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <CardTitle>Activity log</CardTitle>
            <CardDescription>
              Recent administrative events across directives, members, and account actions.
            </CardDescription>
          </div>
          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
            <div className="min-w-[18rem]">
              <SearchInput value={search} onChange={setSearch} placeholder="Search activity..." />
            </div>
            <Select value={actorRole || "all"} onValueChange={(v) => setActorRole(v === "all" ? "" : v)}>
              <SelectTrigger className="md:w-auto" aria-label="Actor role filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="WOREDA_ADMIN">WOREDA_ADMIN</SelectItem>
                <SelectItem value="HIBRET_ADMIN">HIBRET_ADMIN</SelectItem>
                <SelectItem value="MEMBER">MEMBER</SelectItem>
              </SelectContent>
            </Select>
            <Input
              value={operation}
              onChange={(e) => setOperation(e.target.value)}
              placeholder="Operation"
            />
            <Input
              value={targetType}
              onChange={(e) => setTargetType(e.target.value)}
              placeholder="Target type"
            />
            <Button type="button" variant="default" size="default" onClick={() => void load(1)}>
              Refresh
            </Button>
            <Button asChild variant="outline" size="default">
              <Link
                to={search ? `/woreda/activity/admin?search=${encodeURIComponent(search)}` : "/woreda/activity/admin"}
              >
                Open detail
              </Link>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="px-0 pb-0 pt-0">
          {isLoading ? (
            <div className="px-4 py-5">
              <LoadingState label="Loading activity..." />
            </div>
          ) : error ? (
            <div className="px-4 py-5">
              <ErrorState message={error} onRetry={() => void load(1)} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Operation</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activity.length ? (
                    activity.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="whitespace-nowrap text-sm text-foreground">
                          {formatDate(row.createdAt)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex flex-col">
                            <Link
                              to={row.actorEmail ? `/woreda/activity/admin?search=${encodeURIComponent(row.actorEmail)}` : "/woreda/activity/admin"}
                              className="text-sm font-medium text-foreground hover:text-primary"
                            >
                              {row.actorEmail || "-"}
                            </Link>
                            <span className="text-xs text-muted-foreground">
                              {row.actorRole || "-"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-foreground">
                          {row.operation}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-foreground">
                          {[row.targetType, row.targetName].filter(Boolean).join(": ") || "-"}
                        </TableCell>
                        <TableCell className="min-w-[18rem] text-sm text-foreground">
                          {row.description || "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                        No activity records are available for the selected filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
