/**
 * CoverageRail — the count/coverage rail, projected from ViewModel.coverage.
 *
 * Rendered as a column of big numbers with small captions (per the wireframes):
 * breadth → one stat per dimension; exact → an observation count; bare → a "not
 * counted" marker. Meaning is carried by text, not colour alone.
 */

import type { CoverageView } from '../lib/viewModel';

function Stat({ num, cap }: { num: string; cap: string }) {
  return (
    <div>
      <div className="text-[28px] font-bold leading-none tracking-[-0.02em] text-g6">{num}</div>
      <div className="mt-0.5 text-[13px] text-g4">{cap}</div>
    </div>
  );
}

export function CoverageRail({ coverage }: { coverage: CoverageView }) {
  const { kind, dimensions, observationCount } = coverage;

  return (
    <section className="flex flex-col gap-[1.1rem]" aria-label="Coverage">
      {kind === 'breadth' &&
        dimensions.map((d) => <Stat key={d.label} num={String(d.count)} cap={d.label} />)}

      {kind === 'exact' && <Stat num={String(observationCount ?? '—')} cap="observations" />}

      {kind === 'bare' && (
        <div>
          <div className="text-[28px] font-bold leading-none tracking-[-0.02em] text-g6">—</div>
          <div className="mt-0.5 text-[13px] text-g4">not counted</div>
          <div className="mt-1 text-[13px] text-g4">no observations</div>
        </div>
      )}
    </section>
  );
}
