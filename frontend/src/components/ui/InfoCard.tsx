type InfoCardProps = {
  title: string;
  value: string;
  description?: string;
};

export function InfoCard({ title, value, description }: InfoCardProps) {
  return (
    <div className="stat-card border border-woreda-border bg-woreda-surface p-[var(--space-md)]">
      <p className="stat-label text-eyebrow uppercase text-woreda-textMuted">
        {title}
      </p>
      <p className="stat-value mt-2 font-black text-woreda-text">{value}</p>
      {description ? (
        <p className="stat-sub mt-1 text-woreda-textMuted">{description}</p>
      ) : null}
    </div>
  );
}
