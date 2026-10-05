/**
 * Similarity prototype API: embeds `query` and each `target`/`candidate` string
 * via the Gemini embedding API and scores them by cosine similarity against the
 * Spanner/DFO gate thresholds (see `classifyScore`).
 *
 * DELIBERATE EXCEPTION: this app proxies search through dfo-apis instead of
 * calling engines directly from the container. This route is a deliberate,
 * temporary exception to that pattern — dfo-apis has no embeddings endpoint
 * (confirmed against its live OpenAPI spec), and adding one is a cross-repo +
 * Terraform change not worth it for a prototype slated for removal. Do not
 * treat the direct call to Google below as precedent for new work.
 *
 * When no `GEMINI_API_KEY`/`GOOGLE_API_KEY` is configured, requests fall back
 * to a deterministic pseudo-embedding (`generateDeterministicVector`) so the
 * UI stays usable offline. If a key IS configured but the upstream call fails,
 * this route returns 502 rather than silently substituting fake vectors for
 * real ones — a fake score rendered as a real one is worse than an explicit
 * error.
 */
import { NextRequest, NextResponse } from "next/server";
import {
  ALLOWED_DIMENSIONS,
  ALLOWED_TASK_TYPES,
  AMBIGUITY_MARGIN,
  DEFAULT_DIMENSIONS,
  DEFAULT_TASK_TYPE,
  EMBEDDING_MODEL,
  MAX_CANDIDATES,
  MAX_REQUEST_BODY_BYTES,
  MAX_TEXT_LENGTH,
  type CandidateResult,
  type SimilarityResponse,
  type SimilaritySource,
  type SimilarityTier,
} from "@/lib/contract/similarity";

/**
 * Exact cosine similarity between two float vectors.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 0;
  return Math.max(-1, Math.min(1, dot / denom));
}

/**
 * Classifies a cosine score against Data Commons Spanner & DFO gate thresholds.
 */
export function classifyScore(score: number): {
  tier: SimilarityTier;
  label: string;
  description: string;
} {
  if (score >= 0.75) {
    return {
      tier: "strong",
      label: "Strong Match",
      description: "Score ≥ 0.75: High confidence for definite slot binding.",
    };
  }
  if (score >= 0.65) {
    return {
      tier: "candidate",
      label: "Candidate Match",
      description:
        "Score 0.65–0.749: Above DFO recall floor (SEARCH_UNKNOWN_SCORE_THRESHOLD = 0.65).",
    };
  }
  if (score >= 0.5) {
    return {
      tier: "spanner_floor",
      label: "Spanner Floor Match",
      description:
        "Score 0.50–0.649: Passes Spanner vector index floor (0.50), but low confidence for definite election.",
    };
  }
  return {
    tier: "below_threshold",
    label: "Below Threshold",
    description:
      "Score < 0.50: Below Spanner vector search cutoff (0.50). Dropped as noise.",
  };
}

// Independent of the route's own ALLOWED_DIMENSIONS request validation: this is
// a defensive cap on the exported function itself, so it stays safe even if a
// future caller forgets to validate first. An unvalidated `dimensions` reaching
// `new Array(dimensions)` here would allow unbounded memory allocation.
const MAX_DETERMINISTIC_VECTOR_DIMENSIONS = Math.max(...ALLOWED_DIMENSIONS);

/**
 * Deterministic pseudo-embedding for testing or offline environments when live Gemini credentials are not supplied.
 * Defaults to DEFAULT_DIMENSIONS components and returns a unit-norm vector.
 */
export function generateDeterministicVector(
  text: string,
  dimensions = 768,
): number[] {
  if (
    !Number.isInteger(dimensions) ||
    dimensions <= 0 ||
    dimensions > MAX_DETERMINISTIC_VECTOR_DIMENSIONS
  ) {
    throw new RangeError(
      `generateDeterministicVector: dimensions must be a positive integer <= ${MAX_DETERMINISTIC_VECTOR_DIMENSIONS}, got ${dimensions}`,
    );
  }
  const normText = text.trim().toLowerCase();
  const vector = new Array(dimensions).fill(0);

  // Tokenize words and character n-grams
  const words = normText.split(/\s+/).filter(Boolean);
  const ngrams: string[] = [...words];

  for (let i = 0; i < normText.length - 2; i++) {
    ngrams.push(normText.slice(i, i + 3));
  }

  for (const token of ngrams) {
    let hash = 2166136261;
    for (let j = 0; j < token.length; j++) {
      hash ^= token.charCodeAt(j);
      hash = Math.imul(hash, 16777619);
    }
    const idx = Math.abs(hash) % dimensions;
    const sign = hash % 2 === 0 ? 1 : -1;
    vector[idx] += sign * (1 + (token.length > 3 ? 1.5 : 0.8));
    const secondaryIdx = Math.abs(hash >> 8) % dimensions;
    vector[secondaryIdx] += hash % 3 === 0 ? 0.5 : -0.5;
  }

  // Normalize to unit length (L2 norm)
  let norm = 0;
  for (let i = 0; i < dimensions; i++) {
    norm += vector[i] * vector[i];
  }
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < dimensions; i++) {
      vector[i] /= norm;
    }
  } else {
    vector[0] = 1.0;
  }
  return vector;
}

