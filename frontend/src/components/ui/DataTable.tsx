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
    <div className="overflow-x-auto rounded-3xl border border-woreda-border/70 bg-woreda-surface">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-woreda-surfaceLow">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`whitespace-nowrap px-4 py-3 text-xs font-black uppercase tracking-wide text-woreda-textMuted ${col.className || ""}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="border-t border-woreda-border/60">
              {columns.map((col) => (
                <td key={col.key} className={`whitespace-nowrap px-4 py-3 font-semibold text-woreda-text ${col.className || ""}`}>
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

