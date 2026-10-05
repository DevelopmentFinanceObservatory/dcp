/**
 * Fixture registry: test data only. Never imported by runtime code: the app
 * always talks to the live search engine (see lib/transport). These are
 * versioned canned ResolveResponses across the status × coverage matrix
 * (definite/candidates/no_data × exact/breadth/bare). Coverage is a property
 * of a Spec, so it only varies within `definite` and `candidates`; `no_data`
 * has no Spec and therefore no coverage.
 *
 * Use `getSpecFixtures()` for the subset that carries a top-level Spec.
 */

import type { ResolveResponse, Spec } from "@/lib/contract/types";
import { definiteExact, definiteExactSpec } from "./definite-exact";
import { definiteBreadth, definiteBreadthSpec } from "./definite-breadth";
import { definiteBare, definiteBareSpec } from "./definite-bare";
import { definiteCompare, definiteCompareSpec } from "./definite-compare";
import { candidates } from "./candidates";
import { noData } from "./no-data";
import {
  partsDefiniteKenya,
  partsCandidatesNigeria,
  partsMixedTwoVariable,
  partsMixedBrazil,
  partsTwoDefiniteKenya,
  partsComposedBrazil,
  partsDatasetResubmitBrazil,
} from "./parts";

export type FixtureName =
  | "definite-exact"
  | "definite-breadth"
  | "definite-bare"
  | "definite-compare"
  | "candidates"
  | "no-data";

export const fixtures: Record<FixtureName, ResolveResponse> = {
  "definite-exact": definiteExact,
  "definite-breadth": definiteBreadth,
  "definite-bare": definiteBare,
  "definite-compare": definiteCompare,
  candidates,
  "no-data": noData,
};

export const fixtureNames = Object.keys(fixtures) as FixtureName[];

/** Every Spec that appears at the top level of a definite fixture, keyed by spec_id. */
export function getSpecFixtures(): Spec[] {
  return [
    definiteExactSpec,
    definiteBreadthSpec,
    definiteBareSpec,
    definiteCompareSpec,
  ];
}

export {
  definiteExact,
  definiteExactSpec,
  definiteBreadth,
  definiteBreadthSpec,
  definiteBare,
  definiteBareSpec,
  definiteCompare,
  definiteCompareSpec,
  candidates,
  noData,
  // Raw parts[]-envelope wire bodies, pre-normalization. Not part of the
  // `fixtures`/`FixtureName` registry above: those are already-normalized
  // ResolveResponses used across the render-state matrix, while these drive
  // normalizeResponse/normalizeSpec directly.
  partsDefiniteKenya,
  partsCandidatesNigeria,
  partsMixedTwoVariable,
  // Real (not synthetic) two-part captures; see parts.ts's own doc comments.
  partsMixedBrazil,
  partsTwoDefiniteKenya,
  // Same query as partsMixedBrazil, captured against a build that composes
  // the envelope's own rendered_sentence/sentence_plan across both parts.
  partsComposedBrazil,
  // Same query resubmitted through the dataset_resubmit door: one identity
  // entry (population) and one candidates entry (GDP) built from
  // partsComposedBrazil's parts. Drives buildDatasetEntries and the
  // edit-lane store tests against a real dataset_resubmit response.
  partsDatasetResubmitBrazil,
};
