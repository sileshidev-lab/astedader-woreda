import type { ReactNode } from "react";

export function EmptyState({
  title,
  message,
  action,
  icon,
}: {
  title: string;
  message: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div
      className="flex flex-col items-center gap-3 rounded-md border border-dashed border-[var(--aw-border)] bg-[var(--aw-surface)] px-6 py-10 text-center"
    >
      {icon ? (
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--aw-border-soft)] bg-[var(--aw-surface-muted)] text-[var(--aw-muted)]"
        >
          {icon}
        </div>
      ) : null}
      <h3 className="font-display text-base font-semibold text-[var(--aw-text)]">
        {title}
      </h3>
      <p className="mx-auto max-w-xl text-sm font-normal leading-relaxed text-[var(--aw-muted)]">
        {message}
      </p>
      {action ? <div className="mt-1 flex justify-center">{action}</div> : null}
    </div>
  );
}
