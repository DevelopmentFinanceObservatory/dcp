/**
 * Raw `parts[]`-envelope wire bodies. Test data only.
 *
 * Unlike the rest of this fixture set, these are pre-normalization bodies as
 * the engine actually sends them (nested `spec.resolved`, string StatVar/Entity
 * refs, etc.), not typed `ResolveResponse`s. They drive
 * `normalizeResponse`/`normalizeSpec` in lib/contract/types.parts.test.ts.
 * Trimmed from two live engine captures. spec_ids, shape/slot structure, and
 * rendered sentences are real, not invented.
 */

/** Single definite part, for the query "population of Kenya". */
export const partsDefiniteKenya = {
  schema_version: 1,
  query_echo: {
    entry_path: "raw_text",
    raw_query: "population of Kenya",
    normalized_query: "population of Kenya",
    extract_skipped: false,
  },
  diagnostics: {
    engine_build: "9338202abe930ec72153822440de3d590b372eff",
    trace_id: "065d17f526f7458bbabb462b2ce22988",
    warnings: [],
    timing_ms: { total: 3059, by_step: { extract: 891 } },
  },
  parts: [
    {
      variable_text: "population",
      warnings: [],
      timing_ms: {
        total: 2165,
        by_step: {
          recall: 0,
          shape: 105,
          bind: 1796,
          materialise: 2,
          answer: 1,
        },
      },
      status: "definite",
      spec: {
        spec_id: "spec_567bf6828e3cc23c7d70e121cc36f2f9",
        definition: {
          schema_version: 1,
          spec_id: "spec_567bf6828e3cc23c7d70e121cc36f2f9",
          identity: {
            identity_version: "spec1",
            shape: {
              kind: "statvar_schema",
              population_type: "Person",
              measured_property: "count",
              stat_type: "measuredValue",
            },
            slots: [
              { property: "age", binding: { state: "unbound" } },
              { property: "gender", binding: { state: "unbound" } },
            ],
            entities: { observationAbout: ["country/KEN"] },
            requested_window: { kind: "all" },
          },
        },
        resolved: {
          shape: {
            shape_id: "person_count_measuredvalue",
            label: "Total population",
            population_type: { dcid: "Person", label: "Person" },
            measured_property: { dcid: "count", label: "count" },
            stat_type: { dcid: "measuredValue", label: "measuredValue" },
            slot_keys: [
              {
                axis: "how",
                property: { dcid: "age", label: "age" },
                label: "age",
              },
              {
                axis: "how",
                property: { dcid: "gender", label: "gender" },
                label: "gender",
              },
              { axis: "where", label: "place" },
              { axis: "when", label: "time window" },
              { axis: "source", label: "data source" },
            ],
            member_count: 1,
            refine_supported: true,
          },
          slots: [
            {
              key: {
                axis: "how",
                property: { dcid: "age", label: "age" },
                label: "age",
              },
              binding: { kind: "unbound" },
            },
            {
              key: {
                axis: "how",
                property: { dcid: "gender", label: "gender" },
                label: "gender",
              },
              binding: { kind: "unbound" },
            },
            {
              key: { axis: "where", label: "place" },
              binding: {
                kind: "value",
                value: {
                  ref: { dcid: "country/KEN", label: "Kenya" },
                  value_kind: "entity",
                },
              },
            },
            {
              key: { axis: "when", label: "time window" },
              binding: { kind: "unbound" },
            },
            {
              key: { axis: "source", label: "data source" },
              binding: { kind: "unbound" },
            },
          ],
          inapplicable_slots: ["age"],
          unresolved_slots: [],
          stat_vars: [
            {
              ref: "Count_Person",
              label: "Total population",
              slot_values: [],
              data_date_range: { start: "1960", end: "2024" },
            },
          ],
          entities: [
            {
              ref: "country/KEN",
              label: "Kenya",
              entity_type: "Country",
              role: "observationAbout",
            },
          ],
          coverage: {
            kind: "exact",
            has_data: true,
            observation_count: 140,
            dimensions: [
              { label: "sources", count: 4 },
              { label: "observations", count: 65 },
            ],
          },
          slot_options: [],
          entity_options: [],
          facet_options: [
            {
              axis: "provenance",
              options: [
                {
                  value: {
                    ref: {
                      dcid: "dc/base/WorldDevelopmentIndicators",
                      label: "WorldDevelopmentIndicators",
                    },
                    value_kind: "source",
                  },
                },
              ],
              truncated: false,
              source: "observed",
            },
          ],
          rendered_sentence:
            "Total population in Kenya, 1960 to 2024, according to 4 sources.",
          sentence_plan: [
            {
              kind: "slot",
              text: "Total population",
              axis: "what",
              entity_refs: [],
            },
            { kind: "text", text: " in ", entity_refs: [] },
            {
              kind: "slot",
              text: "Kenya",
              axis: "where",
              binding_ref: "where:",
              entity_refs: [],
            },
            { kind: "text", text: ".", entity_refs: [] },
          ],
          trace: {
            resolved_stat_vars: [
              { dcid: "Count_Person", label: "Total population" },
            ],
            resolved_entities: [{ dcid: "country/KEN", label: "Kenya" }],
            resolved_sources: [
              {
                dcid: "dc/base/WorldDevelopmentIndicators",
                label: "WorldDevelopmentIndicators",
              },
            ],
            slot_filters: [],
            pipeline_trace: [{ step: "extract", ran: true, ms: 891 }],
            n_recalled: 37,
          },
          confidence: "high",
          available_at_place: true,
        },
      },
    },
  ],
  status: "definite",
};

/** Single candidates part with 2 competing specs, for the query "GDP of Nigeria". */
export const partsCandidatesNigeria = {
  schema_version: 1,
  query_echo: {
    entry_path: "raw_text",
    raw_query: "GDP of Nigeria",
    normalized_query: "GDP of Nigeria",
    extract_skipped: false,
  },
  diagnostics: {
    engine_build: "9338202abe930ec72153822440de3d590b372eff",
    trace_id: "41799a298e234ab284d5eca65e3cc4e2",
    warnings: [],
    timing_ms: { total: 2792, by_step: { extract: 836 } },
  },
  parts: [
    {
      variable_text: "GDP",
      warnings: [],
      timing_ms: {
        total: 1832,
        by_step: {
          recall: 68,
          shape: 232,
          bind: 1096,
          materialise: 164,
          answer: 272,
        },
      },
      rendered_sentence:
        "2 possible interpretations. They differ by indicator.",
      sentence_plan: [
        {
          kind: "text",
          text: "2 possible interpretations. They differ by indicator.",
          entity_refs: [],
        },
      ],
      status: "candidates",
      candidates: {
        ordering: "broadest_first",
        max_candidates: 6,
        truncated: false,
        specs: [
          {
            spec_id: "spec_a35f69fce32d7ed22e538ca57a901d13",
            definition: {
              schema_version: 1,
              spec_id: "spec_a35f69fce32d7ed22e538ca57a901d13",
              identity: {
                identity_version: "spec1",
                shape: {
                  kind: "statvar_schema",
                  population_type: "EconomicActivity",
                  measured_property: "amount",
                  stat_type: "measuredValue",
                  measurement_qualifier: "Nominal",
                },
                slots: [
                  {
                    property: "activitySource",
                    binding: { state: "value", ref: "GrossDomesticProduction" },
                  },
                ],
                entities: { observationAbout: ["country/NGA"] },
                requested_window: { kind: "all" },
              },
            },
            resolved: {
              shape: {
                shape_id: "economicactivity_amount_measuredvalue_nominal",
                label: "Nominal gross domestic product",
                population_type: {
                  dcid: "EconomicActivity",
                  label: "EconomicActivity",
                },
                measured_property: { dcid: "amount", label: "amount" },
                stat_type: { dcid: "measuredValue", label: "measuredValue" },
                measurement_qualifier: { dcid: "Nominal", label: "Nominal" },
                slot_keys: [
                  {
                    axis: "how",
                    property: {
                      dcid: "activitySource",
                      label: "activitySource",
                    },
                    label: "activity source",
                  },
                  { axis: "where", label: "place" },
                  { axis: "when", label: "time window" },
                  { axis: "source", label: "data source" },
                ],
                member_count: 12,
                refine_supported: true,
              },
              slots: [
                {
                  key: {
                    axis: "how",
                    property: {
                      dcid: "activitySource",
                      label: "activitySource",
                    },
                    label: "activity source",
                  },
                  binding: {
                    kind: "value",
                    value: {
                      ref: {
                        dcid: "GrossDomesticProduction",
                        label: "GrossDomesticProduction",
                      },
                      value_kind: "enum_value",
                    },
                  },
                },
                {
                  key: { axis: "where", label: "place" },
                  binding: {
                    kind: "value",
                    value: {
                      ref: { dcid: "country/NGA", label: "Nigeria" },
                      value_kind: "entity",
                    },
                  },
                },
                {
                  key: { axis: "when", label: "time window" },
                  binding: { kind: "unbound" },
                },
                {
                  key: { axis: "source", label: "data source" },
                  binding: { kind: "unbound" },
                },
              ],
              inapplicable_slots: [],
              unresolved_slots: [],
              stat_vars: [
                {
                  ref: "Amount_EconomicActivity_GrossDomesticProduction_Nominal",
                  label: "Nominal gross domestic product",
                  slot_values: [],
                  data_date_range: { start: "1960", end: "2024" },
                },
              ],
              entities: [
                {
                  ref: "country/NGA",
                  label: "Nigeria",
                  entity_type: "Country",
                  role: "observationAbout",
                },
              ],
              coverage: {
                kind: "exact",
                has_data: true,
                observation_count: 65,
                dimensions: [
                  { label: "sources", count: 1 },
                  { label: "observations", count: 65 },
                ],
              },
              slot_options: [],
              entity_options: [],
              facet_options: [
                {
                  axis: "provenance",
                  options: [
                    {
                      value: {
                        ref: {
                          dcid: "dc/base/WorldDevelopmentIndicators",
                          label: "WorldDevelopmentIndicators",
                        },
                        value_kind: "source",
                      },
                    },
                  ],
                  truncated: false,
                  source: "observed",
                },
              ],
              rendered_sentence:
                "Nominal gross domestic product in Nigeria, 1960 to 2024, according to World Development Indicators.",
              sentence_plan: [
                {
                  kind: "slot",
                  text: "Nominal gross domestic product",
                  axis: "what",
                  entity_refs: [],
                  distinguishes: true,
                },
                { kind: "text", text: " in ", entity_refs: [] },
                {
                  kind: "slot",
                  text: "Nigeria",
                  axis: "where",
                  binding_ref: "where:",
                  entity_refs: [],
                },
                { kind: "text", text: ".", entity_refs: [] },
              ],
              trace: {
                resolved_stat_vars: [
                  {
                    dcid: "Amount_EconomicActivity_GrossDomesticProduction_Nominal",
                    label: "Nominal gross domestic product",
                  },
                ],
                resolved_entities: [{ dcid: "country/NGA", label: "Nigeria" }],
                resolved_sources: [
                  {
                    dcid: "dc/base/WorldDevelopmentIndicators",
                    label: "WorldDevelopmentIndicators",
                  },
                ],
                slot_filters: [],
                pipeline_trace: [{ step: "extract", ran: true, ms: 836 }],
                n_recalled: 70,
              },
              confidence: "high",
              available_at_place: true,
            },
          },
          {
            spec_id: "spec_c3d30c25c63e6a26f77d77b908526edd",
            definition: {
              schema_version: 1,
              spec_id: "spec_c3d30c25c63e6a26f77d77b908526edd",
              identity: {
                identity_version: "spec1",
                shape: {
                  kind: "statvar_schema",
                  population_type: "EconomicActivity",
                  measured_property: "amount",
                  stat_type: "measuredValue",
                  measurement_qualifier: "Nominal",
                  measurement_denominator: { unresolved: true },
                },
                slots: [
                  {
                    property: "activitySource",
                    binding: { state: "value", ref: "GrossDomesticProduction" },
                  },
                ],
                entities: { observationAbout: ["country/NGA"] },
                requested_window: { kind: "all" },
              },
            },
            resolved: {
              shape: {
                shape_id:
                  "economicactivity_amount_measuredvalue_nominal_per_unresolved",
                label: "Nominal gross domestic product per capita",
                population_type: {
                  dcid: "EconomicActivity",
                  label: "EconomicActivity",
                },
                measured_property: { dcid: "amount", label: "amount" },
                stat_type: { dcid: "measuredValue", label: "measuredValue" },
                measurement_qualifier: { dcid: "Nominal", label: "Nominal" },
                measurement_denominator: {
                  dcid: "PerCapita",
                  label: "PerCapita",
                },
                slot_keys: [
                  {
                    axis: "how",
                    property: {
                      dcid: "activitySource",
                      label: "activitySource",
                    },
                    label: "activity source",
                  },
                  { axis: "where", label: "place" },
                  { axis: "when", label: "time window" },
                  { axis: "source", label: "data source" },
                ],
                member_count: 1,
                refine_supported: true,
              },
              slots: [
                {
                  key: {
                    axis: "how",
                    property: {
                      dcid: "activitySource",
                      label: "activitySource",
                    },
                    label: "activity source",
                  },
                  binding: {
                    kind: "value",
                    value: {
                      ref: {
                        dcid: "GrossDomesticProduction",
                        label: "GrossDomesticProduction",
                      },
                      value_kind: "enum_value",
                    },
                  },
                },
                {
                  key: { axis: "where", label: "place" },
                  binding: {
                    kind: "value",
                    value: {
                      ref: { dcid: "country/NGA", label: "Nigeria" },
                      value_kind: "entity",
                    },
                  },
                },
                {
                  key: { axis: "when", label: "time window" },
                  binding: { kind: "unbound" },
                },
                {
                  key: { axis: "source", label: "data source" },
                  binding: { kind: "unbound" },
                },
              ],
              inapplicable_slots: [],
              unresolved_slots: [],
              stat_vars: [
                {
                  ref: "Amount_EconomicActivity_GrossDomesticProduction_Nominal_PerCapita",
                  label: "Nominal gross domestic product per capita",
                  slot_values: [],
                  data_date_range: { start: "1960", end: "2024" },
                },
              ],
              entities: [
                {
                  ref: "country/NGA",
                  label: "Nigeria",
                  entity_type: "Country",
                  role: "observationAbout",
                },
              ],
              coverage: {
                kind: "exact",
                has_data: true,
                observation_count: 65,
                dimensions: [
                  { label: "sources", count: 1 },
                  { label: "observations", count: 65 },
                ],
              },
              slot_options: [],
              entity_options: [],
              facet_options: [
                {
                  axis: "provenance",
                  options: [
                    {
                      value: {
                        ref: {
                          dcid: "dc/base/WorldDevelopmentIndicators",
                          label: "WorldDevelopmentIndicators",
                        },
                        value_kind: "source",
                      },
                    },
                  ],
                  truncated: false,
                  source: "observed",
                },
              ],
              rendered_sentence:
                "Nominal gross domestic product per capita in Nigeria, 1960 to 2024, according to World Development Indicators. This is a loose match for your query.",
              sentence_plan: [
                {
                  kind: "slot",
                  text: "Nominal gross domestic product per capita",
                  axis: "what",
                  entity_refs: [],
                  distinguishes: true,
                },
                { kind: "text", text: " in ", entity_refs: [] },
                {
                  kind: "slot",
                  text: "Nigeria",
                  axis: "where",
                  binding_ref: "where:",
                  entity_refs: [],
                },
                { kind: "text", text: ".", entity_refs: [] },
                {
                  kind: "note",
                  text: " This is a loose match for your query.",
                  entity_refs: [],
                },
              ],
              trace: {
                resolved_stat_vars: [
                  {
                    dcid: "Amount_EconomicActivity_GrossDomesticProduction_Nominal_PerCapita",
                    label: "Nominal gross domestic product per capita",
                  },
                ],
                resolved_entities: [{ dcid: "country/NGA", label: "Nigeria" }],
                resolved_sources: [
                  {
                    dcid: "dc/base/WorldDevelopmentIndicators",
                    label: "WorldDevelopmentIndicators",
                  },
                ],
                slot_filters: [],
                pipeline_trace: [{ step: "extract", ran: true, ms: 836 }],
                n_recalled: 70,
              },
              confidence: "medium",
              available_at_place: true,
            },
          },
        ],
      },
    },
  ],
  status: "candidates",
};

/**
 * Synthetic 2-part body (not a live capture): part 0 definite (Kenya
 * population) + part 1 candidates (Nigeria GDP), envelope status "mixed" per
 * the engine's own computed-status rule. Exercises the part-0-only lift on a
 * genuinely multi-variable response.
 */
export const partsMixedTwoVariable = {
  schema_version: 1,
  query_echo: {
    entry_path: "raw_text",
    raw_query: "population of Kenya and GDP of Nigeria",
    normalized_query: "population of Kenya and GDP of Nigeria",
    extract_skipped: false,
  },
  diagnostics: {
    engine_build: "9338202abe930ec72153822440de3d590b372eff",
    trace_id: "synthetic-mixed-01",
    warnings: [],
    timing_ms: { total: 4891, by_step: { extract: 900 } },
  },
  parts: [partsDefiniteKenya.parts[0], partsCandidatesNigeria.parts[0]],
  status: "mixed",
};

/**
 * Real two-part capture: "population and GDP in Brazil": part 0
 * definite (population, with resolved.observations, trimmed to 3 points),
 * part 1 candidates (GDP, `observations_omitted`). Envelope status
 * "mixed". Drives the resubmit/splice and per-part-editing store tests
 * against a genuinely mixed-status multi-part response, not the synthetic
 * one above.
 */
