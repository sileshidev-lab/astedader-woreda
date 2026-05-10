export function ActivityPage() {
  return (
    <section className="aw-design-page aw-mobile-page aw-design-activity flex min-h-0 flex-1 flex-col gap-5">
      <div className="hidden grid-cols-2 gap-3 md:grid md:grid-cols-4">
        <article className="aw-stat-card relative overflow-hidden rounded-3xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] p-4 shadow-sm">
          <div className="absolute right-0 top-0 h-20 w-20 rounded-bl-full bg-[var(--aw-primary-soft)]" aria-hidden />
          <p className="relative text-[10px] font-black uppercase tracking-[0.16em] text-[var(--aw-muted)]">Events today</p>
          <p className="relative mt-2 text-[clamp(1.35rem,2vw,2rem)] font-black leading-none text-[var(--aw-primary)]">0</p>
          <div className="relative mt-3 h-1.5 rounded-full bg-[var(--aw-primary)]" />
        </article>
        <article className="aw-stat-card relative overflow-hidden rounded-3xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] p-4 shadow-sm">
          <div className="absolute right-0 top-0 h-20 w-20 rounded-bl-full bg-[var(--aw-success-bg)]" aria-hidden />
          <p className="relative text-[10px] font-black uppercase tracking-[0.16em] text-[var(--aw-muted)]">Member actions</p>
          <p className="relative mt-2 text-[clamp(1.35rem,2vw,2rem)] font-black leading-none text-[var(--aw-success)]">0</p>
          <div className="relative mt-3 h-1.5 rounded-full bg-[var(--aw-success)]" />
        </article>
        <article className="aw-stat-card relative overflow-hidden rounded-3xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] p-4 shadow-sm">
          <div className="absolute right-0 top-0 h-20 w-20 rounded-bl-full bg-[var(--aw-magenta-bg)]" aria-hidden />
          <p className="relative text-[10px] font-black uppercase tracking-[0.16em] text-[var(--aw-muted)]">Account updates</p>
          <p className="relative mt-2 text-[clamp(1.35rem,2vw,2rem)] font-black leading-none text-[var(--aw-magenta)]">0</p>
          <div className="relative mt-3 h-1.5 rounded-full bg-[var(--aw-magenta)]" />
        </article>
        <article className="aw-stat-card relative overflow-hidden rounded-3xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] p-4 shadow-sm">
          <div className="absolute right-0 top-0 h-20 w-20 rounded-bl-full bg-[var(--aw-surface-muted)]" aria-hidden />
          <p className="relative text-[10px] font-black uppercase tracking-[0.16em] text-[var(--aw-muted)]">Pending review actions</p>
          <p className="relative mt-2 text-[clamp(1.35rem,2vw,2rem)] font-black leading-none text-[var(--aw-muted)]">0</p>
          <div className="relative mt-3 h-1.5 rounded-full bg-[var(--aw-muted)]" />
        </article>
      </div>

      <div className="overflow-hidden rounded-3xl border border-woreda-border/70 bg-woreda-surface shadow-none">
        <div className="flex flex-col gap-3 border-b border-woreda-border/70 bg-woreda-surfaceLow px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-black text-woreda-text">Activity log</h2>
            <p className="mt-1 text-sm font-semibold text-woreda-textMuted">
              Recent administrative events across announcements, members, and account actions.
            </p>
          </div>
          <div className="grid w-full gap-2 sm:grid-cols-2 md:w-auto md:grid-cols-3">
            <input
              type="date"
              className="min-h-10 rounded border border-woreda-border bg-woreda-surface px-3 text-sm outline-none focus:border-woreda-primary"
            />
            <select className="min-h-10 rounded border border-woreda-border bg-woreda-surface px-3 text-sm outline-none focus:border-woreda-primary">
              <option>All admins</option>
            </select>
            <button
              type="button"
              className="min-h-10 rounded-2xl border border-woreda-border bg-woreda-surface px-3 text-sm font-bold text-woreda-text hover:border-woreda-primary hover:text-woreda-primary"
            >
              Refresh
            </button>
          </div>
        </div>
        <div className="px-4 py-10 text-center">
          <p className="text-sm font-semibold text-woreda-textMuted">
            No activity records are available for the selected filters.
          </p>
        </div>
      </div>
    </section>
  );
}
