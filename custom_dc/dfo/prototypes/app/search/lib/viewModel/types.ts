/**
 * ViewModel — everything the UI renders, projected from one Spec.
 *
 * The Spec is the source of truth; every visible surface is a projection of it.
 * buildViewModel(Spec) is the single pure function that produces this object.
 *
 * The renderers consume the ViewModel and know nothing about HTTP, the engine, or
 * graph vocabulary — graph identifiers live only in `inspector`.
 */

import type {
  BindingKind,
  CoverageKind,
  Direction,
  SlotAxis,
} from "@/lib/contract/types";

export type ViewState =
  "definite" | "candidate" | "wildcard" | "no_data" | "error";

/** One editable phrase in the sentence. */
export interface SlotView {
  axis: SlotAxis;
  /** the slot's human label, e.g. "purpose", "donor" */
  label: string;
  /** plain-language rendering of the binding, e.g. "malaria control", "all sources" */
  text: string;
  bindingKind: BindingKind;
  /** whether this phrase opens an edit popover (all non-absent slots in Stage 1) */
  editable: boolean;
  /** index of this slot in Spec.slots, so an edit targets the right slot */
  slotIndex: number;
}

/**
 * One token of the engine's rendered sentence (`sentence_plan`): either invariant
 * connective text ("for ", "to ") or a bound phrase. Slot phrases backed by a
 * Spec.slots entry are editable via their real slotIndex. A directional
 * read-back (donor) or shape-label token carries slotIndex -1 (no Spec.slots
 * entry) but is ALSO editable — a donor read-back by its role, a shape-label
 * token by its position in the rendered sentence — both via free-text refine
 * when there's no bindable option list (see refineQuery.spliceSentence and
 * SentenceRenderer's onEditEntity/onEditPhrase).
 */
export type SentencePart =
  | { kind: "text"; text: string }
  | ({
      kind: "slot";
      /** dcid of the directional entity this token renders (donor read-back) */
      entityRef?: string;
      /** the directional role, when this token is an entity read-back */
      role?: Direction;
    } & SlotView);

/**
 * What the engine understood the query to be — surfaced in the result's "how this
 * was answered" summary (the same facts the loading trace showed live). Derived
 * from the Spec.
 */
export interface InterpretationView {
  /** the measure(s), e.g. ["ODA grants"] */
  variables: string[];
  /** resolved place names, e.g. ["France"] */
  places: string[];
  /** the applied date window, formatted, e.g. "2015–2020"; null when none */
  dates: string | null;
  /** the chosen data-shape family label, e.g. "development finance flows" */
  shapeLabel: string;
}

export interface CoverageDimensionView {
  label: string;
  count: number;
}

/** The count/coverage rail, a projection of Spec.coverage. */
export interface CoverageView {
  kind: CoverageKind;
  hasData: boolean;
  /** one-line summary, e.g. "14 observations" or "36 donors · 22 years · 3 methods" */
  summary: string;
  /** raw observation count (exact coverage only) — the rail's big number */
  observationCount?: number;
  /** breadth dimensions (empty for exact/bare) */
  dimensions: CoverageDimensionView[];
  window?: { startYear?: number; endYear?: number };
}

export interface TableRowView {
  variable: string;
  entity: string;
  /**
   * The latest resolved observation for this (variable, entity) pair, formatted
   * for display (toLocaleString). Null when the Spec carries no matching
   * ObservationSeries (not yet resolved, or the trailing SSE `observations`
   * event hasn't landed) — rendered as an em-dash, not a dropped row. No unit
   * field exists in the contract yet (engine Epic B4), so this is a bare number.
   */
  value: string | null;
  /** the latest point's date, alongside `value`; null under the same conditions */
  date: string | null;
  /** point count in this pair's series preview (0 when there's no series) */
  obsCount: number;
}

/** One formatted (date, value) pair in a RecentPointsView. */
export interface RecentPointView {
  date: string;
  /** formatted (toLocaleString, same convention as TableRowView.value); null when the point carries no value */
  value: string | null;
}

/**
 * A single-series spec's points as a compact, newest-first list -- richer than
 * TableView's one-row-per-series latest point. Present only when
 * Spec.observations carries exactly one series; multi-series specs leave this
 * unset, since DataTable's per-entity join is the more useful comparison there.
 */
export interface RecentPointsView {
  variable: string;
  entity: string;
  /** newest first, capped at 8 */
  points: RecentPointView[];
  /** points actually shown -- equals points.length */
  shownCount: number;
  /** total observations backing the series (Spec.observations.total_obs), which may exceed shownCount */
  totalObs: number;
}

/**
 * The (stat_var × entity) join over every resolved variable and place, latest
 * point per pair — a projection of Spec.stat_vars × Spec.entities against
 * Spec.observations.series.
 */
export interface TableView {
  rows: TableRowView[];
  /** single-series recent-values projection; null/undefined for zero or multi-series specs */
  recentPoints?: RecentPointsView | null;
}

export interface TraceRefView {
  dcid: string;
  label: string;
}

export interface TraceStepView {
  step: string;
  ran: boolean;
  ms?: number;
}

/** The inspector — the one place graph vocabulary (DCIDs) may appear. */
export interface TraceView {
  statVars: TraceRefView[];
  entities: TraceRefView[];
  sources: TraceRefView[];
  steps: TraceStepView[];
}

export interface ViewModel {
  state: ViewState;
  specId: string;
  /** ordered, editable phrases (absent slots are omitted from the sentence) */
  sentence: SlotView[];
  /**
   * The engine's rendered sentence as ordered tokens (connective text + slot
   * phrases), present only when the response carried a sentence_plan. Renderers
   * prefer this over `sentence` when set; otherwise `sentence` is the fallback.
   */
  sentenceTokens?: SentencePart[];
  /** what the engine understood the query to be (for the result-view summary) */
  interpretation: InterpretationView;
  coverage: CoverageView;
  table: TableView;
  inspector: TraceView;
}
