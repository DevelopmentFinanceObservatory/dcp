/**
 * buildViewModel — the single Spec → ViewModel projection.
 *
 * Pure and route-agnostic: no React, no HTTP, no store. All slot bindings
 * are projected into plain language here; no graph vocabulary leaves this
 * function except inside the inspector trace.
 *
 * Scope: this handles a single grounded Spec, so it returns the `definite` state
 * (wildcard detection for broad queries is a Stage-7 refinement). The
 * response-level states — `candidate`, `no_data`, `error` — are decided at the
 * envelope level (see components/StateView), not here.
 */

import {
  normalizeSpec,
  type Coverage,
  type Entity,
  type ObservationSeries,
  type SentenceToken,
  type Slot,
  type SlotKey,
  type SlotValue,
  type Spec,
  type StatVar,
  type TimeWindow,
} from "@/lib/contract/types";
import { humanizeSourceLabel } from "../humanizeSourceLabel";
import { optionsFromSpec } from "../taxonomy";
import type {
  CoverageView,
  InterpretationView,
  RecentPointsView,
  SentencePart,
  SlotView,
  TableRowView,
  TableView,
  TraceView,
  ViewModel,
} from "./types";

function plural(word: string): string {
  return word.endsWith("s") ? word : `${word}s`;
}

/**
 * A time window split into a plain connective ("between " / "in " / "since " /
 * "until ") and the year core (the editable part). A two-year span reads
 * "between 2010–2012"; equal bounds (a closed single year) reads "in 2010"; a
 * start with no end is an OPEN window and reads "since 2010" (not "in
 * 2010" — collapsing it to "in" claims the data stops at that year, which
 * breaks both the sentence and any spliced refine query built from it); an
 * end with no start reads "until 2010"; no bounds is "all years".
 */
function windowPhrase(w: TimeWindow): { connective: string; core: string } {
  const { start_year, end_year } = w;
  if (start_year != null && end_year != null) {
    if (start_year === end_year)
      return { connective: "in ", core: `${start_year}` };
    const lo = Math.min(start_year, end_year);
    const hi = Math.max(start_year, end_year);
    return { connective: "between ", core: `${lo}–${hi}` };
  }
  if (start_year != null)
    return { connective: "since ", core: `${start_year}` };
  if (end_year != null) return { connective: "until ", core: `${end_year}` };
  return { connective: "", core: "all years" };
}

function formatWindow(w: TimeWindow): string {
  const { connective, core } = windowPhrase(w);
  return `${connective}${core}`;
}

/** The time_window a slot is bound to, or null when it isn't a bound time value. */
function timeWindowOf(slot: Slot): TimeWindow | null {
  const b = slot.binding;
  return b.kind === "value" && b.value.value_kind === "time_window"
    ? (b.value.time_window ?? null)
    : null;
}

/**
 * A window derived from an engine-rendered when-phrase — for the unbound when-slot,
 * where the engine reads back the resolved data date range (e.g. "2012–2022", "since
 * 2015") with no value binding to read. Lets that read-back get the same
 * connective (windowPhrase) as an explicit range. The engine's own wording is the
 * signal for open-vs-closed: "since"/"until" mean the window is genuinely
 * open-ended, but a BARE single year with neither word means the data covers that
 * one year only and must render closed ("in 2012"), not silently widen to "since
 * 2012" — so a bare year maps to equal start/end, same as an explicit closed
 * binding. Null when the text carries no year (e.g. "all years").
 */
function windowFromText(text: string): TimeWindow | null {
  const years = text.match(/\d{4}/g)?.map(Number);
  if (!years || years.length === 0) return null;
  if (years.length >= 2) return { start_year: years[0], end_year: years[1] };
  const [year] = years;
  if (/since/i.test(text)) return { start_year: year };
  if (/until|up to/i.test(text)) return { end_year: year };
  return { start_year: year, end_year: year };
}

/** The first 4-digit year in a date string ("2012", "2012-06", "2012-06-30"). */
function yearOf(date?: string | null): number | undefined {
  const m = date?.match(/\d{4}/);
  return m ? Number(m[0]) : undefined;
}

