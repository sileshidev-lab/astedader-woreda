import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, FilePlus2, FolderOpen } from "lucide-react";
import { listHibretReports } from "../../../services/reportService";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/shadcn/table";
import { statusToBadgeVariant } from "@/lib/badge";

export function HibretReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listHibretReports();
      setReports(data.reports || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Unable to load reports.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  if (isLoading) return <LoadingState label="Loading reports..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  if (!reports.length) {
    return (
      <EmptyState
        icon={<FolderOpen aria-hidden />}
        title="No reports yet"
        message="Reports appear after you start drafting a directive report or submit it to Woreda."
        action={
          <Button asChild variant="default" size="default">
            <Link to="/hibret/announcements" className="inline-flex items-center gap-2">
              <FilePlus2 aria-hidden />
              Open directives
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold">Hibret reports</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Drafts, submissions, and Woreda decisions for this Hibret.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Directive</TableHead>
                <TableHead>Report title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-medium text-foreground">
                    {report.announcement?.title || "-"}
                  </TableCell>
                  <TableCell className="font-medium text-foreground">
                    {report.title}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusToBadgeVariant(report.status)}>
                      {report.status || "-"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(report.updatedAt || report.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="outline" size="sm">
                      <Link
                        to={`/hibret/reports/${report.id}`}
                        className="inline-flex items-center gap-1.5"
                      >
                        Open
                        <ArrowRight aria-hidden />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}
