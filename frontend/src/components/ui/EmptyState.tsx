import type { ReactNode } from "react";

export function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-woreda-border/70 bg-woreda-surface px-6 py-10 text-center">
      <h3 className="text-base font-black text-woreda-text">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm font-semibold text-woreda-textMuted">{message}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
