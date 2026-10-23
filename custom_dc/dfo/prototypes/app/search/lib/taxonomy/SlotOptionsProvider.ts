/**
 * SlotOptionsProvider — a source of candidate values for a slot edit, keyed by
 * shape + slot. Runtime code reads options straight off the engine's response
 * (optionsFromSpec.ts) rather than through this interface; its one implementor,
 * FixtureOptions, now backs component tests only (see FixtureOptions.ts).
 */

import type { Binding, Coverage, SlotKey } from '@/lib/contract/types';

export interface SlotOption {
  /** plain-language display label */
  label: string;
  /** the binding applied when this option is chosen */
  binding: Binding;
  /** observation count for this option (consequence-before-commit preview); only
   *  populated for the engine's `exact` coverage kind. Undefined here doesn't
   *  mean "no data" -- for `breadth`/`bare` coverage (or when this provider
   *  never carries coverage at all, e.g. FixtureOptions), use `coverage` below
   *  to tell probed-zero from never-probed. */
  count?: number;
  /** the engine's raw coverage verdict for this option, when the request probed
   *  it (the apis repo's src/search/models/coverage.py Coverage union). Absent for providers
   *  that don't carry coverage through (e.g. FixtureOptions) -- callers should
   *  fall back to `count` in that case (see lib/optionCoverage.ts's
   *  optionState/optionRichness). */
  coverage?: Coverage | null;
}

export interface SlotOptionsProvider {
  /** Candidate bindings a user can pick for a slot, within a given shape. */
  optionsFor(shapeId: string, slot: SlotKey): SlotOption[];
}
