import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { getHibretReport } from "../../../services/reportService";
import { ErrorState } from "../../../components/ui/ErrorState";
import { LoadingState } from "../../../components/ui/LoadingState";
import { FilePreviewCard } from "../../../components/ui/FilePreviewCard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/shadcn/card";
import { Button } from "@/components/ui/shadcn/button";
import { Badge } from "@/components/ui/shadcn/badge";
import { statusToBadgeVariant } from "@/lib/badge";

export function HibretReportDetailPage() {
  const { reportId } = useParams();
  const [report, setReport] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!reportId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getHibretReport(reportId);
      setReport(data.report);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Unable to load report.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId]);

  if (!reportId) return <ErrorState message="Report id is missing." />;
  if (isLoading) return <LoadingState label="Loading report..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!report) return <ErrorState message="Report not found." />;

  return (
    <section className="flex min-h-0 flex-1 flex-col space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              {report.announcement?.title || "Directive report"}
            </p>
            <CardTitle className="text-base font-semibold">{report.title}</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              <Badge variant={statusToBadgeVariant(report.status)}>
                {report.status || "-"}
              </Badge>
            </CardDescription>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link
                to={`/hibret/announcements/${report.announcementId}`}
                className="inline-flex items-center gap-1.5"
              >
                Open directive
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Report body</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {report.body || "-"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Submitted files</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Media and attachments uploaded for this report.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {report.attachments?.length ? (
              <div className="flex flex-col gap-3">
                {report.attachments.map((attachment: any) => (
                  <FilePreviewCard key={attachment.id} file={attachment.file} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No files have been uploaded for this report yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
