import type { ReactNode } from "react";

export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex flex-col gap-3 rounded-lg border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] px-4 py-4 md:flex-row md:items-center md:justify-between"
      style={{ boxShadow: "var(--aw-shadow-xs)" }}
    >
      {children}
    </div>
  );
}
