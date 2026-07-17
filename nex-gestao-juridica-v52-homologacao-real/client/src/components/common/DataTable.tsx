import { useMemo, useState, type ReactNode } from "react";

export type DataTableColumn<T> = {
  key: keyof T | string;
  header: string;
  render?: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
};

export function DataTable<T extends { id: string }>({ rows, columns, empty = "Nenhum registro encontrado." }: { rows: T[]; columns: DataTableColumn<T>[]; empty?: string }) {
  const [sortKey, setSortKey] = useState<string>(String(columns[0]?.key ?? "id"));
  const [direction, setDirection] = useState<"asc" | "desc">("asc");
  const sorted = useMemo(() => [...rows].sort((a, b) => {
    const column = columns.find((item) => String(item.key) === sortKey);
    const av = column?.sortValue?.(a) ?? String((a as Record<string, unknown>)[sortKey] ?? "");
    const bv = column?.sortValue?.(b) ?? String((b as Record<string, unknown>)[sortKey] ?? "");
    const result = av > bv ? 1 : av < bv ? -1 : 0;
    return direction === "asc" ? result : -result;
  }), [columns, direction, rows, sortKey]);
  if (!rows.length) return <div className="empty-state"><strong>{empty}</strong></div>;
  return <div className="responsive-table"><table><thead><tr>{columns.map((column) => <th key={String(column.key)}><button className="table-sort" onClick={() => { const key = String(column.key); setDirection(sortKey === key && direction === "asc" ? "desc" : "asc"); setSortKey(key); }}>{column.header}</button></th>)}</tr></thead><tbody>{sorted.map((row) => <tr key={row.id}>{columns.map((column) => <td key={String(column.key)} data-label={column.header}>{column.render ? column.render(row) : String((row as Record<string, unknown>)[String(column.key)] ?? "")}</td>)}</tr>)}</tbody></table></div>;
}
