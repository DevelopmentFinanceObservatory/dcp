import { describe, it, expect } from 'vitest';
import { fixtureOptions } from './FixtureOptions';
import { definiteBreadthSpec, definiteExactSpec } from '../fixtures';

describe('FixtureOptions', () => {
  it('offers values plus an unbound choice for a bound slot', () => {
    const whereSlot = definiteBreadthSpec.slots.find((s) => s.key.axis === 'where')!;
    const opts = fixtureOptions.optionsFor(definiteBreadthSpec.shape.shape_id, whereSlot.key);
    expect(opts.map((o) => o.label)).toContain('Kenya');
    expect(opts.some((o) => o.binding.kind === 'unbound')).toBe(true);
  });

  it('keys options by axis + label (disambiguates where=place vs recipient)', () => {
    const placeSlot = definiteExactSpec.slots.find((s) => s.key.label === 'place')!;
    const opts = fixtureOptions.optionsFor(definiteExactSpec.shape.shape_id, placeSlot.key);
    expect(opts.map((o) => o.label)).toContain('Kenya');
  });

  it('returns no options for an unknown shape', () => {
    expect(
      fixtureOptions.optionsFor('shape/unknown', { axis: 'where', property: null, label: 'place' }),
    ).toEqual([]);
  });
});
