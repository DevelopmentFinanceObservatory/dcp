/**
 * definite × bare — "ODA from France".
 * The shape resolved and the region is named, but the numbers were not counted
 * (coverage.kind === "bare"). Exercises the count/coverage display's no-count path.
 *
 * Also the one fixture that carries donor entity_options and a spec-level
 * sentence_plan with a role:'from' read-back token — "ODA from France" is a
 * starter pill routed here, so this is the shape research participants will
 * reach for when they try editing the donor.
 */

import type {
  Spec,
  ResolveResponse,
  SentenceToken,
  SlotKey,
  SlotOption,
} from "@/lib/contract/types";
import { ref, echo, definite } from "./_common";

const SHAPE_ID = "shape/development_finance_flows";

const whatKey: SlotKey = {
  axis: "what",
  property: ref("flowType", "flow type"),
  label: "flow",
};
const howKey: SlotKey = {
  axis: "how",
  property: ref("purpose", "purpose"),
  label: "purpose",
};
const channelKey: SlotKey = {
  axis: "how",
  property: ref("channel", "channel"),
  label: "channel",
};
const whereKey: SlotKey = { axis: "where", property: null, label: "donor" };
const whenKey: SlotKey = { axis: "when", property: null, label: "time" };
const sourceKey: SlotKey = { axis: "source", property: null, label: "source" };

/** A plausible DAC donor set for the entity-options popover (bare fixture: no
 *  per-option counts — coverage is omitted, same as the shape's own coverage). */
const donorOptions: SlotOption[] = [
  { value: { value_kind: "entity", ref: ref("country/FRA", "France") } },
  { value: { value_kind: "entity", ref: ref("country/DEU", "Germany") } },
  { value: { value_kind: "entity", ref: ref("country/USA", "United States") } },
  {
    value: { value_kind: "entity", ref: ref("country/GBR", "United Kingdom") },
  },
  { value: { value_kind: "entity", ref: ref("country/JPN", "Japan") } },
  { value: { value_kind: "entity", ref: ref("country/SWE", "Sweden") } },
];

/**
 * The engine's rendered sentence, tokenised — mirrors render.py's join order
 * (what, then the "from "-prefixed donor read-back, then the remaining unbound
 * slots' empty placeholders). The donor token carries role/entity_refs but no
 * binding_ref, same as the "to"-recipient pattern in
 * buildViewModel.sentencePlan.test.ts — that's what routes it through
 * buildSentenceTokens' directional-entity branch (editable iff entity_options
 * carries this role) instead of the where-slot's own PlacePopover editor.
 * how/source/when are unbound here, so each is an empty slot-token placeholder
 * (still joins to its slot via binding_ref, for "narrow further" to find it);
 * the when-axis one still renders "all years" client-side (buildSentenceTokens'
 * own when-axis fallback), the others drop out of the rendered sentence.
 */
const sentencePlan: SentenceToken[] = [
  {
    kind: "slot",
    text: "ODA",
    axis: "what",
    property_dcid: whatKey.property?.dcid ?? null,
    binding_ref: "what:flowType",
  },
  { kind: "text", text: " from " },
  {
    kind: "slot",
    text: "France",
    axis: "where",
    role: "from",
    entity_refs: ["country/FRA"],
  },
  {
    kind: "slot",
    text: "",
    axis: "how",
    property_dcid: howKey.property?.dcid ?? null,
    binding_ref: "how:purpose",
  },
  { kind: "slot", text: "", axis: "source", binding_ref: "source:" },
  { kind: "slot", text: "", axis: "when", binding_ref: "when:" },
];

export const definiteBareSpec: Spec = {
  spec_id: "spec_def_bare_oda_from_france",
  shape: {
    shape_id: SHAPE_ID,
    label: "development finance flows",
    population_type: ref("DevelopmentFinance", "development finance"),
    measured_property: ref(
      "DevelopmentFinanceFlow",
      "development finance flow",
    ),
    stat_type: ref("measuredValue", "measured value"),
    slot_keys: [whatKey, howKey, channelKey, whereKey, whenKey, sourceKey],
    member_count: 412,
    refine_supported: true,
  },
  slots: [
    {
      key: whatKey,
      binding: {
        kind: "value",
        value: { value_kind: "enum_value", ref: ref("ODA", "ODA") },
      },
    },
    { key: howKey, binding: { kind: "unbound" } },
    { key: channelKey, binding: { kind: "absent" } },
    // The donor rides on the entity side (entities + entity_options + the
    // sentence_plan's role:'from' token) — this where-slot is not itself a
    // rendered chip, so it stays absent. The key is kept so slot_keys/shape
    // stay consistent with the shape's declared axes.
    { key: whereKey, binding: { kind: "absent" } },
    { key: whenKey, binding: { kind: "unbound" } },
    { key: sourceKey, binding: { kind: "unbound" } },
  ],
  stat_vars: [
    {
      ref: ref("ONE/CRS_DAC/ODA-FRA", "ODA from France"),
      shape_id: SHAPE_ID,
      slot_values: [
        {
          key: whatKey,
          value: { value_kind: "enum_value", ref: ref("ODA", "ODA") },
        },
      ],
    },
  ],
  entities: [
    {
      ref: ref("country/FRA", "France"),
      entity_type: ref("Country", "Country"),
      role: {
        kind: "directional",
        role: ref("donor", "donor"),
        direction: "from",
      },
    },
  ],
  entity_options: [
    {
      entity_ref: "country/FRA",
      role: "from",
      options: donorOptions,
      complete: true,
      source: "seed",
    },
  ],
  coverage: { kind: "bare", has_data: false },
  resolution: {
    resolved_stat_vars: [ref("ONE/CRS_DAC/ODA-FRA", "ODA from France")],
    resolved_entities: [ref("country/FRA", "France")],
    resolved_sources: [ref("dc/base/OECD_CRS", "OECD CRS")],
    slot_filters: [
      { key: whatKey, binding_kind: "value", refs: [ref("ODA", "ODA")] },
      { key: howKey, binding_kind: "unbound", refs: [] },
      { key: whereKey, binding_kind: "absent", refs: [] },
    ],
    pipeline_trace: [
      { step: "extract", ran: true, ms: 12 },
      { step: "recall", ran: true, ms: 28 },
      { step: "shape", ran: true, ms: 5 },
      { step: "bind", ran: true, ms: 17 },
      { step: "materialise", ran: false },
      { step: "answer", ran: true, ms: 2 },
    ],
  },
  // Wire reality: a definite spec carries its own confirmation sentence. In
  // production normalizeSpec sets it from spec.resolved; here it's set
  // directly since this fixture is hand-built, not run through the engine.
  rendered_sentence: "ODA from France.",
  sentence_plan: sentencePlan,
};

export const definiteBare: ResolveResponse = definite(
  definiteBareSpec,
  echo({
    raw_query: "ODA from France",
    normalized_query: "ODA from France",
    variable_text: ["ODA"],
  }),
);
