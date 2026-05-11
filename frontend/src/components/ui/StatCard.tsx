import type { ReactNode } from "react";

export function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <article className="relative overflow-hidden rounded-3xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--aw-muted)]">
            {label}
          </p>
          <div className="mt-2 text-[clamp(1.35rem,2vw,2rem)] font-black leading-none text-[var(--aw-primary)]">
            {value}
          </div>
          {hint ? (
            <p className="mt-2 text-xs font-semibold text-[var(--aw-muted)]">{hint}</p>
          ) : null}
        </div>
        {icon ? (
          <div className="rounded-2xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface-muted)] p-2 text-[var(--aw-muted)]">
            {icon}
          </div>
        ) : null}
      </div>
    </article>
  );
}

