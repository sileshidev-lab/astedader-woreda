import type { Pagination as PaginationShape } from "../../types/common";

export function Pagination({
  pagination,
  onPageChange,
}: {
  pagination: PaginationShape;
  onPageChange: (page: number) => void;
}) {
  const { page, totalPages, hasNextPage, hasPreviousPage } = pagination;

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] px-4 py-3"
      style={{ boxShadow: "var(--aw-shadow-xs)" }}
    >
      <p className="text-sm font-medium text-[var(--aw-muted)]">
        Page{" "}
        <span className="font-semibold text-[var(--aw-text)]">{page}</span> of{" "}
        <span className="font-semibold text-[var(--aw-text)]">{totalPages}</span>
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!hasPreviousPage}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          className="inline-flex min-h-9 items-center rounded-md border border-[var(--aw-border)] bg-[var(--aw-surface)] px-3 text-sm font-semibold text-[var(--aw-text)] transition hover:border-[var(--aw-primary)] hover:bg-[var(--aw-primary-softer)] hover:text-[var(--aw-primary)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-[var(--aw-border)] disabled:hover:bg-[var(--aw-surface)] disabled:hover:text-[var(--aw-text)]"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={!hasNextPage}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          className="inline-flex min-h-9 items-center rounded-md border border-[var(--aw-primary)] bg-[var(--aw-primary)] px-3 text-sm font-semibold text-white transition hover:bg-[var(--aw-primary-dark)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