export const partsMixedBrazil = {
  schema_version: 1,
  query_echo: {
    entry_path: "raw_text",
    raw_query: "population and GDP in Brazil",
    normalized_query: "population and GDP in Brazil",
    extract_skipped: false,
  },
  diagnostics: {
    engine_build: "9338202abe930ec72153822440de3d590b372eff",
    trace_id: "58f59c3865614835a380bfd77c9c8cc4",
    warnings: [],
    timing_ms: {
      total: 3238,
      by_step: {
        extract: 714,
      },
    },
    llm_usage: {
      input_tokens: 7022,
      output_tokens: 777,
      cached_tokens: 0,
    },
    timed_out: false,
  },
  parts: [
    {
      variable_text: "population",
      warnings: [],
      timing_ms: {
        total: 2521,
        by_step: {
          recall: 1,
          shape: 227,
          bind: 1716,
          materialise: 98,
          answer: 74,
          options: 405,
        },
      },
      status: "definite",
      spec: {
        spec_id: "spec_1e81b575d2df5f8a5e120c895fc45ba8",
        definition: {
          schema_version: 1,
          spec_id: "spec_1e81b575d2df5f8a5e120c895fc45ba8",
          identity: {
            identity_version: "spec1",
            shape: {
              kind: "statvar_schema",
              population_type: "Person",
              measured_property: "count",
              stat_type: "measuredValue",
            },
            slots: [
              {
                property: "age",
                binding: {
                  state: "unbound",
                },
              },
              {
                property: "nativity",
                binding: {
                  state: "unbound",
                },
              },
              {
                property: "employment",
                binding: {
                  state: "unbound",
                },
              },
              {
                property: "race",
                binding: {
                  state: "unbound",
                },
              },
              {
                property: "placeOfResidenceClassification",
                binding: {
                  state: "unbound",
                },
              },
              {
                property: "religion",
                binding: {
                  state: "unbound",
                },
              },
              {
                property: "literacyStatus",
                binding: {
                  state: "unbound",
                },
              },
              {
                property: "gender",
                binding: {
                  state: "unbound",
                },
              },
              {
                property: "residenceType",
                binding: {
                  state: "unbound",
                },
              },
              {
                property: "educationalAttainment",
                binding: {
                  state: "unbound",
                },
              },
              {
                property: "placeOfBirth",
                binding: {
                  state: "unbound",
                },
              },
              {
                property: "armedForcesStatus",
                binding: {
                  state: "unbound",
                },
              },
            ],
            entities: {
              observationAbout: ["country/BRA"],
            },
            requested_window: {
              kind: "all",
            },
          },
        },
        resolved: {
          shape: {
            shape_id: "person_count_measuredvalue",
            label: "Total population",
            population_type: {
              dcid: "Person",
              label: "Person",
            },
            measured_property: {
              dcid: "count",
              label: "count",
            },
            stat_type: {
              dcid: "measuredValue",
              label: "measuredValue",
            },
            measurement_denominator_unresolved: false,
            slot_keys: [
              {
                axis: "how",
                property: {
                  dcid: "age",
                  label: "age",
                },
                label: "age",
              },
              {
                axis: "how",
                property: {
                  dcid: "nativity",
                  label: "nativity",
                },
                label: "nativity",
              },
              {
                axis: "how",
                property: {
                  dcid: "employment",
                  label: "employment",
                },
                label: "employment",
              },
              {
                axis: "how",
                property: {
                  dcid: "race",
                  label: "race",
                },
                label: "race",
              },
              {
                axis: "how",
                property: {
                  dcid: "placeOfResidenceClassification",
                  label: "placeOfResidenceClassification",
                },
                label: "place of residence classification",
              },
              {
                axis: "how",
                property: {
                  dcid: "religion",
                  label: "religion",
                },
                label: "religion",
              },
              {
                axis: "how",
                property: {
                  dcid: "literacyStatus",
                  label: "literacyStatus",
                },
                label: "literacy status",
              },
              {
                axis: "how",
                property: {
                  dcid: "gender",
                  label: "gender",
                },
                label: "gender",
              },
              {
                axis: "how",
                property: {
                  dcid: "residenceType",
                  label: "residenceType",
                },
                label: "residence type",
              },
              {
                axis: "how",
                property: {
                  dcid: "educationalAttainment",
                  label: "educationalAttainment",
                },
                label: "educational attainment",
              },
              {
                axis: "how",
                property: {
                  dcid: "placeOfBirth",
                  label: "placeOfBirth",
                },
                label: "place of birth",
              },
              {
                axis: "how",
                property: {
                  dcid: "armedForcesStatus",
                  label: "armedForcesStatus",
                },
                label: "armed forces status",
              },
              {
                axis: "where",
                label: "place",
              },
              {
                axis: "when",
                label: "time window",
              },
              {
                axis: "source",
                label: "data source",
              },
            ],
            member_count: 1,
            refine_supported: true,
          },
          slots: [
            {
              key: {
                axis: "how",
                property: {
                  dcid: "age",
                  label: "age",
                },
                label: "age",
              },
              binding: {
                kind: "unbound",
              },
            },
            {
              key: {
                axis: "how",
                property: {
                  dcid: "nativity",
                  label: "nativity",
                },
                label: "nativity",
              },
              binding: {
                kind: "unbound",
              },
            },
            {
              key: {
                axis: "how",
                property: {
                  dcid: "employment",
                  label: "employment",
                },
                label: "employment",
              },
              binding: {
                kind: "unbound",
              },
            },
            {
              key: {
                axis: "how",
                property: {
                  dcid: "race",
                  label: "race",
                },
                label: "race",
              },
              binding: {
                kind: "unbound",
              },
            },
            {
              key: {
                axis: "how",
                property: {
                  dcid: "placeOfResidenceClassification",
                  label: "placeOfResidenceClassification",
                },
                label: "place of residence classification",
              },
              binding: {
                kind: "unbound",
              },
            },
            {
              key: {
                axis: "how",
                property: {
                  dcid: "religion",
                  label: "religion",
                },
                label: "religion",
              },
              binding: {
                kind: "unbound",
              },
            },
            {
              key: {
                axis: "how",
                property: {
                  dcid: "literacyStatus",
                  label: "literacyStatus",
                },
                label: "literacy status",
              },
              binding: {
                kind: "unbound",
              },
            },
            {
              key: {
                axis: "how",
                property: {
                  dcid: "gender",
                  label: "gender",
                },
                label: "gender",
              },
              binding: {
                kind: "unbound",
              },
            },
            {
              key: {
                axis: "how",
                property: {
                  dcid: "residenceType",
                  label: "residenceType",
                },
                label: "residence type",
              },
              binding: {
                kind: "unbound",
              },
            },
            {
              key: {
                axis: "how",
                property: {
                  dcid: "educationalAttainment",
                  label: "educationalAttainment",
                },
                label: "educational attainment",
              },
              binding: {
                kind: "unbound",
              },
            },
            {
              key: {
                axis: "how",
                property: {
                  dcid: "placeOfBirth",
                  label: "placeOfBirth",
                },
                label: "place of birth",
              },
              binding: {
                kind: "unbound",
              },
            },
            {
              key: {
                axis: "how",
                property: {
                  dcid: "armedForcesStatus",
                  label: "armedForcesStatus",
                },
                label: "armed forces status",
              },
              binding: {
                kind: "unbound",
              },
            },
            {
              key: {
                axis: "where",
                label: "place",
              },
              binding: {
                kind: "value",
                value: {
                  ref: {
                    dcid: "country/BRA",
                    label: "Brazil",
                  },
                  value_kind: "entity",
                },
              },
            },
            {
              key: {
                axis: "when",
                label: "time window",
              },
              binding: {
                kind: "unbound",
              },
            },
            {
              key: {
                axis: "source",
                label: "data source",
              },
              binding: {
                kind: "unbound",
              },
            },
          ],
          inapplicable_slots: [
            "age",
            "nativity",
            "employment",
            "race",
            "placeOfResidenceClassification",
            "religion",
            "literacyStatus",
            "gender",
            "residenceType",
            "educationalAttainment",
            "placeOfBirth",
            "armedForcesStatus",
          ],
          unresolved_slots: [],
          stat_vars: [
            {
              ref: "Count_Person",
              label: "Total population",
              slot_values: [],
              data_date_range: {
                start: "1940",
                end: "2025-06",
              },
            },
          ],
          entities: [
            {
              ref: "country/BRA",
              label: "Brazil",
              entity_type: "Country",
              role: "observationAbout",
            },
          ],
          coverage: {
            kind: "exact",
            has_data: true,
            observation_count: 192,
            dimensions: [
              {
                label: "sources",
                count: 6,
              },
              {
                label: "observations",
                count: 65,
              },
            ],
          },
          facets: {
            provenance: {
              basis: "fallback",
              ref: "dc/base/WorldDevelopmentIndicators",
              label: "WorldDevelopmentIndicators",
            },
          },
          observations: {
            series: [
              {
                stat_var: {
                  ref: "Count_Person",
                  label: "Total population",
                },
                entities: [
                  {
                    role: "observationAbout",
                    ref: "country/BRA",
                    label: "Brazil",
                  },
                ],
                points: [
                  {
                    date: "1960",
                    value: 72388126.0,
                  },
                  {
                    date: "1961",
                    value: 74605447.0,
                  },
                  {
                    date: "1962",
                    value: 76865323.0,
                  },
                ],
                total_obs: 65,
                source_refs: [
                  {
                    dcid: "dc/base/WorldDevelopmentIndicators",
                    label: "WorldDevelopmentIndicators",
                  },
                ],
                facet: {
                  provenance: {
                    ref: "dc/base/WorldDevelopmentIndicators",
                    label: "WorldDevelopmentIndicators",
                  },
                },
              },
            ],
            total_obs: 65,
            truncated: false,
          },
          slot_options: [
            {
              key: {
                axis: "how",
                property: {
                  dcid: "placeOfResidenceClassification",
                  label: "placeOfResidenceClassification",
                },
                label: "place of residence classification",
              },
              options: [
                {
                  value: {
                    ref: {
                      dcid: "Urban",
                      label: "Urban",
                    },
                    value_kind: "enum_value",
                  },
                  coverage: {
                    kind: "exact",
                    has_data: true,
                    observation_count: 74,
                    dimensions: [
                      {
                        label: "sources",
                        count: 3,
                      },
                      {
                        label: "observations",
                        count: 65,
                      },
                    ],
                  },
                },
              ],
              truncated: true,
              source: "observed",
            },
            {
              key: {
                axis: "how",
                property: {
                  dcid: "gender",
                  label: "gender",
                },
                label: "gender",
              },
              options: [
                {
                  value: {
                    ref: {
                      dcid: "Female",
                      label: "Female",
                    },
                    value_kind: "enum_value",
                  },
                  coverage: {
                    kind: "exact",
                    has_data: true,
                    observation_count: 22,
                    dimensions: [
                      {
                        label: "sources",
                        count: 2,
                      },
                      {
                        label: "observations",
                        count: 19,
                      },
                    ],
                  },
                },
                {
                  value: {
                    ref: {
                      dcid: "Male",
                      label: "Male",
                    },
                    value_kind: "enum_value",
                  },
                  coverage: {
                    kind: "exact",
                    has_data: true,
                    observation_count: 22,
                    dimensions: [
                      {
                        label: "sources",
                        count: 2,
                      },
                      {
                        label: "observations",
                        count: 19,
                      },
                    ],
                  },
                },
              ],
              truncated: true,
              source: "observed",
            },
          ],
          entity_options: [],
          facet_options: [
            {
              axis: "provenance",
              options: [
                {
                  value: {
                    ref: {
                      dcid: "dc/base/WorldDevelopmentIndicators",
                      label: "WorldDevelopmentIndicators",
                    },
                    value_kind: "source",
                  },
                },
                {
                  value: {
                    ref: {
                      dcid: "dc/base/WikidataPopulation",
                      label: "WikidataPopulation",
                    },
                    value_kind: "source",
                  },
                },
                {
                  value: {
                    ref: {
                      dcid: "dc/base/Brazil_SIDRA_IBGE",
                      label: "Brazil_SIDRA_IBGE",
                    },
                    value_kind: "source",
                  },
                },
                {
                  value: {
                    ref: {
                      dcid: "dc/base/OECDRegionalDemography_Population",
                      label: "OECDRegionalDemography_Population",
                    },
                    value_kind: "source",
                  },
                },
                {
                  value: {
                    ref: {
                      dcid: "dc/base/Subnational_Demographics_Stats",
                      label: "Subnational_Demographics_Stats",
                    },
                    value_kind: "source",
                  },
                },
                {
                  value: {
                    ref: {
                      dcid: "dc/base/Brazil_Census",
                      label: "Brazil_Census",
                    },
                    value_kind: "source",
                  },
                },
              ],
              truncated: false,
              source: "observed",
            },
            {
              axis: "measurementMethod",
              options: [
                {
                  value: {
                    ref: {
                      dcid: "WikidataPopulation",
                      label: "WikidataPopulation",
                    },
                    value_kind: "enum_value",
                  },
                },
                {
                  value: {
                    ref: {
                      dcid: "OECDRegionalStatistics",
                      label: "OECDRegionalStatistics",
                    },
                    value_kind: "enum_value",
                  },
                },
                {
                  value: {
                    ref: {
                      dcid: "WorldBankSubnationalPopulationEstimate",
                      label: "World Bank Subnational Population Estimates.",
                    },
                    value_kind: "enum_value",
                  },
                },
              ],
              truncated: false,
              source: "observed",
            },
          ],
          rendered_sentence:
            "Total population in Brazil, 1940 to June 2025, according to 6 sources.",
          sentence_plan: [
            {
              kind: "slot",
              text: "Total population",
              axis: "what",
              entity_refs: [],
            },
            {
              kind: "slot",
              text: "",
              axis: "how",
              property_dcid: "age",
              binding_ref: "how:age",
              entity_refs: [],
            },
            {
              kind: "slot",
              text: "",
              axis: "how",
              property_dcid: "nativity",
              binding_ref: "how:nativity",
              entity_refs: [],
            },
            {
              kind: "slot",
              text: "",
              axis: "how",
              property_dcid: "employment",
              binding_ref: "how:employment",
              entity_refs: [],
            },
            {
              kind: "slot",
              text: "",
              axis: "how",
              property_dcid: "race",
              binding_ref: "how:race",
              entity_refs: [],
            },
            {
              kind: "slot",
              text: "",
              axis: "how",
              property_dcid: "placeOfResidenceClassification",
              binding_ref: "how:placeOfResidenceClassification",
              entity_refs: [],
            },
            {
              kind: "slot",
              text: "",
              axis: "how",
              property_dcid: "religion",
              binding_ref: "how:religion",
              entity_refs: [],
            },
            {
              kind: "slot",
              text: "",
              axis: "how",
              property_dcid: "literacyStatus",
              binding_ref: "how:literacyStatus",
              entity_refs: [],
            },
            {
              kind: "slot",
              text: "",
              axis: "how",
              property_dcid: "gender",
              binding_ref: "how:gender",
              entity_refs: [],
            },
            {
              kind: "slot",
              text: "",
              axis: "how",
              property_dcid: "residenceType",
              binding_ref: "how:residenceType",
              entity_refs: [],
            },
            {
              kind: "slot",
              text: "",
              axis: "how",
              property_dcid: "educationalAttainment",
              binding_ref: "how:educationalAttainment",
              entity_refs: [],
            },
            {
              kind: "slot",
              text: "",
              axis: "how",
              property_dcid: "placeOfBirth",
              binding_ref: "how:placeOfBirth",
              entity_refs: [],
            },
            {
              kind: "slot",
              text: "",
              axis: "how",
              property_dcid: "armedForcesStatus",
              binding_ref: "how:armedForcesStatus",
              entity_refs: [],
            },
            {
              kind: "text",
              text: " in ",
              entity_refs: [],
            },
            {
              kind: "slot",
              text: "Brazil",
              axis: "where",
              binding_ref: "where:",
              entity_refs: [],
            },
            {
              kind: "text",
              text: ", ",
              entity_refs: [],
            },
            {
              kind: "slot",
              text: "1940 to June 2025",
              axis: "when",
              binding_ref: "when:",
              entity_refs: [],
            },
            {
              kind: "text",
              text: ", according to ",
              entity_refs: [],
            },
            {
              kind: "slot",
              text: "6 sources",
              axis: "source",
              entity_refs: [],
            },
            {
              kind: "text",
              text: ".",
              entity_refs: [],
            },
          ],
          trace: {
            resolved_stat_vars: [
              {
                dcid: "Count_Person",
                label: "Total population",
              },
            ],
            resolved_entities: [
              {
                dcid: "country/BRA",
                label: "Brazil",
              },
            ],
            resolved_sources: [
              {
                dcid: "dc/base/Brazil_SIDRA_IBGE",
                label: "Brazil_SIDRA_IBGE",
              },
              {
                dcid: "dc/base/WorldDevelopmentIndicators",
                label: "WorldDevelopmentIndicators",
              },
              {
                dcid: "dc/base/WikidataPopulation",
                label: "WikidataPopulation",
              },
              {
                dcid: "dc/base/Brazil_Census",
                label: "Brazil_Census",
              },
              {
                dcid: "dc/base/OECDRegionalDemography_Population",
                label: "OECDRegionalDemography_Population",
              },
              {
                dcid: "dc/base/Subnational_Demographics_Stats",
                label: "Subnational_Demographics_Stats",
              },
            ],
            slot_filters: [
              {
                key: {
                  axis: "how",
                  property: {
                    dcid: "age",
                    label: "age",
                  },
                  label: "age",
                },
                binding_kind: "unbound",
                refs: [],
              },
              {
                key: {
                  axis: "how",
                  property: {
                    dcid: "nativity",
                    label: "nativity",
                  },
                  label: "nativity",
                },
                binding_kind: "unbound",
                refs: [],
              },
              {
                key: {
                  axis: "how",
                  property: {
                    dcid: "employment",
                    label: "employment",
                  },
                  label: "employment",
                },
                binding_kind: "unbound",
                refs: [],
              },
              {
                key: {
                  axis: "how",
                  property: {
                    dcid: "race",
                    label: "race",
                  },
                  label: "race",
                },
                binding_kind: "unbound",
                refs: [],
              },
              {
                key: {
                  axis: "how",
                  property: {
                    dcid: "placeOfResidenceClassification",
                    label: "placeOfResidenceClassification",
                  },
                  label: "place of residence classification",
                },
                binding_kind: "unbound",
                refs: [],
              },
              {
                key: {
                  axis: "how",
                  property: {
                    dcid: "religion",
                    label: "religion",
                  },
                  label: "religion",
                },
                binding_kind: "unbound",
                refs: [],
              },
              {
                key: {
                  axis: "how",
                  property: {
                    dcid: "literacyStatus",
                    label: "literacyStatus",
                  },
                  label: "literacy status",
                },
                binding_kind: "unbound",
                refs: [],
              },
              {
                key: {
                  axis: "how",
                  property: {
                    dcid: "gender",
                    label: "gender",
                  },
                  label: "gender",
                },
                binding_kind: "unbound",
                refs: [],
              },
              {
                key: {
                  axis: "how",
                  property: {
                    dcid: "residenceType",
                    label: "residenceType",
                  },
                  label: "residence type",
                },
                binding_kind: "unbound",
                refs: [],
              },
              {
                key: {
                  axis: "how",
                  property: {
                    dcid: "educationalAttainment",
                    label: "educationalAttainment",
                  },
                  label: "educational attainment",
                },
                binding_kind: "unbound",
                refs: [],
              },
              {
                key: {
                  axis: "how",
                  property: {
                    dcid: "placeOfBirth",
                    label: "placeOfBirth",
                  },
                  label: "place of birth",
                },
                binding_kind: "unbound",
                refs: [],
              },
              {
                key: {
                  axis: "how",
                  property: {
                    dcid: "armedForcesStatus",
                    label: "armedForcesStatus",
                  },
                  label: "armed forces status",
                },
                binding_kind: "unbound",
                refs: [],
              },
              {
                key: {
                  axis: "where",
                  label: "place",
                },
                binding_kind: "value",
                refs: [
                  {
                    dcid: "country/BRA",
                    label: "Brazil",
                  },
                ],
              },
              {
                key: {
                  axis: "when",
                  label: "time window",
                },
                binding_kind: "unbound",
                refs: [],
              },
              {
                key: {
                  axis: "source",
                  label: "data source",
                },
                binding_kind: "unbound",
                refs: [],
              },
            ],
            pipeline_trace: [
              {
                step: "extract",
                ran: true,
                ms: 714,
              },
              {
                step: "recall",
                ran: true,
                ms: 1,
              },
              {
                step: "shape",
                ran: true,
                ms: 227,
              },
              {
                step: "bind",
                ran: true,
                ms: 1716,
              },
              {
                step: "materialise",
                ran: true,
                ms: 98,
              },
              {
                step: "answer",
                ran: true,
                ms: 74,
              },
            ],
            n_recalled: 37,
            capability_version: "cap_1029892a119f7dc4",
          },
          confidence: "high",
          available_at_place: true,
        },
      },
    },
    {
      variable_text: "GDP",
      warnings: [
        {
          code: "observations_omitted",
          severity: "warn",
          message:
            "Observations were not fetched for this candidates part; resubmit a chosen candidate with include_observations to retrieve them.",
        },
      ],
      timing_ms: {
        total: 1489,
        by_step: {
          recall: 1,
          shape: 197,
          bind: 961,
          materialise: 103,
          answer: 227,
        },
      },
      rendered_sentence:
        "2 possible interpretations. They differ by indicator.",
      sentence_plan: [
        {
          kind: "text",
          text: "2 possible interpretations. They differ by indicator.",
          entity_refs: [],
        },
      ],
      status: "candidates",
      candidates: {
        ordering: "broadest_first",
        max_candidates: 6,
        specs: [
          {
            spec_id: "spec_1a8485775cfd3807f9eb3884499aec9e",
            definition: {
              schema_version: 1,
              spec_id: "spec_1a8485775cfd3807f9eb3884499aec9e",
              identity: {
                identity_version: "spec1",
                shape: {
                  kind: "statvar_schema",
                  population_type: "EconomicActivity",
                  measured_property: "amount",
                  stat_type: "measuredValue",
                  measurement_qualifier: "Nominal",
                },
                slots: [
                  {
                    property: "activitySource",
                    binding: {
                      state: "value",
                      ref: "GrossDomesticProduction",
                    },
                  },
                  {
                    property: "economicSector",
                    binding: {
                      state: "unbound",
                    },
                  },
                ],
                entities: {
                  observationAbout: ["country/BRA"],
                },
                requested_window: {
                  kind: "all",
                },
              },
            },
            resolved: {
              shape: {
                shape_id: "economicactivity_amount_measuredvalue_nominal",
                label: "Nominal gross domestic product",
                population_type: {
                  dcid: "EconomicActivity",
                  label: "EconomicActivity",
                },
                measured_property: {
                  dcid: "amount",
                  label: "amount",
                },
                stat_type: {
                  dcid: "measuredValue",
                  label: "measuredValue",
                },
                measurement_qualifier: {
                  dcid: "Nominal",
                  label: "Nominal",
                },
                measurement_denominator_unresolved: false,
                slot_keys: [
                  {
                    axis: "how",
                    property: {
                      dcid: "activitySource",
                      label: "activitySource",
                    },
                    label: "activity source",
                  },
                  {
                    axis: "how",
                    property: {
                      dcid: "economicSector",
                      label: "economicSector",
                    },
                    label: "economic sector",
                  },
                  {
                    axis: "where",
                    label: "place",
                  },
                  {
                    axis: "when",
                    label: "time window",
                  },
                  {
                    axis: "source",
                    label: "data source",
                  },
                ],
                member_count: 12,
                refine_supported: true,
              },
              slots: [
                {
                  key: {
                    axis: "how",
                    property: {
                      dcid: "activitySource",
                      label: "activitySource",
                    },
                    label: "activity source",
                  },
                  binding: {
                    kind: "value",
                    value: {
                      ref: {
                        dcid: "GrossDomesticProduction",
                        label: "GrossDomesticProduction",
                      },
                      value_kind: "enum_value",
                    },
                  },
                },
                {
                  key: {
                    axis: "how",
                    property: {
                      dcid: "economicSector",
                      label: "economicSector",
                    },
                    label: "economic sector",
                  },
                  binding: {
                    kind: "unbound",
                  },
                },
                {
                  key: {
                    axis: "where",
                    label: "place",
                  },
                  binding: {
                    kind: "value",
                    value: {
                      ref: {
                        dcid: "country/BRA",
                        label: "Brazil",
                      },
                      value_kind: "entity",
                    },
                  },
                },
                {
                  key: {
                    axis: "when",
                    label: "time window",
                  },
                  binding: {
                    kind: "unbound",
                  },
                },
                {
                  key: {
                    axis: "source",
                    label: "data source",
                  },
                  binding: {
                    kind: "unbound",
                  },
                },
              ],
              inapplicable_slots: ["economicSector"],
              unresolved_slots: [],
              stat_vars: [
                {
                  ref: "Amount_EconomicActivity_GrossDomesticProduction_Nominal",
                  label: "Nominal gross domestic product",
                  slot_values: [
                    {
                      key: {
                        axis: "how",
                        property: {
                          dcid: "activitySource",
                          label: "activitySource",
                        },
                        label: "activity source",
                      },
                      value: {
                        ref: {
                          dcid: "GrossDomesticProduction",
                          label: "GrossDomesticProduction",
                        },
                        value_kind: "enum_value",
                      },
                    },
                  ],
                  data_date_range: {
                    start: "1960",
                    end: "2024",
                  },
                },
              ],
              entities: [
                {
                  ref: "country/BRA",
                  label: "Brazil",
                  entity_type: "Country",
                  role: "observationAbout",
                },
              ],
              coverage: {
                kind: "exact",
                has_data: true,
                observation_count: 65,
                dimensions: [
                  {
                    label: "sources",
                    count: 1,
                  },
                  {
                    label: "observations",
                    count: 65,
                  },
                ],
              },
              facets: {},
              slot_options: [
                {
                  key: {
                    axis: "how",
                    property: {
                      dcid: "activitySource",
                      label: "activitySource",
                    },
                    label: "activity source",
                  },
                  options: [
                    {
                      value: {
                        ref: {
                          dcid: "GrossDomesticProduction",
                          label: "GrossDomesticProduction",
                        },
                        value_kind: "enum_value",
                      },
                      coverage: {
                        kind: "exact",
                        has_data: true,
                        observation_count: 65,
                        dimensions: [
                          {
                            label: "sources",
                            count: 1,
                          },
                          {
                            label: "observations",
                            count: 65,
                          },
                        ],
                      },
                    },
                  ],
                  truncated: true,
                  source: "observed",
                },
              ],
              entity_options: [],
              facet_options: [
                {
                  axis: "provenance",
                  options: [
                    {
                      value: {
                        ref: {
                          dcid: "dc/base/WorldDevelopmentIndicators",
                          label: "WorldDevelopmentIndicators",
                        },
                        value_kind: "source",
                      },
                    },
                  ],
                  truncated: false,
                  source: "observed",
                },
                {
                  axis: "unit",
                  options: [
                    {
                      value: {
                        ref: {
                          dcid: "USDollar",
                          label: "USDollar",
                        },
                        value_kind: "enum_value",
                      },
                    },
                  ],
                  truncated: false,
                  source: "observed",
                },
              ],
              rendered_sentence:
                "Nominal gross domestic product in Brazil, 1960 to 2024, according to World Development Indicators.",
              sentence_plan: [
                {
                  kind: "slot",
                  text: "Nominal gross domestic product",
                  axis: "what",
                  entity_refs: [],
                  distinguishes: true,
                },
                {
                  kind: "slot",
                  text: "",
                  axis: "how",
                  property_dcid: "activitySource",
                  binding_ref: "how:activitySource",
                  entity_refs: [],
                },
                {
                  kind: "slot",
                  text: "",
                  axis: "how",
                  property_dcid: "economicSector",
                  binding_ref: "how:economicSector",
                  entity_refs: [],
                },
                {
                  kind: "text",
                  text: " in ",
                  entity_refs: [],
                },
                {
                  kind: "slot",
                  text: "Brazil",
                  axis: "where",
                  binding_ref: "where:",
                  entity_refs: [],
                },
                {
                  kind: "text",
                  text: ", ",
                  entity_refs: [],
                },
                {
                  kind: "slot",
                  text: "1960 to 2024",
                  axis: "when",
                  binding_ref: "when:",
                  entity_refs: [],
                },
                {
                  kind: "text",
                  text: ", according to ",
                  entity_refs: [],
                },
                {
                  kind: "slot",
                  text: "World Development Indicators",
                  axis: "source",
                  entity_refs: [],
                },
                {
                  kind: "text",
                  text: ".",
                  entity_refs: [],
                },
              ],
              trace: {
                resolved_stat_vars: [
                  {
                    dcid: "Amount_EconomicActivity_GrossDomesticProduction_Nominal",
                    label: "Nominal gross domestic product",
                  },
                ],
                resolved_entities: [
                  {
                    dcid: "country/BRA",
                    label: "Brazil",
                  },
                ],
                resolved_sources: [
                  {
                    dcid: "dc/base/WorldDevelopmentIndicators",
                    label: "WorldDevelopmentIndicators",
                  },
                ],
                slot_filters: [
                  {
                    key: {
                      axis: "how",
                      property: {
                        dcid: "activitySource",
                        label: "activitySource",
                      },
                      label: "activity source",
                    },
                    binding_kind: "value",
                    refs: [
                      {
                        dcid: "GrossDomesticProduction",
                        label: "GrossDomesticProduction",
                      },
                    ],
                  },
                  {
                    key: {
                      axis: "how",
                      property: {
                        dcid: "economicSector",
                        label: "economicSector",
                      },
                      label: "economic sector",
                    },
                    binding_kind: "unbound",
                    refs: [],
                  },
                  {
                    key: {
                      axis: "where",
                      label: "place",
                    },
                    binding_kind: "value",
                    refs: [
                      {
                        dcid: "country/BRA",
                        label: "Brazil",
                      },
                    ],
                  },
                  {
                    key: {
                      axis: "when",
                      label: "time window",
                    },
                    binding_kind: "unbound",
                    refs: [],
                  },
                  {
                    key: {
                      axis: "source",
                      label: "data source",
                    },
                    binding_kind: "unbound",
                    refs: [],
                  },
                ],
                pipeline_trace: [
                  {
                    step: "extract",
                    ran: true,
                    ms: 714,
                  },
                  {
                    step: "recall",
                    ran: true,
                    ms: 1,
                  },
                  {
                    step: "shape",
                    ran: true,
                    ms: 197,
                  },
                  {
                    step: "bind",
                    ran: true,
                    ms: 961,
                  },
                  {
                    step: "materialise",
                    ran: true,
                    ms: 103,
                  },
                ],
                n_recalled: 70,
                capability_version: "cap_1029892a119f7dc4",
              },
              confidence: "high",
              available_at_place: true,
            },
          },
          {
            spec_id: "spec_aac9b0f3b3c528acd649fee3ba4d5ea8",
            definition: {
              schema_version: 1,
              spec_id: "spec_aac9b0f3b3c528acd649fee3ba4d5ea8",
              identity: {
                identity_version: "spec1",
                shape: {
                  kind: "statvar_schema",
                  population_type: "EconomicActivity",
                  measured_property: "amount",
                  stat_type: "measuredValue",
                  measurement_qualifier: "Nominal",
                  measurement_denominator: {
                    unresolved: true,
                  },
                },
                slots: [
                  {
                    property: "activitySource",
                    binding: {
                      state: "value",
                      ref: "GrossDomesticProduction",
                    },
                  },
                ],
                entities: {
                  observationAbout: ["country/BRA"],
                },
                requested_window: {
                  kind: "all",
                },
              },
            },
            resolved: {
              shape: {
                shape_id:
                  "economicactivity_amount_measuredvalue_nominal_per_unresolved",
                label: "Nominal gross domestic product per capita",
                population_type: {
                  dcid: "EconomicActivity",
                  label: "EconomicActivity",
                },
                measured_property: {
                  dcid: "amount",
                  label: "amount",
                },
                stat_type: {
                  dcid: "measuredValue",
                  label: "measuredValue",
                },
                measurement_qualifier: {
                  dcid: "Nominal",
                  label: "Nominal",
                },
                measurement_denominator: {
                  dcid: "PerCapita",
                  label: "PerCapita",
                },
                measurement_denominator_unresolved: true,
                slot_keys: [
                  {
                    axis: "how",
                    property: {
                      dcid: "activitySource",
                      label: "activitySource",
                    },
                    label: "activity source",
                  },
                  {
                    axis: "where",
                    label: "place",
                  },
                  {
                    axis: "when",
                    label: "time window",
                  },
                  {
                    axis: "source",
                    label: "data source",
                  },
                ],
                member_count: 1,
                refine_supported: true,
              },
              slots: [
                {
                  key: {
                    axis: "how",
                    property: {
                      dcid: "activitySource",
                      label: "activitySource",
                    },
                    label: "activity source",
                  },
                  binding: {
                    kind: "value",
                    value: {
                      ref: {
                        dcid: "GrossDomesticProduction",
                        label: "GrossDomesticProduction",
                      },
                      value_kind: "enum_value",
                    },
                  },
                },
                {
                  key: {
                    axis: "where",
                    label: "place",
                  },
                  binding: {
                    kind: "value",
                    value: {
                      ref: {
                        dcid: "country/BRA",
                        label: "Brazil",
                      },
                      value_kind: "entity",
                    },
                  },
                },
                {
                  key: {
                    axis: "when",
                    label: "time window",
                  },
                  binding: {
                    kind: "unbound",
                  },
                },
                {
                  key: {
                    axis: "source",
                    label: "data source",
                  },
                  binding: {
                    kind: "unbound",
                  },
                },
              ],
              inapplicable_slots: [],
              unresolved_slots: [],
              stat_vars: [
                {
                  ref: "Amount_EconomicActivity_GrossDomesticProduction_Nominal_PerCapita",
                  label: "Nominal gross domestic product per capita",
                  slot_values: [
                    {
                      key: {
                        axis: "how",
                        property: {
                          dcid: "activitySource",
                          label: "activitySource",
                        },
                        label: "activity source",
                      },
                      value: {
                        ref: {
                          dcid: "GrossDomesticProduction",
                          label: "GrossDomesticProduction",
                        },
                        value_kind: "enum_value",
                      },
                    },
                  ],
                  data_date_range: {
                    start: "1960",
                    end: "2024",
                  },
                },
              ],
              entities: [
                {
                  ref: "country/BRA",
                  label: "Brazil",
                  entity_type: "Country",
                  role: "observationAbout",
                },
              ],
              coverage: {
                kind: "exact",
                has_data: true,
                observation_count: 65,
                dimensions: [
                  {
                    label: "sources",
                    count: 1,
                  },
                  {
                    label: "observations",
                    count: 65,
                  },
                ],
              },
              facets: {},
              slot_options: [
                {
                  key: {
                    axis: "how",
                    property: {
                      dcid: "activitySource",
                      label: "activitySource",
                    },
                    label: "activity source",
                  },
                  options: [
                    {
                      value: {
                        ref: {
                          dcid: "GrossDomesticProduction",
                          label: "GrossDomesticProduction",
                        },
                        value_kind: "enum_value",
                      },
                      coverage: {
                        kind: "exact",
                        has_data: true,
                        observation_count: 65,
                        dimensions: [
                          {
                            label: "sources",
                            count: 1,
                          },
                          {
                            label: "observations",
                            count: 65,
                          },
                        ],
                      },
                    },
                  ],
                  truncated: true,
                  source: "observed",
                },
              ],
              entity_options: [],
              facet_options: [
                {
                  axis: "provenance",
                  options: [
                    {
                      value: {
                        ref: {
                          dcid: "dc/base/WorldDevelopmentIndicators",
                          label: "WorldDevelopmentIndicators",
                        },
                        value_kind: "source",
                      },
                    },
                  ],
                  truncated: false,
                  source: "observed",
                },
                {
                  axis: "unit",
                  options: [
                    {
                      value: {
                        ref: {
                          dcid: "USDollar",
                          label: "USDollar",
                        },
                        value_kind: "enum_value",
                      },
                    },
                  ],
                  truncated: false,
                  source: "observed",
                },
              ],
              rendered_sentence:
                "Nominal gross domestic product per capita in Brazil, 1960 to 2024, according to World Development Indicators. This is a loose match for your query.",
              sentence_plan: [
                {
                  kind: "slot",
                  text: "Nominal gross domestic product per capita",
                  axis: "what",
                  entity_refs: [],
                  distinguishes: true,
                },
                {
                  kind: "slot",
                  text: "",
                  axis: "how",
                  property_dcid: "activitySource",
                  binding_ref: "how:activitySource",
                  entity_refs: [],
                },
                {
                  kind: "text",
                  text: " in ",
                  entity_refs: [],
                },
                {
                  kind: "slot",
                  text: "Brazil",
                  axis: "where",
                  binding_ref: "where:",
                  entity_refs: [],
                },
                {
                  kind: "text",
                  text: ", ",
                  entity_refs: [],
                },
                {
                  kind: "slot",
                  text: "1960 to 2024",
                  axis: "when",
                  binding_ref: "when:",
                  entity_refs: [],
                },
                {
                  kind: "text",
                  text: ", according to ",
                  entity_refs: [],
                },
                {
                  kind: "slot",
                  text: "World Development Indicators",
                  axis: "source",
                  entity_refs: [],
                },
                {
                  kind: "text",
                  text: ".",
                  entity_refs: [],
                },
                {
                  kind: "note",
                  text: " This is a loose match for your query.",
                  entity_refs: [],
                },
              ],
              trace: {
                resolved_stat_vars: [
                  {
                    dcid: "Amount_EconomicActivity_GrossDomesticProduction_Nominal_PerCapita",
                    label: "Nominal gross domestic product per capita",
                  },
                ],
                resolved_entities: [
                  {
                    dcid: "country/BRA",
                    label: "Brazil",
                  },
                ],
                resolved_sources: [
                  {
                    dcid: "dc/base/WorldDevelopmentIndicators",
                    label: "WorldDevelopmentIndicators",
                  },
                ],
                slot_filters: [
                  {
                    key: {
                      axis: "how",
                      property: {
                        dcid: "activitySource",
                        label: "activitySource",
                      },
                      label: "activity source",
                    },
                    binding_kind: "value",
                    refs: [
                      {
                        dcid: "GrossDomesticProduction",
                        label: "GrossDomesticProduction",
                      },
                    ],
                  },
                  {
                    key: {
                      axis: "where",
                      label: "place",
                    },
                    binding_kind: "value",
                    refs: [
                      {
                        dcid: "country/BRA",
                        label: "Brazil",
                      },
                    ],
                  },
                  {
                    key: {
                      axis: "when",
                      label: "time window",
                    },
                    binding_kind: "unbound",
                    refs: [],
                  },
                  {
                    key: {
                      axis: "source",
                      label: "data source",
                    },
                    binding_kind: "unbound",
                    refs: [],
                  },
                ],
                pipeline_trace: [
                  {
                    step: "extract",
                    ran: true,
                    ms: 714,
                  },
                  {
                    step: "recall",
                    ran: true,
                    ms: 1,
                  },
                  {
                    step: "shape",
                    ran: true,
                    ms: 197,
                  },
                  {
                    step: "bind",
                    ran: true,
                    ms: 961,
                  },
                  {
                    step: "materialise",
                    ran: true,
                    ms: 103,
                  },
                ],
                n_recalled: 70,
                capability_version: "cap_1029892a119f7dc4",
              },
              confidence: "medium",
              available_at_place: true,
            },
          },
        ],
        truncated: false,
      },
    },
  ],
  status: "mixed",
};

