import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <h1
          className="font-display text-[20px] font-semibold leading-snug text-[var(--aw-text)] md:text-[22px]"
          style={{ letterSpacing: "-0.01em" }}
        >
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 max-w-2xl text-[13px] font-normal text-[var(--aw-muted)]">
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
