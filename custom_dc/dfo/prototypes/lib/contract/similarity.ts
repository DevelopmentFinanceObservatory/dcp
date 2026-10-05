/**
 * Similarity prototype contract: request/response shapes shared between the
 * `/api/similarity` route and the `SimilarityClient` UI.
 *
 * Single source of truth for both sides, so the API and the client cannot
 * silently drift apart on the response shape. Import types and constants
 * from here rather than redeclaring them in either consumer.
 */

/** Confidence bucket for a cosine score, mirroring the Spanner/DFO gate thresholds. */
export type SimilarityTier =
  "strong" | "candidate" | "spanner_floor" | "below_threshold";

/** Where the embedding vectors actually came from. */
export type SimilaritySource = "live_genai" | "deterministic_projection";

/** The only embedding model this route ever calls. Never accepted from the client. */
export const EMBEDDING_MODEL = "gemini-embedding-001";

/** Output dimensionalities `gemini-embedding-001` supports via `outputDimensionality`. */
export const ALLOWED_DIMENSIONS = [256, 768, 1536, 3072] as const;

/** Task types the Gemini embedding API accepts. */
export const ALLOWED_TASK_TYPES = [
  "RETRIEVAL_QUERY",
  "RETRIEVAL_DOCUMENT",
  "SEMANTIC_SIMILARITY",
  "CLASSIFICATION",
  "CLUSTERING",
] as const;

export const DEFAULT_DIMENSIONS = 768;
export const DEFAULT_TASK_TYPE = "RETRIEVAL_QUERY";

/** Upper bound on candidates (including `target`) accepted per request. */
export const MAX_CANDIDATES = 50;

/** Upper bound on characters for `query`, `target`, and each candidate. */
export const MAX_TEXT_LENGTH = 2000;

/** SEARCH_NEAR_MARGIN in dfo-apis: score gap below which the top match is ambiguous. */
export const AMBIGUITY_MARGIN = 0.025;

/**
 * Upper bound on request body size in bytes, checked against the `content-length`
 * header before the body is parsed. `content-length` is client-supplied and can
 * be absent entirely under chunked transfer encoding, so this is defense-in-depth
 * alongside — not a replacement for — nginx's default `client_max_body_size`
 * (1 MiB), which already rejects oversized bodies at the proxy layer.
 */
export const MAX_REQUEST_BODY_BYTES = 256 * 1024;

export interface CandidateResult {
  text: string;
  score: number;
  distance: number;
  tier: SimilarityTier;
  tierLabel: string;
  /**
   * Per-candidate tier rationale, retained for direct API/curl consumers
   * inspecting a specific candidate's classification even though the UI
   * renders only the top-level `primaryDescription`.
   */
  description: string;
  deltaToNext: number | null;
  rank: number;
}

export interface SimilarityRequest {
  query: string;
  target?: string;
  candidates?: string[];
  dimensions?: number;
  taskType?: string;
}

export interface SimilarityResponse {
  query: string;
  model: string;
  dimensions: number;
  taskType: string;
  latencyMs: number;
  primaryScore: number;
  primaryDistance: number;
  primaryTier: SimilarityTier;
  primaryTierLabel: string;
  primaryDescription: string;
  isAmbiguous: boolean;
  ambiguityMargin: number;
  candidates: CandidateResult[];
  vectorPreview?: {
    queryVectorPreview: number[];
    targetVectorPreview: number[];
    queryNorm: number;
    targetNorm: number;
  };
  source: SimilaritySource;
}
