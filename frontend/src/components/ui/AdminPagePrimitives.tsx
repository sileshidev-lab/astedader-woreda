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
  // Tone influences subtle text-color hints on the label; the surface
  // itself stays neutral so the page reads as a calm grid rather than a
  // collection of decorated stat cards.
  const labelTone =
    tone === "success"
      ? "text-[var(--aw-success)]"
      : tone === "warning"
        ? "text-[var(--aw-warning)]"
        : tone === "default"
          ? "text-[var(--aw-muted)]"
          : "text-[var(--aw-muted)]";

  return (
    <article
      className="relative overflow-hidden rounded-md border border-[var(--aw-border)] bg-[var(--aw-surface)] p-4"
      style={{ boxShadow: "var(--aw-shadow-xs)" }}
    >
      <p
        className={`relative font-sans text-[11px] font-medium uppercase tracking-[0.06em] ${labelTone}`}
      >
        {label}
      </p>
      <p
        className="relative mt-1.5 font-display text-[1.625rem] font-semibold leading-tight text-[var(--aw-text)]"
        style={{ letterSpacing: "-0.01em", fontVariantNumeric: "tabular-nums lining-nums" }}
      >
        {value}
      </p>
      {note ? (
        <p className="relative mt-1.5 text-xs font-normal text-[var(--aw-muted)]">{note}</p>
      ) : null}
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
      ? "border-[color:var(--aw-primary)]/15 bg-[var(--aw-primary-soft)] text-[var(--aw-primary)]"
      : tone === "success"
        ? "border-[color:var(--aw-success)]/20 bg-[var(--aw-success-bg)] text-[var(--aw-success)]"
        : tone === "danger"
          ? "border-[color:var(--aw-danger)]/20 bg-[var(--aw-danger-bg)] text-[var(--aw-danger)]"
          : tone === "warning"
            ? "border-[color:var(--aw-warning)]/25 bg-[var(--aw-warning-bg)] text-[var(--aw-warning)]"
            : "border-[var(--aw-border)] bg-[var(--aw-surface-muted)] text-[var(--aw-muted)]";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${className}`}
    >
      <span
        aria-hidden
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ background: "currentColor", opacity: 0.7 }}
      />
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
    <section
      className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-[var(--aw-border)] bg-[var(--aw-surface)]"
      style={{ boxShadow: "var(--aw-shadow-xs)" }}
    >
      <div className="flex shrink-0 flex-col gap-2 border-b border-[var(--aw-border-soft)] bg-[var(--aw-surface)] px-5 py-3.5 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <h2 className="font-display text-base font-semibold text-[var(--aw-text)]" style={{ letterSpacing: "-0.005em" }}>
            {title}
          </h2>
          {description ? (
            <p className="mt-0.5 text-sm font-normal text-[var(--aw-muted)]">{description}</p>
          ) : null}
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
    <div className="rounded-md border border-dashed border-[var(--aw-border)] bg-[var(--aw-surface)] px-4 py-10 text-center">
      <p className="font-display text-base font-semibold text-[var(--aw-text)]">{title}</p>
      <p className="mx-auto mt-1.5 max-w-xl text-sm font-normal leading-relaxed text-[var(--aw-muted)]">
        {description}
      </p>
    </div>
  );
}