/**
 * Real two-part capture: "population and total population in Kenya": both
 * parts definite, distinct spec_ids (the deployed engine does not fold
 * these two identically-shaped asks together). Envelope status "definite".
 * Drives store tests that need two real, independently-editable definite
 * parts.
 */
export const partsTwoDefiniteKenya = {
  schema_version: 1,
  query_echo: {
    entry_path: "raw_text",
    raw_query: "population and total population in Kenya",
    normalized_query: "population and total population in Kenya",
    extract_skipped: false,
  },
  diagnostics: {
    engine_build: "9338202abe930ec72153822440de3d590b372eff",
    trace_id: "30d4b41993b34d20bdf71bfb933d5dba",
    warnings: [],
    timing_ms: {
      total: 3406,
      by_step: {
        extract: 671,
      },
    },
    llm_usage: {
      input_tokens: 6747,
      output_tokens: 1256,
      cached_tokens: 0,
    },
    timed_out: false,
  },
  parts: [
    {
      variable_text: "population",
      warnings: [],
      timing_ms: {
        total: 2526,
        by_step: {
          recall: 0,
          shape: 172,
          bind: 1988,
          materialise: 136,
          answer: 1,
          options: 229,
        },
      },
      status: "definite",
      spec: {
        spec_id: "spec_567bf6828e3cc23c7d70e121cc36f2f9",
        definition: {
          schema_version: 1,
          spec_id: "spec_567bf6828e3cc23c7d70e121cc36f2f9",
          identity: {
            identity_version: "spec1",
            shape: {
              kind: "statvar_schema",
              population_type: "Person",
              measured_property: "count",
              stat_type: "measuredValue",
            },
            slots: [
              {
                property: "age",
                binding: {
                  state: "unbound",
                },
              },
              {
                property: "nativity",
                binding: {
                  state: "unbound",
                },
              },
              {
                property: "employment",
                binding: {
                  state: "unbound",
                },
              },
              {
                property: "race",
                binding: {
                  state: "unbound",
                },
              },
              {
                property: "placeOfResidenceClassification",
                binding: {
                  state: "unbound",
                },
              },
              {
                property: "religion",
                binding: {
                  state: "unbound",
                },
              },
              {
                property: "literacyStatus",
                binding: {
                  state: "unbound",
                },
              },
              {
                property: "gender",
                binding: {
                  state: "unbound",
                },
              },
              {
                property: "residenceType",
                binding: {
                  state: "unbound",
                },
              },
              {
                property: "educationalAttainment",
                binding: {
                  state: "unbound",
                },
              },
              {
                property: "placeOfBirth",
                binding: {
                  state: "unbound",
                },
              },
              {
                property: "armedForcesStatus",
                binding: {
                  state: "unbound",
                },
              },
            ],
            entities: {
              observationAbout: ["country/KEN"],
            },
            requested_window: {
              kind: "all",
            },
          },
        },
        resolved: {
          shape: {
            shape_id: "person_count_measuredvalue",
            label: "Total population",
            population_type: {
              dcid: "Person",
              label: "Person",
            },
            measured_property: {
              dcid: "count",
              label: "count",
            },
            stat_type: {
              dcid: "measuredValue",
              label: "measuredValue",
            },
            measurement_denominator_unresolved: false,
            slot_keys: [
              {
                axis: "how",
                property: {
                  dcid: "age",
                  label: "age",
                },
                label: "age",
              },
              {
                axis: "how",
                property: {
                  dcid: "nativity",
                  label: "nativity",
                },
                label: "nativity",
              },
              {
                axis: "how",
                property: {
                  dcid: "employment",
                  label: "employment",
                },
                label: "employment",
              },
              {
                axis: "how",
                property: {
                  dcid: "race",
                  label: "race",
                },
                label: "race",
              },
              {
                axis: "how",
                property: {
                  dcid: "placeOfResidenceClassification",
                  label: "placeOfResidenceClassification",
                },
                label: "place of residence classification",
              },
              {
                axis: "how",
                property: {
                  dcid: "religion",
                  label: "religion",
                },
                label: "religion",
              },
              {
                axis: "how",
                property: {
                  dcid: "literacyStatus",
                  label: "literacyStatus",
                },
                label: "literacy status",
              },
              {
                axis: "how",
                property: {
                  dcid: "gender",
                  label: "gender",
                },
                label: "gender",
              },
              {
                axis: "how",
                property: {
                  dcid: "residenceType",
                  label: "residenceType",
                },
                label: "residence type",
              },
              {
                axis: "how",
                property: {
                  dcid: "educationalAttainment",
                  label: "educationalAttainment",
                },
                label: "educational attainment",
              },
              {
                axis: "how",
                property: {
                  dcid: "placeOfBirth",
                  label: "placeOfBirth",
                },
                label: "place of birth",
              },
              {
                axis: "how",
                property: {
                  dcid: "armedForcesStatus",
                  label: "armedForcesStatus",
                },
                label: "armed forces status",
              },
              {
                axis: "where",
                label: "place",
              },
              {
                axis: "when",
                label: "time window",
              },
              {
                axis: "source",
                label: "data source",
              },
            ],
            member_count: 1,
            refine_supported: true,
          },
          slots: [
            {
              key: {
                axis: "how",
                property: {
                  dcid: "age",
                  label: "age",
                },
                label: "age",
              },
              binding: {
                kind: "unbound",
              },
            },
            {
              key: {
                axis: "how",
                property: {
                  dcid: "nativity",
                  label: "nativity",
                },
                label: "nativity",
              },
              binding: {
                kind: "unbound",
              },
            },
            {
              key: {
                axis: "how",
                property: {
                  dcid: "employment",
                  label: "employment",
                },
                label: "employment",
              },
              binding: {
                kind: "unbound",
              },
            },
            {
              key: {
                axis: "how",
                property: {
                  dcid: "race",
                  label: "race",
                },
                label: "race",
              },
              binding: {
                kind: "unbound",
              },
            },
            {
              key: {
                axis: "how",
                property: {
                  dcid: "placeOfResidenceClassification",
                  label: "placeOfResidenceClassification",
                },
                label: "place of residence classification",
              },
              binding: {
                kind: "unbound",
              },
            },
            {
              key: {
                axis: "how",
                property: {
                  dcid: "religion",
                  label: "religion",
                },
                label: "religion",
              },
              binding: {
                kind: "unbound",
              },
            },
            {
              key: {
                axis: "how",
                property: {
                  dcid: "literacyStatus",
                  label: "literacyStatus",
                },
                label: "literacy status",
              },
              binding: {
                kind: "unbound",
              },
            },
            {
              key: {
                axis: "how",
                property: {
                  dcid: "gender",
                  label: "gender",
                },
                label: "gender",
              },
              binding: {
                kind: "unbound",
              },
            },
            {
              key: {
                axis: "how",
                property: {
                  dcid: "residenceType",
                  label: "residenceType",
                },
                label: "residence type",
              },
              binding: {
                kind: "unbound",
              },
            },
            {
              key: {
                axis: "how",
                property: {
                  dcid: "educationalAttainment",
                  label: "educationalAttainment",
                },
                label: "educational attainment",
              },
              binding: {
                kind: "unbound",
              },
            },
            {
              key: {
                axis: "how",
                property: {
                  dcid: "placeOfBirth",
                  label: "placeOfBirth",
                },
                label: "place of birth",
              },
              binding: {
                kind: "unbound",
              },
            },
            {
              key: {
                axis: "how",
                property: {
                  dcid: "armedForcesStatus",
                  label: "armedForcesStatus",
                },
                label: "armed forces status",
              },
              binding: {
                kind: "unbound",
              },
            },
            {
              key: {
                axis: "where",
                label: "place",
              },
              binding: {
                kind: "value",
                value: {
                  ref: {
                    dcid: "country/KEN",
                    label: "Kenya",
                  },
                  value_kind: "entity",
                },
              },
            },
            {
              key: {
                axis: "when",
                label: "time window",
              },
              binding: {
                kind: "unbound",
              },
            },
            {
              key: {
                axis: "source",
                label: "data source",
              },
              binding: {
                kind: "unbound",
              },
            },
          ],
          inapplicable_slots: [
            "age",
            "nativity",
            "employment",
            "race",
            "placeOfResidenceClassification",
            "religion",
            "literacyStatus",
            "gender",
            "residenceType",
            "educationalAttainment",
            "placeOfBirth",
            "armedForcesStatus",
          ],
          unresolved_slots: [],
          stat_vars: [
            {
              ref: "Count_Person",
              label: "Total population",
              slot_values: [],
              data_date_range: {
                start: "1960",
                end: "2024",
              },
            },
          ],
          entities: [
            {
              ref: "country/KEN",
              label: "Kenya",
              entity_type: "Country",
              role: "observationAbout",
            },
          ],
          coverage: {
            kind: "exact",
            has_data: true,
            observation_count: 140,
            dimensions: [
              {
                label: "sources",
                count: 4,
              },
              {
                label: "observations",
                count: 65,
              },
            ],
          },
          facets: {
            provenance: {
              basis: "fallback",
              ref: "dc/base/WorldDevelopmentIndicators",
              label: "WorldDevelopmentIndicators",
            },
          },
          observations: {
            series: [
              {
                stat_var: {
                  ref: "Count_Person",
                  label: "Total population",
                },
                entities: [
                  {
                    role: "observationAbout",
                    ref: "country/KEN",
                    label: "Kenya",
                  },
                ],
                points: [
                  {
                    date: "1960",
                    value: 7695307.0,
                  },
                  {
                    date: "1961",
                    value: 7987770.0,
                  },
                  {
                    date: "1962",
                    value: 8299308.0,
                  },
                ],
                total_obs: 65,
                source_refs: [
                  {
                    dcid: "dc/base/WorldDevelopmentIndicators",
                    label: "WorldDevelopmentIndicators",
                  },
                ],
                facet: {
                  provenance: {
                    ref: "dc/base/WorldDevelopmentIndicators",
                    label: "WorldDevelopmentIndicators",
                  },
                },
              },
            ],
            total_obs: 65,
            truncated: false,
          },
          slot_options: [
            {
              key: {
                axis: "how",
                property: {
                  dcid: "placeOfResidenceClassification",
                  label: "placeOfResidenceClassification",
                },
                label: "place of residence classification",
              },
              options: [
                {
                  value: {
                    ref: {
                      dcid: "Urban",
                      label: "Urban",
                    },
                    value_kind: "enum_value",
                  },
                  coverage: {
                    kind: "exact",
                    has_data: true,
                    observation_count: 72,
                    dimensions: [
                      {
                        label: "sources",
                        count: 3,
                      },
                      {
                        label: "observations",
                        count: 65,
                      },
                    ],
                  },
                },
              ],
              truncated: true,
              source: "observed",
            },
            {
              key: {
                axis: "how",
                property: {
                  dcid: "gender",
                  label: "gender",
                },
                label: "gender",
              },
              options: [
                {
                  value: {
                    ref: {
                      dcid: "Female",
                      label: "Female",
                    },
                    value_kind: "enum_value",
                  },
                  coverage: {
                    kind: "exact",
                    has_data: true,
                    observation_count: 2,
                    dimensions: [
                      {
                        label: "sources",
                        count: 1,
                      },
                      {
                        label: "observations",
                        count: 1,
                      },
                    ],
                  },
                },
                {
                  value: {
                    ref: {
                      dcid: "Male",
                      label: "Male",
                    },
                    value_kind: "enum_value",
                  },
                  coverage: {
                    kind: "exact",
                    has_data: true,
                    observation_count: 2,
                    dimensions: [
                      {
                        label: "sources",
                        count: 1,
                      },
                      {
                        label: "observations",
                        count: 1,
                      },
                    ],
                  },
                },
              ],
              truncated: true,
              source: "observed",
            },
          ],
          entity_options: [],
          facet_options: [
            {
              axis: "provenance",
              options: [
                {
                  value: {
                    ref: {
                      dcid: "dc/base/WorldDevelopmentIndicators",
                      label: "WorldDevelopmentIndicators",
                    },
                    value_kind: "source",
                  },
                },
                {
                  value: {
                    ref: {
                      dcid: "dc/base/WikidataPopulation",
                      label: "WikidataPopulation",
                    },
                    value_kind: "source",
                  },
                },
                {
                  value: {
                    ref: {
                      dcid: "dc/base/Subnational_Demographics_Stats",
                      label: "Subnational_Demographics_Stats",
                    },
                    value_kind: "source",
                  },
                },
                {
                  value: {
                    ref: {
                      dcid: "dc/base/Kenya_Census",
                      label: "Kenya_Census",
                    },
                    value_kind: "source",
                  },
                },
              ],
              truncated: false,
              source: "observed",
            },
            {
              axis: "measurementMethod",
              options: [
                {
                  value: {
                    ref: {
                      dcid: "WikidataPopulation",
                      label: "WikidataPopulation",
                    },
                    value_kind: "enum_value",
                  },
                },
                {
                  value: {
                    ref: {
                      dcid: "WorldBankSubnationalPopulationEstimate",
                      label: "World Bank Subnational Population Estimates.",
                    },
                    value_kind: "enum_value",
                  },
                },
              ],
              truncated: false,
              source: "observed",
            },
          ],
          rendered_sentence:
            "Total population in Kenya, 1960 to 2024, according to 4 sources.",
          sentence_plan: [
            {
              kind: "slot",
              text: "Total population",
              axis: "what",
              entity_refs: [],
            },
            {
              kind: "slot",
              text: "",
              axis: "how",
              property_dcid: "age",
              binding_ref: "how:age",
              entity_refs: [],
            },
            {
              kind: "slot",
              text: "",
              axis: "how",
              property_dcid: "nativity",
              binding_ref: "how:nativity",
              entity_refs: [],
            },
            {
              kind: "slot",
              text: "",
              axis: "how",
              property_dcid: "employment",
              binding_ref: "how:employment",
              entity_refs: [],
            },
            {
              kind: "slot",
              text: "",
              axis: "how",
              property_dcid: "race",
              binding_ref: "how:race",
              entity_refs: [],
            },
            {
              kind: "slot",
              text: "",
              axis: "how",
              property_dcid: "placeOfResidenceClassification",
              binding_ref: "how:placeOfResidenceClassification",
              entity_refs: [],
            },
            {
              kind: "slot",
              text: "",
              axis: "how",
              property_dcid: "religion",
              binding_ref: "how:religion",
              entity_refs: [],
            },
            {
              kind: "slot",
              text: "",
              axis: "how",
              property_dcid: "literacyStatus",
              binding_ref: "how:literacyStatus",
              entity_refs: [],
            },
            {
              kind: "slot",
              text: "",
              axis: "how",
              property_dcid: "gender",
              binding_ref: "how:gender",
              entity_refs: [],
            },
            {
              kind: "slot",
              text: "",
              axis: "how",
              property_dcid: "residenceType",
              binding_ref: "how:residenceType",
              entity_refs: [],
            },
            {
              kind: "slot",
              text: "",
              axis: "how",
              property_dcid: "educationalAttainment",
              binding_ref: "how:educationalAttainment",
              entity_refs: [],
            },
            {
              kind: "slot",
              text: "",
              axis: "how",
              property_dcid: "placeOfBirth",
              binding_ref: "how:placeOfBirth",
              entity_refs: [],
            },
            {
              kind: "slot",
              text: "",
              axis: "how",
              property_dcid: "armedForcesStatus",
              binding_ref: "how:armedForcesStatus",
              entity_refs: [],
            },
            {
              kind: "text",
              text: " in ",
              entity_refs: [],
            },
            {
              kind: "slot",
              text: "Kenya",
              axis: "where",
              binding_ref: "where:",
              entity_refs: [],
            },
            {
              kind: "text",
              text: ", ",
              entity_refs: [],
            },
            {
              kind: "slot",
              text: "1960 to 2024",
              axis: "when",
              binding_ref: "when:",
              entity_refs: [],
            },
            {
              kind: "text",
              text: ", according to ",
              entity_refs: [],
            },
            {
              kind: "slot",
              text: "4 sources",
              axis: "source",
              entity_refs: [],
            },
            {
              kind: "text",
              text: ".",
              entity_refs: [],
            },
          ],
          trace: {
            resolved_stat_vars: [
              {
                dcid: "Count_Person",
                label: "Total population",
              },
            ],
            resolved_entities: [
              {
                dcid: "country/KEN",
                label: "Kenya",
              },
            ],
            resolved_sources: [
              {
                dcid: "dc/base/WorldDevelopmentIndicators",
                label: "WorldDevelopmentIndicators",
              },
              {
                dcid: "dc/base/WikidataPopulation",
                label: "WikidataPopulation",
              },
              {
                dcid: "dc/base/Kenya_Census",
                label: "Kenya_Census",
              },
              {
                dcid: "dc/base/Subnational_Demographics_Stats",
                label: "Subnational_Demographics_Stats",
              },
            ],
            slot_filters: [
              {
                key: {
                  axis: "how",
                  property: {
                    dcid: "age",
                    label: "age",
                  },
                  label: "age",
                },
                binding_kind: "unbound",
                refs: [],
              },
              {
                key: {
                  axis: "how",
                  property: {
                    dcid: "nativity",
                    label: "nativity",
                  },
                  label: "nativity",
                },
                binding_kind: "unbound",
                refs: [],
              },
              {
                key: {
                  axis: "how",
                  property: {
                    dcid: "employment",
                    label: "employment",
                  },
                  label: "employment",
                },
                binding_kind: "unbound",
                refs: [],
              },
              {
                key: {
                  axis: "how",
                  property: {
                    dcid: "race",
                    label: "race",
                  },
                  label: "race",
                },
                binding_kind: "unbound",
                refs: [],
              },
              {
                key: {
                  axis: "how",
                  property: {
                    dcid: "placeOfResidenceClassification",
                    label: "placeOfResidenceClassification",
                  },
                  label: "place of residence classification",
                },
                binding_kind: "unbound",
                refs: [],
              },
              {
                key: {
                  axis: "how",
                  property: {
                    dcid: "religion",
                    label: "religion",
                  },
                  label: "religion",
                },
                binding_kind: "unbound",
                refs: [],
              },
              {
                key: {
                  axis: "how",
                  property: {
                    dcid: "literacyStatus",
                    label: "literacyStatus",
                  },
                  label: "literacy status",
                },
                binding_kind: "unbound",
                refs: [],
              },
              {
                key: {
                  axis: "how",
                  property: {
                    dcid: "gender",
                    label: "gender",
                  },
                  label: "gender",
                },
                binding_kind: "unbound",
                refs: [],
              },
              {
                key: {
                  axis: "how",
                  property: {
                    dcid: "residenceType",
                    label: "residenceType",
                  },
                  label: "residence type",
                },
                binding_kind: "unbound",
                refs: [],
              },
              {
                key: {
                  axis: "how",
                  property: {
                    dcid: "educationalAttainment",
                    label: "educationalAttainment",
                  },
                  label: "educational attainment",
                },
                binding_kind: "unbound",
                refs: [],
              },
              {
                key: {
                  axis: "how",
                  property: {
                    dcid: "placeOfBirth",
                    label: "placeOfBirth",
                  },
                  label: "place of birth",
                },
                binding_kind: "unbound",
                refs: [],
              },
              {
                key: {
                  axis: "how",
                  property: {
                    dcid: "armedForcesStatus",
                    label: "armedForcesStatus",
                  },
                  label: "armed forces status",
                },
                binding_kind: "unbound",
                refs: [],
              },
              {
                key: {
                  axis: "where",
                  label: "place",
                },
                binding_kind: "value",
                refs: [
                  {
                    dcid: "country/KEN",
                    label: "Kenya",
                  },
                ],
              },
              {
                key: {
                  axis: "when",
                  label: "time window",
                },
                binding_kind: "unbound",
                refs: [],
              },
              {
                key: {
                  axis: "source",
                  label: "data source",
                },
                binding_kind: "unbound",
                refs: [],
              },
            ],
            pipeline_trace: [
              {
                step: "extract",
                ran: true,
                ms: 671,
              },
              {
                step: "recall",
                ran: true,
                ms: 0,
              },
              {
                step: "shape",
                ran: true,
                ms: 172,
              },
              {
                step: "bind",
                ran: true,
                ms: 1988,
              },
              {
                step: "materialise",
                ran: true,
                ms: 136,
              },
              {
                step: "answer",
                ran: true,
                ms: 1,
              },
            ],
            n_recalled: 37,
            capability_version: "cap_1029892a119f7dc4",
          },
          confidence: "high",
          available_at_place: true,
        },
      },
    },
    {
      variable_text: "total population",
      warnings: [],
      timing_ms: {
        total: 2732,
        by_step: {
          recall: 0,
          shape: 265,
          bind: 2198,
          materialise: 90,
          answer: 1,
          options: 178,
        },
      },
      status: "definite",
      spec: {
        spec_id: "spec_ee399fc925ac7192b04df4b09b87c053",
        definition: {
          schema_version: 1,
          spec_id: "spec_ee399fc925ac7192b04df4b09b87c053",
          identity: {
            identity_version: "spec1",
            shape: {
              kind: "statvar_schema",
              population_type: "Person",
              measured_property: "count",
              stat_type: "measuredValue",
            },
            slots: [
              {
                property: "age",
                binding: {
                  state: "unbound",
                },
              },
              {
                property: "nativity",
                binding: {
                  state: "unbound",
                },
              },
              {
                property: "employment",
                binding: {
                  state: "unbound",
                },
              },
              {
                property: "religion",
                binding: {
                  state: "unbound",
                },
              },
              {
                property: "race",
                binding: {
                  state: "unbound",
                },
              },
              {
                property: "placeOfResidenceClassification",
                binding: {
                  state: "unbound",
                },
              },
              {
                property: "literacyStatus",
                binding: {
                  state: "unbound",
                },
              },
              {
                property: "educationalAttainment",
                binding: {
                  state: "unbound",
                },
              },
              {
                property: "incomeStatus",
                binding: {
                  state: "unbound",
                },
              },
              {
                property: "residenceType",
                binding: {
                  state: "unbound",
                },
              },
              {
                property: "gender",
                binding: {
                  state: "unbound",
                },
              },
              {
                property: "armedForcesStatus",
                binding: {
                  state: "unbound",
                },
              },
              {
                property: "placeOfBirth",
                binding: {
                  state: "unbound",
                },
              },
              {
                property: "maritalStatus",
                binding: {
                  state: "unbound",
                },
              },
            ],
            entities: {
              observationAbout: ["country/KEN"],
            },
            requested_window: {
              kind: "all",
            },
          },
        },
        resolved: {
          shape: {
            shape_id: "person_count_measuredvalue",
            label: "Total population",
            population_type: {
              dcid: "Person",
              label: "Person",
            },
            measured_property: {
              dcid: "count",
              label: "count",
            },
            stat_type: {
              dcid: "measuredValue",
              label: "measuredValue",
            },
            measurement_denominator_unresolved: false,
            slot_keys: [
              {
                axis: "how",
                property: {
                  dcid: "age",
                  label: "age",
                },
                label: "age",
              },
              {
                axis: "how",
                property: {
                  dcid: "nativity",
                  label: "nativity",
                },
                label: "nativity",
              },
              {
                axis: "how",
                property: {
                  dcid: "employment",
                  label: "employment",
                },
                label: "employment",
              },
              {
                axis: "how",
                property: {
                  dcid: "religion",
                  label: "religion",
                },
                label: "religion",
              },
              {
                axis: "how",
                property: {
                  dcid: "race",
                  label: "race",
                },
                label: "race",
              },
              {
                axis: "how",
                property: {
                  dcid: "placeOfResidenceClassification",
                  label: "placeOfResidenceClassification",
                },
                label: "place of residence classification",
              },
              {
                axis: "how",
                property: {
                  dcid: "literacyStatus",
                  label: "literacyStatus",
                },
                label: "literacy status",
              },
              {
                axis: "how",
                property: {
                  dcid: "educationalAttainment",
                  label: "educationalAttainment",
                },
                label: "educational attainment",
              },
              {
                axis: "how",
                property: {
                  dcid: "incomeStatus",
                  label: "incomeStatus",
                },
                label: "income status",
              },
              {
                axis: "how",
                property: {
                  dcid: "residenceType",
                  label: "residenceType",
                },
                label: "residence type",
              },
              {
                axis: "how",
                property: {
                  dcid: "gender",
                  label: "gender",
                },
                label: "gender",
              },
              {
                axis: "how",
                property: {
                  dcid: "armedForcesStatus",
                  label: "armedForcesStatus",
                },
                label: "armed forces status",
              },
              {
                axis: "how",
                property: {
                  dcid: "placeOfBirth",
                  label: "placeOfBirth",
                },
                label: "place of birth",
              },
              {
                axis: "how",
                property: {
                  dcid: "maritalStatus",
                  label: "maritalStatus",
                },
                label: "marital status",
              },
              {
                axis: "where",
                label: "place",
              },
              {
                axis: "when",
                label: "time window",
              },
              {
                axis: "source",
                label: "data source",
              },
            ],
            member_count: 1,
            refine_supported: true,
          },
          slots: [
            {
              key: {
                axis: "how",
                property: {
                  dcid: "age",
                  label: "age",
                },
                label: "age",
              },
              binding: {
                kind: "unbound",
              },
            },
            {
              key: {
                axis: "how",
                property: {
                  dcid: "nativity",
                  label: "nativity",
                },
                label: "nativity",
              },
              binding: {
                kind: "unbound",
              },
            },
            {
              key: {
                axis: "how",
                property: {
                  dcid: "employment",
                  label: "employment",
                },
                label: "employment",
              },
              binding: {
                kind: "unbound",
              },
            },
            {
              key: {
                axis: "how",
                property: {
                  dcid: "religion",
                  label: "religion",
                },
                label: "religion",
              },
              binding: {
                kind: "unbound",
              },
            },
            {
              key: {
                axis: "how",
                property: {
                  dcid: "race",
                  label: "race",
                },
                label: "race",
              },
              binding: {
                kind: "unbound",
              },
            },
            {
              key: {
                axis: "how",
                property: {
                  dcid: "placeOfResidenceClassification",
                  label: "placeOfResidenceClassification",
                },
                label: "place of residence classification",
              },
              binding: {
                kind: "unbound",
              },
            },
            {
              key: {
                axis: "how",
                property: {
                  dcid: "literacyStatus",
                  label: "literacyStatus",
                },
                label: "literacy status",
              },
              binding: {
                kind: "unbound",
              },
            },
            {
              key: {
                axis: "how",
                property: {
                  dcid: "educationalAttainment",
                  label: "educationalAttainment",
                },
                label: "educational attainment",
              },
              binding: {
                kind: "unbound",
              },
            },
            {
              key: {
                axis: "how",
                property: {
                  dcid: "incomeStatus",
                  label: "incomeStatus",
                },
                label: "income status",
              },
              binding: {
                kind: "unbound",
              },
            },
            {
              key: {
                axis: "how",
                property: {
                  dcid: "residenceType",
                  label: "residenceType",
                },
                label: "residence type",
              },
              binding: {
                kind: "unbound",
              },
            },
            {
              key: {
                axis: "how",
                property: {
                  dcid: "gender",
                  label: "gender",
                },
                label: "gender",
              },
              binding: {
                kind: "unbound",
              },
            },
            {
              key: {
                axis: "how",
                property: {
                  dcid: "armedForcesStatus",
                  label: "armedForcesStatus",
                },
                label: "armed forces status",
              },
              binding: {
                kind: "unbound",
              },
            },
            {
              key: {
                axis: "how",
                property: {
                  dcid: "placeOfBirth",
                  label: "placeOfBirth",
                },
                label: "place of birth",
              },
              binding: {
                kind: "unbound",
              },
            },
            {
              key: {
                axis: "how",
                property: {
                  dcid: "maritalStatus",
                  label: "maritalStatus",
                },
                label: "marital status",
              },
              binding: {
                kind: "unbound",
              },
            },
            {
              key: {
                axis: "where",
                label: "place",
              },
              binding: {
                kind: "value",
                value: {
                  ref: {
                    dcid: "country/KEN",
                    label: "Kenya",
                  },
                  value_kind: "entity",
                },
              },
            },
            {
              key: {
                axis: "when",
                label: "time window",
              },
              binding: {
                kind: "unbound",
              },
            },
            {
              key: {
                axis: "source",
                label: "data source",
              },
              binding: {
                kind: "unbound",
              },
            },
          ],
          inapplicable_slots: [
            "age",
            "nativity",
            "employment",
            "religion",
            "race",
            "placeOfResidenceClassification",
            "literacyStatus",
            "educationalAttainment",
            "incomeStatus",
            "residenceType",
            "gender",
            "armedForcesStatus",
            "placeOfBirth",
            "maritalStatus",
          ],
          unresolved_slots: [],
          stat_vars: [
            {
              ref: "Count_Person",
              label: "Total population",
              slot_values: [],
              data_date_range: {
                start: "1960",
                end: "2024",
              },
            },
          ],
          entities: [
            {
              ref: "country/KEN",
              label: "Kenya",
              entity_type: "Country",
              role: "observationAbout",
            },
          ],
          coverage: {
            kind: "exact",
            has_data: true,
            observation_count: 140,
            dimensions: [
              {
                label: "sources",
                count: 4,
              },
              {
                label: "observations",
                count: 65,
              },
            ],
          },
          facets: {
            provenance: {
              basis: "fallback",
              ref: "dc/base/WorldDevelopmentIndicators",
              label: "WorldDevelopmentIndicators",
            },
          },
          observations: {
            series: [
              {
                stat_var: {
                  ref: "Count_Person",
                  label: "Total population",
                },
                entities: [
                  {
                    role: "observationAbout",
                    ref: "country/KEN",
                    label: "Kenya",
                  },
                ],
                points: [
                  {
                    date: "1960",
                    value: 7695307.0,
                  },
                  {
                    date: "1961",
                    value: 7987770.0,
                  },
                  {
                    date: "1962",
                    value: 8299308.0,
                  },
                ],
                total_obs: 65,
                source_refs: [
                  {
                    dcid: "dc/base/WorldDevelopmentIndicators",
                    label: "WorldDevelopmentIndicators",
                  },
                ],
                facet: {
                  provenance: {
                    ref: "dc/base/WorldDevelopmentIndicators",
                    label: "WorldDevelopmentIndicators",
                  },
                },
              },
            ],
            total_obs: 65,
            truncated: false,
          },
          slot_options: [
            {
              key: {
                axis: "how",
                property: {
                  dcid: "placeOfResidenceClassification",
                  label: "placeOfResidenceClassification",
                },
                label: "place of residence classification",
              },
              options: [
                {
                  value: {
                    ref: {
                      dcid: "Urban",
                      label: "Urban",
                    },
                    value_kind: "enum_value",
                  },
                  coverage: {
                    kind: "exact",
                    has_data: true,
                    observation_count: 72,
                    dimensions: [
                      {
                        label: "sources",
                        count: 3,
                      },
                      {
                        label: "observations",
                        count: 65,
                      },
                    ],
                  },
                },
              ],
              truncated: true,
              source: "observed",
            },
            {
              key: {
                axis: "how",
                property: {
                  dcid: "gender",
                  label: "gender",
                },
                label: "gender",
              },
              options: [
                {
                  value: {
                    ref: {
                      dcid: "Female",
                      label: "Female",
                    },
                    value_kind: "enum_value",
                  },
                  coverage: {
                    kind: "exact",
                    has_data: true,
                    observation_count: 2,
                    dimensions: [
                      {
                        label: "sources",
                        count: 1,
                      },
                      {
                        label: "observations",
                        count: 1,
                      },
                    ],
                  },
                },
              ],
              truncated: true,
              source: "observed",
            },
          ],
          entity_options: [],
          facet_options: [
            {
              axis: "provenance",
              options: [
                {
                  value: {
                    ref: {
                      dcid: "dc/base/WorldDevelopmentIndicators",
                      label: "WorldDevelopmentIndicators",
                    },
                    value_kind: "source",
                  },
                },
                {
                  value: {
                    ref: {
                      dcid: "dc/base/WikidataPopulation",
                      label: "WikidataPopulation",
                    },
                    value_kind: "source",
                  },
                },
                {
                  value: {
                    ref: {
                      dcid: "dc/base/Subnational_Demographics_Stats",
                      label: "Subnational_Demographics_Stats",
                    },
                    value_kind: "source",
                  },
                },
                {
                  value: {
                    ref: {
                      dcid: "dc/base/Kenya_Census",
                      label: "Kenya_Census",
                    },
                    value_kind: "source",
                  },
                },
              ],
              truncated: false,
              source: "observed",
            },
            {
              axis: "measurementMethod",
              options: [
                {
                  value: {
                    ref: {
                      dcid: "WikidataPopulation",
                      label: "WikidataPopulation",
                    },
                    value_kind: "enum_value",
                  },
                },
                {
                  value: {
                    ref: {
                      dcid: "WorldBankSubnationalPopulationEstimate",
                      label: "World Bank Subnational Population Estimates.",
                    },
                    value_kind: "enum_value",
                  },
                },
              ],
              truncated: false,
              source: "observed",
            },
          ],
          rendered_sentence:
            "Total population in Kenya, 1960 to 2024, according to 4 sources.",
          sentence_plan: [
            {
              kind: "slot",
              text: "Total population",
              axis: "what",
              entity_refs: [],
            },
            {
              kind: "slot",
              text: "",
              axis: "how",
              property_dcid: "age",
              binding_ref: "how:age",
              entity_refs: [],
            },
            {
              kind: "slot",
              text: "",
              axis: "how",
              property_dcid: "nativity",
              binding_ref: "how:nativity",
              entity_refs: [],
            },
            {
              kind: "slot",
              text: "",
              axis: "how",
              property_dcid: "employment",
              binding_ref: "how:employment",
              entity_refs: [],
            },
            {
              kind: "slot",
              text: "",
              axis: "how",
              property_dcid: "religion",
              binding_ref: "how:religion",
              entity_refs: [],
            },
            {
              kind: "slot",
              text: "",
              axis: "how",
              property_dcid: "race",
              binding_ref: "how:race",
              entity_refs: [],
            },
            {
              kind: "slot",
              text: "",
              axis: "how",
              property_dcid: "placeOfResidenceClassification",
              binding_ref: "how:placeOfResidenceClassification",
              entity_refs: [],
            },
            {
              kind: "slot",
              text: "",
              axis: "how",
              property_dcid: "literacyStatus",
              binding_ref: "how:literacyStatus",
              entity_refs: [],
            },
            {
              kind: "slot",
              text: "",
              axis: "how",
              property_dcid: "educationalAttainment",
              binding_ref: "how:educationalAttainment",
              entity_refs: [],
            },
            {
              kind: "slot",
              text: "",
              axis: "how",
              property_dcid: "incomeStatus",
              binding_ref: "how:incomeStatus",
              entity_refs: [],
            },
            {
              kind: "slot",
              text: "",
              axis: "how",
              property_dcid: "residenceType",
              binding_ref: "how:residenceType",
              entity_refs: [],
            },
            {
              kind: "slot",
              text: "",
              axis: "how",
              property_dcid: "gender",
              binding_ref: "how:gender",
              entity_refs: [],
            },
            {
              kind: "slot",
              text: "",
              axis: "how",
              property_dcid: "armedForcesStatus",
              binding_ref: "how:armedForcesStatus",
              entity_refs: [],
            },
            {
              kind: "slot",
              text: "",
              axis: "how",
              property_dcid: "placeOfBirth",
              binding_ref: "how:placeOfBirth",
              entity_refs: [],
            },
            {
              kind: "slot",
              text: "",
              axis: "how",
              property_dcid: "maritalStatus",
              binding_ref: "how:maritalStatus",
              entity_refs: [],
            },
            {
              kind: "text",
              text: " in ",
              entity_refs: [],
            },
            {
              kind: "slot",
              text: "Kenya",
              axis: "where",
              binding_ref: "where:",
              entity_refs: [],
            },
            {
              kind: "text",
              text: ", ",
              entity_refs: [],
            },
            {
              kind: "slot",
              text: "1960 to 2024",
              axis: "when",
              binding_ref: "when:",
              entity_refs: [],
            },
            {
              kind: "text",
              text: ", according to ",
              entity_refs: [],
            },
            {
              kind: "slot",
              text: "4 sources",
              axis: "source",
              entity_refs: [],
            },
            {
              kind: "text",
              text: ".",
              entity_refs: [],
            },
          ],
          trace: {
            resolved_stat_vars: [
              {
                dcid: "Count_Person",
                label: "Total population",
              },
            ],
            resolved_entities: [
              {
                dcid: "country/KEN",
                label: "Kenya",
              },
            ],
            resolved_sources: [
              {
                dcid: "dc/base/WorldDevelopmentIndicators",
                label: "WorldDevelopmentIndicators",
              },
              {
                dcid: "dc/base/WikidataPopulation",
                label: "WikidataPopulation",
              },
              {
                dcid: "dc/base/Kenya_Census",
                label: "Kenya_Census",
              },
              {
                dcid: "dc/base/Subnational_Demographics_Stats",
                label: "Subnational_Demographics_Stats",
              },
            ],
            slot_filters: [
              {
                key: {
                  axis: "how",
                  property: {
                    dcid: "age",
                    label: "age",
                  },
                  label: "age",
                },
                binding_kind: "unbound",
                refs: [],
              },
              {
                key: {
                  axis: "how",
                  property: {
                    dcid: "nativity",
                    label: "nativity",
                  },
                  label: "nativity",
                },
                binding_kind: "unbound",
                refs: [],
              },
              {
                key: {
                  axis: "how",
                  property: {
                    dcid: "employment",
                    label: "employment",
                  },
                  label: "employment",
                },
                binding_kind: "unbound",
                refs: [],
              },
              {
                key: {
                  axis: "how",
                  property: {
                    dcid: "religion",
                    label: "religion",
                  },
                  label: "religion",
                },
                binding_kind: "unbound",
                refs: [],
              },
              {
                key: {
                  axis: "how",
                  property: {
                    dcid: "race",
                    label: "race",
                  },
                  label: "race",
                },
                binding_kind: "unbound",
                refs: [],
              },
              {
                key: {
                  axis: "how",
                  property: {
                    dcid: "placeOfResidenceClassification",
                    label: "placeOfResidenceClassification",
                  },
                  label: "place of residence classification",
                },
                binding_kind: "unbound",
                refs: [],
              },
              {
                key: {
                  axis: "how",
                  property: {
                    dcid: "literacyStatus",
                    label: "literacyStatus",
                  },
                  label: "literacy status",
                },
                binding_kind: "unbound",
                refs: [],
              },
              {
                key: {
                  axis: "how",
                  property: {
                    dcid: "educationalAttainment",
                    label: "educationalAttainment",
                  },
                  label: "educational attainment",
                },
                binding_kind: "unbound",
                refs: [],
              },
              {
                key: {
                  axis: "how",
                  property: {
                    dcid: "incomeStatus",
                    label: "incomeStatus",
                  },
                  label: "income status",
                },
                binding_kind: "unbound",
                refs: [],
              },
              {
                key: {
                  axis: "how",
                  property: {
                    dcid: "residenceType",
                    label: "residenceType",
                  },
                  label: "residence type",
                },
                binding_kind: "unbound",
                refs: [],
              },
              {
                key: {
                  axis: "how",
                  property: {
                    dcid: "gender",
                    label: "gender",
                  },
                  label: "gender",
                },
                binding_kind: "unbound",
                refs: [],
              },
              {
                key: {
                  axis: "how",
                  property: {
                    dcid: "armedForcesStatus",
                    label: "armedForcesStatus",
                  },
                  label: "armed forces status",
                },
                binding_kind: "unbound",
                refs: [],
              },
              {
                key: {
                  axis: "how",
                  property: {
                    dcid: "placeOfBirth",
                    label: "placeOfBirth",
                  },
                  label: "place of birth",
                },
                binding_kind: "unbound",
                refs: [],
              },
              {
                key: {
                  axis: "how",
                  property: {
                    dcid: "maritalStatus",
                    label: "maritalStatus",
                  },
                  label: "marital status",
                },
                binding_kind: "unbound",
                refs: [],
              },
              {
                key: {
                  axis: "where",
                  label: "place",
                },
                binding_kind: "value",
                refs: [
                  {
                    dcid: "country/KEN",
                    label: "Kenya",
                  },
                ],
              },
              {
                key: {
                  axis: "when",
                  label: "time window",
                },
                binding_kind: "unbound",
                refs: [],
              },
              {
                key: {
                  axis: "source",
                  label: "data source",
                },
                binding_kind: "unbound",
                refs: [],
              },
            ],
            pipeline_trace: [
              {
                step: "extract",
                ran: true,
                ms: 671,
              },
              {
                step: "recall",
                ran: true,
                ms: 0,
              },
              {
                step: "shape",
                ran: true,
                ms: 265,
              },
              {
                step: "bind",
                ran: true,
                ms: 2198,
              },
              {
                step: "materialise",
                ran: true,
                ms: 90,
              },
              {
                step: "answer",
                ran: true,
                ms: 1,
              },
            ],
            n_recalled: 41,
            capability_version: "cap_1029892a119f7dc4",
          },
          confidence: "high",
          available_at_place: true,
        },
      },
    },
  ],
  status: "definite",
};