/**
 * The full available data window, unioned across the answer's StatVars'
 * data_date_range (earliest start, latest end) — the same source TimeEditor derives
 * its year bounds from. Used to render an unbound ("all years") when-slot as the
 * concrete range it actually covers ("between 2012–2022") instead of the
 * uninformative "all years", for the case where the engine's own read-back token
 * came back empty. Null when no StatVar carries a date range.
 */
function windowFromStatVars(spec: Spec): TimeWindow | null {
  const starts: number[] = [];
  const ends: number[] = [];
  for (const sv of spec.stat_vars ?? []) {
    const start = yearOf(sv.data_date_range?.start);
    const end = yearOf(sv.data_date_range?.end);
    if (start != null) starts.push(start);
    if (end != null) ends.push(end);
  }
  const start_year = starts.length ? Math.min(...starts) : undefined;
  const end_year = ends.length ? Math.max(...ends) : undefined;
  if (start_year == null && end_year == null) return null;
  return { start_year, end_year };
}

function formatValue(v?: SlotValue | null): string {
  if (!v) return "";
  switch (v.value_kind) {
    case "time_window":
      return v.time_window ? formatWindow(v.time_window) : "all years";
    case "literal":
      return v.literal ?? "";
    case "source":
      // Raw import-name labels ("Kenya_Census") never reach the sentence --
      // same humaniser the engine itself renders through (render.py's
      // _humanize_source_label), so a bound source chip and the popover's
      // resolved_sources fallback options agree on wording.
      return humanizeSourceLabel(v.ref?.label ?? "");
    default:
      return v.ref?.label ?? "";
  }
}

/** Plain-language rendering of a single slot's binding. */
export function renderBinding(slot?: Slot | null): string {
  if (!slot || !slot.binding || !slot.key) return "";
  const { binding, key } = slot;
  switch (binding.kind) {
    case "value":
      return formatValue(binding.value);
    case "set": {
      if (binding.set_ref) return binding.set_ref.label;
      const labels = (binding.values ?? []).map(formatValue).filter(Boolean);
      if (labels.length <= 1) return labels[0] ?? "";
      // Compact form for an ad-hoc multi-select, e.g. "Ethiopia +2".
      return `${labels[0]} +${labels.length - 1}`;
    }
    case "unbound":
      return key.axis === "when"
        ? "all years"
        : `all ${plural(key.label ?? "")}`;
    case "absent":
      return "";
  }
}

function buildSentence(spec: Spec): SlotView[] {
  return (spec.slots ?? [])
    .map((slot, slotIndex) => ({ slot, slotIndex }))
    .filter(({ slot }) => slot?.binding?.kind !== "absent")
    .map(({ slot, slotIndex }) => ({
      axis: slot.key?.axis ?? "what",
      label: slot.key?.label ?? "",
      text: renderBinding(slot),
      bindingKind: slot.binding?.kind ?? "unbound",
      // Sources are a closed set the engine binds itself, never a free-text
      // field (see computeAddableDimensions' identical source gate in
      // SearchClient.tsx) -- editable exactly iff the popover it would open
      // has options (delegates to optionsFromSpec, the single source of truth
      // for both engine slot_options and the resolved_sources fallback, so
      // this can never drift from what the popover actually shows). Every
      // other axis stays freely editable.
      editable:
        slot.key?.axis !== "source" ||
        optionsFromSpec(spec, slot.key).length > 0,
      slotIndex,
    }));
}

/** SlotKey.as_ref(): the "axis:property_dcid" join key used by sentence tokens. */
function keyRef(key?: SlotKey | null): string {
  if (!key) return "";
  return `${key.axis ?? ""}:${key.property?.dcid ?? ""}`;
}

/**
 * Compact an entity-sourced token (a directional recipient/donor phrase) the same
 * way renderBinding compacts a set: "First +N". The engine bakes the full member
 * list into the token text ("Ethiopia, Kenya, and Uganda") but names every entity
 * in entity_refs, in the same order — so we read the count from there and the
 * first label from Spec.entities (avoids parsing the joined text, which breaks on
 * names like "Trinidad and Tobago"). Null when there's nothing to compact (one or
 * no entities) or the first label can't be resolved — caller falls back to the
 * engine's text.
 */
