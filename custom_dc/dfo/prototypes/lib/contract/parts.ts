/**
 * Small pure helpers over the `parts[]` envelope. One definition of "the part
 * at index i" and "the spec inside it," shared by the store and any
 * component that needs to read or patch a part.
 *
 * The UI renders every part, in order (per-part search view). `partAt`
 * indexes into the envelope; `patchPartSpec` rewrites one spec inside one
 * part (a definite part's own spec, or one candidate among several);
 * `spliceResponseParts` replaces `parts[index]` with one or more parts from
 * another response (a `raw_text` refine can return more than one part) and
 * recomputes the envelope's own `status`; `envelopeStatus` is that status
 * recomputation, factored out so it's never inlined twice.
 *
 * The splice does not touch `response.rendered_sentence`/`sentence_plan` —
 * the envelope pair describes the sentence composed across every part as of
 * the last full run, and rides forward unchanged onto the spliced envelope.
 * A refine's own response composes only the phrase it re-resolved, so the
 * pair stays stale for that phrase until the next full run replaces the
 * whole envelope.
 */

import type {
  Part,
  PartStatus,
  ResolveResponse,
  SentenceToken,
  Spec,
} from "./types";

/** The part at `index`, or undefined if the envelope doesn't have one. */
export function partAt(
  response: ResolveResponse,
  index: number,
): Part | undefined {
  return response.parts[index];
}

/**
 * The confirmation/summary sentence for one part, and its token form,
 * together so they never come from two different sources. A definite part's
 * own `rendered_sentence`/`sentence_plan` are always null on the wire — its
 * sentence lives on the spec instead (lifted there by normalizeSpec).
 * Candidates and no_data parts carry their own summary sentence directly.
 */
export function partSentence(part: Part): {
  rendered_sentence: string | null;
  sentence_plan: SentenceToken[] | null;
} {
  if (part.status === "definite") {
    return {
      rendered_sentence: part.spec.rendered_sentence ?? null,
      sentence_plan: part.spec.sentence_plan ?? null,
    };
  }
  return {
    rendered_sentence: part.rendered_sentence ?? null,
    sentence_plan: part.sentence_plan ?? null,
  };
}

/**
 * Returns a new response with the spec matching `spec_id` inside `parts[index]`
 * replaced by `fn(spec)`: the definite spec, or one candidate among several.
 * The one place a trailing option/observation merge patches a spec, so there
 * is a single copy of it. A no match (spec_id belongs to no spec in that
 * part, or the part carries no spec at all) returns `response` unchanged.
 */
export function patchPartSpec(
  response: ResolveResponse,
  index: number,
  spec_id: string,
  fn: (spec: Spec) => Spec,
): ResolveResponse {
  const part = response.parts[index];
  if (!part) return response;

  let patched: Part | null = null;
  if (part.status === "definite" && part.spec.spec_id === spec_id) {
    patched = { ...part, spec: fn(part.spec) };
  } else if (part.status === "candidates") {
    const specs = part.candidates.specs;
    const at = specs.findIndex((s) => s.spec_id === spec_id);
    if (at !== -1) {
      const nextSpecs = specs.slice();
      nextSpecs[at] = fn(specs[at]);
      patched = {
        ...part,
        candidates: { ...part.candidates, specs: nextSpecs },
      };
    }
  }
  if (!patched) return response;

  // A trailing-options/observations patch never changes a part's own
  // `status`, so the envelope's computed status can't change either — no
  // need to recompute it here.
  const parts = response.parts.slice();
  parts[index] = patched;
  return { ...response, parts };
}

/**
 * The envelope-level status the engine itself computes: the parts' shared
 * status when every part agrees, else the literal string "mixed"
 * (`ResolveResponse.status`). A spliced-together envelope was never itself
 * returned by the engine, so the client has to replicate this one-line
 * reduction locally after every splice.
 */
export function envelopeStatus(parts: Part[]): PartStatus | "mixed" {
  const statuses = new Set(parts.map((p) => p.status));
  return statuses.size === 1 ? [...statuses][0] : "mixed";
}

/**
 * Splices `parts` into `parts[index]` of a (possibly multi-part) current
 * envelope: one or more parts, in order, replacing that single index, and
 * recomputes the envelope's own `status`. Every other part is carried through
 * untouched. Used directly by a free-text refine (`specStore.refineText`),
 * whose raw-text resolve can return more than one part and whose returned
 * parts keep their own `variable_text` (a raw-text run supplies it). A no-op
 * (returns `response` unchanged) when `index` doesn't exist in `response` or
 * `parts` is empty — an empty splice would desync `response.parts` from the
 * PartView array built alongside it. The result is not itself a shape the
 * engine ever returns; it exists only on the client, which is why this is the
 * one place that builds it.
 */
export function spliceResponseParts(
  response: ResolveResponse,
  index: number,
  parts: Part[],
): ResolveResponse {
  if (!response.parts[index] || parts.length === 0) return response;

  const nextParts = [
    ...response.parts.slice(0, index),
    ...parts,
    ...response.parts.slice(index + 1),
  ];
  return { ...response, parts: nextParts, status: envelopeStatus(nextParts) };
}
