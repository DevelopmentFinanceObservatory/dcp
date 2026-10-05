/**
 * Routes one token of an envelope's composed sentence plan
 * (`ResolveResponse.sentence_plan`) to the part it belongs to. The hero
 * sentence renders the plan whole, in order, so this is the only job left: a
 * renderer needs to know which part's spec/slot a token addresses (or that
 * it's shared between parts) without walking `part_index` tags itself.
 *
 * A single-part response's plan carries either no `part_index` tags at all
 * (a spec-level plan, never split across parts) or the same index on every
 * token (composed, but with one part to compose). Either way, every token in
 * it belongs to that one part, not to a shared skeleton.
 * `tokenPartIndex` folds this into one rule: when a plan contributes at most
 * one distinct part index across all of its tokens, that lone index (or 0,
 * when none of its tokens carry one) owns every token in it, tagged or not.
 * A plan spanning more than one contributing part keeps its own per-token
 * tags: an untagged token there is genuinely shared (a connective, a hoisted
 * qualifier, the terminal punctuation).
 */

import type { SentenceToken } from "@/lib/contract/types";

/** Every distinct part index referenced by at least one token in `plan`. */
export function partsInPlan(plan: SentenceToken[]): Set<number> {
  const parts = new Set<number>();
  for (const token of plan) {
    if (token.part_index != null) parts.add(token.part_index);
  }
  return parts;
}

/**
 * The part `token` belongs to: its own `part_index` when the plan tagged it.
 * Otherwise, when `planParts` (from `partsInPlan(plan)`) names at most one
 * part, that lone part owns it too, the single-contributing-part rule.
 * `null` only when the plan genuinely spans more than one part and this
 * particular token carries no tag of its own (shared/hoisted).
 */
export function tokenPartIndex(
  token: SentenceToken,
  planParts: Set<number>,
): number | null {
  if (token.part_index != null) return token.part_index;
  if (planParts.size === 0) return 0;
  if (planParts.size === 1) return [...planParts][0];
  return null;
}
