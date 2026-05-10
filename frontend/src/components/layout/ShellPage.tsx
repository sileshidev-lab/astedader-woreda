type ShellPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
};

export function ShellPage({
  eyebrow,
  title,
  description,
  actions,
  children,
}: ShellPageProps) {
  return (
    <section className="aw-design-page space-y-6">
      <div className="border border-woreda-border bg-woreda-surface px-shell-x py-shell-y shadow-none">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-fluid-eyebrow font-bold uppercase tracking-[0.16em] text-woreda-textMuted">
              {eyebrow}
            </p>
            <h1 className="mt-2 text-fluid-title font-bold leading-tight text-woreda-text">
              {title}
            </h1>
            <p className="mt-2 max-w-4xl text-fluid-body leading-6 text-woreda-textMuted">
              {description}
            </p>
          </div>

          {actions ? (
            <div className="flex flex-wrap items-center gap-2">{actions}</div>
          ) : null}
        </div>
      </div>

      {children}
    </section>
  );
}
