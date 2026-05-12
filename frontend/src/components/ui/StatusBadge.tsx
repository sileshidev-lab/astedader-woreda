const styles: Record<string, string> = {
  approved:
    "border-[color:var(--aw-success)]/20 bg-[var(--aw-success-bg)] text-[color:var(--aw-success)]",
  active:
    "border-[color:var(--aw-success)]/20 bg-[var(--aw-success-bg)] text-[color:var(--aw-success)]",
  submitted:
    "border-[color:var(--aw-primary)]/15 bg-[var(--aw-primary-soft)] text-[color:var(--aw-primary)]",
  published:
    "border-[color:var(--aw-primary)]/15 bg-[var(--aw-primary-soft)] text-[color:var(--aw-primary)]",
  draft:
    "border-[var(--aw-border)] bg-[var(--aw-surface-muted)] text-[var(--aw-muted)]",
  closed:
    "border-[var(--aw-border)] bg-[var(--aw-surface-muted)] text-[var(--aw-muted)]",
  rejected:
    "border-[color:var(--aw-danger)]/20 bg-[var(--aw-danger-bg)] text-[color:var(--aw-danger)]",
  changes_requested:
    "border-[color:var(--aw-warning)]/25 bg-[var(--aw-warning-bg)] text-[color:var(--aw-warning)]",
  DISABLED:
    "border-[color:var(--aw-danger)]/20 bg-[var(--aw-danger-bg)] text-[color:var(--aw-danger)]",
  PENDING_SETUP:
    "border-[color:var(--aw-primary)]/15 bg-[var(--aw-primary-soft)] text-[color:var(--aw-primary)]",
  ACTIVE:
    "border-[color:var(--aw-success)]/20 bg-[var(--aw-success-bg)] text-[color:var(--aw-success)]",
};

export function StatusBadge({ value, label }: { value?: string | null; label?: string }) {
  const normalized = String(value || "").trim();
  const cls =
    styles[normalized] ||
    "border-[var(--aw-border)] bg-[var(--aw-surface-muted)] text-[var(--aw-muted)]";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}
    >
      <span
        aria-hidden
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ background: "currentColor", opacity: 0.7 }}
      />
      {label || (normalized || "-")}
    </span>
  );
}
