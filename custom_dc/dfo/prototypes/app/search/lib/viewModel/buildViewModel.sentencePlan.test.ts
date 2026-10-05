import { describe, it, expect } from 'vitest';
import { buildViewModel } from './buildViewModel';
import type { SentenceToken, Spec } from '@/lib/contract/types';

const whatKey = { axis: 'what' as const, property: { dcid: 'flowType', label: 'flow type' }, label: 'flow' };
const whereKey = { axis: 'where' as const, property: null, label: 'recipient' };
const sourceKey = { axis: 'source' as const, property: null, label: 'source' };

function spec(): Spec {
  return {
    spec_id: 's',
    shape: { shape_id: 'sh', label: '', population_type: null, measured_property: null, stat_type: null, slot_keys: [], member_count: 1 },
    slots: [
      { key: whatKey, binding: { kind: 'value', value: { value_kind: 'enum_value', ref: { dcid: 'ODAGrants', label: 'ODA grants' } } } },
      { key: whereKey, binding: { kind: 'value', value: { value_kind: 'entity', ref: { dcid: 'country/ETH', label: 'Ethiopia' } } } },
    ],
    stat_vars: [],
    entities: [],
    coverage: { kind: 'bare', has_data: true },
    resolution: { resolved_stat_vars: [], resolved_entities: [], resolved_sources: [], slot_filters: [], pipeline_trace: [] },
  } as Spec;
}

const plan: SentenceToken[] = [
  { kind: 'slot', text: 'ODA grants', axis: 'what', binding_ref: 'what:flowType' },
  { kind: 'text', text: ' to ' },
  { kind: 'slot', text: 'Ethiopia', axis: 'where', binding_ref: 'where:' },
  { kind: 'text', text: ' from ' },
  // directional donor read-back: entity_refs, no binding_ref → editable by role
  { kind: 'slot', text: 'France', role: 'from', entity_refs: ['country/FRA'] },
  { kind: 'slot', text: '', axis: 'when' }, // empty skeleton token → dropped
];

describe('buildViewModel sentence_plan', () => {
  it('produces no sentenceTokens without a plan', () => {
    expect(buildViewModel(spec()).sentenceTokens).toBeUndefined();
  });

  it('maps tokens to parts, keeping slot-backed phrases editable', () => {
    const vm = buildViewModel(spec(), plan);
    const parts = vm.sentenceTokens!;
    // text tokens preserved; empty slot token dropped
    expect(parts.map((p) => p.text)).toEqual(['ODA grants', ' to ', 'Ethiopia', ' from ', 'France']);

    const what = parts.find((p) => p.kind === 'slot' && p.text === 'ODA grants')!;
    expect(what.kind).toBe('slot');
    if (what.kind === 'slot') {
      expect(what.editable).toBe(true);
      expect(what.slotIndex).toBe(0);
    }

    const where = parts.find((p) => p.kind === 'slot' && p.text === 'Ethiopia')!;
    if (where.kind === 'slot') expect(where.slotIndex).toBe(1);

    // donor read-back has no backing slot (slotIndex -1) but is still editable
    // -- addressed by role rather than slot index (see onEditEntity).
    const donor = parts.find((p) => p.kind === 'slot' && p.text === 'France')!;
    if (donor.kind === 'slot') {
      expect(donor.editable).toBe(true);
      expect(donor.slotIndex).toBe(-1);
    }
  });

  it('keeps a shape-label fallback phrase (no binding_ref, no role) editable, addressed by neither slot index nor role', () => {
    // Standard-shape variable/measure read-back, e.g. "Floods", "Total
    // population" -- no confirmable sibling to construct a real edit from, so
    // it's free-text-refine-only (SentenceRenderer's onEditPhrase, addressed
    // by rendered position -- see refineQuery.spliceSentence).
    const shapeLabelPlan: SentenceToken[] = [{ kind: 'slot', text: 'Floods', axis: 'what' }];
    const parts = buildViewModel(spec(), shapeLabelPlan).sentenceTokens!;
    const floods = parts.find((p) => p.kind === 'slot' && p.text === 'Floods')!;
    expect(floods.kind).toBe('slot');
    if (floods.kind === 'slot') {
      expect(floods.editable).toBe(true);
      expect(floods.slotIndex).toBe(-1);
      expect(floods.role).toBeUndefined();
    }
  });

  it('marks a source-axis fallback token (no binding_ref, no role) non-editable, unlike a sibling what-axis fallback', () => {
    // Live evidence: "life expectancy in Ghana since 2000 according to CRS" --
    // the engine ignores the typed source and binds WDI, emitting the source
    // token with no binding_ref (same fallback branch as a shape-label phrase).
    // Sources are a closed set the engine binds itself, so unlike "Floods" this
    // phrase has no free-text refine to fall back on -- it must not be editable.
    const plan: SentenceToken[] = [
      { kind: 'slot', text: 'Floods', axis: 'what' },
      { kind: 'text', text: ' according to ' },
      { kind: 'slot', text: 'World Development Indicators', axis: 'source' },
    ];
    const parts = buildViewModel(spec(), plan).sentenceTokens!;
    const what = parts.find((p) => p.kind === 'slot' && p.text === 'Floods')!;
    const source = parts.find((p) => p.kind === 'slot' && p.text === 'World Development Indicators')!;
    if (what.kind === 'slot') expect(what.editable).toBe(true);
    if (source.kind === 'slot') {
      expect(source.editable).toBe(false);
      expect(source.slotIndex).toBe(-1);
    }
  });
});

