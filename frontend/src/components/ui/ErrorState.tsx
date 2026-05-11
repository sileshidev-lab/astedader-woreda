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
    <div className="rounded-3xl border border-woreda-border/70 bg-woreda-surface p-5">
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-black text-woreda-text">{title || "Something went wrong"}</h3>
        <p className="text-sm font-semibold text-woreda-textMuted">{message}</p>
      </div>
      {onRetry ? (
        <div className="mt-4">
          <button
            type="button"
            onClick={onRetry}
            className="min-h-10 rounded-2xl bg-woreda-primary px-4 text-sm font-black text-white hover:brightness-105"
          >
            Retry
          </button>
        </div>
      ) : null}
    </div>
  );
}

