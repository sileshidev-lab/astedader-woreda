import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getActivity } from "../../../services/activityService";
import { ErrorState } from "../../../components/ui/ErrorState";
import { LoadingState } from "../../../components/ui/LoadingState";
import type { ActivityLogItem } from "../../../services/activityService";
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

export function AdminActivityDetailPage() {
  const [params] = useSearchParams();
  const initialSearch = params.get("search") || "";

  const [search, setSearch] = useState(initialSearch);
  const [activity, setActivity] = useState<ActivityLogItem[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const title = useMemo(() => (search ? `Activity: ${search}` : "Admin activity"), [search]);

  async function load(page = 1) {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getActivity({ page, pageSize: 25, ...(search ? { search } : {}) });
      setActivity(data.activity || []);
      setPagination(data.pagination);
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
      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Monitoring
            </p>
            <CardTitle>{title}</CardTitle>
            <CardDescription>
              Filter by admin email, operation name, or target to locate relevant actions.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="default">
              <Link to="/woreda/activity">Back to activity</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-[1fr,auto]">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email, operation, target..."
          />
          <Button type="button" variant="default" size="default" onClick={() => void load(1)}>
            Search
          </Button>
        </CardContent>
      </Card>

      {isLoading ? <LoadingState label="Loading activity..." /> : null}
      {error ? <ErrorState message={error} onRetry={() => void load(1)} /> : null}

      {!isLoading && !error ? (
        <Card>
          <CardContent className="px-0 pb-0 pt-0">
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
                        <TableCell className="whitespace-nowrap">
                          {formatDate(row.createdAt)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-foreground">{row.actorEmail || "-"}</span>
                            <span className="text-xs text-muted-foreground">
                              {row.actorRole || "-"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{row.operation}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {[row.targetType, row.targetName].filter(Boolean).join(": ") || "-"}
                        </TableCell>
                        <TableCell className="min-w-[18rem]">{row.description || "-"}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                        No activity records match the current filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {pagination ? (
              <div className="border-t border-border px-4 py-3 text-sm text-muted-foreground">
                Showing page <span className="font-medium text-foreground">{pagination.page}</span> of{" "}
                <span className="font-medium text-foreground">{pagination.totalPages}</span>.
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}
