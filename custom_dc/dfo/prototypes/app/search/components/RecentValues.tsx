/**
 * RecentValues — compact newest-first Date/Value table for a single-series
 * spec, rendered by DataPreview instead of DataTable when there's more than
 * the latest point to show. Same table styling idiom as DataTable, plus a
 * quiet note when the series ships fewer points than the answer actually has.
 */

import type { RecentPointsView } from '../lib/viewModel';

const EMPTY = '—'; // em dash

export function RecentValues({ recentPoints }: { recentPoints: RecentPointsView }) {
  const th = 'border-b border-g2 px-3 pb-2 text-left text-[12px] font-semibold uppercase tracking-[0.04em] text-g4';
  const thNum = `${th} text-right`;
  const td = 'border-b border-g1 px-3 py-2 text-g6';
  const tdNum = `${td} text-right tabular-nums`;

  return (
    <div className="grid gap-1">
      <table className="w-full border-collapse text-[14px]">
        <thead>
          <tr>
            <th className={th}>Date</th>
            <th className={thNum}>Value</th>
          </tr>
        </thead>
        <tbody>
          {recentPoints.points.map((p, i) => (
            <tr key={`${p.date}-${i}`} className="[&:last-child>td]:border-b-0">
              <td className={td}>{p.date}</td>
              <td className={tdNum}>{p.value ?? EMPTY}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {recentPoints.shownCount < recentPoints.totalObs && (
        <div className="text-[12px] text-g4">
          Showing latest {recentPoints.shownCount} of {recentPoints.totalObs} observations
        </div>
      )}
    </div>
  );
}
