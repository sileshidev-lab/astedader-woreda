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
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-woreda-border/70 bg-woreda-surface px-4 py-3">
      <p className="text-sm font-semibold text-woreda-textMuted">
        Page <span className="font-black text-woreda-text">{page}</span> of{" "}
        <span className="font-black text-woreda-text">{totalPages}</span>
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!hasPreviousPage}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          className="min-h-10 rounded-2xl border border-woreda-border bg-woreda-surface px-3 text-sm font-black text-woreda-text disabled:opacity-50"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={!hasNextPage}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          className="min-h-10 rounded-2xl bg-woreda-primary px-3 text-sm font-black text-white disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}

