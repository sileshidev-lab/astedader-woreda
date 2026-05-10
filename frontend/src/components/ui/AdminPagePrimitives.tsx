import type { ReactNode } from "react";

export function AdminMetricCard({
  label,
  value,
  note,
  tone = "primary",
}: {
  label: string;
  value: string | number;
  note?: string;
  tone?: "primary" | "success" | "warning" | "default";
}) {
  const toneClass =
    tone === "success"
      ? "bg-[var(--aw-success)]"
      : tone === "warning"
        ? "bg-[var(--aw-yellow)]"
        : tone === "default"
          ? "bg-[var(--aw-text)]"
          : "bg-[var(--aw-primary)]";

  return (
    <article className="aw-stat-card relative overflow-hidden rounded-3xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] p-4 shadow-sm">
      <div className="absolute right-0 top-0 h-20 w-20 rounded-bl-full bg-[var(--aw-primary-soft)]" aria-hidden />
      <p className="relative text-[11px] font-black uppercase tracking-[0.14em] text-[var(--aw-muted)]">{label}</p>
      <p className="relative mt-2 text-[clamp(1.35rem,2vw,2rem)] font-black leading-none text-[var(--aw-text)]">
        {value}
      </p>
      {note ? <p className="relative mt-2 text-xs font-semibold text-[var(--aw-muted)]">{note}</p> : null}
      <div className={`relative mt-3 h-1.5 rounded-full ${toneClass}`} />
    </article>
  );
}

export function AdminStatusPill({
  label,
  tone = "muted",
}: {
  label: string;
  tone?: "primary" | "success" | "danger" | "warning" | "muted";
}) {
  const className =
    tone === "primary"
      ? "border-woreda-primary/25 bg-woreda-primarySoft text-woreda-primary"
      : tone === "success"
        ? "border-woreda-success/25 bg-woreda-successBg text-woreda-success"
        : tone === "danger"
          ? "border-woreda-danger/25 bg-woreda-dangerBg text-woreda-danger"
          : tone === "warning"
            ? "border-woreda-yellow/30 bg-woreda-yellowBg text-woreda-yellowText"
            : "border-woreda-border bg-woreda-surfaceLow text-woreda-textMuted";

  return (
    <span className={`inline-flex items-center border px-2.5 py-1 text-xs font-black uppercase tracking-[0.06em] ${className}`}>
      {label}
    </span>
  );
}

export function AdminSectionPanel({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] shadow-sm">
      <div className="flex shrink-0 flex-col gap-3 border-b border-[var(--aw-border-soft)] bg-[var(--aw-surface-muted)] px-5 py-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="text-lg font-black text-[var(--aw-text)]">{title}</h2>
          {description ? <p className="mt-1 text-sm font-semibold text-[var(--aw-muted)]">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function AdminEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--aw-border-soft)] bg-[var(--aw-surface-muted)] px-4 py-10 text-center">
      <p className="text-base font-black text-[var(--aw-text)]">{title}</p>
      <p className="mt-2 text-sm font-semibold text-[var(--aw-muted)]">{description}</p>
    </div>
  );
}
