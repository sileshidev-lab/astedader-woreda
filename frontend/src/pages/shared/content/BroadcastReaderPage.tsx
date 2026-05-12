import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, FileText } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { getBroadcast, type Broadcast } from "../../../services/contentService";
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

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

export function BroadcastReaderPage({
  backTo,
  backLabel,
}: {
  backTo: string;
  backLabel: string;
}) {
  const { broadcastId } = useParams();
  const [broadcast, setBroadcast] = useState<Broadcast | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const title = useMemo(() => broadcast?.title || "Broadcast", [broadcast?.title]);

  async function load() {
    if (!broadcastId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getBroadcast(broadcastId);
      setBroadcast(data);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Unable to load broadcast.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [broadcastId]);

  if (!broadcastId) return <ErrorState message="Broadcast id is missing." />;
  if (isLoading) return <LoadingState label="Loading broadcast..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!broadcast) return <ErrorState message="Broadcast not found." />;

  return (
    <section className="flex min-h-0 flex-1 flex-col space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 space-y-2">
            <Button asChild variant="outline" size="sm">
              <Link to={backTo} className="inline-flex items-center gap-2">
                <ArrowLeft aria-hidden />
                {backLabel}
              </Link>
            </Button>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Badge variant={statusToBadgeVariant(broadcast.status)}>{broadcast.status}</Badge>
            </div>

            <CardTitle className="truncate text-base font-semibold sm:text-lg">
              {title}
            </CardTitle>

            <div className="flex flex-wrap gap-3 text-sm font-normal text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <CalendarDays size={16} aria-hidden />
                {formatDate(broadcast.publishedAt || broadcast.createdAt)}
              </span>
              {broadcast.summary ? (
                <>
                  <span className="hidden md:inline">·</span>
                  <span className="truncate">{broadcast.summary}</span>
                </>
              ) : null}
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.4fr,0.6fr]">
        <Card className="min-h-0 overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Post body</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="aw-richtext text-sm font-normal leading-relaxed text-foreground"
              dangerouslySetInnerHTML={{ __html: broadcast.bodyHtml }}
            />
          </CardContent>
        </Card>

        <aside className="flex min-h-0 flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <FileText aria-hidden className="text-muted-foreground" />
                Attachments
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Files included with this post.
              </CardDescription>
            </CardHeader>
          </Card>

          {broadcast.attachments.length ? (
            <div className="flex flex-col gap-3">
              {broadcast.attachments.map((item) => (
                <FilePreviewCard key={item.id} file={item.file} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="px-5 py-8 text-sm font-normal text-muted-foreground">
                No attachments were submitted for this post.
              </CardContent>
            </Card>
          )}
        </aside>
      </div>
    </section>
  );
}
