import type { ReactNode } from "react";

export type DataTableColumn<Row> = {
  key: string;
  header: string;
  cell: (row: Row) => ReactNode;
  className?: string;
};

export function DataTable<Row>({
  columns,
  rows,
  rowKey,
}: {
  columns: Array<DataTableColumn<Row>>;
  rows: Row[];
  rowKey: (row: Row) => string;
}) {
  return (
    <div
      className="overflow-x-auto rounded-lg border border-[var(--aw-border-soft)] bg-[var(--aw-surface)]"
      style={{ boxShadow: "var(--aw-shadow-xs)" }}
    >
      <table className="min-w-full text-left text-sm">
        <thead className="sticky top-0 z-10 bg-[var(--aw-surface-muted)]">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={[
                  "whitespace-nowrap border-b border-[var(--aw-border-soft)] px-4 py-3 font-display text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--aw-muted)]",
                  col.className || "",
                ].join(" ")}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr
              key={rowKey(row)}
              className={[
                "transition-colors duration-fast hover:bg-[var(--aw-surface-muted)]",
                idx === 0 ? "" : "border-t border-[var(--aw-border-soft)]",
              ].join(" ")}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={[
                    "whitespace-nowrap px-4 py-3 font-medium text-[var(--aw-text)]",
                    col.className || "",
                  ].join(" ")}
                >
                  {col.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
