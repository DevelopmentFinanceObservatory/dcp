import { describe, it, expect } from 'vitest';
import { optionsFromSpec, entityOptionsFromSpec } from './optionsFromSpec';
import type { SlotKey, Spec } from '@/lib/contract/types';

const whatKey: SlotKey = { axis: 'what', property: { dcid: 'flowType', label: 'flow type' }, label: 'flow' };

function specWithOptions(): Spec {
  return {
    spec_id: 's',
    shape: { shape_id: 'sh', label: '', population_type: null, measured_property: null, stat_type: null, slot_keys: [], member_count: 1 },
    slots: [{ key: whatKey, binding: { kind: 'unbound' } }],
    slot_options: [
      {
        key: whatKey,
        complete: true,
        source: 'seed',
        options: [
          { value: { value_kind: 'enum_value', ref: { dcid: 'ODAGrants', label: 'ODA grants' } }, coverage: { kind: 'exact', has_data: true, observation_count: 205 } },
          { value: { value_kind: 'enum_value', ref: { dcid: 'AllFlows', label: 'all flows' } } },
          // an unlabelled dcid the engine would have omitted — guard drops it
          { value: { value_kind: 'enum_value', ref: { dcid: 'x', label: '' } } },
        ],
      },
    ],
    stat_vars: [],
    entities: [],
    coverage: { kind: 'bare', has_data: true },
    resolution: { resolved_stat_vars: [], resolved_entities: [], resolved_sources: [], slot_filters: [], pipeline_trace: [] },
  } as Spec;
}

describe('optionsFromSpec', () => {
  it('maps engine slot_options to labelled value options with coverage counts', () => {
    const opts = optionsFromSpec(specWithOptions(), whatKey);
    expect(opts.map((o) => o.label)).toEqual(['ODA grants', 'all flows']); // unlabelled dropped
    expect(opts[0].binding).toEqual({ kind: 'value', value: { value_kind: 'enum_value', ref: { dcid: 'ODAGrants', label: 'ODA grants' } } });
    expect(opts[0].count).toBe(205);
    expect(opts[1].count).toBeUndefined();
  });

  it('carries the raw coverage through alongside count, for every coverage kind', () => {
    const opts = optionsFromSpec(specWithOptions(), whatKey);
    expect(opts[0].coverage).toEqual({ kind: 'exact', has_data: true, observation_count: 205 });
    expect(opts[1].coverage).toBeUndefined(); // this option carried no coverage at all
  });

  it('carries a breadth/bare probed-zero coverage through even though count is undefined for it', () => {
    const spec = specWithOptions();
    spec.slot_options![0].options.push(
      { value: { value_kind: 'enum_value', ref: { dcid: 'BreadthZero', label: 'breadth zero' } }, coverage: { kind: 'breadth', has_data: false, dimensions: [{ label: 'donors', count: 0 }] } },
      { value: { value_kind: 'enum_value', ref: { dcid: 'BareZero', label: 'bare zero' } }, coverage: { kind: 'bare', has_data: false } },
    );
    const opts = optionsFromSpec(spec, whatKey);
    const breadthZero = opts.find((o) => o.label === 'breadth zero')!;
    const bareZero = opts.find((o) => o.label === 'bare zero')!;
    expect(breadthZero.count).toBeUndefined();
    expect(breadthZero.coverage).toEqual({ kind: 'breadth', has_data: false, dimensions: [{ label: 'donors', count: 0 }] });
    expect(bareZero.count).toBeUndefined();
    expect(bareZero.coverage).toEqual({ kind: 'bare', has_data: false });
  });

  it('returns [] when the spec has no options for the key', () => {
    const spec = specWithOptions();
    expect(optionsFromSpec(spec, { axis: 'where', property: null, label: 'place' })).toEqual([]);
  });
});

