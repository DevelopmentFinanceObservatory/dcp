/**
 * Shared placeholder chrome for the Stage-0 component seams.
 *
 * Every seam is an EMPTY SCAFFOLD at Stage 0: typed props, a labelled stub, and a
 * TODO pointing at the stage that fills it in. They render against the Spec for
 * now; Stage 1 introduces buildViewModel(Spec) → ViewModel and the seams switch to
 * consuming the ViewModel instead. Keeping them present (not absent) lets the
 * /search surface compose the full layout from day one.
 */

import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function SeamPlaceholder({
  name,
  stage,
  children,
}: {
  name: string;
  stage: string;
  children?: ReactNode;
}) {
  return (
    <section
      aria-label={`${name} (scaffold)`}
      className="rounded-lg border border-dashed border-g3 bg-g1 px-4 py-3"
    >
      <div className={cn('text-[12px] text-g4', Boolean(children) && 'mb-1.5')}>
        {name} · scaffold · {stage}
      </div>
      {children}
    </section>
  );
}
