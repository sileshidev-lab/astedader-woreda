import type { ReactNode } from "react";

export function Modal({
  title,
  isOpen,
  onClose,
  children,
}: {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 md:items-center" role="dialog" aria-modal="true">
      <div className="w-full max-w-2xl rounded-3xl border border-woreda-border bg-woreda-surface shadow-xl">
        <div className="flex items-center justify-between gap-3 border-b border-woreda-border/70 px-5 py-4">
          <h2 className="text-base font-black text-woreda-text">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-xl border border-woreda-border bg-woreda-surface px-3 py-2 text-sm font-black text-woreda-text">
            Close
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>
  );
}

