/**
 * optionCoverage — shared rank-and-demote logic for coverage-annotated option lists.
 *
 * Coverage-annotated options (the search engine's SlotOption/EntityOption, and the
 * flattened production SlotOption PhrasePopover renders -- app/search/lib/taxonomy/
 * SlotOptionsProvider.ts, which carries both a `count` and an optional raw
 * `coverage` ride-along) fall into three states:
 *   - 'observed'    the probe ran and found data
 *   - 'probed-zero' the probe ran and confirmed no data for this slice
 *   - 'unknown'     never probed (coverage off), or this option had no
 *                    constructible/confirmable member to probe at all
 * The engine never fabricates a verdict for the third case (see
 * SlotOption.coverage in the apis repo's src/search/models/options.py) —
 * coverage stays `None`/`undefined` rather than being reported as zero, so it
 * must never be treated as "no data" here either.
 *
 * partitionOptions groups a list into `main` (observed, richest-first, then
 * unknown in original relative order) and `hidden` (probed-zero, minus any
 * pinned selection) for a caller-side disclosure row. A list with no probed
 * verdicts at all passes through unchanged (today's order and behavior).
 */

export type CoverageState = 'observed' | 'probed-zero' | 'unknown';

/** State for an engine-shaped coverage value (SlotOption.coverage from
 *  the apis repo's src/search/models/options.py): absent means never probed, has_data:false
 *  means the probe ran and confirmed nothing, otherwise observed. */
export function coverageState(coverage: { has_data?: boolean } | null | undefined): CoverageState {
  if (!coverage) return 'unknown';
  return coverage.has_data === false ? 'probed-zero' : 'observed';
}

/** Richness key for an engine coverage value, compared lexicographically
 *  (higher first): `dimensions`, in the engine's fixed [facet_count, obs_count]
 *  order (see search.engine.coverage.coverage_from_facets), when present, else
 *  `observation_count`, else 0 (e.g. a bare has_data:true with no count). */
export function coverageRichness(coverage: any): number[] {
  const dims: Array<{ count?: number }> = coverage?.dimensions ?? [];
  if (dims.length) return dims.map((d) => d.count ?? 0);
  if (coverage?.observation_count != null) return [coverage.observation_count];
  return [0];
}

/** State from a flattened observation count alone (no coverage ride-along):
 *  undefined means never probed, 0 means probed-and-empty, any positive number
 *  means observed. Only correct for `exact` coverage, whose has_data verdict
 *  always agrees with its count -- a `breadth`/`bare` probed-zero has no count
 *  at all, so it would be misread as never-probed. Used as the fallback leg of
 *  optionState/optionRichness below, for producers (e.g. FixtureOptions) that
 *  don't carry coverage through. */
export function countState(count: number | null | undefined): CoverageState {
  if (count == null) return 'unknown';
  return count > 0 ? 'observed' : 'probed-zero';
}

/** Flattened production SlotOption shape (app/search/lib/taxonomy/SlotOptionsProvider.ts):
 *  a `count` plus an optional raw `coverage` ride-along. `coverage` is `any`
 *  here for the same reason as coverageRichness's param -- it's the engine's
 *  Coverage discriminated union (the apis repo's src/search/models/coverage.py), which this
 *  shared lib deliberately doesn't import to stay usable from both the
 *  flattened production shape and the raw engine shape (app/gutcheck/page.tsx). */
interface FlattenedOption {
  coverage?: any;
  count?: number | null;
}

/** State for a flattened production option: prefers the full engine `coverage`
 *  (correct across all three coverage kinds) when the option carries one,
 *  falling back to the flattened `count` for providers that don't (e.g.
 *  FixtureOptions, which only ever set `count`). */
export function optionState(option: FlattenedOption): CoverageState {
  if (option.coverage != null) return coverageState(option.coverage);
  return countState(option.count);
}

/** Richness for a flattened production option, same coverage-first/count-
 *  fallback preference as optionState. */
export function optionRichness(option: FlattenedOption): number[] {
  if (option.coverage != null) return coverageRichness(option.coverage);
  return [option.count ?? 0];
}

export interface CoverageAccessors<T> {
  state(item: T): CoverageState;
  /** Compared lexicographically, higher first. */
  richness(item: T): number[];
  label(item: T): string;
  /** The currently-bound option: stays in `main` even when probed-zero (rule: a
   *  user's existing selection must never vanish from view). */
  isPinned(item: T): boolean;
}

export interface PartitionedOptions<T> {
  main: T[];
  hidden: T[];
}

function compareRichnessDesc(a: number[], b: number[]): number {
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const diff = (b[i] ?? 0) - (a[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export function partitionOptions<T>(items: T[], accessors: CoverageAccessors<T>): PartitionedOptions<T> {
  // No option carries a probed verdict at all -- leave order/behavior untouched.
  if (!items.some((item) => accessors.state(item) !== 'unknown')) {
    return { main: items, hidden: [] };
  }

  const observed: T[] = [];
  const unknown: T[] = [];
  const hidden: T[] = [];
  const pinnedZero: T[] = [];
  for (const item of items) {
    const state = accessors.state(item);
    if (state === 'observed') observed.push(item);
    else if (state === 'unknown') unknown.push(item);
    else if (accessors.isPinned(item)) pinnedZero.push(item);
    else hidden.push(item);
  }

  observed.sort(
    (a, b) =>
      compareRichnessDesc(accessors.richness(a), accessors.richness(b)) ||
      accessors.label(a).localeCompare(accessors.label(b)),
  );

  return { main: [...observed, ...pinnedZero, ...unknown], hidden };
}
