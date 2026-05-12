import type { ReactNode } from "react";
import { X } from "lucide-react";

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
    <div
      className="fixed inset-0 z-50 flex justify-end"
      style={{ background: "var(--overlay-scrim)" }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="flex h-dvh w-full max-w-xl flex-col border-l border-[var(--aw-border-soft)] bg-[var(--aw-surface)]"
        style={{ boxShadow: "var(--aw-shadow-xl)" }}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[var(--aw-border-soft)] bg-[var(--aw-surface-muted)] px-5 py-3.5">
          <h2 className="font-display text-base font-bold text-[var(--aw-text-strong)]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--aw-border)] bg-[var(--aw-surface)] text-[var(--aw-muted)] transition hover:border-[var(--aw-primary)] hover:text-[var(--aw-primary)]"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto px-5 py-5">{children}</div>
      </div>
    </div>
  );
}