function sourceSpec(slotOptions?: Spec['slot_options']): Spec {
  return {
    spec_id: 's',
    shape: { shape_id: 'sh', label: '', population_type: null, measured_property: null, stat_type: null, slot_keys: [], member_count: 1 },
    slots: [{ key: sourceKey, binding: { kind: 'unbound' } }],
    slot_options: slotOptions,
    stat_vars: [],
    entities: [],
    coverage: { kind: 'bare', has_data: true },
    resolution: { resolved_stat_vars: [], resolved_entities: [], resolved_sources: [], slot_filters: [], pipeline_trace: [] },
  } as Spec;
}

describe('buildViewModel source-slot editability', () => {
  const plan: SentenceToken[] = [
    { kind: 'slot', text: 'World Development Indicators', axis: 'source', binding_ref: 'source:' },
  ];

  it('is non-editable when slot-backed but the spec carries no source slot_options -- a closed set with nothing to pick from', () => {
    const parts = buildViewModel(sourceSpec(), plan).sentenceTokens!;
    const source = parts.find((p) => p.kind === 'slot')!;
    if (source.kind === 'slot') {
      expect(source.editable).toBe(false);
      expect(source.slotIndex).toBe(0);
    }
  });

  it('is editable when the spec DOES carry a non-empty source slot_options entry (future-proofing, mirrors computeAddableDimensions)', () => {
    const slotOptions: Spec['slot_options'] = [
      {
        key: sourceKey,
        options: [{ value: { value_kind: 'source', ref: { dcid: 'dc/base/OECD_CRS', label: 'OECD CRS' } } }],
        complete: true,
        source: 'seed',
      },
    ];
    const parts = buildViewModel(sourceSpec(slotOptions), plan).sentenceTokens!;
    const source = parts.find((p) => p.kind === 'slot')!;
    if (source.kind === 'slot') expect(source.editable).toBe(true);
  });

  it('is editable when the spec has no slot_options but 2+ resolved_sources -- the resolved_sources fallback, mirrors optionsFromSpec', () => {
    const spec = sourceSpec();
    spec.resolution.resolved_sources = [
      { dcid: 'dc/base/OECD_CRS', label: 'OECD CRS' },
      { dcid: 'dc/base/WorldDevelopmentIndicators', label: 'WorldDevelopmentIndicators' },
    ];
    const parts = buildViewModel(spec, plan).sentenceTokens!;
    const source = parts.find((p) => p.kind === 'slot')!;
    if (source.kind === 'slot') expect(source.editable).toBe(true);
  });

  it('stays non-editable with exactly one resolved source -- nothing to switch to', () => {
    const spec = sourceSpec();
    spec.resolution.resolved_sources = [{ dcid: 'dc/base/OECD_CRS', label: 'OECD CRS' }];
    const parts = buildViewModel(spec, plan).sentenceTokens!;
    const source = parts.find((p) => p.kind === 'slot')!;
    if (source.kind === 'slot') expect(source.editable).toBe(false);
  });

  it('stays non-editable when the spec has a matching slot_options entry with an empty options array, even with 2+ resolved_sources -- the gate delegates to optionsFromSpec, which never falls through past an exact key match', () => {
    const spec = sourceSpec([{ key: sourceKey, options: [], complete: true, source: 'seed' }]);
    spec.resolution.resolved_sources = [
      { dcid: 'dc/base/OECD_CRS', label: 'OECD CRS' },
      { dcid: 'dc/base/WorldDevelopmentIndicators', label: 'WorldDevelopmentIndicators' },
    ];
    const parts = buildViewModel(spec, plan).sentenceTokens!;
    const source = parts.find((p) => p.kind === 'slot')!;
    if (source.kind === 'slot') expect(source.editable).toBe(false);
  });
});

