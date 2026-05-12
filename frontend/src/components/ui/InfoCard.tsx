type InfoCardProps = {
  title: string;
  value: string;
  description?: string;
};

export function InfoCard({ title, value, description }: InfoCardProps) {
  return (
    <div
      className="rounded-lg border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] p-4"
      style={{ boxShadow: "var(--aw-shadow-xs)" }}
    >
      <p className="font-display text-[10.5px] font-bold uppercase tracking-[0.12em] text-[var(--aw-muted)]">
        {title}
      </p>
      <p
        className="mt-2 font-display text-xl font-bold text-[var(--aw-text-strong)]"
        style={{ letterSpacing: "-0.015em" }}
      >
        {value}
      </p>
      {description ? (
        <p className="mt-1 text-xs font-medium text-[var(--aw-muted)]">
          {description}
        </p>
      ) : null}
    </div>
  );
}
