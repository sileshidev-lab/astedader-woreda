import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  getBroadcast,
  publishBroadcast,
  archiveBroadcast,
  deleteBroadcast,
} from "../../../services/contentService";
import type { Broadcast } from "../../../services/contentService";
import { ErrorState } from "../../../components/ui/ErrorState";
import { LoadingState } from "../../../components/ui/LoadingState";
import { FilePreviewCard } from "../../../components/ui/FilePreviewCard";
import { useAuthStore } from "../../../stores/authStore";
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

export function BroadcastDetailPage() {
  const { t } = useTranslation();
  const { broadcastId } = useParams();
  const { hasPrivilege } = useAuthStore();

  const [broadcast, setBroadcast] = useState<Broadcast | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canUpdate = hasPrivilege("broadcast.update");
  const canPublish = hasPrivilege("broadcast.publish");
  const canArchive = hasPrivilege("broadcast.archive");
  const canDelete = hasPrivilege("broadcast.delete");

  const title = useMemo(
    () => broadcast?.title || t("broadcasts.detail.fallbackTitle"),
    [broadcast?.title, t],
  );

  async function load() {
    if (!broadcastId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getBroadcast(broadcastId);
      setBroadcast(data);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || t("broadcasts.detail.errors.load"));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [broadcastId]);

  async function handlePublish() {
    if (!broadcast || !broadcastId) return;
    await publishBroadcast(broadcastId);
    await load();
  }

  async function handleArchive() {
    if (!broadcast || !broadcastId) return;
    await archiveBroadcast(broadcastId);
    await load();
  }

  async function handleDelete() {
    if (!broadcast || !broadcastId) return;
    if (!confirm(t("broadcasts.detail.confirmDelete"))) return;
    await deleteBroadcast(broadcastId);
    window.location.href = "/woreda/broadcasts";
  }

  if (!broadcastId) {
    return <ErrorState message={t("broadcasts.detail.errors.missingId")} />;
  }

  if (isLoading) {
    return <LoadingState label={t("broadcasts.detail.loading")} />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={load} />;
  }

  if (!broadcast) {
    return <ErrorState message={t("broadcasts.detail.errors.notFound")} />;
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-5">
      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 space-y-1">
            <Badge variant={statusToBadgeVariant(broadcast.status)}>{broadcast.status}</Badge>
            <CardTitle className="truncate">{title}</CardTitle>
            {broadcast.summary ? (
              <CardDescription>{broadcast.summary}</CardDescription>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {canUpdate ? (
              <Button asChild variant="outline" size="default">
                <Link to={`/woreda/broadcasts/${broadcast.id}/edit`}>{t("common.edit")}</Link>
              </Button>
            ) : null}
            {canPublish && broadcast.status !== "published" ? (
              <Button type="button" variant="default" size="default" onClick={handlePublish}>
                {t("common.publish")}
              </Button>
            ) : null}
            {canArchive && broadcast.status === "published" ? (
              <Button type="button" variant="outline" size="default" onClick={handleArchive}>
                {t("common.archive")}
              </Button>
            ) : null}
            {canDelete ? (
              <Button type="button" variant="destructive" size="default" onClick={handleDelete}>
                {t("common.delete")}
              </Button>
            ) : null}
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[1.4fr,0.6fr]">
        <Card className="min-h-0 overflow-hidden">
          <CardHeader>
            <CardTitle>{t("broadcasts.detail.bodyTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="aw-richtext text-sm leading-relaxed text-foreground"
              dangerouslySetInnerHTML={{ __html: broadcast.bodyHtml }}
            />
          </CardContent>
        </Card>

        <aside className="flex min-h-0 flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("broadcasts.detail.attachmentsTitle")}</CardTitle>
              <CardDescription>{t("broadcasts.detail.attachmentsSubtitle")}</CardDescription>
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
              <CardContent className="px-5 py-8 text-sm text-muted-foreground">
                {t("broadcasts.detail.attachmentsEmpty")}
              </CardContent>
            </Card>
          )}
        </aside>
      </div>
    </section>
  );
}
