import { describe, it, expect } from 'vitest';
import { computeAddableDimensions } from './SearchClient';
import type { Spec, SlotKey } from '@/lib/contract/types';

// "female population kenya" — gender is bound to Female, but render.py's dedup
// folds its sentence token to empty text because "Female population" already
// names it (today's regression: the token stays slot-linked, just textless).
// age is unbound and has no phrase at all (the usual chipless case). where is
// bound and DOES have a rendered chip. source is absent (not a real phrase).
const genderKey: SlotKey = { axis: 'how', property: { dcid: 'gender', label: 'gender' }, label: 'gender' };
const ageKey: SlotKey = { axis: 'how', property: { dcid: 'age', label: 'age' }, label: 'age' };
const whereKey: SlotKey = { axis: 'where', property: null, label: 'place' };
const sourceKey: SlotKey = { axis: 'source', property: null, label: 'source' };

function spec(refineSupported: boolean): Spec {
  return {
    spec_id: 's',
    shape: {
      shape_id: 'sh',
      label: 'person count',
      population_type: null,
      measured_property: null,
      stat_type: null,
      slot_keys: [genderKey, ageKey, whereKey, sourceKey],
      member_count: 1,
      refine_supported: refineSupported,
    },
    slots: [
      { key: genderKey, binding: { kind: 'value', value: { value_kind: 'enum_value', ref: { dcid: 'Female', label: 'Female' } } } }, // 0: bound, chipless
      { key: ageKey, binding: { kind: 'unbound' } }, // 1: unbound, chipless
      { key: whereKey, binding: { kind: 'value', value: { value_kind: 'entity', ref: { dcid: 'country/KEN', label: 'Kenya' } } } }, // 2: bound, rendered
      { key: sourceKey, binding: { kind: 'absent' } }, // 3: absent, never addable
    ],
    stat_vars: [],
    entities: [],
    coverage: { kind: 'bare', has_data: true },
    resolution: { resolved_stat_vars: [], resolved_entities: [], resolved_sources: [], slot_filters: [], pipeline_trace: [] },
  } as Spec;
}

/** A minimal refine-supported spec with a single unbound source slot, for
 *  testing the source-axis gate in isolation. `slotOptions` populates
 *  spec.slot_options so optionsFromSpec can find a match when present. */
function sourceOnlySpec(slotOptions?: Spec['slot_options']): Spec {
  return {
    spec_id: 's2',
    shape: {
      shape_id: 'sh2',
      label: 'x',
      population_type: null,
      measured_property: null,
      stat_type: null,
      slot_keys: [sourceKey],
      member_count: 1,
      refine_supported: true,
    },
    slots: [{ key: sourceKey, binding: { kind: 'unbound' } }],
    slot_options: slotOptions,
    stat_vars: [],
    entities: [],
    coverage: { kind: 'bare', has_data: true },
    resolution: { resolved_stat_vars: [], resolved_entities: [], resolved_sources: [], slot_filters: [], pipeline_trace: [] },
  } as Spec;
}

