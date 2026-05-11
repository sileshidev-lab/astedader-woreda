import type { ReactNode } from "react";

export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-woreda-border/70 bg-woreda-surface px-4 py-4 md:flex-row md:items-center md:justify-between">
      {children}
    </div>
  );
}

