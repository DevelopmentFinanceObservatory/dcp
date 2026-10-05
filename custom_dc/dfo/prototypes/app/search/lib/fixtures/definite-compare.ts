/**
 * definite × exact, multi-entity — "women in Kenya and Nigeria".
 * Same shape/stat_var as definite-exact, but the where-slot is a multi-select
 * (`binding.kind === 'set'`) over two subject entities — the fixture that
 * exercises a side-by-side place comparison in the observation table (one
 * ObservationSeries per entity, joined on the SAME stat_var_dcid).
 */

import type { Spec, ResolveResponse, SlotKey } from '@/lib/contract/types';
import { ref, echo, definite } from './_common';

const SHAPE_ID = 'shape/person_count';

const genderKey: SlotKey = { axis: 'how', property: ref('gender', 'gender'), label: 'gender' };
const ageKey: SlotKey = { axis: 'how', property: ref('age', 'age'), label: 'age' };
const whereKey: SlotKey = { axis: 'where', property: null, label: 'place' };

const kenya = ref('country/KEN', 'Kenya');
const nigeria = ref('country/NGA', 'Nigeria');
const statVar = ref('Count_Person_Female', 'Count of female persons');
const source = ref('dc/base/WorldDevelopmentIndicators', 'World Development Indicators');

export const definiteCompareSpec: Spec = {
  spec_id: 'spec_def_exact_women_kenya_nigeria',
  shape: {
    shape_id: SHAPE_ID,
    label: 'person count',
    population_type: ref('Person', 'person'),
    measured_property: ref('count', 'count'),
    stat_type: ref('measuredValue', 'measured value'),
    slot_keys: [genderKey, ageKey, whereKey],
    member_count: 25,
    refine_supported: true,
  },
  slots: [
    {
      key: genderKey,
      binding: { kind: 'value', value: { value_kind: 'enum_value', ref: ref('Female', 'female') } },
    },
    { key: ageKey, binding: { kind: 'absent' } },
    {
      key: whereKey,
      binding: {
        kind: 'set',
        values: [
          { value_kind: 'entity', ref: kenya },
          { value_kind: 'entity', ref: nigeria },
        ],
      },
    },
  ],
  stat_vars: [
    {
      ref: statVar,
      shape_id: SHAPE_ID,
      slot_values: [
        { key: genderKey, value: { value_kind: 'enum_value', ref: ref('Female', 'female') } },
      ],
      data_date_range: { start: '2020', end: '2023' },
      data_confirmed_at_recipient: true,
    },
  ],
  entities: [
    { ref: kenya, entity_type: ref('Country', 'Country'), role: { kind: 'subject' } },
    { ref: nigeria, entity_type: ref('Country', 'Country'), role: { kind: 'subject' } },
  ],
  coverage: {
    kind: 'exact',
    has_data: true,
    observation_count: 8,
    window: { start_year: 2020, end_year: 2023 },
  },
  resolution: {
    resolved_stat_vars: [statVar],
    resolved_entities: [kenya, nigeria],
    resolved_sources: [source],
    slot_filters: [
      { key: genderKey, binding_kind: 'value', refs: [ref('Female', 'female')] },
      { key: ageKey, binding_kind: 'absent', refs: [] },
      { key: whereKey, binding_kind: 'set', refs: [kenya, nigeria] },
    ],
    pipeline_trace: [
      { step: 'extract', ran: true, ms: 16 },
      { step: 'recall', ran: true, ms: 33 },
      { step: 'shape', ran: true, ms: 6 },
      { step: 'bind', ran: true, ms: 21 },
      { step: 'materialise', ran: true, ms: 27 },
      { step: 'answer', ran: true, ms: 2 },
    ],
  },
  // Small, full (complete: true) series per entity -- a side-by-side comparison
  // is short enough to ship in full rather than truncate to the latest point.
  observations: {
    series: [
      {
        stat_var_dcid: statVar.dcid,
        entity_dcid: kenya.dcid,
        points: [
          { date: '2020', value: 26_500_000 },
          { date: '2021', value: 27_100_000 },
          { date: '2022', value: 27_700_000 },
          { date: '2023', value: 28_300_000 },
        ],
        source_refs: [source],
      },
      {
        stat_var_dcid: statVar.dcid,
        entity_dcid: nigeria.dcid,
        points: [
          { date: '2020', value: 102_000_000 },
          { date: '2021', value: 104_500_000 },
          { date: '2022', value: 107_000_000 },
          { date: '2023', value: 109_600_000 },
        ],
        source_refs: [source],
      },
    ],
    total_obs: 8,
    complete: true,
  },
};

export const definiteCompare: ResolveResponse = definite(
  definiteCompareSpec,
  echo({
    raw_query: 'women in Kenya and Nigeria',
    normalized_query: 'female persons in Kenya and Nigeria',
    variable_text: ['female persons'],
  }),
);
