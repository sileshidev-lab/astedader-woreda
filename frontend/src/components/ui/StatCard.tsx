import type { ReactNode } from "react";

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "primary",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  tone?: "primary" | "success" | "warning" | "danger" | "neutral";
}) {
  const accent =
    tone === "success"
      ? "var(--aw-success)"
      : tone === "warning"
        ? "var(--aw-warning)"
        : tone === "danger"
          ? "var(--aw-danger)"
          : tone === "neutral"
            ? "var(--aw-muted)"
            : "var(--aw-primary)";

  return (
    <article
      className="relative overflow-hidden rounded-md border border-[var(--aw-border)] bg-[var(--aw-surface)] p-4"
      style={{ boxShadow: "var(--aw-shadow-xs)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-sans text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--aw-muted)]">
            {label}
          </p>
          <div
            className="mt-1.5 font-display text-[1.625rem] font-semibold leading-tight text-[var(--aw-text)]"
            style={{ letterSpacing: "-0.01em", fontVariantNumeric: "tabular-nums lining-nums" }}
          >
            {value}
          </div>
          {hint ? (
            <p className="mt-1.5 text-xs font-normal text-[var(--aw-muted)]">{hint}</p>
          ) : null}
        </div>
        {icon ? (
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[var(--aw-border-soft)] bg-[var(--aw-surface-muted)]"
            style={{ color: accent }}
          >
            {icon}
          </div>
        ) : null}
      </div>
    </article>
  );
}
