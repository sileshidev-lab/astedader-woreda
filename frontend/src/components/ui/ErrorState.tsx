import { AlertCircle } from "lucide-react";

export function ErrorState({
  title,
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      className="rounded-md border border-[var(--aw-border)] bg-[var(--aw-surface)] p-5"
      style={{ boxShadow: "var(--aw-shadow-xs)" }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md"
          style={{
            background: "var(--aw-danger-bg)",
            color: "var(--aw-danger)",
          }}
        >
          <AlertCircle size={18} />
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-[15px] font-semibold text-[var(--aw-text)]">
            {title || "Something went wrong"}
          </h3>
          <p className="mt-1 text-sm font-normal leading-relaxed text-[var(--aw-muted)]">
            {message}
          </p>
        </div>
      </div>
      {onRetry ? (
        <div className="mt-3">
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex h-9 items-center rounded-md border border-[var(--aw-primary)] bg-[var(--aw-primary)] px-3.5 text-sm font-medium text-white transition hover:bg-[var(--aw-primary-dark)] hover:border-[var(--aw-primary-dark)]"
          >
            Retry
          </button>
        </div>
      ) : null}
    </div>
  );
}