describe('optionsFromSpec source-axis resolved_sources fallback', () => {
  const sourceKey: SlotKey = { axis: 'source', property: null, label: 'source' };
  const worldBank = { dcid: 'dc/base/WorldDevelopmentIndicators', label: 'WorldDevelopmentIndicators' };
  const kenyaCensus = { dcid: 'dc/base/Kenya_Census', label: 'Kenya_Census' };
  const subnational = { dcid: 'dc/base/Subnational_Demographics_Stats', label: 'Subnational_Demographics_Stats' };

  it('falls back to humanised resolved_sources when the spec has 2+ and no engine slot_options for source', () => {
    const spec = specWithOptions();
    spec.resolution.resolved_sources = [worldBank, kenyaCensus, subnational];
    const opts = optionsFromSpec(spec, sourceKey);
    expect(opts.map((o) => o.label)).toEqual([
      'World Development Indicators',
      'Kenya Census',
      'Subnational Demographics Stats',
    ]);
    expect(opts[0].binding).toEqual({
      kind: 'value',
      value: { value_kind: 'source', ref: worldBank },
    });
    // No coverage/count exists for this fallback -- the popover treats an
    // undefined coverage as "never probed", not "no data".
    expect(opts[0].count).toBeUndefined();
    expect(opts[0].coverage).toBeUndefined();
  });

  it('returns [] with exactly one resolved source -- nothing to switch to', () => {
    const spec = specWithOptions();
    spec.resolution.resolved_sources = [worldBank];
    expect(optionsFromSpec(spec, sourceKey)).toEqual([]);
  });

  it('returns [] with no resolved sources', () => {
    const spec = specWithOptions();
    expect(optionsFromSpec(spec, sourceKey)).toEqual([]);
  });

  it('prefers engine slot_options over the resolved_sources fallback -- no mixing', () => {
    const spec = specWithOptions();
    spec.resolution.resolved_sources = [worldBank, kenyaCensus];
    spec.slot_options!.push({
      key: sourceKey,
      complete: true,
      source: 'seed',
      options: [{ value: { value_kind: 'source', ref: kenyaCensus } }],
    });
    const opts = optionsFromSpec(spec, sourceKey);
    // The engine's own (unhumanised) label wins -- mapOptions never runs the
    // fallback's humaniser, so this also proves the two paths don't mix.
    expect(opts.map((o) => o.label)).toEqual(['Kenya_Census']);
  });

  it('falls back to the dcid tail when a resolved source carries no label', () => {
    const spec = specWithOptions();
    spec.resolution.resolved_sources = [
      { dcid: 'dc/base/WorldBank_WDI', label: '' },
      kenyaCensus,
    ];
    const opts = optionsFromSpec(spec, sourceKey);
    expect(opts[0].label).toBe('World Bank WDI');
  });

  it('returns [] when the spec has a matching slot_options entry with an empty options array, even with 2+ resolved_sources -- a key match short-circuits before the fallback runs', () => {
    // Latent today (the engine can't emit an empty source slot_options entry),
    // but pins the exact-match-wins contract: any slot_options entry for this
    // key, even an empty one, means "the engine already answered this" and
    // must not fall through to resolved_sources.
    const spec = specWithOptions();
    spec.resolution.resolved_sources = [worldBank, kenyaCensus];
    spec.slot_options!.push({ key: sourceKey, complete: true, source: 'seed', options: [] });
    expect(optionsFromSpec(spec, sourceKey)).toEqual([]);
  });
});

describe('entityOptionsFromSpec', () => {
  function specWithDonor(): Spec {
    const s = specWithOptions();
    s.entity_options = [
      {
        entity_ref: 'country/FRA',
        role: 'from',
        complete: true,
        source: 'seed',
        options: [
          { value: { value_kind: 'entity', ref: { dcid: 'country/FRA', label: 'France' } }, coverage: { kind: 'exact', has_data: true, observation_count: 88 } },
          { value: { value_kind: 'entity', ref: { dcid: 'country/DEU', label: 'Germany' } } },
        ],
      },
    ];
    return s;
  }

  it('maps donor (from) entity options with coverage counts', () => {
    const opts = entityOptionsFromSpec(specWithDonor(), 'from');
    expect(opts.map((o) => o.label)).toEqual(['France', 'Germany']);
    expect(opts[0].count).toBe(88);
  });

  it('returns [] for a role the spec has no options for', () => {
    expect(entityOptionsFromSpec(specWithDonor(), 'to')).toEqual([]);
    expect(entityOptionsFromSpec(specWithOptions(), 'from')).toEqual([]);
  });
});