const whenKey = { axis: 'when' as const, property: null, label: 'time' };

function timeSpec(when: Spec['slots'][number]['binding']): Spec {
  return {
    spec_id: 's',
    shape: { shape_id: 'sh', label: '', population_type: null, measured_property: null, stat_type: null, slot_keys: [], member_count: 1 },
    slots: [{ key: whenKey, binding: when }],
    stat_vars: [],
    entities: [],
    coverage: { kind: 'bare', has_data: true },
    resolution: { resolved_stat_vars: [], resolved_entities: [], resolved_sources: [], slot_filters: [], pipeline_trace: [] },
  } as Spec;
}

describe('buildViewModel time connective', () => {
  it('splits a bound range into a plain "between " + an editable year core', () => {
    const spec = timeSpec({ kind: 'value', value: { value_kind: 'time_window', time_window: { start_year: 2010, end_year: 2020 } } });
    const plan: SentenceToken[] = [{ kind: 'slot', text: '2010-2020', axis: 'when', binding_ref: 'when:' }];
    const parts = buildViewModel(spec, plan).sentenceTokens!;
    expect(parts.map((p) => p.text)).toEqual(['between ', '2010–2020']);
    const core = parts[1];
    expect(core.kind === 'text' ? false : core.editable).toBe(true);
  });

  it('keeps "between" on the unbound read-back range (all years shows coverage)', () => {
    // when-slot unbound, but the engine reads back the resolved data range.
    const spec = timeSpec({ kind: 'unbound' });
    const plan: SentenceToken[] = [{ kind: 'slot', text: '2012–2022', axis: 'when', binding_ref: 'when:' }];
    const parts = buildViewModel(spec, plan).sentenceTokens!;
    expect(parts.map((p) => p.text)).toEqual(['between ', '2012–2022']);
  });

  it('reads "since" out of the unbound read-back text as an open start-only window', () => {
    const spec = timeSpec({ kind: 'unbound' });
    const plan: SentenceToken[] = [{ kind: 'slot', text: 'since 2015', axis: 'when', binding_ref: 'when:' }];
    const parts = buildViewModel(spec, plan).sentenceTokens!;
    expect(parts.map((p) => p.text)).toEqual(['since ', '2015']);
  });

  it('reads "until"/"up to" out of the unbound read-back text as an open end-only window', () => {
    const spec = timeSpec({ kind: 'unbound' });
    const plan: SentenceToken[] = [{ kind: 'slot', text: 'until 2015', axis: 'when', binding_ref: 'when:' }];
    const parts = buildViewModel(spec, plan).sentenceTokens!;
    expect(parts.map((p) => p.text)).toEqual(['until ', '2015']);
  });

  it('keeps a BARE single year from the read-back text closed ("in "), not open -- the year with neither "since" nor "until" means data covers that one year only', () => {
    const spec = timeSpec({ kind: 'unbound' });
    const plan: SentenceToken[] = [{ kind: 'slot', text: '2012', axis: 'when', binding_ref: 'when:' }];
    const parts = buildViewModel(spec, plan).sentenceTokens!;
    expect(parts.map((p) => p.text)).toEqual(['in ', '2012']);
  });

  it('renders an open, start-only window as "since " + the year (not "in " -- that would claim the data stops there)', () => {
    const spec = timeSpec({ kind: 'value', value: { value_kind: 'time_window', time_window: { start_year: 2015 } } });
    const plan: SentenceToken[] = [{ kind: 'slot', text: 'since 2015', axis: 'when', binding_ref: 'when:' }];
    const parts = buildViewModel(spec, plan).sentenceTokens!;
    expect(parts.map((p) => p.text)).toEqual(['since ', '2015']);
  });

  it('renders a closed single-year window (equal start/end) as "in " + the year', () => {
    const spec = timeSpec({
      kind: 'value',
      value: { value_kind: 'time_window', time_window: { start_year: 2015, end_year: 2015 } },
    });
    const plan: SentenceToken[] = [{ kind: 'slot', text: '2015', axis: 'when', binding_ref: 'when:' }];
    const parts = buildViewModel(spec, plan).sentenceTokens!;
    expect(parts.map((p) => p.text)).toEqual(['in ', '2015']);
  });

  it('renders an unbound when-slot as the data range from stat_vars ("between …")', () => {
    // The engine's read-back token came back EMPTY, but the answer's StatVars carry
    // a data_date_range — derive the covered span (earliest start, latest end)
    // rather than showing the uninformative "all years".
    const spec = timeSpec({ kind: 'unbound' });
    spec.stat_vars = [
      { ref: { dcid: 'sv1', label: 'x' }, shape_id: 'sh', slot_values: [], data_date_range: { start: '2012', end: '2020' } },
      { ref: { dcid: 'sv2', label: 'y' }, shape_id: 'sh', slot_values: [], data_date_range: { start: '2010-06', end: '2018' } },
    ];
    const plan: SentenceToken[] = [{ kind: 'slot', text: '', axis: 'when', binding_ref: 'when:' }];
    const parts = buildViewModel(spec, plan).sentenceTokens!;
    expect(parts.map((p) => p.text)).toEqual(['between ', '2010–2020']);
    const chip = parts.find((p) => p.kind === 'slot')!;
    expect(chip.editable).toBe(true);
  });

  it('falls back to an editable "all years" chip only when no date range is known at all', () => {
    // Unbound, empty read-back, AND no StatVar date range — the last resort, still
    // an editable chip (never dropped) so the user can re-open the time editor.
    const spec = timeSpec({ kind: 'unbound' }); // timeSpec carries no stat_vars
    const plan: SentenceToken[] = [{ kind: 'slot', text: '', axis: 'when', binding_ref: 'when:' }];
    const parts = buildViewModel(spec, plan).sentenceTokens!;
    expect(parts.map((p) => p.text)).toEqual(['all years']);
    const chip = parts.find((p) => p.kind === 'slot')!;
    expect(chip.editable).toBe(true);
  });
});

