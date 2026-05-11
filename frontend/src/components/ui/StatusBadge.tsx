const styles: Record<string, string> = {
  approved: "border-[color:var(--aw-success)]/20 bg-[var(--aw-success-bg)] text-[color:var(--aw-success)]",
  active: "border-[color:var(--aw-success)]/20 bg-[var(--aw-success-bg)] text-[color:var(--aw-success)]",
  submitted: "border-[color:var(--aw-primary)]/20 bg-[var(--aw-primary-soft)] text-[color:var(--aw-primary)]",
  published: "border-[color:var(--aw-primary)]/20 bg-[var(--aw-primary-soft)] text-[color:var(--aw-primary)]",
  draft: "border-woreda-border bg-woreda-surfaceLow text-woreda-textMuted",
  closed: "border-woreda-border bg-woreda-surfaceLow text-woreda-textMuted",
  rejected: "border-[color:var(--aw-danger)]/20 bg-[var(--aw-danger-bg)] text-[color:var(--aw-danger)]",
  changes_requested: "border-[color:var(--aw-warning)]/30 bg-[var(--aw-warning-bg)] text-[color:var(--aw-warning)]",
  DISABLED: "border-[color:var(--aw-danger)]/20 bg-[var(--aw-danger-bg)] text-[color:var(--aw-danger)]",
  PENDING_SETUP: "border-[color:var(--aw-primary)]/20 bg-[var(--aw-primary-soft)] text-[color:var(--aw-primary)]",
  ACTIVE: "border-[color:var(--aw-success)]/20 bg-[var(--aw-success-bg)] text-[color:var(--aw-success)]",
};

export function StatusBadge({ value, label }: { value?: string | null; label?: string }) {
  const normalized = String(value || "").trim();
  const cls = styles[normalized] || "border-woreda-border bg-woreda-surfaceLow text-woreda-textMuted";

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-black ${cls}`}>
      {label || (normalized || "-")}
    </span>
  );
}