/** Raised when a configured key exists but the upstream embedding call fails; carries no URL/key. */
class UpstreamEmbeddingError extends Error {}

/**
 * Embeds texts via the Gemini Developer API's batch embedding endpoint. Only
 * falls back to a deterministic projection when NO key is configured at all;
 * once a key is present, any upstream failure throws UpstreamEmbeddingError
 * rather than silently substituting fake vectors.
 */
async function embedTextsWithGoogle(
  texts: string[],
  taskType: string,
  dimensions: number,
): Promise<{ embeddings: number[][]; source: SimilaritySource }> {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (!geminiKey) {
    return {
      embeddings: texts.map((t) => generateDeterministicVector(t, dimensions)),
      source: "deterministic_projection",
    };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:batchEmbedContents`;
  const requests = texts.map((text) => ({
    model: `models/${EMBEDDING_MODEL}`,
    content: { parts: [{ text }] },
    taskType,
    outputDimensionality: dimensions,
  }));

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": geminiKey,
      },
      body: JSON.stringify({ requests }),
    });
  } catch (err) {
    console.error(
      "Similarity: embedding request failed to reach upstream:",
      err,
    );
    throw new UpstreamEmbeddingError("Failed to reach the embedding service");
  }

  if (!res.ok) {
    console.error(
      `Similarity: upstream embedding call returned status ${res.status}`,
    );
    throw new UpstreamEmbeddingError(
      `Embedding service returned an error (status ${res.status})`,
    );
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch (err) {
    console.error(
      "Similarity: failed to parse upstream embedding response:",
      err,
    );
    throw new UpstreamEmbeddingError(
      "Embedding service returned a malformed response",
    );
  }

  const rawEmbeddings = (data as { embeddings?: unknown } | null)?.embeddings;
  if (!Array.isArray(rawEmbeddings) || rawEmbeddings.length !== texts.length) {
    console.error(
      "Similarity: upstream embedding response was malformed or short",
      {
        received: Array.isArray(rawEmbeddings)
          ? rawEmbeddings.length
          : typeof rawEmbeddings,
        expected: texts.length,
      },
    );
    throw new UpstreamEmbeddingError(
      "Embedding service returned a malformed response",
    );
  }

  const rawVectors = rawEmbeddings.map(
    (e) => (e as { values?: unknown })?.values,
  );

  // Every vector must match the requested dimensionality exactly (a length
  // mismatch — including a shorter-than-expected one — would otherwise either
  // make cosineSimilarity silently return 0 for the offending pair, or make the
  // `dimensions` we report back untrue of what was actually compared) and every
  // component must be a finite number (a non-numeric or NaN/Infinity component
  // would otherwise poison the cosine math and still render as a normal score).
  const hasInvalidVector = rawVectors.some((v) => {
    if (!Array.isArray(v) || v.length !== dimensions) return true;
    return v.some((x) => typeof x !== "number" || !Number.isFinite(x));
  });
  if (hasInvalidVector) {
    console.error(
      "Similarity: upstream embedding response contained a vector with the wrong shape or non-finite values",
      { expectedDimensions: dimensions },
    );
    throw new UpstreamEmbeddingError(
      "Embedding service returned a malformed response",
    );
  }

  return { embeddings: rawVectors as number[][], source: "live_genai" };
}

// Minimal per-instance rate limiter: a SINGLE global fixed-window counter,
// roughly 30 requests/minute across ALL clients on this instance — not
// per-client. It is deliberately not keyed by IP: nginx-app.conf sets no
// `proxy_set_header X-Forwarded-For`, so that header is entirely
// attacker-controlled, and a map keyed by an attacker-controlled string with no
// eviction is itself an unbounded-memory vulnerability. Resets on instance
// restart/scale; no shared state across instances — acceptable for guarding
// this internal prototype.
//
// Known, accepted tradeoff: because the counter is global, one abuser can
// exhaust the whole 30/min budget and lock out every other user on this
// instance. That's deliberate, not an oversight — this is an internal
// prototype behind a dev URL, and a spoof-proof cap that occasionally blocks
// everyone beats a per-key cap that can itself be turned into a memory DoS.
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 60_000;
let rateLimitCount = 0;
let rateLimitWindowStart = 0;

function checkRateLimit(): { limited: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  if (now - rateLimitWindowStart >= RATE_LIMIT_WINDOW_MS) {
    rateLimitWindowStart = now;
    rateLimitCount = 1;
    return { limited: false, retryAfterSeconds: 0 };
  }
  rateLimitCount += 1;
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((RATE_LIMIT_WINDOW_MS - (now - rateLimitWindowStart)) / 1000),
  );
  return { limited: rateLimitCount > RATE_LIMIT_MAX, retryAfterSeconds };
}

/** Test-only: resets the rate limiter's window so tests can't bleed into each other. */
export function resetRateLimitForTests(): void {
  rateLimitCount = 0;
  rateLimitWindowStart = 0;
}

function isAllowedDimensions(
  value: unknown,
): value is (typeof ALLOWED_DIMENSIONS)[number] {
  return (
    typeof value === "number" &&
    (ALLOWED_DIMENSIONS as readonly number[]).includes(value)
  );
}

function isAllowedTaskType(
  value: unknown,
): value is (typeof ALLOWED_TASK_TYPES)[number] {
  return (
    typeof value === "string" &&
    (ALLOWED_TASK_TYPES as readonly string[]).includes(value)
  );
}

export async function POST(request: NextRequest) {
  const start = performance.now();

  // Cheap guard against oversized payloads, checked before we read the body at
  // all. `content-length` is client-supplied and can be absent entirely under
  // chunked transfer encoding, so this is defense-in-depth alongside — not a
  // replacement for — nginx's default `client_max_body_size` (1 MiB), which
  // already rejects oversized bodies at the proxy layer before Next sees them.
  const contentLength = Number(request.headers.get("content-length"));
  if (contentLength > MAX_REQUEST_BODY_BYTES) {
    return NextResponse.json(
      { error: "Request body too large" },
      { status: 413 },
    );
  }

  const rateLimit = checkRateLimit();
  if (rateLimit.limited) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      },
    );
  }

  let parsedBody: unknown;
  try {
    parsedBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed JSON body" }, { status: 400 });
  }

  if (
    typeof parsedBody !== "object" ||
    parsedBody === null ||
    Array.isArray(parsedBody)
  ) {
    return NextResponse.json(
      { error: "Request body must be a JSON object" },
      { status: 400 },
    );
  }
  const body = parsedBody as Record<string, unknown>;

  try {
    const query = typeof body.query === "string" ? body.query.trim() : "";
    const target = typeof body.target === "string" ? body.target.trim() : "";
    const rawCandidates: string[] = Array.isArray(body.candidates)
      ? body.candidates
          .map((c: unknown) => (typeof c === "string" ? c.trim() : ""))
          .filter(Boolean)
      : [];

    if (!query) {
      return NextResponse.json(
        { error: "Query string is required" },
        { status: 400 },
      );
    }

    // Case-insensitive dedup: keep the first-seen casing for display.
    const candidateList: string[] = [];
    const seenKeys = new Set<string>();
    const addCandidate = (text: string) => {
      const key = text.toLowerCase();
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        candidateList.push(text);
      }
    };
    if (target) addCandidate(target);
    for (const c of rawCandidates) addCandidate(c);

    if (candidateList.length === 0) {
      return NextResponse.json(
        {
          error: "At least one target or candidate StatVar string is required",
        },
        { status: 400 },
      );
    }

    if (candidateList.length > MAX_CANDIDATES) {
      return NextResponse.json(
        {
          error: `At most ${MAX_CANDIDATES} candidates (including target) are allowed`,
        },
        { status: 400 },
      );
    }

    if ([query, ...candidateList].some((t) => t.length > MAX_TEXT_LENGTH)) {
      return NextResponse.json(
        {
          error: `Query, target, and candidate text must each be at most ${MAX_TEXT_LENGTH} characters`,
        },
        { status: 400 },
      );
    }

    const rawTaskType = body.taskType ?? DEFAULT_TASK_TYPE;
    if (!isAllowedTaskType(rawTaskType)) {
      return NextResponse.json(
        { error: `taskType must be one of: ${ALLOWED_TASK_TYPES.join(", ")}` },
        { status: 400 },
      );
    }
    const taskType = rawTaskType;

    const rawDimensions = body.dimensions ?? DEFAULT_DIMENSIONS;
    if (!isAllowedDimensions(rawDimensions)) {
      return NextResponse.json(
        {
          error: `dimensions must be one of: ${ALLOWED_DIMENSIONS.join(", ")}`,
        },
        { status: 400 },
      );
    }
    const dimensions = rawDimensions;

    // Embed query + all candidates in one batch
    const allTexts = [query, ...candidateList];
    const { embeddings, source } = await embedTextsWithGoogle(
      allTexts,
      taskType,
      dimensions,
    );

    const queryVector = embeddings[0];
    const candidateVectors = embeddings.slice(1);

    // Index-aligned with candidateVectors; candidateList is already deduped
    // (case-insensitively), so every key is unique. Used below to look up the
    // WINNING candidate's vector after sorting, since candidateVectors stays in
    // pre-sort input order while scoredCandidates does not.
    const vectorByText = new Map<string, number[]>(
      candidateList.map((text, idx) => [text, candidateVectors[idx]]),
    );

    // Compute scores for each candidate
    const scoredCandidates: CandidateResult[] = candidateList.map(
      (text, idx) => {
        const vec = candidateVectors[idx];
        const score = cosineSimilarity(queryVector, vec);
        const distance = 1 - score;
        const { tier, label, description } = classifyScore(score);
        return {
          text,
          score: Math.round(score * 10000) / 10000,
          distance: Math.round(distance * 10000) / 10000,
          tier,
          tierLabel: label,
          description,
          deltaToNext: null,
          rank: 1,
        };
      },
    );

    // Sort descending by score
    scoredCandidates.sort((a, b) => b.score - a.score);
    scoredCandidates.forEach((c, idx) => {
      c.rank = idx + 1;
      if (idx < scoredCandidates.length - 1) {
        c.deltaToNext =
          Math.round((c.score - scoredCandidates[idx + 1].score) * 10000) /
          10000;
      }
    });

    const primaryCandidate = scoredCandidates[0];
    const isAmbiguous =
      scoredCandidates.length > 1 &&
      scoredCandidates[0].score - scoredCandidates[1].score < AMBIGUITY_MARGIN;

    // vectorByText is built from the same candidateList every scoredCandidate's
    // text comes from, so this lookup always succeeds.
    const primaryVector = vectorByText.get(primaryCandidate.text);
    if (!primaryVector) {
      throw new Error(
        `Similarity: internal error — no vector found for primary candidate "${primaryCandidate.text}"`,
      );
    }

    // Vector preview inspection (first 8 components + norm) — the WINNING
    // candidate's vector, not necessarily the first one typed.
    const previewLen = 8;
    const queryVectorPreview = queryVector
      .slice(0, previewLen)
      .map((v) => Math.round(v * 10000) / 10000);
    const targetVectorPreview = primaryVector
      .slice(0, previewLen)
      .map((v) => Math.round(v * 10000) / 10000);

    const queryNorm = Math.sqrt(queryVector.reduce((sum, v) => sum + v * v, 0));
    const targetNorm = Math.sqrt(
      primaryVector.reduce((sum, v) => sum + v * v, 0),
    );

    const latencyMs = Math.round(performance.now() - start);

    const response: SimilarityResponse = {
      query,
      model: EMBEDDING_MODEL,
      dimensions,
      taskType,
      latencyMs,
      primaryScore: primaryCandidate.score,
      primaryDistance: primaryCandidate.distance,
      primaryTier: primaryCandidate.tier,
      primaryTierLabel: primaryCandidate.tierLabel,
      primaryDescription: primaryCandidate.description,
      isAmbiguous,
      ambiguityMargin: AMBIGUITY_MARGIN,
      candidates: scoredCandidates,
      vectorPreview: {
        queryVectorPreview,
        targetVectorPreview,
        queryNorm: Math.round(queryNorm * 10000) / 10000,
        targetNorm: Math.round(targetNorm * 10000) / 10000,
      },
      source,
    };

    return NextResponse.json(response);
  } catch (err) {
    if (err instanceof UpstreamEmbeddingError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    console.error("Similarity: unexpected error handling request:", err);
    return NextResponse.json(
      { error: "Internal similarity error" },
      { status: 500 },
    );
  }
}
