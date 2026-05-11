import { PageButton } from "../../../components/ui/PageButton";

export function ReportsPage() {
  return (
    <section className="aw-design-page aw-mobile-page flex min-h-0 flex-1 flex-col gap-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <article className="aw-stat-card relative overflow-hidden rounded-3xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] p-4 shadow-sm">
          <div className="absolute right-0 top-0 h-20 w-20 rounded-bl-full bg-[var(--aw-primary-soft)]" aria-hidden />
          <p className="relative text-[10px] font-black uppercase tracking-[0.16em] text-[var(--aw-muted)]">Reports</p>
          <p className="relative mt-2 text-[clamp(1.35rem,2vw,2rem)] font-black leading-none text-[var(--aw-primary)]">0</p>
          <div className="relative mt-3 h-1.5 rounded-full bg-[var(--aw-primary)]" />
        </article>
        <article className="aw-stat-card relative overflow-hidden rounded-3xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] p-4 shadow-sm">
          <div className="absolute right-0 top-0 h-20 w-20 rounded-bl-full bg-[var(--aw-success-bg)]" aria-hidden />
          <p className="relative text-[10px] font-black uppercase tracking-[0.16em] text-[var(--aw-muted)]">Approved</p>
          <p className="relative mt-2 text-[clamp(1.35rem,2vw,2rem)] font-black leading-none text-[var(--aw-success)]">0</p>
          <div className="relative mt-3 h-1.5 rounded-full bg-[var(--aw-success)]" />
        </article>
        <article className="aw-stat-card relative overflow-hidden rounded-3xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] p-4 shadow-sm">
          <div className="absolute right-0 top-0 h-20 w-20 rounded-bl-full bg-[var(--aw-warning-bg)]" aria-hidden />
          <p className="relative text-[10px] font-black uppercase tracking-[0.16em] text-[var(--aw-muted)]">Changes requested</p>
          <p className="relative mt-2 text-[clamp(1.35rem,2vw,2rem)] font-black leading-none text-[var(--aw-warning)]">0</p>
          <div className="relative mt-3 h-1.5 rounded-full bg-[var(--aw-warning)]" />
        </article>
        <article className="aw-stat-card relative overflow-hidden rounded-3xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] p-4 shadow-sm">
          <div className="absolute right-0 top-0 h-20 w-20 rounded-bl-full bg-[var(--aw-magenta-bg)]" aria-hidden />
          <p className="relative text-[10px] font-black uppercase tracking-[0.16em] text-[var(--aw-muted)]">Rejected</p>
          <p className="relative mt-2 text-[clamp(1.35rem,2vw,2rem)] font-black leading-none text-[var(--aw-magenta)]">0</p>
          <div className="relative mt-3 h-1.5 rounded-full bg-[var(--aw-magenta)]" />
        </article>
      </div>

      <section className="overflow-hidden rounded-3xl border border-woreda-border/70 bg-woreda-surface">
        <div className="flex flex-col gap-3 border-b border-woreda-border/70 bg-woreda-surfaceLow px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-black text-woreda-text">Reports</h2>
            <p className="mt-1 text-sm font-semibold text-woreda-textMuted">
              Hibret report records are accessed from directive and Hibret review flows.
            </p>
          </div>
          <PageButton>Export Reports</PageButton>
        </div>
        <div className="px-5 py-10 text-center">
          <p className="text-sm font-semibold text-woreda-textMuted">
            No standalone report records are listed on this page.
          </p>
        </div>
      </section>
    </section>
  );
}