/**
 * Real two-part capture: "population and GDP in Brazil" against a build
 * that composes the envelope's own sentence: part 0 definite (population),
 * part 1 candidates (GDP, `observations_omitted`). Unlike partsMixedBrazil,
 * this envelope carries its own `rendered_sentence`/`sentence_plan` with
 * `part_index` on every token, composed across both parts. Drives
 * ComposedSentence's rendering of a composed envelope. No observation points
 * ride on the response event itself; they arrive on a later, separate SSE
 * event this fixture doesn't include.
 */
export const partsComposedBrazil = {
  schema_version: 1,
  query_echo: {
    entry_path: "raw_text",
    raw_query: "population and GDP in Brazil",
    normalized_query: "population and GDP in Brazil",
    extract_skipped: false,
  },
  diagnostics: {
    engine_build: "e75073680c2d1a63105729760a939269eb7cdb58",
    trace_id: "be91cace8379445eb01e4c250b3c0e5b",
    warnings: [],
    timing_ms: {
      total: 4666,
      by_step: {
        extract: 792,
      },
    },
    llm_usage: {
      input_tokens: 7022,
      output_tokens: 777,
      cached_tokens: 0,
    },
  },
  parts: [
    {
      variable_text: "population",
      warnings: [],
      timing_ms: {
        total: 3773,
        by_step: {
          recall: 501,
          shape: 727,
          bind: 2032,
          materialise: 143,
          answer: 103,
          options: 267,
        },
      },
      status: "definite",
      spec: {
        spec_id: "spec_1e81b575d2df5f8a5e120c895fc45ba8",
        definition: {
          schema_version: 1,
          spec_id: "spec_1e81b575d2df5f8a5e120c895fc45ba8",
          identity: {
            identity_version: "spec1",
            shape: {
              kind: "statvar_schema",
              population_type: "Person",
              measured_property: "count",
              stat_type: "measuredValue",
            },
            slots: [
              {
                property: "age",
                binding: {
                  state: "unbound",
                },
              },
              {
                property: "nativity",
                binding: {
                  state: "unbound",
                },
              },
              {
                property: "employment",
                binding: {
                  state: "unbound",
                },
              },
              {
                property: "race",
                binding: {
                  state: "unbound",
                },
              },
              {
                property: "placeOfResidenceClassification",
                binding: {
                  state: "unbound",
                },
              },
              {
                property: "religion",
                binding: {
                  state: "unbound",
                },
              },
              {
                property: "literacyStatus",
                binding: {
                  state: "unbound",
                },
              },
              {
                property: "gender",
                binding: {
                  state: "unbound",
                },
              },
              {
                property: "residenceType",
                binding: {
                  state: "unbound",
                },
              },
              {
                property: "educationalAttainment",
                binding: {
                  state: "unbound",
                },
              },
              {
                property: "placeOfBirth",
                binding: {
                  state: "unbound",
                },
              },
              {
                property: "armedForcesStatus",
                binding: {
                  state: "unbound",
                },
              },
            ],
            entities: {
              observationAbout: ["country/BRA"],
            },
            requested_window: {
              kind: "all",
            },
          },
        },
        resolved: {
          shape: {
            shape_id: "person_count_measuredvalue",
            label: "Total population",
            population_type: {
              dcid: "Person",
              label: "Person",
            },
            measured_property: {
              dcid: "count",
              label: "count",
            },
            stat_type: {
              dcid: "measuredValue",
              label: "measuredValue",
            },
            measurement_denominator_unresolved: false,
            slot_keys: [
              {
                axis: "how",
                property: {
                  dcid: "age",
                  label: "age",
                },
                label: "age",
              },
              {
                axis: "how",
                property: {
                  dcid: "nativity",
                  label: "nativity",
                },
                label: "nativity",
              },
              {
                axis: "how",
                property: {
                  dcid: "employment",
                  label: "employment",
                },
                label: "employment",
              },
              {
                axis: "how",
                property: {
                  dcid: "race",
                  label: "race",
                },
                label: "race",
              },
              {
                axis: "how",
                property: {
                  dcid: "placeOfResidenceClassification",
                  label: "placeOfResidenceClassification",
                },
                label: "place of residence classification",
              },
              {
                axis: "how",
                property: {
                  dcid: "religion",
                  label: "religion",
                },
                label: "religion",
              },
              {
                axis: "how",
                property: {
                  dcid: "literacyStatus",
                  label: "literacyStatus",
                },
                label: "literacy status",
              },
              {
                axis: "how",
                property: {
                  dcid: "gender",
                  label: "gender",
                },
                label: "gender",
              },
              {
                axis: "how",
                property: {
                  dcid: "residenceType",
                  label: "residenceType",
                },
                label: "residence type",
              },
              {
                axis: "how",
                property: {
                  dcid: "educationalAttainment",
                  label: "educationalAttainment",
                },
                label: "educational attainment",
              },
              {
                axis: "how",
                property: {
                  dcid: "placeOfBirth",
                  label: "placeOfBirth",
                },
                label: "place of birth",
              },
              {
                axis: "how",
                property: {
                  dcid: "armedForcesStatus",
                  label: "armedForcesStatus",
                },
                label: "armed forces status",
              },
              {
                axis: "where",
                label: "place",
              },
              {
                axis: "when",
                label: "time window",
              },
              {
                axis: "source",
                label: "data source",
              },
            ],
            member_count: 1,
            refine_supported: true,
          },
          slots: [
            {
              key: {
                axis: "how",
                property: {
                  dcid: "age",
                  label: "age",
                },
                label: "age",
              },
              binding: {
                kind: "unbound",
              },
            },
            {
              key: {
                axis: "how",
                property: {
                  dcid: "nativity",
                  label: "nativity",
                },
                label: "nativity",
              },
              binding: {
                kind: "unbound",
              },
            },
            {
              key: {
                axis: "how",
                property: {
                  dcid: "employment",
                  label: "employment",
                },
                label: "employment",
              },
              binding: {
                kind: "unbound",
              },
            },
            {
              key: {
                axis: "how",
                property: {
                  dcid: "race",
                  label: "race",
                },
                label: "race",
              },
              binding: {
                kind: "unbound",
              },
            },
            {
              key: {
                axis: "how",
                property: {
                  dcid: "placeOfResidenceClassification",
                  label: "placeOfResidenceClassification",
                },
                label: "place of residence classification",
              },
              binding: {
                kind: "unbound",
              },
            },
            {
              key: {
                axis: "how",
                property: {
                  dcid: "religion",
                  label: "religion",
                },
                label: "religion",
              },
              binding: {
                kind: "unbound",
              },
            },
            {
              key: {
                axis: "how",
                property: {
                  dcid: "literacyStatus",
                  label: "literacyStatus",
                },
                label: "literacy status",
              },
              binding: {
                kind: "unbound",
              },
            },
            {
              key: {
                axis: "how",
                property: {
                  dcid: "gender",
                  label: "gender",
                },
                label: "gender",
              },
              binding: {
                kind: "unbound",
              },
            },
            {
              key: {
                axis: "how",
                property: {
                  dcid: "residenceType",
                  label: "residenceType",
                },
                label: "residence type",
              },
              binding: {
                kind: "unbound",
              },
            },
            {
              key: {
                axis: "how",
                property: {
                  dcid: "educationalAttainment",
                  label: "educationalAttainment",
                },
                label: "educational attainment",
              },
              binding: {
                kind: "unbound",
              },
            },
            {
              key: {
                axis: "how",
                property: {
                  dcid: "placeOfBirth",
                  label: "placeOfBirth",
                },
                label: "place of birth",
              },
              binding: {
                kind: "unbound",
              },
            },
            {
              key: {
                axis: "how",
                property: {
                  dcid: "armedForcesStatus",
                  label: "armedForcesStatus",
                },
                label: "armed forces status",
              },
              binding: {
                kind: "unbound",
              },
            },
            {
              key: {
                axis: "where",
                label: "place",
              },
              binding: {
                kind: "value",
                value: {
                  ref: {
                    dcid: "country/BRA",
                    label: "Brazil",
                  },
                  value_kind: "entity",
                },
              },
            },
            {
              key: {
                axis: "when",
                label: "time window",
              },
              binding: {
                kind: "unbound",
              },
            },
            {
              key: {
                axis: "source",
                label: "data source",
              },
              binding: {
                kind: "unbound",
              },
            },
          ],
          inapplicable_slots: [
            "age",
            "nativity",
            "employment",
            "race",
            "placeOfResidenceClassification",
            "religion",
            "literacyStatus",
            "gender",
            "residenceType",
            "educationalAttainment",
            "placeOfBirth",
            "armedForcesStatus",
          ],
          unresolved_slots: [],
          stat_vars: [
            {
              ref: "Count_Person",
              label: "Total population",
              slot_values: [],
              data_date_range: {
                start: "1940",
                end: "2026-06",
              },
            },
          ],
          entities: [
            {
              ref: "country/BRA",
              label: "Brazil",
              entity_type: "Country",
              role: "observationAbout",
            },
          ],
          coverage: {
            kind: "exact",
            has_data: true,
            observation_count: 188,
            dimensions: [
              {
                label: "sources",
                count: 6,
              },
              {
                label: "observations",
                count: 65,
              },
            ],
          },
          facets: {
            provenance: {
              basis: "fallback",
              ref: "dc/base/WorldDevelopmentIndicators",
              label: "WorldDevelopmentIndicators",
            },
          },
          slot_options: [
            {
              key: {
                axis: "how",
                property: {
                  dcid: "placeOfResidenceClassification",
                  label: "placeOfResidenceClassification",
                },
                label: "place of residence classification",
              },
              options: [
                {
                  value: {
                    ref: {
                      dcid: "Urban",
                      label: "Urban",
                    },
                    value_kind: "enum_value",
                  },
                  coverage: null,
                },
              ],
              truncated: true,
              source: "observed",
            },
            {
              key: {
                axis: "how",
                property: {
                  dcid: "gender",
                  label: "gender",
                },
                label: "gender",
              },
              options: [
                {
                  value: {
                    ref: {
                      dcid: "Female",
                      label: "Female",
                    },
                    value_kind: "enum_value",
                  },
                  coverage: null,
                },
                {
                  value: {
                    ref: {
                      dcid: "Male",
                      label: "Male",
                    },
                    value_kind: "enum_value",
                  },
                  coverage: null,
                },
              ],
              truncated: true,
              source: "observed",
            },
          ],
          entity_options: [],
          facet_options: [],
          rendered_sentence:
            "Total population in Brazil, 1940 to June 2026, according to 6 sources.",
          sentence_plan: [
            {
              kind: "slot",
              text: "Total population",
              axis: "what",
              entity_refs: [],
            },
            {
              kind: "slot",
              text: "",
              axis: "how",
              property_dcid: "age",
              binding_ref: "how:age",
              entity_refs: [],
            },
            {
              kind: "slot",
              text: "",
              axis: "how",
              property_dcid: "nativity",
              binding_ref: "how:nativity",
              entity_refs: [],
            },
            {
              kind: "slot",
              text: "",
              axis: "how",
              property_dcid: "employment",
              binding_ref: "how:employment",
              entity_refs: [],
            },
            {
              kind: "slot",
              text: "",
              axis: "how",
              property_dcid: "race",
              binding_ref: "how:race",
              entity_refs: [],
            },
            {
              kind: "slot",
              text: "",
              axis: "how",
              property_dcid: "placeOfResidenceClassification",
              binding_ref: "how:placeOfResidenceClassification",
              entity_refs: [],
            },
            {
              kind: "slot",
              text: "",
              axis: "how",
              property_dcid: "religion",
              binding_ref: "how:religion",
              entity_refs: [],
            },
            {
              kind: "slot",
              text: "",
              axis: "how",
              property_dcid: "literacyStatus",
              binding_ref: "how:literacyStatus",
              entity_refs: [],
            },
            {
              kind: "slot",
              text: "",
              axis: "how",
              property_dcid: "gender",
              binding_ref: "how:gender",
              entity_refs: [],
            },
            {
              kind: "slot",
              text: "",
              axis: "how",
              property_dcid: "residenceType",
              binding_ref: "how:residenceType",
              entity_refs: [],
            },
            {
              kind: "slot",
              text: "",
              axis: "how",
              property_dcid: "educationalAttainment",
              binding_ref: "how:educationalAttainment",
              entity_refs: [],
            },
            {
              kind: "slot",
              text: "",
              axis: "how",
              property_dcid: "placeOfBirth",
              binding_ref: "how:placeOfBirth",
              entity_refs: [],
            },
            {
              kind: "slot",
              text: "",
              axis: "how",
              property_dcid: "armedForcesStatus",
              binding_ref: "how:armedForcesStatus",
              entity_refs: [],
            },
            {
              kind: "text",
              text: " in ",
              entity_refs: [],
            },
            {
              kind: "slot",
              text: "Brazil",
              axis: "where",
              binding_ref: "where:",
              entity_refs: [],
            },
            {
              kind: "text",
              text: ", ",
              entity_refs: [],
            },
            {
              kind: "slot",
              text: "1940 to June 2026",
              axis: "when",
              binding_ref: "when:",
              entity_refs: [],
            },
            {
              kind: "text",
              text: ", according to ",
              entity_refs: [],
            },
            {
              kind: "slot",
              text: "6 sources",
              axis: "source",
              entity_refs: [],
            },
            {
              kind: "text",
              text: ".",
              entity_refs: [],
            },
          ],
          trace: {
            resolved_stat_vars: [
              {
                dcid: "Count_Person",
                label: "Total population",
              },
            ],
            resolved_entities: [
              {
                dcid: "country/BRA",
                label: "Brazil",
              },
            ],
            resolved_sources: [
              {
                dcid: "dc/base/Brazil_SIDRA_IBGE",
                label: "Brazil_SIDRA_IBGE",
              },
              {
                dcid: "dc/base/WorldDevelopmentIndicators",
                label: "WorldDevelopmentIndicators",
              },
              {
                dcid: "dc/base/WikidataPopulation",
                label: "WikidataPopulation",
              },
              {
                dcid: "dc/base/Brazil_Census",
                label: "Brazil_Census",
              },
              {
                dcid: "dc/base/OECDRegionalDemography_Population",
                label: "OECDRegionalDemography_Population",
              },
              {
                dcid: "dc/base/Subnational_Demographics_Stats",
                label: "Subnational_Demographics_Stats",
              },
            ],
            slot_filters: [
              {
                key: {
                  axis: "how",
                  property: {
                    dcid: "age",
                    label: "age",
                  },
                  label: "age",
                },
                binding_kind: "unbound",
                refs: [],
              },
              {
                key: {
                  axis: "how",
                  property: {
                    dcid: "nativity",
                    label: "nativity",
                  },
                  label: "nativity",
                },
                binding_kind: "unbound",
                refs: [],
              },
              {
                key: {
                  axis: "how",
                  property: {
                    dcid: "employment",
                    label: "employment",
                  },
                  label: "employment",
                },
                binding_kind: "unbound",
                refs: [],
              },
              {
                key: {
                  axis: "how",
                  property: {
                    dcid: "race",
                    label: "race",
                  },
                  label: "race",
                },
                binding_kind: "unbound",
                refs: [],
              },
              {
                key: {
                  axis: "how",
                  property: {
                    dcid: "placeOfResidenceClassification",
                    label: "placeOfResidenceClassification",
                  },
                  label: "place of residence classification",
                },
                binding_kind: "unbound",
                refs: [],
              },
              {
                key: {
                  axis: "how",
                  property: {
                    dcid: "religion",
                    label: "religion",
                  },
                  label: "religion",
                },
                binding_kind: "unbound",
                refs: [],
              },
              {
                key: {
                  axis: "how",
                  property: {
                    dcid: "literacyStatus",
                    label: "literacyStatus",
                  },
                  label: "literacy status",
                },
                binding_kind: "unbound",
                refs: [],
              },
              {
                key: {
                  axis: "how",
                  property: {
                    dcid: "gender",
                    label: "gender",
                  },
                  label: "gender",
                },
                binding_kind: "unbound",
                refs: [],
              },
              {
                key: {
                  axis: "how",
                  property: {
                    dcid: "residenceType",
                    label: "residenceType",
                  },
                  label: "residence type",
                },
                binding_kind: "unbound",
                refs: [],
              },
              {
                key: {
                  axis: "how",
                  property: {
                    dcid: "educationalAttainment",
                    label: "educationalAttainment",
                  },
                  label: "educational attainment",
                },
                binding_kind: "unbound",
                refs: [],
              },
              {
                key: {
                  axis: "how",
                  property: {
                    dcid: "placeOfBirth",
                    label: "placeOfBirth",
                  },
                  label: "place of birth",
                },
                binding_kind: "unbound",
                refs: [],
              },
              {
                key: {
                  axis: "how",
                  property: {
                    dcid: "armedForcesStatus",
                    label: "armedForcesStatus",
                  },
                  label: "armed forces status",
                },
                binding_kind: "unbound",
                refs: [],
              },
              {
                key: {
                  axis: "where",
                  label: "place",
                },
                binding_kind: "value",
                refs: [
                  {
                    dcid: "country/BRA",
                    label: "Brazil",
                  },
                ],
              },
              {
                key: {
                  axis: "when",
                  label: "time window",
                },
                binding_kind: "unbound",
                refs: [],
              },
              {
                key: {
                  axis: "source",
                  label: "data source",
                },
                binding_kind: "unbound",
                refs: [],
              },
            ],
            pipeline_trace: [
              {
                step: "extract",
                ran: true,
                ms: 792,
              },
              {
                step: "recall",
                ran: true,
                ms: 501,
              },
              {
                step: "shape",
                ran: true,
                ms: 727,
              },
              {
                step: "bind",
                ran: true,
                ms: 2032,
              },
              {
                step: "materialise",
                ran: true,
                ms: 143,
              },
              {
                step: "answer",
                ran: true,
                ms: 103,
              },
            ],
            n_recalled: 37,
            capability_version: "cap_1029892a119f7dc4",
          },
          confidence: "high",
          available_at_place: true,
        },
      },
    },
    {
      variable_text: "GDP",
      warnings: [],
      timing_ms: {
        total: 2738,
        by_step: {
          recall: 643,
          shape: 661,
          bind: 952,
          materialise: 295,
          answer: 187,
        },
      },
      rendered_sentence:
        "2 possible interpretations. They differ by indicator.",
      sentence_plan: [
        {
          kind: "text",
          text: "2 possible interpretations. They differ by indicator.",
          entity_refs: [],
        },
      ],
      status: "candidates",
      candidates: {
        ordering: "broadest_first",
        max_candidates: 6,
        specs: [
          {
            spec_id: "spec_1a8485775cfd3807f9eb3884499aec9e",
            definition: {
              schema_version: 1,
              spec_id: "spec_1a8485775cfd3807f9eb3884499aec9e",
              identity: {
                identity_version: "spec1",
                shape: {
                  kind: "statvar_schema",
                  population_type: "EconomicActivity",
                  measured_property: "amount",
                  stat_type: "measuredValue",
                  measurement_qualifier: "Nominal",
                },
                slots: [
                  {
                    property: "activitySource",
                    binding: {
                      state: "value",
                      ref: "GrossDomesticProduction",
                    },
                  },
                  {
                    property: "economicSector",
                    binding: {
                      state: "unbound",
                    },
                  },
                ],
                entities: {
                  observationAbout: ["country/BRA"],
                },
                requested_window: {
                  kind: "all",
                },
              },
            },
            resolved: {
              shape: {
                shape_id: "economicactivity_amount_measuredvalue_nominal",
                label: "Nominal gross domestic product",
                population_type: {
                  dcid: "EconomicActivity",
                  label: "EconomicActivity",
                },
                measured_property: {
                  dcid: "amount",
                  label: "amount",
                },
                stat_type: {
                  dcid: "measuredValue",
                  label: "measuredValue",
                },
                measurement_qualifier: {
                  dcid: "Nominal",
                  label: "Nominal",
                },
                measurement_denominator_unresolved: false,
                slot_keys: [
                  {
                    axis: "how",
                    property: {
                      dcid: "activitySource",
                      label: "activitySource",
                    },
                    label: "activity source",
                  },
                  {
                    axis: "how",
                    property: {
                      dcid: "economicSector",
                      label: "economicSector",
                    },
                    label: "economic sector",
                  },
                  {
                    axis: "where",
                    label: "place",
                  },
                  {
                    axis: "when",
                    label: "time window",
                  },
                  {
                    axis: "source",
                    label: "data source",
                  },
                ],
                member_count: 12,
                refine_supported: true,
              },
              slots: [
                {
                  key: {
                    axis: "how",
                    property: {
                      dcid: "activitySource",
                      label: "activitySource",
                    },
                    label: "activity source",
                  },
                  binding: {
                    kind: "value",
                    value: {
                      ref: {
                        dcid: "GrossDomesticProduction",
                        label: "GrossDomesticProduction",
                      },
                      value_kind: "enum_value",
                    },
                  },
                },
                {
                  key: {
                    axis: "how",
                    property: {
                      dcid: "economicSector",
                      label: "economicSector",
                    },
                    label: "economic sector",
                  },
                  binding: {
                    kind: "unbound",
                  },
                },
                {
                  key: {
                    axis: "where",
                    label: "place",
                  },
                  binding: {
                    kind: "value",
                    value: {
                      ref: {
                        dcid: "country/BRA",
                        label: "Brazil",
                      },
                      value_kind: "entity",
                    },
                  },
                },
                {
                  key: {
                    axis: "when",
                    label: "time window",
                  },
                  binding: {
                    kind: "unbound",
                  },
                },
                {
                  key: {
                    axis: "source",
                    label: "data source",
                  },
                  binding: {
                    kind: "unbound",
                  },
                },
              ],
              inapplicable_slots: ["economicSector"],
              unresolved_slots: [],
              stat_vars: [
                {
                  ref: "Amount_EconomicActivity_GrossDomesticProduction_Nominal",
                  label: "Nominal gross domestic product",
                  slot_values: [
                    {
                      key: {
                        axis: "how",
                        property: {
                          dcid: "activitySource",
                          label: "activitySource",
                        },
                        label: "activity source",
                      },
                      value: {
                        ref: {
                          dcid: "GrossDomesticProduction",
                          label: "GrossDomesticProduction",
                        },
                        value_kind: "enum_value",
                      },
                    },
                  ],
                  data_date_range: {
                    start: "1960",
                    end: "2024",
                  },
                },
              ],
              entities: [
                {
                  ref: "country/BRA",
                  label: "Brazil",
                  entity_type: "Country",
                  role: "observationAbout",
                },
              ],
              coverage: {
                kind: "exact",
                has_data: true,
                observation_count: 65,
                dimensions: [
                  {
                    label: "sources",
                    count: 1,
                  },
                  {
                    label: "observations",
                    count: 65,
                  },
                ],
              },
              facets: {},
              slot_options: [
                {
                  key: {
                    axis: "how",
                    property: {
                      dcid: "activitySource",
                      label: "activitySource",
                    },
                    label: "activity source",
                  },
                  options: [
                    {
                      value: {
                        ref: {
                          dcid: "GrossDomesticProduction",
                          label: "GrossDomesticProduction",
                        },
                        value_kind: "enum_value",
                      },
                      coverage: null,
                    },
                  ],
                  truncated: true,
                  source: "observed",
                },
              ],
              entity_options: [],
              facet_options: [],
              rendered_sentence:
                "Nominal gross domestic product in Brazil, 1960 to 2024, according to World Development Indicators.",
              sentence_plan: [
                {
                  kind: "slot",
                  text: "Nominal gross domestic product",
                  axis: "what",
                  entity_refs: [],
                  distinguishes: true,
                },
                {
                  kind: "slot",
                  text: "",
                  axis: "how",
                  property_dcid: "activitySource",
                  binding_ref: "how:activitySource",
                  entity_refs: [],
                },
                {
                  kind: "slot",
                  text: "",
                  axis: "how",
                  property_dcid: "economicSector",
                  binding_ref: "how:economicSector",
                  entity_refs: [],
                },
                {
                  kind: "text",
                  text: " in ",
                  entity_refs: [],
                },
                {
                  kind: "slot",
                  text: "Brazil",
                  axis: "where",
                  binding_ref: "where:",
                  entity_refs: [],
                },
                {
                  kind: "text",
                  text: ", ",
                  entity_refs: [],
                },
                {
                  kind: "slot",
                  text: "1960 to 2024",
                  axis: "when",
                  binding_ref: "when:",
                  entity_refs: [],
                },
                {
                  kind: "text",
                  text: ", according to ",
                  entity_refs: [],
                },
                {
                  kind: "slot",
                  text: "World Development Indicators",
                  axis: "source",
                  entity_refs: [],
                },
                {
                  kind: "text",
                  text: ".",
                  entity_refs: [],
                },
              ],
              trace: {
                resolved_stat_vars: [
                  {
                    dcid: "Amount_EconomicActivity_GrossDomesticProduction_Nominal",
                    label: "Nominal gross domestic product",
                  },
                ],
                resolved_entities: [
                  {
                    dcid: "country/BRA",
                    label: "Brazil",
                  },
                ],
                resolved_sources: [
                  {
                    dcid: "dc/base/WorldDevelopmentIndicators",
                    label: "WorldDevelopmentIndicators",
                  },
                ],
                slot_filters: [
                  {
                    key: {
                      axis: "how",
                      property: {
                        dcid: "activitySource",
                        label: "activitySource",
                      },
                      label: "activity source",
                    },
                    binding_kind: "value",
                    refs: [
                      {
                        dcid: "GrossDomesticProduction",
                        label: "GrossDomesticProduction",
                      },
                    ],
                  },
                  {
                    key: {
                      axis: "how",
                      property: {
                        dcid: "economicSector",
                        label: "economicSector",
                      },
                      label: "economic sector",
                    },
                    binding_kind: "unbound",
                    refs: [],
                  },
                  {
                    key: {
                      axis: "where",
                      label: "place",
                    },
                    binding_kind: "value",
                    refs: [
                      {
                        dcid: "country/BRA",
                        label: "Brazil",
                      },
                    ],
                  },
                  {
                    key: {
                      axis: "when",
                      label: "time window",
                    },
                    binding_kind: "unbound",
                    refs: [],
                  },
                  {
                    key: {
                      axis: "source",
                      label: "data source",
                    },
                    binding_kind: "unbound",
                    refs: [],
                  },
                ],
                pipeline_trace: [
                  {
                    step: "extract",
                    ran: true,
                    ms: 792,
                  },
                  {
                    step: "recall",
                    ran: true,
                    ms: 643,
                  },
                  {
                    step: "shape",
                    ran: true,
                    ms: 661,
                  },
                  {
                    step: "bind",
                    ran: true,
                    ms: 952,
                  },
                  {
                    step: "materialise",
                    ran: true,
                    ms: 295,
                  },
                ],
                n_recalled: 70,
                capability_version: "cap_1029892a119f7dc4",
              },
              confidence: "high",
              available_at_place: true,
            },
          },
          {
            spec_id: "spec_aac9b0f3b3c528acd649fee3ba4d5ea8",
            definition: {
              schema_version: 1,
              spec_id: "spec_aac9b0f3b3c528acd649fee3ba4d5ea8",
              identity: {
                identity_version: "spec1",
                shape: {
                  kind: "statvar_schema",
                  population_type: "EconomicActivity",
                  measured_property: "amount",
                  stat_type: "measuredValue",
                  measurement_qualifier: "Nominal",
                  measurement_denominator: {
                    unresolved: true,
                  },
                },
                slots: [
                  {
                    property: "activitySource",
                    binding: {
                      state: "value",
                      ref: "GrossDomesticProduction",
                    },
                  },
                ],
                entities: {
                  observationAbout: ["country/BRA"],
                },
                requested_window: {
                  kind: "all",
                },
              },
            },
            resolved: {
              shape: {
                shape_id:
                  "economicactivity_amount_measuredvalue_nominal_per_unresolved",
                label: "Nominal gross domestic product per capita",
                population_type: {
                  dcid: "EconomicActivity",
                  label: "EconomicActivity",
                },
                measured_property: {
                  dcid: "amount",
                  label: "amount",
                },
                stat_type: {
                  dcid: "measuredValue",
                  label: "measuredValue",
                },
                measurement_qualifier: {
                  dcid: "Nominal",
                  label: "Nominal",
                },
                measurement_denominator: {
                  dcid: "PerCapita",
                  label: "PerCapita",
                },
                measurement_denominator_unresolved: true,
                slot_keys: [
                  {
                    axis: "how",
                    property: {
                      dcid: "activitySource",
                      label: "activitySource",
                    },
                    label: "activity source",
                  },
                  {
                    axis: "where",
                    label: "place",
                  },
                  {
                    axis: "when",
                    label: "time window",
                  },
                  {
                    axis: "source",
                    label: "data source",
                  },
                ],
                member_count: 1,
                refine_supported: true,
              },
              slots: [
                {
                  key: {
                    axis: "how",
                    property: {
                      dcid: "activitySource",
                      label: "activitySource",
                    },
                    label: "activity source",
                  },
                  binding: {
                    kind: "value",
                    value: {
                      ref: {
                        dcid: "GrossDomesticProduction",
                        label: "GrossDomesticProduction",
                      },
                      value_kind: "enum_value",
                    },
                  },
                },
                {
                  key: {
                    axis: "where",
                    label: "place",
                  },
                  binding: {
                    kind: "value",
                    value: {
                      ref: {
                        dcid: "country/BRA",
                        label: "Brazil",
                      },
                      value_kind: "entity",
                    },
                  },
                },
                {
                  key: {
                    axis: "when",
                    label: "time window",
                  },
                  binding: {
                    kind: "unbound",
                  },
                },
                {
                  key: {
                    axis: "source",
                    label: "data source",
                  },
                  binding: {
                    kind: "unbound",
                  },
                },
              ],
              inapplicable_slots: [],
              unresolved_slots: [],
              stat_vars: [
                {
                  ref: "Amount_EconomicActivity_GrossDomesticProduction_Nominal_PerCapita",
                  label: "Nominal gross domestic product per capita",
                  slot_values: [
                    {
                      key: {
                        axis: "how",
                        property: {
                          dcid: "activitySource",
                          label: "activitySource",
                        },
                        label: "activity source",
                      },
                      value: {
                        ref: {
                          dcid: "GrossDomesticProduction",
                          label: "GrossDomesticProduction",
                        },
                        value_kind: "enum_value",
                      },
                    },
                  ],
                  data_date_range: {
                    start: "1960",
                    end: "2024",
                  },
                },
              ],
              entities: [
                {
                  ref: "country/BRA",
                  label: "Brazil",
                  entity_type: "Country",
                  role: "observationAbout",
                },
              ],
              coverage: {
                kind: "exact",
                has_data: true,
                observation_count: 65,
                dimensions: [
                  {
                    label: "sources",
                    count: 1,
                  },
                  {
                    label: "observations",
                    count: 65,
                  },
                ],
              },
              facets: {},
              slot_options: [
                {
                  key: {
                    axis: "how",
                    property: {
                      dcid: "activitySource",
                      label: "activitySource",
                    },
                    label: "activity source",
                  },
                  options: [
                    {
                      value: {
                        ref: {
                          dcid: "GrossDomesticProduction",
                          label: "GrossDomesticProduction",
                        },
                        value_kind: "enum_value",
                      },
                      coverage: null,
                    },
                  ],
                  truncated: true,
                  source: "observed",
                },
              ],
              entity_options: [],
              facet_options: [],
              rendered_sentence:
                "Nominal gross domestic product per capita in Brazil, 1960 to 2024, according to World Development Indicators. This is a loose match for your query.",
              sentence_plan: [
                {
                  kind: "slot",
                  text: "Nominal gross domestic product per capita",
                  axis: "what",
                  entity_refs: [],
                  distinguishes: true,
                },
                {
                  kind: "slot",
                  text: "",
                  axis: "how",
                  property_dcid: "activitySource",
                  binding_ref: "how:activitySource",
                  entity_refs: [],
                },
                {
                  kind: "text",
                  text: " in ",
                  entity_refs: [],
                },
                {
                  kind: "slot",
                  text: "Brazil",
                  axis: "where",
                  binding_ref: "where:",
                  entity_refs: [],
                },
                {
                  kind: "text",
                  text: ", ",
                  entity_refs: [],
                },
                {
                  kind: "slot",
                  text: "1960 to 2024",
                  axis: "when",
                  binding_ref: "when:",
                  entity_refs: [],
                },
                {
                  kind: "text",
                  text: ", according to ",
                  entity_refs: [],
                },
                {
                  kind: "slot",
                  text: "World Development Indicators",
                  axis: "source",
                  entity_refs: [],
                },
                {
                  kind: "text",
                  text: ".",
                  entity_refs: [],
                },
                {
                  kind: "note",
                  text: " This is a loose match for your query.",
                  entity_refs: [],
                },
              ],
              trace: {
                resolved_stat_vars: [
                  {
                    dcid: "Amount_EconomicActivity_GrossDomesticProduction_Nominal_PerCapita",
                    label: "Nominal gross domestic product per capita",
                  },
                ],
                resolved_entities: [
                  {
                    dcid: "country/BRA",
                    label: "Brazil",
                  },
                ],
                resolved_sources: [
                  {
                    dcid: "dc/base/WorldDevelopmentIndicators",
                    label: "WorldDevelopmentIndicators",
                  },
                ],
                slot_filters: [
                  {
                    key: {
                      axis: "how",
                      property: {
                        dcid: "activitySource",
                        label: "activitySource",
                      },
                      label: "activity source",
                    },
                    binding_kind: "value",
                    refs: [
                      {
                        dcid: "GrossDomesticProduction",
                        label: "GrossDomesticProduction",
                      },
                    ],
                  },
                  {
                    key: {
                      axis: "where",
                      label: "place",
                    },
                    binding_kind: "value",
                    refs: [
                      {
                        dcid: "country/BRA",
                        label: "Brazil",
                      },
                    ],
                  },
                  {
                    key: {
                      axis: "when",
                      label: "time window",
                    },
                    binding_kind: "unbound",
                    refs: [],
                  },
                  {
                    key: {
                      axis: "source",
                      label: "data source",
                    },
                    binding_kind: "unbound",
                    refs: [],
                  },
                ],
                pipeline_trace: [
                  {
                    step: "extract",
                    ran: true,
                    ms: 792,
                  },
                  {
                    step: "recall",
                    ran: true,
                    ms: 643,
                  },
                  {
                    step: "shape",
                    ran: true,
                    ms: 661,
                  },
                  {
                    step: "bind",
                    ran: true,
                    ms: 952,
                  },
                  {
                    step: "materialise",
                    ran: true,
                    ms: 295,
                  },
                ],
                n_recalled: 70,
                capability_version: "cap_1029892a119f7dc4",
              },
              confidence: "medium",
              available_at_place: true,
            },
          },
        ],
        truncated: false,
      },
    },
  ],
  rendered_sentence:
    "Total population (Brazil, 1940 to June 2026, 6 sources) and GDP.",
  sentence_plan: [
    {
      kind: "slot",
      text: "Total population",
      axis: "what",
      entity_refs: [],
      part_index: 0,
    },
    {
      kind: "slot",
      text: "",
      axis: "how",
      property_dcid: "age",
      binding_ref: "how:age",
      entity_refs: [],
      part_index: 0,
    },
    {
      kind: "slot",
      text: "",
      axis: "how",
      property_dcid: "nativity",
      binding_ref: "how:nativity",
      entity_refs: [],
      part_index: 0,
    },
    {
      kind: "slot",
      text: "",
      axis: "how",
      property_dcid: "employment",
      binding_ref: "how:employment",
      entity_refs: [],
      part_index: 0,
    },
    {
      kind: "slot",
      text: "",
      axis: "how",
      property_dcid: "race",
      binding_ref: "how:race",
      entity_refs: [],
      part_index: 0,
    },
    {
      kind: "slot",
      text: "",
      axis: "how",
      property_dcid: "placeOfResidenceClassification",
      binding_ref: "how:placeOfResidenceClassification",
      entity_refs: [],
      part_index: 0,
    },
    {
      kind: "slot",
      text: "",
      axis: "how",
      property_dcid: "religion",
      binding_ref: "how:religion",
      entity_refs: [],
      part_index: 0,
    },
    {
      kind: "slot",
      text: "",
      axis: "how",
      property_dcid: "literacyStatus",
      binding_ref: "how:literacyStatus",
      entity_refs: [],
      part_index: 0,
    },
    {
      kind: "slot",
      text: "",
      axis: "how",
      property_dcid: "gender",
      binding_ref: "how:gender",
      entity_refs: [],
      part_index: 0,
    },
    {
      kind: "slot",
      text: "",
      axis: "how",
      property_dcid: "residenceType",
      binding_ref: "how:residenceType",
      entity_refs: [],
      part_index: 0,
    },
    {
      kind: "slot",
      text: "",
      axis: "how",
      property_dcid: "educationalAttainment",
      binding_ref: "how:educationalAttainment",
      entity_refs: [],
      part_index: 0,
    },
    {
      kind: "slot",
      text: "",
      axis: "how",
      property_dcid: "placeOfBirth",
      binding_ref: "how:placeOfBirth",
      entity_refs: [],
      part_index: 0,
    },
    {
      kind: "slot",
      text: "",
      axis: "how",
      property_dcid: "armedForcesStatus",
      binding_ref: "how:armedForcesStatus",
      entity_refs: [],
      part_index: 0,
    },
    {
      kind: "text",
      text: " (",
      entity_refs: [],
      part_index: 0,
    },
    {
      kind: "slot",
      text: "Brazil",
      axis: "where",
      binding_ref: "where:",
      entity_refs: [],
      part_index: 0,
    },
    {
      kind: "text",
      text: ", ",
      entity_refs: [],
      part_index: 0,
    },
    {
      kind: "slot",
      text: "1940 to June 2026",
      axis: "when",
      binding_ref: "when:",
      entity_refs: [],
      part_index: 0,
    },
    {
      kind: "text",
      text: ", ",
      entity_refs: [],
      part_index: 0,
    },
    {
      kind: "slot",
      text: "6 sources",
      axis: "source",
      entity_refs: [],
      part_index: 0,
    },
    {
      kind: "text",
      text: ")",
      entity_refs: [],
      part_index: 0,
    },
    {
      kind: "text",
      text: " and ",
      entity_refs: [],
    },
    {
      kind: "slot",
      text: "GDP",
      axis: "what",
      entity_refs: [],
      part_index: 1,
    },
    {
      kind: "text",
      text: ".",
      entity_refs: [],
    },
  ],
  status: "mixed",
};