const entity = (dcid: string, label: string): Spec['entities'][number] => ({
  ref: { dcid, label },
  role: { kind: 'subject' },
});

function placesSpec(slots: Spec['slots'], entities: Spec['entities']): Spec {
  return {
    spec_id: 's',
    shape: { shape_id: 'sh', label: '', population_type: null, measured_property: null, stat_type: null, slot_keys: [], member_count: 1 },
    slots,
    stat_vars: [],
    entities,
    coverage: { kind: 'bare', has_data: true },
    resolution: { resolved_stat_vars: [], resolved_entities: [], resolved_sources: [], slot_filters: [], pipeline_trace: [] },
  } as Spec;
}

describe('buildViewModel entity compaction', () => {
  it('compacts multiple recipient entities (countries) to "First +N"', () => {
    // The recipient is entity-sourced: the where slot binding may be unbound, and
    // the members ride on the token's entity_refs, not a set binding.
    const spec = placesSpec(
      [{ key: whereKey, binding: { kind: 'unbound' } }],
      [entity('country/ETH', 'Ethiopia'), entity('country/KEN', 'Kenya'), entity('country/UGA', 'Uganda')],
    );
    const plan: SentenceToken[] = [
      { kind: 'text', text: 'to ' },
      {
        kind: 'slot',
        text: 'Ethiopia, Kenya, and Uganda', // engine's full join
        axis: 'where',
        binding_ref: 'where:',
        role: 'to',
        entity_refs: ['country/ETH', 'country/KEN', 'country/UGA'],
      },
    ];
    const chip = buildViewModel(spec, plan).sentenceTokens!.find((p) => p.kind === 'slot')!;
    expect(chip.text).toBe('Ethiopia +2');
  });

  it('leaves a single recipient uncompacted', () => {
    const spec = placesSpec(
      [{ key: whereKey, binding: { kind: 'unbound' } }],
      [entity('country/ETH', 'Ethiopia')],
    );
    const plan: SentenceToken[] = [
      { kind: 'slot', text: 'Ethiopia', axis: 'where', binding_ref: 'where:', role: 'to', entity_refs: ['country/ETH'] },
    ];
    const chip = buildViewModel(spec, plan).sentenceTokens!.find((p) => p.kind === 'slot')!;
    expect(chip.text).toBe('Ethiopia');
  });

  it('compacts multiple donor entities (no backing slot) to "First +N"', () => {
    const spec = placesSpec(
      [],
      [entity('country/FRA', 'France'), entity('country/USA', 'United States'), entity('country/DEU', 'Germany')],
    );
    const plan: SentenceToken[] = [
      { kind: 'text', text: 'from ' },
      {
        kind: 'slot',
        text: 'France, United States, and Germany',
        role: 'from',
        entity_refs: ['country/FRA', 'country/USA', 'country/DEU'],
      },
    ];
    const chip = buildViewModel(spec, plan).sentenceTokens!.find((p) => p.kind === 'slot')!;
    expect(chip.text).toBe('France +2');
  });
});

