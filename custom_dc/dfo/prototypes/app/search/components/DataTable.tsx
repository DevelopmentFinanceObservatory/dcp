/**
 * DataTable — the (stat_var × entity) observation table, projected from
 * ViewModel.table. One row per resolved variable × place, with its latest
 * value and date when Spec.observations has a matching series, an em-dash
 * pair otherwise; the row stays, since the join itself is still meaningful.
 * Renders as a plain, accessible table.
 *
 * `showVariableColumn` defaults to true. DataPreview passes it explicitly:
 * false for a single part, since nothing else distinguishes rows; true once
 * it unions rows from more than one part, so the union stays readable.
 */

import type { TableView } from "../lib/viewModel";

const EMPTY = "—"; // em dash

export function DataTable({
  table,
  showVariableColumn = true,
}: {
  table: TableView;
  showVariableColumn?: boolean;
}) {
  if (table.rows.length === 0) return null;

  const th =
    "border-b border-g2 px-3 pb-2 text-left text-[12px] font-semibold uppercase tracking-[0.04em] text-g4";
  const thNum = `${th} text-right`;
  const td = "border-b border-g1 px-3 py-2 text-g6";
  const tdNum = `${td} text-right tabular-nums`;

  return (
    <table className="w-full border-collapse text-[14px]">
      <thead>
        <tr>
          {showVariableColumn && <th className={th}>Variable</th>}
          <th className={th}>Place</th>
          <th className={thNum}>Latest value</th>
          <th className={th}>Date</th>
        </tr>
      </thead>
      <tbody>
        {table.rows.map((row, i) => (
          <tr
            key={`${row.variable}-${row.entity}-${i}`}
            className="[&:last-child>td]:border-b-0"
          >
            {showVariableColumn && <td className={td}>{row.variable}</td>}
            <td className={td}>{row.entity || EMPTY}</td>
            <td className={tdNum}>{row.value ?? EMPTY}</td>
            <td className={td}>{row.date ?? EMPTY}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
