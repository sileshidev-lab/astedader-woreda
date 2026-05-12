import { Loader2 } from "lucide-react";

export function LoadingState({ label }: { label?: string }) {
  return (
    <div
      className="flex min-h-40 items-center justify-center gap-3 rounded-md border border-[var(--aw-border)] bg-[var(--aw-surface)] px-5 py-10 text-sm font-normal text-[var(--aw-muted)]"
      style={{ boxShadow: "var(--aw-shadow-xs)" }}
      role="status"
      aria-live="polite"
    >
      <Loader2 size={16} className="animate-spin text-[var(--aw-primary)]" />
      <span>{label || "Loading..."}</span>
    </div>
  );
}