describe('buildViewModel multi-select', () => {
  it('compacts a set to "first +N", not the engine\'s full member list', () => {
    const spec: Spec = {
      spec_id: 's',
      shape: { shape_id: 'sh', label: '', population_type: null, measured_property: null, stat_type: null, slot_keys: [], member_count: 1 },
      slots: [
        {
          key: whatKey,
          binding: {
            kind: 'set',
            values: [
              { value_kind: 'enum_value', ref: { dcid: 'a', label: 'ODA grants' } },
              { value_kind: 'enum_value', ref: { dcid: 'b', label: 'ODA loans' } },
              { value_kind: 'enum_value', ref: { dcid: 'c', label: 'Equity' } },
            ],
          },
        },
      ],
      stat_vars: [],
      entities: [],
      coverage: { kind: 'bare', has_data: true },
      resolution: { resolved_stat_vars: [], resolved_entities: [], resolved_sources: [], slot_filters: [], pipeline_trace: [] },
    } as Spec;
    // The engine lists every member; the front end must compact it.
    const plan: SentenceToken[] = [
      { kind: 'slot', text: 'ODA grants, ODA loans, and Equity', axis: 'what', binding_ref: 'what:flowType' },
    ];
    const chip = buildViewModel(spec, plan).sentenceTokens!.find((p) => p.kind === 'slot')!;
    expect(chip.text).toBe('ODA grants +2');
  });
});
