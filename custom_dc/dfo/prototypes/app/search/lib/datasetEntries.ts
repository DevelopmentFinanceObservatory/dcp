/**
 * Pure builder for a `dataset_resubmit` request's `entries` list from the
 * current `parts[]` envelope. No zustand, no React — the store (or a future
 * caller) drives this with its own `Part[]` and folds the result into a
 * request.
 *
 * One entry per part, in order: a definite part becomes an `identity` entry
 * carrying its own current identity and base; a candidates part becomes a
 * `candidates` entry preserving the posted candidate order; a no_data or
 * unsupported part becomes a `placeholder` entry that holds its position
 * without asking the engine to re-evaluate it. `entry_kind: "parsed"` is
 * never emitted here: free-text refine stays a fresh raw_text run.
 *
 * `override` covers the two ways a caller changes what gets built, without
 * this module knowing *why* (editSlot vs. editWindow vs. editDonor vs.
 * pickCandidate are all the caller's concern):
 *  - `{ kind: "edit", index, identity }` replaces one part's identity. The
 *    entry's base (`base_spec_id`/`base_identity`/`removed`/
 *    `resolved_stat_var_dcids`) carries forward from that part's own current
 *    spec via `promoteFromSpec`, same as an unedited identity entry — unless
 *    `asBase` is set, for a pick: the picked identity has no prior state of
 *    its own, so it's posted as both `identity` and `base_identity` (and
 *    `base_spec_id`, when the candidate's own spec_id is given), rather than
 *    carrying forward the candidates part's non-existent "current identity".
 *  - `{ kind: "editShared", rewrite }` applies `rewrite` to every definite
 *    entry's identity in the built list (editShared: the same axis rewritten
 *    across every definite part in one request).
 */

import { promoteFromSpec } from "@/lib/contract/promote";
import type {
  BaseIdentity,
  DatasetCandidateEntry,
  DatasetResubmitEntry,
  Part,
  RemovedParts,
  Spec,
} from "@/lib/contract/types";

export type BuildDatasetEntriesOverride =
  | {
      kind: "edit";
      index: number;
      identity: BaseIdentity;
      /** Post `identity` as both `identity` and `base_identity`/`base_spec_id`
       *  (a pick, which has no prior identity of its own) instead of
       *  deriving the base from the targeted part's current spec. */
      asBase?: { spec_id?: string };
      removed?: RemovedParts;
      resolved_stat_var_dcids?: string[];
    }
  | {
      kind: "editShared";
      rewrite: (identity: BaseIdentity) => BaseIdentity;
    };

/** The identity a Spec carries for resubmit, or a thrown error naming which
 *  spec was missing one — every definite/candidate spec built here is
 *  expected to carry `definition.identity` (set by normalizeSpec off the
 *  engine's own response). */
function requireIdentity(spec: Spec, what: string): BaseIdentity {
  const identity = spec.definition?.identity;
  if (!identity) {
    throw new Error(
      `buildDatasetEntries: ${what} (spec_id=${spec.spec_id}) has no identity to resubmit`,
    );
  }
  return identity;
}

function candidateEntry(spec: Spec): DatasetCandidateEntry {
  return {
    identity: requireIdentity(spec, "candidate spec"),
    resolved_stat_var_dcids: promoteFromSpec(spec).resolved_stat_var_dcids,
  };
}

/** The entry a part builds on its own, with no override applied. */
function entryForPart(part: Part, variable_text: string): DatasetResubmitEntry {
  switch (part.status) {
    case "definite": {
      const promote = promoteFromSpec(part.spec);
      return {
        entry_kind: "identity",
        variable_text,
        identity: requireIdentity(part.spec, "definite part"),
        base_spec_id: promote.base_spec_id,
        base_identity: promote.base_identity,
        removed: promote.removed,
        resolved_stat_var_dcids: promote.resolved_stat_var_dcids,
      };
    }
    case "candidates": {
      const { candidates } = part;
      return {
        entry_kind: "candidates",
        variable_text,
        ordering: candidates.ordering,
        // The door's entry has no max_candidates (C135); truncated is
        // required there even though CandidateSet's own is optional, so a
        // part missing it (shouldn't happen live) still posts a boolean.
        truncated: candidates.truncated ?? false,
        candidates: candidates.specs.map(candidateEntry),
      };
    }
    case "no_data":
      return {
        entry_kind: "placeholder",
        variable_text,
        status: "no_data",
        reason: part.no_data.reason,
      };
    case "unsupported":
      return {
        entry_kind: "placeholder",
        variable_text,
        status: "unsupported",
        code: part.unsupported.code,
      };
  }
}

/** Build one part's edit-override entry (`override.kind === "edit"` and
 *  `override.index === index`). */
function editEntry(
  part: Part,
  index: number,
  variable_text: string,
  override: Extract<BuildDatasetEntriesOverride, { kind: "edit" }>,
): DatasetResubmitEntry {
  if (override.asBase) {
    return {
      entry_kind: "identity",
      variable_text,
      identity: override.identity,
      base_spec_id: override.asBase.spec_id,
      base_identity: override.identity,
      removed: override.removed,
      resolved_stat_var_dcids: override.resolved_stat_var_dcids,
    };
  }
  if (part.status !== "definite") {
    throw new Error(
      `buildDatasetEntries: edit override at index ${index} targets a non-definite part without asBase`,
    );
  }
  const promote = promoteFromSpec(part.spec);
  return {
    entry_kind: "identity",
    variable_text,
    identity: override.identity,
    base_spec_id: promote.base_spec_id,
    base_identity: promote.base_identity,
    removed: override.removed ?? promote.removed,
    resolved_stat_var_dcids:
      override.resolved_stat_var_dcids ?? promote.resolved_stat_var_dcids,
  };
}

/**
 * Build one `dataset_resubmit` `entries` list from the current `parts[]`, in
 * part order. See the module doc comment for `override`'s two shapes.
 */
export function buildDatasetEntries(
  parts: Part[],
  override?: BuildDatasetEntriesOverride,
): DatasetResubmitEntry[] {
  return parts.map((part, index) => {
    // variable_text is required on every entry; a part missing it (only
    // possible for a stale in-memory part that was never restored after a
    // resubmit) contributes an empty string rather than throwing, since a
    // missing name isn't this builder's error to raise.
    const variable_text = part.variable_text ?? "";

    if (override?.kind === "edit" && override.index === index) {
      return editEntry(part, index, variable_text, override);
    }

    const entry = entryForPart(part, variable_text);
    if (override?.kind === "editShared" && entry.entry_kind === "identity") {
      return { ...entry, identity: override.rewrite(entry.identity) };
    }
    return entry;
  });
}
