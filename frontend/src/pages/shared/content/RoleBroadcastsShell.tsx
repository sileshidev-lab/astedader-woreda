import { Newspaper } from "lucide-react";
import { PublishedBroadcastsPage } from "./PublishedBroadcastsPage";

type RoleBroadcastsShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  subtitle: string;
  detailBasePath?: string;
};

export function RoleBroadcastsShell({
  eyebrow,
  title,
  description,
  subtitle,
  detailBasePath,
}: RoleBroadcastsShellProps) {
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
                {eyebrow}
              </p>
              <h1 className="mt-1 text-[clamp(1.35rem,2.2vw,2rem)] font-black tracking-tight text-[var(--aw-text)]">
                {title}
              </h1>
              <p className="mt-1 max-w-3xl text-sm font-semibold leading-6 text-[var(--aw-muted)]">
                {description}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-visible rounded-[1.75rem] border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] shadow-sm md:overflow-hidden">
        <PublishedBroadcastsPage title={title} subtitle={subtitle} detailBasePath={detailBasePath} />
      </div>
    </section>
  );
}
