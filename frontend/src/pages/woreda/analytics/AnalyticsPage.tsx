function InfoCard({
  title,
  value,
  description,
  tone = "primary",
}: {
  title: string;
  value: string;
  description: string;
  tone?: "primary" | "success" | "magenta" | "muted";
}) {
  const toneClass =
    tone === "success"
      ? {
          soft: "bg-[var(--aw-success-bg)]",
          value: "text-[var(--aw-success)]",
          bar: "bg-[var(--aw-success)]",
        }
      : tone === "magenta"
        ? {
            soft: "bg-[var(--aw-magenta-bg)]",
            value: "text-[var(--aw-magenta)]",
            bar: "bg-[var(--aw-magenta)]",
          }
        : tone === "muted"
          ? {
              soft: "bg-[var(--aw-surface-muted)]",
              value: "text-[var(--aw-muted)]",
              bar: "bg-[var(--aw-muted)]",
            }
          : {
              soft: "bg-[var(--aw-primary-soft)]",
              value: "text-[var(--aw-primary)]",
              bar: "bg-[var(--aw-primary)]",
            };

  return (
    <article className="aw-stat-card relative overflow-hidden rounded-3xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] p-4 shadow-sm">
      <div className={`absolute right-0 top-0 h-20 w-20 rounded-bl-full ${toneClass.soft}`} aria-hidden />
      <p className="relative text-[10px] font-black uppercase tracking-[0.16em] text-[var(--aw-muted)]">
        {title}
      </p>
      <p className={`relative mt-2 text-[clamp(1.35rem,2vw,2rem)] font-black leading-none ${toneClass.value}`}>
        {value}
      </p>
      <p className="relative mt-2 text-xs font-semibold text-[var(--aw-muted)]">{description}</p>
      <div className={`relative mt-3 h-1.5 rounded-full ${toneClass.bar}`} />
    </article>
  );
}

export function AnalyticsPage() {
  return (
    <section className="aw-design-page aw-mobile-page flex min-h-0 flex-1 flex-col gap-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <InfoCard title="Forms" value="0" description="Total forms" tone="primary" />
        <InfoCard title="Reports" value="0" description="Submitted reports" tone="success" />
        <InfoCard title="Members" value="0" description="Registered members" tone="primary" />
        <InfoCard title="Reviews" value="0" description="Pending reviews" tone="magenta" />
      </div>

      <div className="overflow-hidden rounded-3xl border border-woreda-border/70 bg-woreda-surface">
        <div className="border-b border-woreda-border/70 bg-woreda-surfaceLow px-5 py-4">
          <h2 className="text-lg font-black text-woreda-text">Analytics overview</h2>
          <p className="mt-1 text-sm font-semibold text-woreda-textMuted">
            Analytics will appear here as reporting data is generated from directives and submissions.
          </p>
        </div>
        <div className="px-5 py-10 text-center">
          <p className="text-sm font-semibold text-woreda-textMuted">
            No analytics records are available yet.
          </p>
        </div>
      </div>
    </section>
  );
}
