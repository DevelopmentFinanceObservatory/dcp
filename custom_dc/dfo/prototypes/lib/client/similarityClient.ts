/**
 * Browser-side client for the /api/similarity vector-comparison endpoint.
 *
 * A single buffered POST — no SSE, no options machinery — so this stays a
 * thin wrapper unlike the fuller `searchClient.ts`: build the request body,
 * parse the JSON response, and turn a non-2xx response into a thrown Error
 * (with the HTTP status attached as `.status`, so callers can tell a 502
 * upstream-embedding failure apart from a 400 validation error).
 *
 * Base URL: `/prototype/api/similarity`, hardcoded. This route lives inside
 * the Next app itself (not proxied to dfo-apis like /api/search/*), so it
 * picks up the app's `basePath: "/prototype"` and the prefix has to be
 * spelled out for `fetch` — same as ExportHubModal's `/prototype/api/download`.
 */

import type {
  SimilarityRequest,
  SimilarityResponse,
} from "../contract/similarity";

export async function computeSimilarity(
  req: SimilarityRequest,
  signal?: AbortSignal,
): Promise<SimilarityResponse> {
  const res = await fetch("/prototype/api/similarity", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
    signal,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}) as { error?: string });
    const err = new Error(
      body.error || `Similarity API error ${res.status}`,
    ) as Error & {
      status?: number;
    };
    err.status = res.status;
    throw err;
  }

  return res.json();
}
