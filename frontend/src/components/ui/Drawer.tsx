import type { ReactNode } from "react";

export function Drawer({
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
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" role="dialog" aria-modal="true">
      <div className="flex h-dvh w-full max-w-xl flex-col border-l border-woreda-border bg-woreda-surface">
        <div className="flex items-center justify-between gap-3 border-b border-woreda-border/70 px-5 py-4">
          <h2 className="text-base font-black text-woreda-text">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-xl border border-woreda-border bg-woreda-surface px-3 py-2 text-sm font-black text-woreda-text">
            Close
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto px-5 py-5">{children}</div>
      </div>
    </div>
  );
}

