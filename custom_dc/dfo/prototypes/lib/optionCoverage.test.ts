import { describe, it, expect } from 'vitest';
import {
  coverageRichness,
  coverageState,
  countState,
  optionRichness,
  optionState,
  partitionOptions,
  type CoverageAccessors,
} from './optionCoverage';

// Minimal option shape mirroring the engine's SlotOption/EntityOption: a label
// plus an optional Coverage (see the apis repo's src/search/models/coverage.py).
type Opt = { label: string; dcid: string; coverage?: any };

function opt(label: string, dcid: string, coverage?: any): Opt {
  return { label, dcid, coverage };
}

function accessors(selected: Set<string> = new Set()): CoverageAccessors<Opt> {
  return {
    state: (o) => coverageState(o.coverage),
    richness: (o) => coverageRichness(o.coverage),
    label: (o) => o.label,
    isPinned: (o) => selected.has(o.dcid),
  };
}

describe('coverageState', () => {
  it('is unknown for no coverage at all', () => {
    expect(coverageState(null)).toBe('unknown');
    expect(coverageState(undefined)).toBe('unknown');
  });

  it('is probed-zero when the probe ran and found nothing', () => {
    expect(coverageState({ has_data: false })).toBe('probed-zero');
  });

  it('is observed when the probe found data', () => {
    expect(coverageState({ has_data: true })).toBe('observed');
  });
});

describe('coverageRichness', () => {
  it('uses dimensions in their fixed [facet, obs] order when present', () => {
    expect(coverageRichness({ dimensions: [{ count: 18 }, { count: 3 }] })).toEqual([18, 3]);
  });

  it('falls back to observation_count when there are no dimensions', () => {
    expect(coverageRichness({ observation_count: 42 })).toEqual([42]);
  });

  it('falls back to 0 when neither is present (e.g. a bare has_data:true)', () => {
    expect(coverageRichness({ has_data: true })).toEqual([0]);
  });
});

describe('countState', () => {
  it('is unknown for an undefined count', () => {
    expect(countState(undefined)).toBe('unknown');
    expect(countState(null)).toBe('unknown');
  });

  it('is probed-zero for a count of exactly 0', () => {
    expect(countState(0)).toBe('probed-zero');
  });

  it('is observed for any positive count', () => {
    expect(countState(205)).toBe('observed');
  });
});

describe('optionState', () => {
  it('is probed-zero for an exact coverage with has_data:false, even with count absent', () => {
    expect(optionState({ coverage: { kind: 'exact', has_data: false, observation_count: 0 } })).toBe('probed-zero');
  });

  it('is probed-zero for a breadth coverage with has_data:false (the bug this fixes: count is undefined here)', () => {
    expect(
      optionState({ count: undefined, coverage: { kind: 'breadth', has_data: false, dimensions: [{ label: 'donors', count: 0 }] } }),
    ).toBe('probed-zero');
  });

  it('is probed-zero for a bare coverage with has_data:false', () => {
    expect(optionState({ count: undefined, coverage: { kind: 'bare', has_data: false } })).toBe('probed-zero');
  });

  it('is observed for a breadth coverage with has_data:true, despite no flattened count', () => {
    expect(
      optionState({ count: undefined, coverage: { kind: 'breadth', has_data: true, dimensions: [{ label: 'donors', count: 12 }] } }),
    ).toBe('observed');
  });

  it('is unknown when coverage is truly absent (null/undefined) and count is also absent', () => {
    expect(optionState({ coverage: null })).toBe('unknown');
    expect(optionState({})).toBe('unknown');
  });

  it('falls back to the flattened count when coverage was never carried through (e.g. FixtureOptions)', () => {
    expect(optionState({ count: 205 })).toBe('observed');
    expect(optionState({ count: 0 })).toBe('probed-zero');
    expect(optionState({ count: undefined })).toBe('unknown');
  });
});

describe('optionRichness', () => {
  it('uses the coverage dimensions when a breadth coverage rides along', () => {
    expect(
      optionRichness({ coverage: { kind: 'breadth', has_data: true, dimensions: [{ label: 'donors', count: 18 }, { label: 'years', count: 3 }] } }),
    ).toEqual([18, 3]);
  });

  it('falls back to the flattened count when coverage is absent', () => {
    expect(optionRichness({ count: 42 })).toEqual([42]);
    expect(optionRichness({})).toEqual([0]);
  });
});

describe('partitionOptions', () => {
  it('passes a list through unchanged when nothing carries a probed verdict', () => {
    const options = [opt('Germany', 'DEU'), opt('Kenya', 'KEN'), opt('Czech Republic', 'CZE')];
    const { main, hidden } = partitionOptions(options, accessors());
    expect(main).toEqual(options); // same order, same array contents
    expect(hidden).toEqual([]);
  });

  it('sorts observed options richest-first, then by richness dimensions, then label', () => {
    const options = [
      opt('Czech Republic', 'CZE', { has_data: false }),
      opt('Kenya', 'KEN', { has_data: true, dimensions: [{ count: 18 }, { count: 3 }] }),
      opt('Germany', 'DEU', { has_data: true, dimensions: [{ count: 40 }, { count: 5 }] }),
      opt('Nigeria', 'NGA', { has_data: true, dimensions: [{ count: 18 }, { count: 7 }] }),
    ];
    const { main } = partitionOptions(options, accessors());
    // Germany (40) > Nigeria and Kenya tie on the facet dim (18) but Nigeria's
    // second dimension (7) beats Kenya's (3).
    expect(main.map((o) => o.label)).toEqual(['Germany', 'Nigeria', 'Kenya']);
  });

  it('collapses probed-zero options into `hidden`, out of the main list', () => {
    const options = [
      opt('Germany', 'DEU', { has_data: true, observation_count: 18 }),
      opt('Czech Republic', 'CZE', { has_data: false }),
      opt('Latvia', 'LVA', { has_data: false }),
    ];
    const { main, hidden } = partitionOptions(options, accessors());
    expect(main.map((o) => o.label)).toEqual(['Germany']);
    expect(hidden.map((o) => o.label).sort()).toEqual(['Czech Republic', 'Latvia']);
  });

  it('keeps unprobed (unknown) options in main, after observed, in original relative order', () => {
    const options = [
      opt('Unprobed B', 'UB'), // no coverage field at all: unknown
      opt('Germany', 'DEU', { has_data: true, observation_count: 18 }),
      opt('Unprobed A', 'UA'),
      opt('Kenya', 'KEN', { has_data: true, observation_count: 5 }),
    ];
    const { main, hidden } = partitionOptions(options, accessors());
    expect(main.map((o) => o.label)).toEqual(['Germany', 'Kenya', 'Unprobed B', 'Unprobed A']);
    expect(hidden).toEqual([]);
  });

  it('pins a selected option into main even when it is probed-zero', () => {
    const options = [
      opt('Germany', 'DEU', { has_data: true, observation_count: 18 }),
      opt('Czech Republic', 'CZE', { has_data: false }), // currently bound, but no data
      opt('Latvia', 'LVA', { has_data: false }),
    ];
    const { main, hidden } = partitionOptions(options, accessors(new Set(['CZE'])));
    expect(main.map((o) => o.label)).toEqual(['Germany', 'Czech Republic']);
    expect(hidden.map((o) => o.label)).toEqual(['Latvia']);
  });
});
