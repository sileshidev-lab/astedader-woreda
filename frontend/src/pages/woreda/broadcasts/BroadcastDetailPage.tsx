import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getBroadcast, publishBroadcast, archiveBroadcast, deleteBroadcast } from "../../../services/contentService";
import type { Broadcast } from "../../../services/contentService";
import { ErrorState } from "../../../components/ui/ErrorState";
import { LoadingState } from "../../../components/ui/LoadingState";
import { FilePreviewCard } from "../../../components/ui/FilePreviewCard";
import { useAuthStore } from "../../../stores/authStore";

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

  const title = useMemo(() => broadcast?.title || t("broadcasts.detail.fallbackTitle"), [broadcast?.title, t]);

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
    <section className="aw-design-page aw-mobile-page flex min-h-0 flex-1 flex-col gap-5">
      <div className="flex flex-col gap-3 rounded-3xl border border-woreda-border/70 bg-woreda-surface px-5 py-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-woreda-textMuted">
              {broadcast.status}
            </p>
            <h2 className="mt-1 truncate text-xl font-black text-woreda-text">{title}</h2>
            {broadcast.summary ? (
              <p className="mt-2 text-sm font-semibold text-woreda-textMuted">{broadcast.summary}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {canUpdate ? (
              <Link
                to={`/woreda/broadcasts/${broadcast.id}/edit`}
                className="min-h-10 rounded-2xl border border-woreda-border bg-woreda-surface px-4 text-sm font-black text-woreda-text hover:border-woreda-primary hover:text-woreda-primary"
              >
                {t("common.edit")}
              </Link>
            ) : null}
            {canPublish && broadcast.status !== "published" ? (
              <button
                type="button"
                onClick={handlePublish}
                className="min-h-10 rounded-2xl bg-woreda-primary px-4 text-sm font-black text-white hover:brightness-105"
              >
                {t("common.publish")}
              </button>
            ) : null}
            {canArchive && broadcast.status === "published" ? (
              <button
                type="button"
                onClick={handleArchive}
                className="min-h-10 rounded-2xl border border-woreda-border bg-woreda-surface px-4 text-sm font-black text-woreda-text hover:border-woreda-primary hover:text-woreda-primary"
              >
                {t("common.archive")}
              </button>
            ) : null}
            {canDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                className="min-h-10 rounded-2xl border border-[var(--aw-danger)]/30 bg-[var(--aw-danger-bg)] px-4 text-sm font-black text-[var(--aw-danger)]"
              >
                {t("common.delete")}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr,0.6fr]">
        <article className="min-h-0 overflow-hidden rounded-3xl border border-woreda-border/70 bg-woreda-surface">
          <div className="border-b border-woreda-border/70 bg-woreda-surfaceLow px-5 py-4">
            <h3 className="text-base font-black text-woreda-text">{t("broadcasts.detail.bodyTitle")}</h3>
          </div>
          <div className="px-5 py-5">
            <div
              className="aw-richtext text-sm font-semibold leading-relaxed text-woreda-text"
              dangerouslySetInnerHTML={{ __html: broadcast.bodyHtml }}
            />
          </div>
        </article>

        <aside className="flex min-h-0 flex-col gap-4">
          <div className="rounded-3xl border border-woreda-border/70 bg-woreda-surface px-5 py-5">
            <h3 className="text-base font-black text-woreda-text">{t("broadcasts.detail.attachmentsTitle")}</h3>
            <p className="mt-1 text-sm font-semibold text-woreda-textMuted">
              {t("broadcasts.detail.attachmentsSubtitle")}
            </p>
          </div>

          {broadcast.attachments.length ? (
            <div className="flex flex-col gap-3">
              {broadcast.attachments.map((item) => (
                <FilePreviewCard key={item.id} file={item.file} />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-woreda-border/70 bg-woreda-surface px-5 py-8 text-sm font-semibold text-woreda-textMuted">
              {t("broadcasts.detail.attachmentsEmpty")}
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