function compactEntities(spec: Spec, entityRefs?: string[]): string | null {
  if (!entityRefs || entityRefs.length <= 1) return null;
  const first = (spec.entities ?? []).find(
    (e) => e?.ref?.dcid === entityRefs[0],
  )?.ref?.label;
  return first ? `${first} +${entityRefs.length - 1}` : null;
}

/**
 * Project the engine's sentence_plan into renderable parts. A slot token backed by
 * a Spec.slots entry (matched on binding_ref) stays editable and carries its real
 * slotIndex. A directional read-back / shape-label token carries slotIndex -1 (no
 * Spec.slots entry) but is ALSO editable — via free-text refine rather than a
 * bindable option list (see refineQuery.spliceSentence): a donor read-back opens
 * its entity picker (which free-text-refines itself when entity_options is empty),
 * and a shape-label token (a standard-shape variable/measure read-back with no
 * confirmable sibling to construct a real edit from, e.g. "Floods", "Total
 * population") opens a popover addressed by its position in the rendered sentence
 * (SentenceRenderer's onEditPhrase) instead of a slot index or role. Empty-text
 * slot tokens (loading skeletons) are dropped. Exception: a source-axis token is
 * NEVER free-text editable, backed slot or not -- sources are a closed set the
 * engine binds itself (mirrors computeAddableDimensions' source gate in
 * SearchClient.tsx), so offering an open text field is a dead end.
 */
function buildSentenceTokens(
  spec: Spec,
  plan?: SentenceToken[] | null,
): SentencePart[] {
  const parts: SentencePart[] = [];
  const slots = spec.slots ?? [];
  for (const tok of plan ?? []) {
    if (tok.kind === "text") {
      parts.push({ kind: "text", text: tok.text });
      continue;
    }
    const idx = tok.binding_ref
      ? slots.findIndex((s) => keyRef(s?.key) === tok.binding_ref)
      : -1;

    // Time slot: ALWAYS render an editable chip — even when the engine emits an
    // empty token for an unbound when-slot with no resolved date to read back.
    // Otherwise "all years" would drop out of the sentence (like any empty token),
    // leaving the user no way to narrow the time range again. Re-render from the
    // window so the wording is ours ("between …"/"in …"), splitting the plain
    // connective from the editable, underlined year core; use the value binding
    // when present, else the engine's read-back text (the unbound when-slot's
    // resolved date range) so a bare "2012–2022" still gets its connective. With
    // no window at all, the chip reads "all years".
    if (idx >= 0 && slots[idx]?.key?.axis === "when") {
      const slot = slots[idx];
      // Prefer the bound window; else the engine's read-back text; else the answer's
      // own data range (so "all years" reads as the concrete span it covers). Only
      // a slot with no derivable window at all falls through to "all years".
      const tw =
        timeWindowOf(slot) ??
        windowFromText(tok.text) ??
        windowFromStatVars(spec);
      if (tw) {
        const { connective, core } = windowPhrase(tw);
        if (connective) parts.push({ kind: "text", text: connective });
        parts.push({
          kind: "slot",
          axis: "when",
          label: slot.key?.label ?? "",
          text: core,
          bindingKind: slot.binding?.kind ?? "unbound",
          editable: true,
          slotIndex: idx,
        });
      } else {
        parts.push({
          kind: "slot",
          axis: "when",
          label: slot.key?.label ?? "",
          text: renderBinding(slot), // unbound, no read-back → "all years"
          bindingKind: slot.binding?.kind ?? "unbound",
          editable: true,
          slotIndex: idx,
        });
      }
      continue;
    }

    if (tok.text === "") continue; // other empty skeleton tokens — nothing to show
    if (idx >= 0) {
      const slot = slots[idx];
      parts.push({
        kind: "slot",
        axis: slot.key?.axis ?? "what",
        label: slot.key?.label ?? "",
        // A multi-select renders compactly ("First +N"), never the engine's full
        // member list, which is unreadable in the sentence. A recipient carries its
        // members as entity_refs (entity-sourced, so the slot binding may be
        // unbound); a plain set carries them in the binding — compact whichever
        // applies. Other kinds keep the engine's wording. (Time never reaches here.)
        text:
          compactEntities(spec, tok.entity_refs) ??
          (slot.binding?.kind === "set" ? renderBinding(slot) : tok.text),
        bindingKind: slot.binding?.kind ?? "unbound",
        // Source is a closed set the engine binds itself -- editable exactly
        // iff optionsFromSpec would give the popover something to pick from
        // (see buildSentence's identical delegation above for why).
        editable:
          slot.key?.axis !== "source" ||
          optionsFromSpec(spec, slot.key).length > 0,
        slotIndex: idx,
      });
    } else if (tok.role && tok.entity_refs?.length) {
      // directional entity read-back (donor). Always editable: the edit path is
      // editDonor, keyed by entityRef/role rather than a slot index; when the spec
      // carries entity_options for this role that's a bindable pick, and when it
      // doesn't, EntityPopover renders its free-text refine field instead of a
      // dead end (see refineQuery.spliceSentence). Donor is always a single entity
      // in v1, so the ViewModel projection keeps entityRef singular — the first
      // (only) dcid in the token's entity_refs.
      parts.push({
        kind: "slot",
        axis: tok.axis ?? "where",
        label: "",
        // Compact multiple donors the same way as recipients ("First +N").
        text: compactEntities(spec, tok.entity_refs) ?? tok.text,
        bindingKind: "value",
        editable: true,
        slotIndex: -1,
        entityRef: tok.entity_refs[0],
        role: tok.role,
      });
    } else {
      // shape-label fallback phrase with no backing slot (e.g. a standard-shape
      // variable/measure read-back like "Floods", "Total population"): no
      // confirmable sibling exists to construct a real bindable edit from, so
      // it's editable via free-text refine ONLY — SentenceRenderer's onEditPhrase
      // addresses it by rendered position rather than a slot index or role (see
      // refineQuery.spliceSentence's phrase-index targeting), and the popover it
      // opens has zero options, so its refine field is what the user actually gets.
      // Exception: a source-axis fallback has no options AND no free-text path
      // (sources are a closed set the engine binds itself), so it's never editable.
      const axis = tok.axis ?? "what";
      parts.push({
        kind: "slot",
        axis,
        label: "",
        text: tok.text,
        bindingKind: "value",
        editable: axis !== "source",
        slotIndex: -1,
      });
    }
  }
  return parts;
}

