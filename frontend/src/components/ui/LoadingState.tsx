export function LoadingState({ label }: { label?: string }) {
  return (
    <div className="flex min-h-40 items-center justify-center rounded-3xl border border-woreda-border/70 bg-woreda-surface px-5 py-10 text-sm font-semibold text-woreda-textMuted">
      {label || "Loading..."}
    </div>
  );
}

