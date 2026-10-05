/**
 * Schema version handling for the engine contract.
 *
 * The contract is semver "MAJOR.MINOR". A MAJOR bump means the canonical form or
 * hash function changed (breaking); a MINOR bump is additive and backward
 * compatible. The permalink carries a version tag from the first commit so we can
 * detect-or-migrate old links (plan: Stage 7).
 */

import type { SchemaVersion } from "./types";

/** The contract version this build targets. Mirrors the contract doc. */
export const CURRENT_SCHEMA_VERSION: SchemaVersion = "1.0";

function major(v: SchemaVersion): string {
  return String(v).split(".")[0] ?? "";
}

/**
 * A version is supported if its MAJOR matches the current MAJOR. Same MAJOR with a
 * different MINOR is additive and safe to read. A different MAJOR is a breaking
 * change; decodeDefinition reports it as unsupported so callers can prompt a
 * re-run. (Migrating old links is deferred until the engine contract is settled.)
 */
export function isSupportedVersion(v: SchemaVersion): boolean {
  return Boolean(v) && major(v) === major(CURRENT_SCHEMA_VERSION);
}