/**
 * Slot indices that already render a chip in the sentence — via a sentence_plan
 * token backed by a real slot (buildSentenceTokens keeps only the non-empty
 * ones), or, when no plan is available, every non-absent slot in the SlotView
 * fallback (buildSentence always renders one, bound or unbound). A slot in this
 * set has its own phrase in the sentence already and must not also be offered as
 * an "addable" dimension — e.g. the what-axis's always-non-empty fallback token
 * for an otherwise-unbound slot (render.py's AXIS_OVERRIDES/_fallback_what).
 */
export function renderedSlotIndices(
  sentence: SlotView[],
  sentenceTokens?: SentencePart[],
): Set<number> {
  if (sentenceTokens && sentenceTokens.length) {
    return new Set(
      sentenceTokens
        .filter(
          (t): t is Extract<SentencePart, { kind: "slot" }> =>
            t.kind === "slot" && t.slotIndex >= 0,
        )
        .map((t) => t.slotIndex),
    );
  }
  return new Set((sentence ?? []).map((s) => s.slotIndex));
}

function buildCoverage(coverage?: Coverage | null): CoverageView {
  if (!coverage) {
    return {
      kind: "bare",
      hasData: false,
      summary: "not counted",
      dimensions: [],
    };
  }
  const window = coverage.window
    ? {
        startYear: coverage.window.start_year,
        endYear: coverage.window.end_year,
      }
    : undefined;

  switch (coverage.kind) {
    case "exact": {
      const n = coverage.observation_count ?? 0;
      return {
        kind: "exact",
        hasData: coverage.has_data ?? false,
        summary: `${n} ${n === 1 ? "observation" : "observations"}`,
        observationCount: n,
        dimensions: (coverage.dimensions ?? []).map((d) => ({
          label: d?.label ?? "",
          count: d?.count ?? 0,
        })),
        window,
      };
    }
    case "breadth": {
      const dims = (coverage.dimensions ?? []).map((d) => ({
        label: d?.label ?? "",
        count: d?.count ?? 0,
      }));
      return {
        kind: "breadth",
        hasData: coverage.has_data ?? false,
        summary: dims.map((d) => `${d.count} ${d.label}`).join(" · "),
        dimensions: dims,
        window,
      };
    }
    case "bare":
    default:
      return {
        kind: "bare",
        hasData: coverage.has_data ?? false,
        summary: "not counted",
        dimensions: [],
        window,
      };
  }
}

