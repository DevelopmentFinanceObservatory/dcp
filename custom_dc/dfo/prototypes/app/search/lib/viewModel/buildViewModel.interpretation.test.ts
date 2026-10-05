import { describe, it, expect } from 'vitest';
import { buildViewModel } from './buildViewModel';
import type { Spec } from '@/lib/contract/types';

function spec(): Spec {
  return {
    spec_id: 's',
    shape: {
      shape_id: 'sh',
      label: 'development finance flows',
      population_type: null,
      measured_property: null,
      stat_type: null,
      slot_keys: [],
      member_count: 1,
    },
    slots: [],
    stat_vars: [],
    entities: [],
    coverage: { kind: 'bare', has_data: true },
    variable_text: 'ODA grants',
    resolution: {
      resolved_stat_vars: [],
      resolved_entities: [{ dcid: 'country/FRA', label: 'France' }],
      resolved_sources: [],
      slot_filters: [],
      pipeline_trace: [],
      applied_window: { start_year: 2015, end_year: 2020 },
    },
  } as Spec;
}

describe('buildViewModel interpretation', () => {
  it('derives the interpretation summary from the spec', () => {
    const { interpretation } = buildViewModel(spec());
    expect(interpretation.variables).toEqual(['ODA grants']);
    expect(interpretation.places).toEqual(['France']);
    expect(interpretation.dates).toBe('between 2015–2020');
    expect(interpretation.shapeLabel).toBe('development finance flows');
  });

  it('handles a spec with no window or variable text', () => {
    const s = spec();
    s.variable_text = null;
    s.resolution.applied_window = undefined;
    const { interpretation } = buildViewModel(s);
    expect(interpretation.variables).toEqual([]);
    expect(interpretation.dates).toBeNull();
    expect(interpretation.places).toEqual(['France']);
  });
});
