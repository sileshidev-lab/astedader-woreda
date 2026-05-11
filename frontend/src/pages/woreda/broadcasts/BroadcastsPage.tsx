import { Link } from "react-router-dom";
import { Newspaper, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PublishedBroadcastsPage } from "../../shared/content/PublishedBroadcastsPage";
import { useAuthStore } from "../../../stores/authStore";

export function BroadcastsPage() {
  const { t } = useTranslation();
  const { hasPrivilege } = useAuthStore();
  const canCreate = hasPrivilege("broadcast.create");

  return (
    <section className="aw-design-page aw-mobile-page aw-broadcasts-page flex min-h-0 flex-1 flex-col gap-4 overflow-visible md:overflow-hidden">
      <header className="shrink-0 overflow-hidden rounded-[1.75rem] border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] shadow-sm">
        <div className="h-1.5 bg-gradient-to-r from-[var(--aw-primary)] via-[var(--aw-yellow)] to-[var(--aw-magenta)]" />

        <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 gap-3 sm:gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--aw-primary-soft)] text-[var(--aw-primary)] ring-1 ring-[var(--aw-primary)]/15 sm:h-14 sm:w-14">
              <Newspaper size={24} />
            </div>

            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--aw-primary)]">
                {t("broadcasts.list.eyebrow")}
              </p>
              <h1 className="mt-1 text-[clamp(1.35rem,2.2vw,2rem)] font-black tracking-tight text-[var(--aw-text)]">
                {t("broadcasts.list.title")}
              </h1>
              <p className="mt-1 max-w-3xl text-sm font-semibold leading-6 text-[var(--aw-muted)]">
                {t("broadcasts.list.subtitle")}
              </p>
            </div>
          </div>

          {canCreate ? (
            <Link
              to="/woreda/broadcasts/new"
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[var(--aw-primary)] bg-[var(--aw-primary)] px-4 py-2.5 text-sm font-black text-white shadow-sm shadow-[var(--aw-primary)]/20 transition hover:-translate-y-0.5 hover:bg-[var(--aw-primary-strong)] focus:outline-none focus:ring-4 focus:ring-[var(--aw-primary)]/20 active:translate-y-0 sm:w-auto"
            >
              <Plus size={16} />
              {t("broadcasts.list.actions.new")}
            </Link>
          ) : null}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-visible rounded-[1.75rem] border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] shadow-sm md:overflow-hidden">
        <PublishedBroadcastsPage
          title={t("broadcasts.list.feedTitle")}
          subtitle={t("broadcasts.list.feedSubtitle")}
          detailBasePath="/woreda/broadcasts"
        />
      </div>
    </section>
  );
}