function buildInterpretation(spec: Spec): InterpretationView {
  const t = spec.resolution;
  const resolvedEntities = t?.resolved_entities ?? [];
  return {
    variables: spec.variable_text ? [spec.variable_text] : [],
    places: resolvedEntities.map((e) => e?.label).filter(Boolean),
    dates: t?.applied_window ? formatWindow(t.applied_window) : null,
    shapeLabel: spec.shape?.label ?? "",
  };
}

/** Bare toLocaleString formatting -- no unit field exists in the contract yet
 *  (units land with engine Epic B4). */
function formatObservationValue(v: number): string {
  return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

/**
 * A series' entity label, resolved through the chain a dev-finance bilateral
 * series needs: the series may be keyed by an entity (the donor) that never
 * appears in Spec.entities -- only the recipient does -- because the engine
 * bakes the donor into the StatVar dcid rather than listing it as a Spec
 * entity. Prefer the engine's own label when it supplies one, else look the
 * dcid up anywhere else the response names it, else fall back to the dcid's
 * trailing segment (e.g. "country/USA" -> "USA") rather than show nothing.
 */
function entityLabelFor(spec: Spec, series: ObservationSeries): string {
  if (series.entity_label) return series.entity_label;
  const specEntity = (spec.entities ?? []).find(
    (e) => e?.ref?.dcid === series.entity_dcid,
  );
  if (specEntity?.ref?.label) return specEntity.ref.label;
  const resolved = (spec.resolution?.resolved_entities ?? []).find(
    (r) => r?.dcid === series.entity_dcid,
  );
  if (resolved?.label) return resolved.label;
  return series.entity_dcid?.split("/").pop() ?? series.entity_dcid ?? "";
}

/** One row per series, latest point, entity label via entityLabelFor. */
function tableRowFromSeries(
  spec: Spec,
  sv: StatVar,
  series: ObservationSeries,
): TableRowView {
  const points = series.points ?? [];
  const latest = points.length ? points[points.length - 1] : undefined;
  const variableLabel =
    sv?.ref?.label ||
    (series as unknown as { stat_var?: { label: string } })?.stat_var?.label ||
    (spec.resolution?.resolved_stat_vars ?? []).find(
      (r) => r?.dcid === series.stat_var_dcid,
    )?.label ||
    sv?.ref?.dcid ||
    series.stat_var_dcid ||
    "";
  return {
    variable: variableLabel,
    entity: entityLabelFor(spec, series),
    value: latest?.value != null ? formatObservationValue(latest.value) : null,
    date: latest?.date ?? null,
    obsCount: points.length,
  };
}

/** A value:null/date:null em-dash row for a (stat_var, entity) pair with no
 *  matching series -- unresolved, or the observations event hasn't landed. */
function emptyTableRow(sv: StatVar, entity: Entity | null): TableRowView {
  return {
    variable: sv.ref?.label ?? "",
    entity: entity?.ref?.label ?? "",
    value: null,
    date: null,
    obsCount: 0,
  };
}

/**
 * Rows are SERIES-DRIVEN, not entity-driven: for each stat_var, one row per
 * matching ObservationSeries (join on stat_var_dcid only -- the series' own
 * entity_dcid may not be one of Spec.entities, e.g. a dev-finance series keyed
 * by donor while Spec.entities holds only the recipient). A stat_var with no
 * matching series falls back to one em-dash row per Spec.entities (or a single
 * entity:'' row when where is unbound) -- still a row per variable, never
 * dropped. For the common case where series entities equal Spec.entities (a
 * standard multi-place comparison), this produces the same rows, in the same
 * order, as the old entity-driven join.
 */
function buildTable(spec: Spec): TableView {
  const rows: TableRowView[] = [];
  const obsSeries = spec.observations?.series ?? [];
  const specEntities = spec.entities ?? [];
  const statVars =
    spec.stat_vars && spec.stat_vars.length > 0
      ? spec.stat_vars
      : obsSeries.map((s) => ({
          ref: {
            dcid: s.stat_var_dcid,
            label: (s as any).stat_var?.label ?? s.stat_var_dcid,
          },
          shape_id: spec.shape?.shape_id ?? "",
          slot_values: [],
        }));

  for (const sv of statVars) {
    const series = obsSeries.filter(
      (s) =>
        s?.stat_var_dcid === sv?.ref?.dcid ||
        (obsSeries.length === 1 && statVars.length === 1),
    );
    if (series.length) {
      for (const s of series) rows.push(tableRowFromSeries(spec, sv, s));
    } else {
      const entities = specEntities.length ? specEntities : [null];
      for (const entity of entities) rows.push(emptyTableRow(sv, entity));
    }
  }
  return { rows, recentPoints: buildRecentPoints(spec) };
}

const MAX_RECENT_POINTS = 8;

/**
 * Single-series recent-values projection: every shipped point newest-first,
 * capped at MAX_RECENT_POINTS, alongside the series' true total (which may
 * exceed what's shipped -- see SpecObservations.complete). Null for a spec
 * with zero or more than one series, where DataTable's per-row latest-point
 * join is the more useful view.
 */
function buildRecentPoints(spec: Spec): RecentPointsView | null {
  const series = spec.observations?.series;
  if (!series || series.length !== 1) return null;
  const [only] = series;
  const sv = (spec.stat_vars ?? []).find(
    (v) =>
      v?.ref?.dcid === only.stat_var_dcid ||
      (!v?.ref?.dcid && !only.stat_var_dcid),
  );
  const variableLabel =
    sv?.ref?.label ||
    (only as any)?.stat_var?.label ||
    (spec.resolution?.resolved_stat_vars ?? []).find(
      (r) => r?.dcid === only.stat_var_dcid,
    )?.label ||
    sv?.ref?.dcid ||
    only.stat_var_dcid ||
    "";
  const points = [...(only.points ?? [])]
    .reverse()
    .slice(0, MAX_RECENT_POINTS)
    .map((p) => ({
      date: p.date,
      value: p.value != null ? formatObservationValue(p.value) : null,
    }));
  return {
    variable: variableLabel,
    entity: entityLabelFor(spec, only),
    points,
    shownCount: points.length,
    totalObs: spec.observations?.total_obs ?? points.length,
  };
}

function buildInspector(spec: Spec): TraceView {
  const t = spec.resolution;
  return {
    statVars: (t?.resolved_stat_vars ?? []).map((r) => ({
      dcid: r?.dcid ?? "",
      label: r?.label ?? "",
    })),
    entities: (t?.resolved_entities ?? []).map((e) => ({
      dcid: e?.dcid ?? "",
      label: e?.label ?? "",
    })),
    sources: (t?.resolved_sources ?? []).map((r) => ({
      dcid: r?.dcid ?? "",
      label: r?.label ?? "",
    })),
    steps: (t?.pipeline_trace ?? []).map((s) => ({
      step: s?.step ?? "",
      ran: s?.ran ?? false,
      ms: s?.ms,
    })),
  };
}

export function buildViewModel(
  rawSpec: Spec,
  sentencePlan?: SentenceToken[] | null,
): ViewModel {
  const spec = normalizeSpec(rawSpec);
  const plan = sentencePlan ?? spec?.sentence_plan;
  const sentenceTokens =
    plan && plan.length ? buildSentenceTokens(spec, plan) : undefined;
  return {
    state: "definite",
    specId: spec?.spec_id ?? "",
    sentence: buildSentence(spec),
    ...(sentenceTokens ? { sentenceTokens } : {}),
    interpretation: buildInterpretation(spec),
    coverage: buildCoverage(spec?.coverage),
    table: buildTable(spec),
    inspector: buildInspector(spec),
  };
}
