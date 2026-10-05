/**
 * no_data — "GDP of Atlantis".
 * Nothing to return. The body carries a reason and (optionally) nearest sentences.
 * Coverage does not apply to this status — there is no Spec.
 */

import type { ResolveResponse } from "@/lib/contract/types";
import { CURRENT_SCHEMA_VERSION } from "@/lib/contract/version";
import { echo, diagnostics, warn } from "./_common";

export const noData: ResolveResponse = {
  schema_version: CURRENT_SCHEMA_VERSION,
  status: "no_data",
  query_echo: echo({
    raw_query: "GDP of Atlantis",
    normalized_query: "GDP of Atlantis",
    variable_text: ["GDP"],
  }),
  diagnostics: diagnostics({ warnings: [warn("entity not found")] }),
  parts: [
    {
      status: "no_data",
      variable_text: "GDP",
      warnings: [],
      timing_ms: null,
      rendered_sentence: null,
      sentence_plan: null,
      no_data: {
        // "Atlantis" doesn't resolve to a graph entity.
        reason: "entity_not_resolved",
        // `nearest_real` / `flagged_match` omitted: none offered for this query.
      },
    },
  ],
};