/**
 * Real `dataset_resubmit` capture: resubmitting both parts of
 * partsComposedBrazil's envelope ("population and GDP in Brazil") through the
 * dataset door — an `identity` entry for the definite population part
 * (its own current identity posted as both `identity` and `base_identity`)
 * and a `candidates` entry for the still-unresolved GDP part, built the same
 * way `buildDatasetEntries` builds them. Envelope status stays "mixed";
 * `query_echo.entry_path` reads "dataset_resubmit"; both parts carry
 * `restatement: null`, since neither an `identity` nor a `candidates` entry
 * has a phrase to restate (only a `parsed` entry gets one back, out of scope
 * this wave). Population's observations arrived on the door's trailing SSE
 * `observations` event, not inline on the `response` event, and are merged
 * in here trimmed to 3 points; `total_obs` (65) is left at its real value.
 * Captured on engine build fd00bba (dev, 2026-09-08): GDP's unresolved
 * outcome now brackets its slot token instead of trailing it — the plan
 * reads "Multiple options for GDP, select one." as three `part_index: 1`
 * tokens, a text before the slot, the `what` slot itself, then a text after.
 */
export const partsDatasetResubmitBrazil = {
  "schema_version": 1,
  "query_echo": {
    "entry_path": "dataset_resubmit",
    "raw_query": "population and GDP in Brazil",
    "extract_skipped": true
  },
  "diagnostics": {
    "engine_build": "fd00bba891d12f8148c5bc7863c95e58f4a4756f",
    "trace_id": "af08d20510ff45edbb9380004916adcc",
    "warnings": [],
    "timing_ms": {
      "total": 2316
    }
  },
  "parts": [
    {
      "variable_text": "population",
      "warnings": [
        {
          "code": "axis_admitted_unconfirmed",
          "severity": "warn",
          "message": "'educationalAttainment' was admitted with no confirmed sample values: its own family page was truncated before any exact-family member confirmed or refused it."
        }
      ],
      "timing_ms": {
        "total": 83,
        "by_step": {
          "materialise": 1,
          "answer": 82,
          "options": 0
        }
      },
      "status": "definite",
      "spec": {
        "spec_id": "spec_1e81b575d2df5f8a5e120c895fc45ba8",
        "definition": {
          "schema_version": 1,
          "spec_id": "spec_1e81b575d2df5f8a5e120c895fc45ba8",
          "identity": {
            "identity_version": "spec1",
            "shape": {
              "kind": "statvar_schema",
              "population_type": "Person",
              "measured_property": "count",
              "stat_type": "measuredValue"
            },
            "slots": [
              {
                "property": "age",
                "binding": {
                  "state": "unbound"
                }
              },
              {
                "property": "nativity",
                "binding": {
                  "state": "unbound"
                }
              },
              {
                "property": "employment",
                "binding": {
                  "state": "unbound"
                }
              },
              {
                "property": "race",
                "binding": {
                  "state": "unbound"
                }
              },
              {
                "property": "placeOfResidenceClassification",
                "binding": {
                  "state": "unbound"
                }
              },
              {
                "property": "religion",
                "binding": {
                  "state": "unbound"
                }
              },
              {
                "property": "literacyStatus",
                "binding": {
                  "state": "unbound"
                }
              },
              {
                "property": "gender",
                "binding": {
                  "state": "unbound"
                }
              },
              {
                "property": "residenceType",
                "binding": {
                  "state": "unbound"
                }
              },
              {
                "property": "educationalAttainment",
                "binding": {
                  "state": "unbound"
                }
              },
              {
                "property": "placeOfBirth",
                "binding": {
                  "state": "unbound"
                }
              },
              {
                "property": "armedForcesStatus",
                "binding": {
                  "state": "unbound"
                }
              }
            ],
            "entities": {
              "observationAbout": [
                "country/BRA"
              ]
            },
            "requested_window": {
              "kind": "all"
            }
          }
        },
        "resolved": {
          "shape": {
            "shape_id": "person_count_measuredvalue",
            "label": "person_count_measuredvalue",
            "population_type": {
              "dcid": "Person",
              "label": "Person"
            },
            "measured_property": {
              "dcid": "count",
              "label": "count"
            },
            "stat_type": {
              "dcid": "measuredValue",
              "label": "measuredValue"
            },
            "measurement_denominator_unresolved": false,
            "slot_keys": [
              {
                "axis": "how",
                "property": {
                  "dcid": "age",
                  "label": "age"
                },
                "label": "age"
              },
              {
                "axis": "how",
                "property": {
                  "dcid": "nativity",
                  "label": "nativity"
                },
                "label": "nativity"
              },
              {
                "axis": "how",
                "property": {
                  "dcid": "employment",
                  "label": "employment"
                },
                "label": "employment"
              },
              {
                "axis": "how",
                "property": {
                  "dcid": "race",
                  "label": "race"
                },
                "label": "race"
              },
              {
                "axis": "how",
                "property": {
                  "dcid": "placeOfResidenceClassification",
                  "label": "placeOfResidenceClassification"
                },
                "label": "place of residence classification"
              },
              {
                "axis": "how",
                "property": {
                  "dcid": "religion",
                  "label": "religion"
                },
                "label": "religion"
              },
              {
                "axis": "how",
                "property": {
                  "dcid": "literacyStatus",
                  "label": "literacyStatus"
                },
                "label": "literacy status"
              },
              {
                "axis": "how",
                "property": {
                  "dcid": "gender",
                  "label": "gender"
                },
                "label": "gender"
              },
              {
                "axis": "how",
                "property": {
                  "dcid": "residenceType",
                  "label": "residenceType"
                },
                "label": "residence type"
              },
              {
                "axis": "how",
                "property": {
                  "dcid": "educationalAttainment",
                  "label": "educationalAttainment"
                },
                "label": "educational attainment"
              },
              {
                "axis": "how",
                "property": {
                  "dcid": "placeOfBirth",
                  "label": "placeOfBirth"
                },
                "label": "place of birth"
              },
              {
                "axis": "how",
                "property": {
                  "dcid": "armedForcesStatus",
                  "label": "armedForcesStatus"
                },
                "label": "armed forces status"
              },
              {
                "axis": "where",
                "label": "place"
              },
              {
                "axis": "when",
                "label": "time window"
              },
              {
                "axis": "source",
                "label": "data source"
              }
            ],
            "member_count": 1,
            "refine_supported": true
          },
          "slots": [
            {
              "key": {
                "axis": "how",
                "property": {
                  "dcid": "age",
                  "label": "age"
                },
                "label": "age"
              },
              "binding": {
                "kind": "unbound"
              }
            },
            {
              "key": {
                "axis": "how",
                "property": {
                  "dcid": "nativity",
                  "label": "nativity"
                },
                "label": "nativity"
              },
              "binding": {
                "kind": "unbound"
              }
            },
            {
              "key": {
                "axis": "how",
                "property": {
                  "dcid": "employment",
                  "label": "employment"
                },
                "label": "employment"
              },
              "binding": {
                "kind": "unbound"
              }
            },
            {
              "key": {
                "axis": "how",
                "property": {
                  "dcid": "race",
                  "label": "race"
                },
                "label": "race"
              },
              "binding": {
                "kind": "unbound"
              }
            },
            {
              "key": {
                "axis": "how",
                "property": {
                  "dcid": "placeOfResidenceClassification",
                  "label": "placeOfResidenceClassification"
                },
                "label": "place of residence classification"
              },
              "binding": {
                "kind": "unbound"
              }
            },
            {
              "key": {
                "axis": "how",
                "property": {
                  "dcid": "religion",
                  "label": "religion"
                },
                "label": "religion"
              },
              "binding": {
                "kind": "unbound"
              }
            },
            {
              "key": {
                "axis": "how",
                "property": {
                  "dcid": "literacyStatus",
                  "label": "literacyStatus"
                },
                "label": "literacy status"
              },
              "binding": {
                "kind": "unbound"
              }
            },
            {
              "key": {
                "axis": "how",
                "property": {
                  "dcid": "gender",
                  "label": "gender"
                },
                "label": "gender"
              },
              "binding": {
                "kind": "unbound"
              }
            },
            {
              "key": {
                "axis": "how",
                "property": {
                  "dcid": "residenceType",
                  "label": "residenceType"
                },
                "label": "residence type"
              },
              "binding": {
                "kind": "unbound"
              }
            },
            {
              "key": {
                "axis": "how",
                "property": {
                  "dcid": "educationalAttainment",
                  "label": "educationalAttainment"
                },
                "label": "educational attainment"
              },
              "binding": {
                "kind": "unbound"
              }
            },
            {
              "key": {
                "axis": "how",
                "property": {
                  "dcid": "placeOfBirth",
                  "label": "placeOfBirth"
                },
                "label": "place of birth"
              },
              "binding": {
                "kind": "unbound"
              }
            },
            {
              "key": {
                "axis": "how",
                "property": {
                  "dcid": "armedForcesStatus",
                  "label": "armedForcesStatus"
                },
                "label": "armed forces status"
              },
              "binding": {
                "kind": "unbound"
              }
            },
            {
              "key": {
                "axis": "where",
                "label": "place"
              },
              "binding": {
                "kind": "value",
                "value": {
                  "ref": {
                    "dcid": "country/BRA",
                    "label": "Brazil"
                  },
                  "value_kind": "entity"
                }
              }
            },
            {
              "key": {
                "axis": "when",
                "label": "time window"
              },
              "binding": {
                "kind": "unbound"
              }
            },
            {
              "key": {
                "axis": "source",
                "label": "data source"
              },
              "binding": {
                "kind": "unbound"
              }
            }
          ],
          "inapplicable_slots": [
            "age",
            "nativity",
            "employment",
            "race",
            "placeOfResidenceClassification",
            "religion",
            "literacyStatus",
            "gender",
            "residenceType",
            "educationalAttainment",
            "placeOfBirth",
            "armedForcesStatus"
          ],
          "unresolved_slots": [],
          "stat_vars": [
            {
              "ref": "Count_Person",
              "label": "Total population",
              "slot_values": [],
              "data_date_range": {
                "start": "1940",
                "end": "2026-06"
              }
            }
          ],
          "entities": [
            {
              "ref": "country/BRA",
              "label": "Brazil",
              "entity_type": "Country",
              "role": "observationAbout"
            }
          ],
          "coverage": {
            "kind": "exact",
            "has_data": true,
            "observation_count": 188,
            "dimensions": [
              {
                "label": "sources",
                "count": 6
              },
              {
                "label": "observations",
                "count": 65
              }
            ]
          },
          "facets": {
            "provenance": {
              "basis": "fallback",
              "ref": "dc/base/WorldDevelopmentIndicators",
              "label": "WorldDevelopmentIndicators"
            }
          },
          "slot_options": [
            {
              "key": {
                "axis": "how",
                "property": {
                  "dcid": "age",
                  "label": "age"
                },
                "label": "age"
              },
              "options": [
                {
                  "value": {
                    "ref": {
                      "dcid": "Years0To15",
                      "label": "Years 0 To 15"
                    },
                    "value_kind": "enum_value"
                  },
                  "coverage": null
                },
                {
                  "value": {
                    "ref": {
                      "dcid": "Years0To16",
                      "label": "Years 0 To 16"
                    },
                    "value_kind": "enum_value"
                  },
                  "coverage": null
                },
                {
                  "value": {
                    "ref": {
                      "dcid": "Years0To17",
                      "label": "Years 0 To 17"
                    },
                    "value_kind": "enum_value"
                  },
                  "coverage": null
                }
              ],
              "truncated": true,
              "source": "observed"
            },
            {
              "key": {
                "axis": "how",
                "property": {
                  "dcid": "nativity",
                  "label": "nativity"
                },
                "label": "nativity"
              },
              "options": [
                {
                  "value": {
                    "ref": {
                      "dcid": "USC_ForeignBorn",
                      "label": "USC_ForeignBorn"
                    },
                    "value_kind": "enum_value"
                  },
                  "coverage": null
                },
                {
                  "value": {
                    "ref": {
                      "dcid": "USC_Native",
                      "label": "USC_Native"
                    },
                    "value_kind": "enum_value"
                  },
                  "coverage": null
                }
              ],
              "truncated": true,
              "source": "observed"
            },
            {
              "key": {
                "axis": "how",
                "property": {
                  "dcid": "employment",
                  "label": "employment"
                },
                "label": "employment"
              },
              "options": [
                {
                  "value": {
                    "ref": {
                      "dcid": "BLS_Employed",
                      "label": "BLS_Employed"
                    },
                    "value_kind": "enum_value"
                  },
                  "coverage": null
                },
                {
                  "value": {
                    "ref": {
                      "dcid": "USC_EmployedAndWorking",
                      "label": "USC_EmployedAndWorking"
                    },
                    "value_kind": "enum_value"
                  },
                  "coverage": null
                },
                {
                  "value": {
                    "ref": {
                      "dcid": "BLS_Unemployed",
                      "label": "BLS_Unemployed"
                    },
                    "value_kind": "enum_value"
                  },
                  "coverage": null
                }
              ],
              "truncated": true,
              "source": "observed"
            },
            {
              "key": {
                "axis": "how",
                "property": {
                  "dcid": "race",
                  "label": "race"
                },
                "label": "race"
              },
              "options": [
                {
                  "value": {
                    "ref": {
                      "dcid": "AmericanIndianAndAlaskaNativeAlone",
                      "label": "AmericanIndianAndAlaskaNativeAlone"
                    },
                    "value_kind": "enum_value"
                  },
                  "coverage": null
                },
                {
                  "value": {
                    "ref": {
                      "dcid": "AmericanIndianAndAlaskaNativeAloneOrInCombinationWithOneOrMoreOtherRaces",
                      "label": "AmericanIndianAndAlaskaNativeAloneOrInCombinationWithOneOrMoreOtherRaces"
                    },
                    "value_kind": "enum_value"
                  },
                  "coverage": null
                },
                {
                  "value": {
                    "ref": {
                      "dcid": "AsianAlone",
                      "label": "AsianAlone"
                    },
                    "value_kind": "enum_value"
                  },
                  "coverage": null
                },
                {
                  "value": {
                    "ref": {
                      "dcid": "AsianOrPacificIslander",
                      "label": "AsianOrPacificIslander"
                    },
                    "value_kind": "enum_value"
                  },
                  "coverage": null
                },
                {
                  "value": {
                    "ref": {
                      "dcid": "BlackAfrican",
                      "label": "BlackAfrican"
                    },
                    "value_kind": "enum_value"
                  },
                  "coverage": null
                },
                {
                  "value": {
                    "ref": {
                      "dcid": "BlackOrAfricanAmericanAlone",
                      "label": "BlackOrAfricanAmericanAlone"
                    },
                    "value_kind": "enum_value"
                  },
                  "coverage": null
                },
                {
                  "value": {
                    "ref": {
                      "dcid": "BlackOrAfricanAmericanAloneOrInCombinationWithOneOrMoreOtherRaces",
                      "label": "BlackOrAfricanAmericanAloneOrInCombinationWithOneOrMoreOtherRaces"
                    },
                    "value_kind": "enum_value"
                  },
                  "coverage": null
                },
                {
                  "value": {
                    "ref": {
                      "dcid": "AsianAloneOrInCombinationWithOneOrMoreOtherRaces",
                      "label": "AsianAloneOrInCombinationWithOneOrMoreOtherRaces"
                    },
                    "value_kind": "enum_value"
                  },
                  "coverage": null
                },
                {
                  "value": {
                    "ref": {
                      "dcid": "HispanicOrLatino",
                      "label": "HispanicOrLatino"
                    },
                    "value_kind": "enum_value"
                  },
                  "coverage": null
                },
                {
                  "value": {
                    "ref": {
                      "dcid": "NativeHawaiianAndOtherPacificIslanderAlone",
                      "label": "NativeHawaiianAndOtherPacificIslanderAlone"
                    },
                    "value_kind": "enum_value"
                  },
                  "coverage": null
                },
                {
                  "value": {
                    "ref": {
                      "dcid": "NativeHawaiianAndOtherPacificIslanderAloneOrInCombinationWithOneOrMoreOtherRaces",
                      "label": "NativeHawaiianAndOtherPacificIslanderAloneOrInCombinationWithOneOrMoreOtherRaces"
                    },
                    "value_kind": "enum_value"
                  },
                  "coverage": null
                },
                {
                  "value": {
                    "ref": {
                      "dcid": "NotHispanicOrLatino",
                      "label": "NotHispanicOrLatino"
                    },
                    "value_kind": "enum_value"
                  },
                  "coverage": null
                },
                {
                  "value": {
                    "ref": {
                      "dcid": "WhiteAlone",
                      "label": "WhiteAlone"
                    },
                    "value_kind": "enum_value"
                  },
                  "coverage": null
                },
                {
                  "value": {
                    "ref": {
                      "dcid": "SouthAfrica_Coloured",
                      "label": "SouthAfrica_Coloured"
                    },
                    "value_kind": "enum_value"
                  },
                  "coverage": null
                },
                {
                  "value": {
                    "ref": {
                      "dcid": "TwoOrMoreRaces",
                      "label": "TwoOrMoreRaces"
                    },
                    "value_kind": "enum_value"
                  },
                  "coverage": null
                },
                {
                  "value": {
                    "ref": {
                      "dcid": "White",
                      "label": "White"
                    },
                    "value_kind": "enum_value"
                  },
                  "coverage": null
                },
                {
                  "value": {
                    "ref": {
                      "dcid": "WhiteAloneNotHispanicOrLatino",
                      "label": "WhiteAloneNotHispanicOrLatino"
                    },
                    "value_kind": "enum_value"
                  },
                  "coverage": null
                },
                {
                  "value": {
                    "ref": {
                      "dcid": "WhiteAloneOrInCombinationWithOneOrMoreOtherRaces",
                      "label": "WhiteAloneOrInCombinationWithOneOrMoreOtherRaces"
                    },
                    "value_kind": "enum_value"
                  },
                  "coverage": null
                }
              ],
              "truncated": true,
              "source": "observed"
            },
            {
              "key": {
                "axis": "how",
                "property": {
                  "dcid": "placeOfResidenceClassification",
                  "label": "placeOfResidenceClassification"
                },
                "label": "place of residence classification"
              },
              "options": [
                {
                  "value": {
                    "ref": {
                      "dcid": "Rural",
                      "label": "Rural"
                    },
                    "value_kind": "enum_value"
                  },
                  "coverage": null
                },
                {
                  "value": {
                    "ref": {
                      "dcid": "Urban",
                      "label": "Urban"
                    },
                    "value_kind": "enum_value"
                  },
                  "coverage": null
                }
              ],
              "truncated": true,
              "source": "observed"
            },
            {
              "key": {
                "axis": "how",
                "property": {
                  "dcid": "religion",
                  "label": "religion"
                },
                "label": "religion"
              },
              "options": [
                {
                  "value": {
                    "ref": {
                      "dcid": "Catholicism",
                      "label": "Catholicism"
                    },
                    "value_kind": "enum_value"
                  },
                  "coverage": null
                },
                {
                  "value": {
                    "ref": {
                      "dcid": "INEGI_ReligionOtherThanCatholicism",
                      "label": "Mexico Religion Other than Catholicism"
                    },
                    "value_kind": "enum_value"
                  },
                  "coverage": null
                },
                {
                  "value": {
                    "ref": {
                      "dcid": "Irreligion",
                      "label": "Irreligion"
                    },
                    "value_kind": "enum_value"
                  },
                  "coverage": null
                }
              ],
              "truncated": true,
              "source": "observed"
            },
            {
              "key": {
                "axis": "how",
                "property": {
                  "dcid": "literacyStatus",
                  "label": "literacyStatus"
                },
                "label": "literacy status"
              },
              "options": [
                {
                  "value": {
                    "ref": {
                      "dcid": "Illiterate",
                      "label": "Illiterate"
                    },
                    "value_kind": "enum_value"
                  },
                  "coverage": null
                },
                {
                  "value": {
                    "ref": {
                      "dcid": "Literate",
                      "label": "Literate"
                    },
                    "value_kind": "enum_value"
                  },
                  "coverage": null
                }
              ],
              "truncated": true,
              "source": "observed"
            },
            {
              "key": {
                "axis": "how",
                "property": {
                  "dcid": "gender",
                  "label": "gender"
                },
                "label": "gender"
              },
              "options": [
                {
                  "value": {
                    "ref": {
                      "dcid": "Female",
                      "label": "Female"
                    },
                    "value_kind": "enum_value"
                  },
                  "coverage": null
                },
                {
                  "value": {
                    "ref": {
                      "dcid": "Male",
                      "label": "Male"
                    },
                    "value_kind": "enum_value"
                  },
                  "coverage": null
                }
              ],
              "truncated": true,
              "source": "observed"
            },
            {
              "key": {
                "axis": "how",
                "property": {
                  "dcid": "residenceType",
                  "label": "residenceType"
                },
                "label": "residence type"
              },
              "options": [
                {
                  "value": {
                    "ref": {
                      "dcid": "AdultCorrectionalFacilities",
                      "label": "AdultCorrectionalFacilities"
                    },
                    "value_kind": "enum_value"
                  },
                  "coverage": null
                },
                {
                  "value": {
                    "ref": {
                      "dcid": "CollegeOrUniversityStudentHousing",
                      "label": "CollegeOrUniversityStudentHousing"
                    },
                    "value_kind": "enum_value"
                  },
                  "coverage": null
                },
                {
                  "value": {
                    "ref": {
                      "dcid": "GroupQuarters",
                      "label": "GroupQuarters"
                    },
                    "value_kind": "enum_value"
                  },
                  "coverage": null
                },
                {
                  "value": {
                    "ref": {
                      "dcid": "InstitutionalizedGroupQuarters",
                      "label": "InstitutionalizedGroupQuarters"
                    },
                    "value_kind": "enum_value"
                  },
                  "coverage": null
                },
                {
                  "value": {
                    "ref": {
                      "dcid": "JuvenileFacilities",
                      "label": "JuvenileFacilities"
                    },
                    "value_kind": "enum_value"
                  },
                  "coverage": null
                },
                {
                  "value": {
                    "ref": {
                      "dcid": "MilitaryQuartersOrMilitaryShips",
                      "label": "MilitaryQuartersOrMilitaryShips"
                    },
                    "value_kind": "enum_value"
                  },
                  "coverage": null
                },
                {
                  "value": {
                    "ref": {
                      "dcid": "NoninstitutionalizedGroupQuarters",
                      "label": "NoninstitutionalizedGroupQuarters"
                    },
                    "value_kind": "enum_value"
                  },
                  "coverage": null
                },
                {
                  "value": {
                    "ref": {
                      "dcid": "NursingFacilities",
                      "label": "NursingFacilities"
                    },
                    "value_kind": "enum_value"
                  },
                  "coverage": null
                },
                {
                  "value": {
                    "ref": {
                      "dcid": "HousingUnit",
                      "label": "HousingUnit"
                    },
                    "value_kind": "enum_value"
                  },
                  "coverage": null
                }
              ],
              "truncated": true,
              "source": "observed"
            },
            {
              "key": {
                "axis": "how",
                "property": {
                  "dcid": "placeOfBirth",
                  "label": "placeOfBirth"
                },
                "label": "place of birth"
              },
              "options": [
                {
                  "value": {
                    "ref": {
                      "dcid": "africa",
                      "label": "Africa"
                    },
                    "value_kind": "enum_value"
                  },
                  "coverage": null
                },
                {
                  "value": {
                    "ref": {
                      "dcid": "asia",
                      "label": "Asia"
                    },
                    "value_kind": "enum_value"
                  },
                  "coverage": null
                },
                {
                  "value": {
                    "ref": {
                      "dcid": "Caribbean",
                      "label": "Caribbean"
                    },
                    "value_kind": "enum_value"
                  },
                  "coverage": null
                },
                {
                  "value": {
                    "ref": {
                      "dcid": "CentralAmericaExceptMexico",
                      "label": "Central America"
                    },
                    "value_kind": "enum_value"
                  },
                  "coverage": null
                },
                {
                  "value": {
                    "ref": {
                      "dcid": "EasternAsia",
                      "label": "Eastern Asia"
                    },
                    "value_kind": "enum_value"
                  },
                  "coverage": null
                },
                {
                  "value": {
                    "ref": {
                      "dcid": "europe",
                      "label": "Europe"
                    },
                    "value_kind": "enum_value"
                  },
                  "coverage": null
                },
                {
                  "value": {
                    "ref": {
                      "dcid": "LatinAmerica",
                      "label": "Latin America"
                    },
                    "value_kind": "enum_value"
                  },
                  "coverage": null
                },
                {
                  "value": {
                    "ref": {
                      "dcid": "country/MEX",
                      "label": "Mexico"
                    },
                    "value_kind": "enum_value"
                  },
                  "coverage": null
                },
                {
                  "value": {
                    "ref": {
                      "dcid": "northamerica",
                      "label": "North America"
                    },
                    "value_kind": "enum_value"
                  },
                  "coverage": null
                },
                {
                  "value": {
                    "ref": {
                      "dcid": "NorthernWesternEurope",
                      "label": "Northern and Western Europe"
                    },
                    "value_kind": "enum_value"
                  },
                  "coverage": null
                },
                {
                  "value": {
                    "ref": {
                      "dcid": "oceania",
                      "label": "Oceania"
                    },
                    "value_kind": "enum_value"
                  },
                  "coverage": null
                },
                {
                  "value": {
                    "ref": {
                      "dcid": "SouthCentralAsia",
                      "label": "South Central Asia"
                    },
                    "value_kind": "enum_value"
                  },
                  "coverage": null
                },
                {
                  "value": {
                    "ref": {
                      "dcid": "SouthEasternAsia",
                      "label": "South-Eastern Asia"
                    },
                    "value_kind": "enum_value"
                  },
                  "coverage": null
                },
                {
                  "value": {
                    "ref": {
                      "dcid": "southamerica",
                      "label": "South America"
                    },
                    "value_kind": "enum_value"
                  },
                  "coverage": null
                },
                {
                  "value": {
                    "ref": {
                      "dcid": "SouthernEasternEurope",
                      "label": "Southern and Eastern Europe"
                    },
                    "value_kind": "enum_value"
                  },
                  "coverage": null
                },
                {
                  "value": {
                    "ref": {
                      "dcid": "WesternAsia",
                      "label": "Western Asia"
                    },
                    "value_kind": "enum_value"
                  },
                  "coverage": null
                },
                {
                  "value": {
                    "ref": {
                      "dcid": "BornInOtherStateInTheUnitedStates",
                      "label": "BornInOtherStateInTheUnitedStates"
                    },
                    "value_kind": "enum_value"
                  },
                  "coverage": null
                },
                {
                  "value": {
                    "ref": {
                      "dcid": "BornInStateOfResidence",
                      "label": "BornInStateOfResidence"
                    },
                    "value_kind": "enum_value"
                  },
                  "coverage": null
                },
                {
                  "value": {
                    "ref": {
                      "dcid": "ForeignBorn",
                      "label": "ForeignBorn"
                    },
                    "value_kind": "enum_value"
                  },
                  "coverage": null
                }
              ],
              "truncated": true,
              "source": "observed"
            },
            {
              "key": {
                "axis": "how",
                "property": {
                  "dcid": "armedForcesStatus",
                  "label": "armedForcesStatus"
                },
                "label": "armed forces status"
              },
              "options": [
                {
                  "value": {
                    "ref": {
                      "dcid": "Civilian",
                      "label": "Civilian"
                    },
                    "value_kind": "enum_value"
                  },
                  "coverage": null
                }
              ],
              "truncated": true,
              "source": "observed"
            }
          ],
          "entity_options": [],
          "facet_options": [],
          "rendered_sentence": "Total population in Brazil, 1940 to June 2026, according to 6 sources.",
          "sentence_plan": [
            {
              "kind": "slot",
              "text": "Total population",
              "axis": "what",
              "entity_refs": []
            },
            {
              "kind": "slot",
              "text": "",
              "axis": "how",
              "property_dcid": "age",
              "binding_ref": "how:age",
              "entity_refs": []
            },
            {
              "kind": "slot",
              "text": "",
              "axis": "how",
              "property_dcid": "nativity",
              "binding_ref": "how:nativity",
              "entity_refs": []
            },
            {
              "kind": "slot",
              "text": "",
              "axis": "how",
              "property_dcid": "employment",
              "binding_ref": "how:employment",
              "entity_refs": []
            },
            {
              "kind": "slot",
              "text": "",
              "axis": "how",
              "property_dcid": "race",
              "binding_ref": "how:race",
              "entity_refs": []
            },
            {
              "kind": "slot",
              "text": "",
              "axis": "how",
              "property_dcid": "placeOfResidenceClassification",
              "binding_ref": "how:placeOfResidenceClassification",
              "entity_refs": []
            },
            {
              "kind": "slot",
              "text": "",
              "axis": "how",
              "property_dcid": "religion",
              "binding_ref": "how:religion",
              "entity_refs": []
            },
            {
              "kind": "slot",
              "text": "",
              "axis": "how",
              "property_dcid": "literacyStatus",
              "binding_ref": "how:literacyStatus",
              "entity_refs": []
            },
            {
              "kind": "slot",
              "text": "",
              "axis": "how",
              "property_dcid": "gender",
              "binding_ref": "how:gender",
              "entity_refs": []
            },
            {
              "kind": "slot",
              "text": "",
              "axis": "how",
              "property_dcid": "residenceType",
              "binding_ref": "how:residenceType",
              "entity_refs": []
            },
            {
              "kind": "slot",
              "text": "",
              "axis": "how",
              "property_dcid": "educationalAttainment",
              "binding_ref": "how:educationalAttainment",
              "entity_refs": []
            },
            {
              "kind": "slot",
              "text": "",
              "axis": "how",
              "property_dcid": "placeOfBirth",
              "binding_ref": "how:placeOfBirth",
              "entity_refs": []
            },
            {
              "kind": "slot",
              "text": "",
              "axis": "how",
              "property_dcid": "armedForcesStatus",
              "binding_ref": "how:armedForcesStatus",
              "entity_refs": []
            },
            {
              "kind": "text",
              "text": " in ",
              "entity_refs": []
            },
            {
              "kind": "slot",
              "text": "Brazil",
              "axis": "where",
              "binding_ref": "where:",
              "entity_refs": []
            },
            {
              "kind": "text",
              "text": ", ",
              "entity_refs": []
            },
            {
              "kind": "slot",
              "text": "1940 to June 2026",
              "axis": "when",
              "binding_ref": "when:",
              "entity_refs": []
            },
            {
              "kind": "text",
              "text": ", according to ",
              "entity_refs": []
            },
            {
              "kind": "slot",
              "text": "6 sources",
              "axis": "source",
              "entity_refs": []
            },
            {
              "kind": "text",
              "text": ".",
              "entity_refs": []
            }
          ],
          "trace": {
            "resolved_stat_vars": [
              {
                "dcid": "Count_Person",
                "label": "Total population"
              }
            ],
            "resolved_entities": [
              {
                "dcid": "country/BRA",
                "label": "Brazil"
              }
            ],
            "resolved_sources": [
              {
                "dcid": "dc/base/Brazil_SIDRA_IBGE",
                "label": "Brazil_SIDRA_IBGE"
              },
              {
                "dcid": "dc/base/WorldDevelopmentIndicators",
                "label": "WorldDevelopmentIndicators"
              },
              {
                "dcid": "dc/base/WikidataPopulation",
                "label": "WikidataPopulation"
              },
              {
                "dcid": "dc/base/Brazil_Census",
                "label": "Brazil_Census"
              },
              {
                "dcid": "dc/base/OECDRegionalDemography_Population",
                "label": "OECDRegionalDemography_Population"
              },
              {
                "dcid": "dc/base/Subnational_Demographics_Stats",
                "label": "Subnational_Demographics_Stats"
              }
            ],
            "slot_filters": [
              {
                "key": {
                  "axis": "how",
                  "property": {
                    "dcid": "age",
                    "label": "age"
                  },
                  "label": "age"
                },
                "binding_kind": "unbound",
                "refs": []
              },
              {
                "key": {
                  "axis": "how",
                  "property": {
                    "dcid": "nativity",
                    "label": "nativity"
                  },
                  "label": "nativity"
                },
                "binding_kind": "unbound",
                "refs": []
              },
              {
                "key": {
                  "axis": "how",
                  "property": {
                    "dcid": "employment",
                    "label": "employment"
                  },
                  "label": "employment"
                },
                "binding_kind": "unbound",
                "refs": []
              },
              {
                "key": {
                  "axis": "how",
                  "property": {
                    "dcid": "race",
                    "label": "race"
                  },
                  "label": "race"
                },
                "binding_kind": "unbound",
                "refs": []
              },
              {
                "key": {
                  "axis": "how",
                  "property": {
                    "dcid": "placeOfResidenceClassification",
                    "label": "placeOfResidenceClassification"
                  },
                  "label": "place of residence classification"
                },
                "binding_kind": "unbound",
                "refs": []
              },
              {
                "key": {
                  "axis": "how",
                  "property": {
                    "dcid": "religion",
                    "label": "religion"
                  },
                  "label": "religion"
                },
                "binding_kind": "unbound",
                "refs": []
              },
              {
                "key": {
                  "axis": "how",
                  "property": {
                    "dcid": "literacyStatus",
                    "label": "literacyStatus"
                  },
                  "label": "literacy status"
                },
                "binding_kind": "unbound",
                "refs": []
              },
              {
                "key": {
                  "axis": "how",
                  "property": {
                    "dcid": "gender",
                    "label": "gender"
                  },
                  "label": "gender"
                },
                "binding_kind": "unbound",
                "refs": []
              },
              {
                "key": {
                  "axis": "how",
                  "property": {
                    "dcid": "residenceType",
                    "label": "residenceType"
                  },
                  "label": "residence type"
                },
                "binding_kind": "unbound",
                "refs": []
              },
              {
                "key": {
                  "axis": "how",
                  "property": {
                    "dcid": "educationalAttainment",
                    "label": "educationalAttainment"
                  },
                  "label": "educational attainment"
                },
                "binding_kind": "unbound",
                "refs": []
              },
              {
                "key": {
                  "axis": "how",
                  "property": {
                    "dcid": "placeOfBirth",
                    "label": "placeOfBirth"
                  },
                  "label": "place of birth"
                },
                "binding_kind": "unbound",
                "refs": []
              },
              {
                "key": {
                  "axis": "how",
                  "property": {
                    "dcid": "armedForcesStatus",
                    "label": "armedForcesStatus"
                  },
                  "label": "armed forces status"
                },
                "binding_kind": "unbound",
                "refs": []
              },
              {
                "key": {
                  "axis": "where",
                  "label": "place"
                },
                "binding_kind": "value",
                "refs": [
                  {
                    "dcid": "country/BRA",
                    "label": "Brazil"
                  }
                ]
              },
              {
                "key": {
                  "axis": "when",
                  "label": "time window"
                },
                "binding_kind": "unbound",
                "refs": []
              },
              {
                "key": {
                  "axis": "source",
                  "label": "data source"
                },
                "binding_kind": "unbound",
                "refs": []
              }
            ],
            "pipeline_trace": [
              {
                "step": "extract",
                "ran": false
              }
            ],
            "capability_version": "cap_c3e34c2e9e306bbd"
          },
          "confidence": "high",
          "available_at_place": true,
          "observations": {
            "series": [
              {
                "stat_var": {
                  "ref": "Count_Person",
                  "label": "Total population"
                },
                "entities": [
                  {
                    "role": "observationAbout",
                    "ref": "country/BRA",
                    "label": "Brazil"
                  }
                ],
                "points": [
                  {
                    "date": "1960",
                    "value": 72388126.0
                  },
                  {
                    "date": "1961",
                    "value": 74605447.0
                  },
                  {
                    "date": "1962",
                    "value": 76865323.0
                  }
                ],
                "total_obs": 65,
                "source_refs": [
                  {
                    "dcid": "dc/base/WorldDevelopmentIndicators",
                    "label": "WorldDevelopmentIndicators"
                  }
                ],
                "facet": {
                  "provenance": {
                    "ref": "dc/base/WorldDevelopmentIndicators",
                    "label": "WorldDevelopmentIndicators"
                  }
                }
              }
            ],
            "total_obs": 65,
            "truncated": false
          }
        }
      }
    },
    {
      "variable_text": "GDP",
      "warnings": [],
      "timing_ms": {
        "total": 87,
        "by_step": {
          "materialise": 0,
          "answer": 87,
          "options": 0
        }
      },
      "rendered_sentence": "2 possible interpretations. They differ by indicator.",
      "sentence_plan": [
        {
          "kind": "text",
          "text": "2 possible interpretations. They differ by indicator.",
          "entity_refs": []
        }
      ],
      "status": "candidates",
      "candidates": {
        "ordering": "broadest_first",
        "max_candidates": 6,
        "specs": [
          {
            "spec_id": "spec_16acd7d87d8e63f7e8f369b65bed8fbf",
            "definition": {
              "schema_version": 1,
              "spec_id": "spec_16acd7d87d8e63f7e8f369b65bed8fbf",
              "identity": {
                "identity_version": "spec1",
                "shape": {
                  "kind": "statvar_schema",
                  "population_type": "EconomicActivity",
                  "measured_property": "amount",
                  "stat_type": "measuredValue",
                  "measurement_qualifier": "Nominal"
                },
                "slots": [
                  {
                    "property": "activitySource",
                    "binding": {
                      "state": "value",
                      "ref": "GrossDomesticProduction"
                    }
                  }
                ],
                "entities": {
                  "observationAbout": [
                    "country/BRA"
                  ]
                },
                "requested_window": {
                  "kind": "all"
                }
              }
            },
            "resolved": {
              "shape": {
                "shape_id": "economicactivity_amount_measuredvalue_nominal",
                "label": "economicactivity_amount_measuredvalue_nominal",
                "population_type": {
                  "dcid": "EconomicActivity",
                  "label": "EconomicActivity"
                },
                "measured_property": {
                  "dcid": "amount",
                  "label": "amount"
                },
                "stat_type": {
                  "dcid": "measuredValue",
                  "label": "measuredValue"
                },
                "measurement_qualifier": {
                  "dcid": "Nominal",
                  "label": "Nominal"
                },
                "measurement_denominator_unresolved": false,
                "slot_keys": [
                  {
                    "axis": "how",
                    "property": {
                      "dcid": "activitySource",
                      "label": "activitySource"
                    },
                    "label": "activity source"
                  },
                  {
                    "axis": "where",
                    "label": "place"
                  },
                  {
                    "axis": "when",
                    "label": "time window"
                  },
                  {
                    "axis": "source",
                    "label": "data source"
                  }
                ],
                "member_count": 1,
                "refine_supported": true
              },
              "slots": [
                {
                  "key": {
                    "axis": "how",
                    "property": {
                      "dcid": "activitySource",
                      "label": "activitySource"
                    },
                    "label": "activity source"
                  },
                  "binding": {
                    "kind": "value",
                    "value": {
                      "ref": {
                        "dcid": "GrossDomesticProduction",
                        "label": "GrossDomesticProduction"
                      },
                      "value_kind": "enum_value"
                    }
                  }
                },
                {
                  "key": {
                    "axis": "where",
                    "label": "place"
                  },
                  "binding": {
                    "kind": "value",
                    "value": {
                      "ref": {
                        "dcid": "country/BRA",
                        "label": "Brazil"
                      },
                      "value_kind": "entity"
                    }
                  }
                },
                {
                  "key": {
                    "axis": "when",
                    "label": "time window"
                  },
                  "binding": {
                    "kind": "unbound"
                  }
                },
                {
                  "key": {
                    "axis": "source",
                    "label": "data source"
                  },
                  "binding": {
                    "kind": "unbound"
                  }
                }
              ],
              "inapplicable_slots": [],
              "unresolved_slots": [],
              "stat_vars": [
                {
                  "ref": "Amount_EconomicActivity_GrossDomesticProduction_Nominal",
                  "label": "Nominal gross domestic product",
                  "slot_values": [
                    {
                      "key": {
                        "axis": "how",
                        "property": {
                          "dcid": "activitySource",
                          "label": "activitySource"
                        },
                        "label": "activity source"
                      },
                      "value": {
                        "ref": {
                          "dcid": "GrossDomesticProduction",
                          "label": "GrossDomesticProduction"
                        },
                        "value_kind": "enum_value"
                      }
                    }
                  ],
                  "data_date_range": {
                    "start": "1960",
                    "end": "2024"
                  }
                }
              ],
              "entities": [
                {
                  "ref": "country/BRA",
                  "label": "Brazil",
                  "entity_type": "Country",
                  "role": "observationAbout"
                }
              ],
              "coverage": {
                "kind": "exact",
                "has_data": true,
                "observation_count": 65,
                "dimensions": [
                  {
                    "label": "sources",
                    "count": 1
                  },
                  {
                    "label": "observations",
                    "count": 65
                  }
                ]
              },
              "facets": {},
              "slot_options": [
                {
                  "key": {
                    "axis": "how",
                    "property": {
                      "dcid": "activitySource",
                      "label": "activitySource"
                    },
                    "label": "activity source"
                  },
                  "options": [
                    {
                      "value": {
                        "ref": {
                          "dcid": "GrossDomesticProduction",
                          "label": "GrossDomesticProduction"
                        },
                        "value_kind": "enum_value"
                      },
                      "coverage": null
                    }
                  ],
                  "truncated": true,
                  "source": "observed"
                }
              ],
              "entity_options": [],
              "facet_options": [],
              "rendered_sentence": "Nominal gross domestic product in Brazil, 1960 to 2024, according to World Development Indicators.",
              "sentence_plan": [
                {
                  "kind": "slot",
                  "text": "Nominal gross domestic product",
                  "axis": "what",
                  "entity_refs": [],
                  "distinguishes": true
                },
                {
                  "kind": "slot",
                  "text": "",
                  "axis": "how",
                  "property_dcid": "activitySource",
                  "binding_ref": "how:activitySource",
                  "entity_refs": []
                },
                {
                  "kind": "text",
                  "text": " in ",
                  "entity_refs": []
                },
                {
                  "kind": "slot",
                  "text": "Brazil",
                  "axis": "where",
                  "binding_ref": "where:",
                  "entity_refs": []
                },
                {
                  "kind": "text",
                  "text": ", ",
                  "entity_refs": []
                },
                {
                  "kind": "slot",
                  "text": "1960 to 2024",
                  "axis": "when",
                  "binding_ref": "when:",
                  "entity_refs": []
                },
                {
                  "kind": "text",
                  "text": ", according to ",
                  "entity_refs": []
                },
                {
                  "kind": "slot",
                  "text": "World Development Indicators",
                  "axis": "source",
                  "entity_refs": []
                },
                {
                  "kind": "text",
                  "text": ".",
                  "entity_refs": []
                }
              ],
              "trace": {
                "resolved_stat_vars": [
                  {
                    "dcid": "Amount_EconomicActivity_GrossDomesticProduction_Nominal",
                    "label": "Nominal gross domestic product"
                  }
                ],
                "resolved_entities": [
                  {
                    "dcid": "country/BRA",
                    "label": "Brazil"
                  }
                ],
                "resolved_sources": [
                  {
                    "dcid": "dc/base/WorldDevelopmentIndicators",
                    "label": "WorldDevelopmentIndicators"
                  }
                ],
                "slot_filters": [
                  {
                    "key": {
                      "axis": "how",
                      "property": {
                        "dcid": "activitySource",
                        "label": "activitySource"
                      },
                      "label": "activity source"
                    },
                    "binding_kind": "value",
                    "refs": [
                      {
                        "dcid": "GrossDomesticProduction",
                        "label": "GrossDomesticProduction"
                      }
                    ]
                  },
                  {
                    "key": {
                      "axis": "where",
                      "label": "place"
                    },
                    "binding_kind": "value",
                    "refs": [
                      {
                        "dcid": "country/BRA",
                        "label": "Brazil"
                      }
                    ]
                  },
                  {
                    "key": {
                      "axis": "when",
                      "label": "time window"
                    },
                    "binding_kind": "unbound",
                    "refs": []
                  },
                  {
                    "key": {
                      "axis": "source",
                      "label": "data source"
                    },
                    "binding_kind": "unbound",
                    "refs": []
                  }
                ],
                "pipeline_trace": [
                  {
                    "step": "extract",
                    "ran": false
                  }
                ],
                "capability_version": "cap_c3e34c2e9e306bbd"
              },
              "confidence": "high",
              "available_at_place": true
            }
          },
          {
            "spec_id": "spec_aac9b0f3b3c528acd649fee3ba4d5ea8",
            "definition": {
              "schema_version": 1,
              "spec_id": "spec_aac9b0f3b3c528acd649fee3ba4d5ea8",
              "identity": {
                "identity_version": "spec1",
                "shape": {
                  "kind": "statvar_schema",
                  "population_type": "EconomicActivity",
                  "measured_property": "amount",
                  "stat_type": "measuredValue",
                  "measurement_qualifier": "Nominal",
                  "measurement_denominator": {
                    "unresolved": true
                  }
                },
                "slots": [
                  {
                    "property": "activitySource",
                    "binding": {
                      "state": "value",
                      "ref": "GrossDomesticProduction"
                    }
                  }
                ],
                "entities": {
                  "observationAbout": [
                    "country/BRA"
                  ]
                },
                "requested_window": {
                  "kind": "all"
                }
              }
            },
            "resolved": {
              "shape": {
                "shape_id": "economicactivity_amount_measuredvalue_nominal_per_unresolved",
                "label": "economicactivity_amount_measuredvalue_nominal_per_unresolved",
                "population_type": {
                  "dcid": "EconomicActivity",
                  "label": "EconomicActivity"
                },
                "measured_property": {
                  "dcid": "amount",
                  "label": "amount"
                },
                "stat_type": {
                  "dcid": "measuredValue",
                  "label": "measuredValue"
                },
                "measurement_qualifier": {
                  "dcid": "Nominal",
                  "label": "Nominal"
                },
                "measurement_denominator": {
                  "dcid": "PerCapita",
                  "label": "PerCapita"
                },
                "measurement_denominator_unresolved": true,
                "slot_keys": [
                  {
                    "axis": "how",
                    "property": {
                      "dcid": "activitySource",
                      "label": "activitySource"
                    },
                    "label": "activity source"
                  },
                  {
                    "axis": "where",
                    "label": "place"
                  },
                  {
                    "axis": "when",
                    "label": "time window"
                  },
                  {
                    "axis": "source",
                    "label": "data source"
                  }
                ],
                "member_count": 1,
                "refine_supported": true
              },
              "slots": [
                {
                  "key": {
                    "axis": "how",
                    "property": {
                      "dcid": "activitySource",
                      "label": "activitySource"
                    },
                    "label": "activity source"
                  },
                  "binding": {
                    "kind": "value",
                    "value": {
                      "ref": {
                        "dcid": "GrossDomesticProduction",
                        "label": "GrossDomesticProduction"
                      },
                      "value_kind": "enum_value"
                    }
                  }
                },
                {
                  "key": {
                    "axis": "where",
                    "label": "place"
                  },
                  "binding": {
                    "kind": "value",
                    "value": {
                      "ref": {
                        "dcid": "country/BRA",
                        "label": "Brazil"
                      },
                      "value_kind": "entity"
                    }
                  }
                },
                {
                  "key": {
                    "axis": "when",
                    "label": "time window"
                  },
                  "binding": {
                    "kind": "unbound"
                  }
                },
                {
                  "key": {
                    "axis": "source",
                    "label": "data source"
                  },
                  "binding": {
                    "kind": "unbound"
                  }
                }
              ],
              "inapplicable_slots": [],
              "unresolved_slots": [],
              "stat_vars": [
                {
                  "ref": "Amount_EconomicActivity_GrossDomesticProduction_Nominal_PerCapita",
                  "label": "Nominal gross domestic product per capita",
                  "slot_values": [
                    {
                      "key": {
                        "axis": "how",
                        "property": {
                          "dcid": "activitySource",
                          "label": "activitySource"
                        },
                        "label": "activity source"
                      },
                      "value": {
                        "ref": {
                          "dcid": "GrossDomesticProduction",
                          "label": "GrossDomesticProduction"
                        },
                        "value_kind": "enum_value"
                      }
                    }
                  ],
                  "data_date_range": {
                    "start": "1960",
                    "end": "2024"
                  }
                }
              ],
              "entities": [
                {
                  "ref": "country/BRA",
                  "label": "Brazil",
                  "entity_type": "Country",
                  "role": "observationAbout"
                }
              ],
              "coverage": {
                "kind": "exact",
                "has_data": true,
                "observation_count": 65,
                "dimensions": [
                  {
                    "label": "sources",
                    "count": 1
                  },
                  {
                    "label": "observations",
                    "count": 65
                  }
                ]
              },
              "facets": {},
              "slot_options": [
                {
                  "key": {
                    "axis": "how",
                    "property": {
                      "dcid": "activitySource",
                      "label": "activitySource"
                    },
                    "label": "activity source"
                  },
                  "options": [
                    {
                      "value": {
                        "ref": {
                          "dcid": "GrossDomesticProduction",
                          "label": "GrossDomesticProduction"
                        },
                        "value_kind": "enum_value"
                      },
                      "coverage": null
                    }
                  ],
                  "truncated": true,
                  "source": "observed"
                }
              ],
              "entity_options": [],
              "facet_options": [],
              "rendered_sentence": "Nominal gross domestic product per capita in Brazil, 1960 to 2024, according to World Development Indicators.",
              "sentence_plan": [
                {
                  "kind": "slot",
                  "text": "Nominal gross domestic product per capita",
                  "axis": "what",
                  "entity_refs": [],
                  "distinguishes": true
                },
                {
                  "kind": "slot",
                  "text": "",
                  "axis": "how",
                  "property_dcid": "activitySource",
                  "binding_ref": "how:activitySource",
                  "entity_refs": []
                },
                {
                  "kind": "text",
                  "text": " in ",
                  "entity_refs": []
                },
                {
                  "kind": "slot",
                  "text": "Brazil",
                  "axis": "where",
                  "binding_ref": "where:",
                  "entity_refs": []
                },
                {
                  "kind": "text",
                  "text": ", ",
                  "entity_refs": []
                },
                {
                  "kind": "slot",
                  "text": "1960 to 2024",
                  "axis": "when",
                  "binding_ref": "when:",
                  "entity_refs": []
                },
                {
                  "kind": "text",
                  "text": ", according to ",
                  "entity_refs": []
                },
                {
                  "kind": "slot",
                  "text": "World Development Indicators",
                  "axis": "source",
                  "entity_refs": []
                },
                {
                  "kind": "text",
                  "text": ".",
                  "entity_refs": []
                }
              ],
              "trace": {
                "resolved_stat_vars": [
                  {
                    "dcid": "Amount_EconomicActivity_GrossDomesticProduction_Nominal_PerCapita",
                    "label": "Nominal gross domestic product per capita"
                  }
                ],
                "resolved_entities": [
                  {
                    "dcid": "country/BRA",
                    "label": "Brazil"
                  }
                ],
                "resolved_sources": [
                  {
                    "dcid": "dc/base/WorldDevelopmentIndicators",
                    "label": "WorldDevelopmentIndicators"
                  }
                ],
                "slot_filters": [
                  {
                    "key": {
                      "axis": "how",
                      "property": {
                        "dcid": "activitySource",
                        "label": "activitySource"
                      },
                      "label": "activity source"
                    },
                    "binding_kind": "value",
                    "refs": [
                      {
                        "dcid": "GrossDomesticProduction",
                        "label": "GrossDomesticProduction"
                      }
                    ]
                  },
                  {
                    "key": {
                      "axis": "where",
                      "label": "place"
                    },
                    "binding_kind": "value",
                    "refs": [
                      {
                        "dcid": "country/BRA",
                        "label": "Brazil"
                      }
                    ]
                  },
                  {
                    "key": {
                      "axis": "when",
                      "label": "time window"
                    },
                    "binding_kind": "unbound",
                    "refs": []
                  },
                  {
                    "key": {
                      "axis": "source",
                      "label": "data source"
                    },
                    "binding_kind": "unbound",
                    "refs": []
                  }
                ],
                "pipeline_trace": [
                  {
                    "step": "extract",
                    "ran": false
                  }
                ],
                "capability_version": "cap_c3e34c2e9e306bbd"
              },
              "confidence": "high",
              "available_at_place": true
            }
          }
        ],
        "truncated": false
      }
    }
  ],
  "rendered_sentence": "Total population in Brazil, 1940 to June 2026, according to 6 sources. Multiple options for GDP, select one.",
  "sentence_plan": [
    {
      "kind": "slot",
      "text": "Total population",
      "axis": "what",
      "entity_refs": [],
      "part_index": 0
    },
    {
      "kind": "slot",
      "text": "",
      "axis": "how",
      "property_dcid": "age",
      "binding_ref": "how:age",
      "entity_refs": [],
      "part_index": 0
    },
    {
      "kind": "slot",
      "text": "",
      "axis": "how",
      "property_dcid": "nativity",
      "binding_ref": "how:nativity",
      "entity_refs": [],
      "part_index": 0
    },
    {
      "kind": "slot",
      "text": "",
      "axis": "how",
      "property_dcid": "employment",
      "binding_ref": "how:employment",
      "entity_refs": [],
      "part_index": 0
    },
    {
      "kind": "slot",
      "text": "",
      "axis": "how",
      "property_dcid": "race",
      "binding_ref": "how:race",
      "entity_refs": [],
      "part_index": 0
    },
    {
      "kind": "slot",
      "text": "",
      "axis": "how",
      "property_dcid": "placeOfResidenceClassification",
      "binding_ref": "how:placeOfResidenceClassification",
      "entity_refs": [],
      "part_index": 0
    },
    {
      "kind": "slot",
      "text": "",
      "axis": "how",
      "property_dcid": "religion",
      "binding_ref": "how:religion",
      "entity_refs": [],
      "part_index": 0
    },
    {
      "kind": "slot",
      "text": "",
      "axis": "how",
      "property_dcid": "literacyStatus",
      "binding_ref": "how:literacyStatus",
      "entity_refs": [],
      "part_index": 0
    },
    {
      "kind": "slot",
      "text": "",
      "axis": "how",
      "property_dcid": "gender",
      "binding_ref": "how:gender",
      "entity_refs": [],
      "part_index": 0
    },
    {
      "kind": "slot",
      "text": "",
      "axis": "how",
      "property_dcid": "residenceType",
      "binding_ref": "how:residenceType",
      "entity_refs": [],
      "part_index": 0
    },
    {
      "kind": "slot",
      "text": "",
      "axis": "how",
      "property_dcid": "educationalAttainment",
      "binding_ref": "how:educationalAttainment",
      "entity_refs": [],
      "part_index": 0
    },
    {
      "kind": "slot",
      "text": "",
      "axis": "how",
      "property_dcid": "placeOfBirth",
      "binding_ref": "how:placeOfBirth",
      "entity_refs": [],
      "part_index": 0
    },
    {
      "kind": "slot",
      "text": "",
      "axis": "how",
      "property_dcid": "armedForcesStatus",
      "binding_ref": "how:armedForcesStatus",
      "entity_refs": [],
      "part_index": 0
    },
    {
      "kind": "text",
      "text": " in ",
      "entity_refs": [],
      "part_index": 0
    },
    {
      "kind": "slot",
      "text": "Brazil",
      "axis": "where",
      "binding_ref": "where:",
      "entity_refs": [],
      "part_index": 0
    },
    {
      "kind": "text",
      "text": ", ",
      "entity_refs": [],
      "part_index": 0
    },
    {
      "kind": "slot",
      "text": "1940 to June 2026",
      "axis": "when",
      "binding_ref": "when:",
      "entity_refs": [],
      "part_index": 0
    },
    {
      "kind": "text",
      "text": ", according to ",
      "entity_refs": [],
      "part_index": 0
    },
    {
      "kind": "slot",
      "text": "6 sources",
      "axis": "source",
      "entity_refs": [],
      "part_index": 0
    },
    {
      "kind": "text",
      "text": ".",
      "entity_refs": [],
      "part_index": 0
    },
    {
      "kind": "text",
      "text": " ",
      "entity_refs": []
    },
    {
      "kind": "text",
      "text": "Multiple options for ",
      "entity_refs": [],
      "part_index": 1
    },
    {
      "kind": "slot",
      "text": "GDP",
      "axis": "what",
      "entity_refs": [],
      "part_index": 1
    },
    {
      "kind": "text",
      "text": ", select one.",
      "entity_refs": [],
      "part_index": 1
    }
  ],
  "status": "mixed"
};