describe('computeAddableDimensions', () => {
  it('returns [] when the shape does not support refine', () => {
    // slot 2 (where) is rendered, so only 0 and 1 would otherwise qualify.
    expect(computeAddableDimensions(spec(false), new Set([2]))).toEqual([]);
  });

  it('returns [] when there is no spec', () => {
    expect(computeAddableDimensions(null, new Set())).toEqual([]);
  });

  it('includes a chipless bound slot with a value-bearing label', () => {
    // gender (0) has no chip — its token was folded away, but it's still bound.
    const rendered = new Set([2]); // only "where" has a rendered chip
    const result = computeAddableDimensions(spec(true), rendered);
    expect(result).toContainEqual({ slotIndex: 0, label: 'gender: Female' });
  });

  it('includes a chipless unbound slot with its bare label (unchanged behavior)', () => {
    const rendered = new Set([2]);
    const result = computeAddableDimensions(spec(true), rendered);
    expect(result).toContainEqual({ slotIndex: 1, label: 'age' });
  });

  it('excludes a bound slot that already has a rendered chip', () => {
    const rendered = new Set([2]);
    const result = computeAddableDimensions(spec(true), rendered);
    expect(result.some((d) => d.slotIndex === 2)).toBe(false);
  });

  it('excludes an absent slot even when nothing renders a chip for it', () => {
    const result = computeAddableDimensions(spec(true), new Set());
    expect(result.some((d) => d.slotIndex === 3)).toBe(false);
  });

  it('produces exactly the two chipless slots, in slot order', () => {
    const rendered = new Set([2]);
    const result = computeAddableDimensions(spec(true), rendered);
    expect(result).toEqual([
      { slotIndex: 0, label: 'gender: Female' },
      { slotIndex: 1, label: 'age' },
    ]);
  });

  it('excludes a chipless source slot when the spec carries no matching slot_options', () => {
    // The engine never surfaces slot_options for the source axis in v1, so
    // this is the common case — an unbound source slot must not become a
    // dead-end "+ narrow further" entry with zero popover options.
    const result = computeAddableDimensions(sourceOnlySpec(), new Set());
    expect(result).toEqual([]);
  });

  it('includes a chipless source slot when the spec carries matching slot_options', () => {
    const withOptions = sourceOnlySpec([
      {
        key: sourceKey,
        options: [{ value: { value_kind: 'source', ref: { dcid: 'src/1', label: 'UN' } } }],
        complete: true,
        source: 'seed',
      },
    ]);
    const result = computeAddableDimensions(withOptions, new Set());
    expect(result).toEqual([{ slotIndex: 0, label: 'source' }]);
  });

  it('includes a chipless source slot when 2+ resolved sources back the answer', () => {
    // No engine slot_options, but optionsFromSpec falls back to the answer's
    // own resolved_sources when there's genuinely more than one to switch to.
    const base = sourceOnlySpec();
    const multi = {
      ...base,
      resolution: {
        ...base.resolution,
        resolved_sources: [
          { dcid: 'dc/base/WorldDevelopmentIndicators', label: 'WorldDevelopmentIndicators' },
          { dcid: 'dc/base/Kenya_Census', label: 'Kenya_Census' },
        ],
      },
    };
    expect(computeAddableDimensions(multi, new Set())).toEqual([{ slotIndex: 0, label: 'source' }]);
  });

  it('excludes a chipless source slot when only one resolved source exists', () => {
    // One source = nothing to switch to; the entry would be a dead end.
    const base = sourceOnlySpec();
    const single = {
      ...base,
      resolution: {
        ...base.resolution,
        resolved_sources: [{ dcid: 'dc/base/WorldDevelopmentIndicators', label: 'WorldDevelopmentIndicators' }],
      },
    };
    expect(computeAddableDimensions(single, new Set())).toEqual([]);
  });

  it('excludes unbound slots that have no matching options in spec.slot_options', () => {
    const s = spec(true);
    // When slot_options is provided but has no entry for ageKey
    s.slot_options = [
      {
        key: genderKey,
        options: [{ value: { value_kind: 'enum_value', ref: { dcid: 'Female', label: 'Female' } }, coverage: { kind: 'exact', has_data: true, observation_count: 5 } }],
        complete: true,
        source: 'observed',
      },
    ];
    const rendered = new Set([2]); // only where rendered
    const result = computeAddableDimensions(s, rendered);
    // gender is bound so it remains, but unbound age without options is dropped
    expect(result).toEqual([{ slotIndex: 0, label: 'gender: Female' }]);
  });

  it('excludes unbound slots whose options all have zero observations (probed zero)', () => {
    const s = spec(true);
    s.slot_options = [
      {
        key: ageKey,
        options: [{ value: { value_kind: 'enum_value', ref: { dcid: 'Age10', label: '10' } }, coverage: { kind: 'exact', has_data: false, observation_count: 0 } }],
        complete: true,
        source: 'observed',
      },
    ];
    const rendered = new Set([2, 0]); // where and gender rendered
    const result = computeAddableDimensions(s, rendered);
    expect(result).toEqual([]);
  });
});
