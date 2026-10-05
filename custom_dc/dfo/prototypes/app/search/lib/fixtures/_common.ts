/**
 * Shared helpers for the fixture set. Keep fixtures terse and consistent.
 *
 * TEST DATA ONLY — never imported by runtime code. Fixtures are deterministic,
 * versioned canned ResolveResponses used as unit-test input for hard-to-trigger
 * states. They are NOT a mock of the engine's resolution logic — only of its
 * output contract.
 */

import { CURRENT_SCHEMA_VERSION } from "@/lib/contract/version";
import type {
  Diagnostics,
  GraphRef,
  QueryEcho,
  ResolveResponse,
  Spec,
  Warning,
} from "@/lib/contract/types";

export function ref(dcid: string, label: string): GraphRef {
  return { dcid, label };
}

/** A terse fixture Warning from a message (illustrative code/severity). */
export function warn(message: string): Warning {
  return { code: "FIXTURE", severity: "warn", message };
}

export function diagnostics(overrides: Partial<Diagnostics> = {}): Diagnostics {
  return {
    engine_build: "fixture",
    warnings: [],
    timing_ms: { total: 0 },
    ...overrides,
  };
}

export function echo(overrides: Partial<QueryEcho>): QueryEcho {
  return {
    entry_path: "raw_text",
    variable_text: [],
    extract_skipped: false,
    ...overrides,
  };
}

/** Wrap a Spec as a single-part `definite` envelope at the current schema
 *  version. The part's own rendered_sentence/sentence_plan stay null, as on
 *  the wire — a definite spec's sentence lives on the spec itself. */
export function definite(spec: Spec, query_echo: QueryEcho): ResolveResponse {
  return {
    schema_version: CURRENT_SCHEMA_VERSION,
    status: "definite",
    query_echo,
    diagnostics: diagnostics(),
    parts: [
      {
        status: "definite",
        variable_text: query_echo.variable_text[0] ?? null,
        warnings: [],
        timing_ms: null,
        rendered_sentence: null,
        sentence_plan: null,
        spec,
      },
    ],
  };
}
