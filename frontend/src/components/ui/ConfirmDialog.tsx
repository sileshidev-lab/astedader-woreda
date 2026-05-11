import { Modal } from "./Modal";

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  isDanger,
}: {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDanger?: boolean;
}) {
  return (
    <Modal title={title} isOpen={isOpen} onClose={onCancel}>
      <p className="text-sm font-semibold text-woreda-textMuted">{message}</p>
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-10 rounded-2xl border border-woreda-border bg-woreda-surface px-4 text-sm font-black text-woreda-text"
        >
          {cancelLabel || "Cancel"}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={[
            "min-h-10 rounded-2xl px-4 text-sm font-black text-white",
            isDanger ? "bg-[var(--aw-danger)]" : "bg-woreda-primary",
          ].join(" ")}
        >
          {confirmLabel || "Confirm"}
        </button>
      </div>
    </Modal>
  );
}

