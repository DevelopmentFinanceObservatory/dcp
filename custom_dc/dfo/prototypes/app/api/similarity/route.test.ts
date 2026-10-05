import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import {
  POST,
  cosineSimilarity,
  classifyScore,
  generateDeterministicVector,
  resetRateLimitForTests,
} from "./route";
import {
  EMBEDDING_MODEL,
  MAX_CANDIDATES,
  MAX_REQUEST_BODY_BYTES,
  MAX_TEXT_LENGTH,
} from "@/lib/contract/similarity";

function makeRequest(
  body: unknown,
  headers: Record<string, string> = {},
): NextRequest {
  return new NextRequest("http://localhost:3000/api/similarity", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

/** Pads a short vector with zeros to the given dimensionality. Zero padding
 * doesn't change cosine similarity or L2 norm relative to the unpadded vector. */
function vec(values: number[], dimensions = 256): number[] {
  return [
    ...values,
    ...new Array(Math.max(0, dimensions - values.length)).fill(0),
  ];
}

const ORIGINAL_GEMINI_KEY = process.env.GEMINI_API_KEY;
const ORIGINAL_GOOGLE_KEY = process.env.GOOGLE_API_KEY;

beforeEach(() => {
  vi.restoreAllMocks();
  delete process.env.GEMINI_API_KEY;
  delete process.env.GOOGLE_API_KEY;
  // The rate limiter is a single global counter (see route.ts); reset it before
  // every test so unrelated tests can't trip or be tripped by each other.
  resetRateLimitForTests();
});

afterEach(() => {
  if (ORIGINAL_GEMINI_KEY === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = ORIGINAL_GEMINI_KEY;
  if (ORIGINAL_GOOGLE_KEY === undefined) delete process.env.GOOGLE_API_KEY;
  else process.env.GOOGLE_API_KEY = ORIGINAL_GOOGLE_KEY;
});

describe("cosineSimilarity", () => {
  it("returns 1 for identical vectors", () => {
    const v = [0.6, 0.8, 0];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1.0, 5);
  });

  it("returns 0 for orthogonal vectors", () => {
    const v1 = [1, 0, 0];
    const v2 = [0, 1, 0];
    expect(cosineSimilarity(v1, v2)).toBeCloseTo(0.0, 5);
  });

  it("returns -1 for opposite vectors", () => {
    const v1 = [0.5, 0.5, 0.5];
    const v2 = [-0.5, -0.5, -0.5];
    expect(cosineSimilarity(v1, v2)).toBeCloseTo(-1.0, 5);
  });

  it("handles empty or mismatched arrays safely", () => {
    expect(cosineSimilarity([], [])).toBe(0);
    expect(cosineSimilarity([1, 2], [1])).toBe(0);
  });
});

describe("classifyScore", () => {
  it("classifies scores >= 0.75 as strong", () => {
    const res = classifyScore(0.78);
    expect(res.tier).toBe("strong");
    expect(res.label).toBe("Strong Match");
  });

  it("classifies scores between 0.65 and 0.749 as candidate", () => {
    const res = classifyScore(0.68);
    expect(res.tier).toBe("candidate");
    expect(res.label).toBe("Candidate Match");
  });

  it("classifies scores between 0.50 and 0.649 as spanner_floor", () => {
    const res = classifyScore(0.55);
    expect(res.tier).toBe("spanner_floor");
    expect(res.label).toBe("Spanner Floor Match");
  });

  it("classifies scores < 0.50 as below_threshold", () => {
    const res = classifyScore(0.35);
    expect(res.tier).toBe("below_threshold");
    expect(res.label).toBe("Below Threshold");
  });
});

describe("generateDeterministicVector", () => {
  it("produces a normalized 768-dimensional unit vector", () => {
    const vec = generateDeterministicVector("Life expectancy female", 768);
    expect(vec).toHaveLength(768);

    const norm = Math.sqrt(vec.reduce((sum, x) => sum + x * x, 0));
    expect(norm).toBeCloseTo(1.0, 4);
  });

  it("produces identical vectors for identical inputs", () => {
    const v1 = generateDeterministicVector("Gross Domestic Product");
    const v2 = generateDeterministicVector("Gross Domestic Product");
    expect(v1).toEqual(v2);
  });

  it("throws on an invalid dimensions argument regardless of the caller", () => {
    // Belt-and-braces: every call site validates dimensions first, but this
    // exported function must not trust that — an unvalidated `dimensions`
    // reaching `new Array(dimensions)` here would allow unbounded memory
    // allocation.
    expect(() => generateDeterministicVector("x", 100000000)).toThrow(
      RangeError,
    );
    expect(() => generateDeterministicVector("x", -1)).toThrow(RangeError);
    expect(() => generateDeterministicVector("x", 0)).toThrow(RangeError);
    expect(() => generateDeterministicVector("x", 1.5)).toThrow(RangeError);
  });
});

describe("POST /api/similarity", () => {
  it("returns 400 if query is missing", async () => {
    const req = makeRequest({ query: "", target: "Count_Person" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it("returns 400 if target and candidates are missing", async () => {
    const req = makeRequest({ query: "Total Population" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("calculates similarity score for a single pair using the deterministic projection when no key is configured", async () => {
    const req = makeRequest({
      query: "female life expectancy at birth",
      target: "LifeExpectancy_Person_Female",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.query).toBe("female life expectancy at birth");
    expect(data.model).toBe(EMBEDDING_MODEL);
    expect(data.dimensions).toBe(768);
    expect(data.taskType).toBe("RETRIEVAL_QUERY");
    expect(data.source).toBe("deterministic_projection");
    expect(typeof data.primaryScore).toBe("number");
    expect(typeof data.primaryDistance).toBe("number");
    expect(data.candidates).toHaveLength(1);
    expect(data.vectorPreview).toBeDefined();
    expect(data.vectorPreview.queryVectorPreview.length).toBe(8);
  });

  it("evaluates ambiguity margin when multiple candidates are provided", async () => {
    const req = makeRequest({
      query: "population of women",
      candidates: [
        "Count_Person_Female",
        "Count_Person_Women",
        "Amount_EconomicActivity_GDP",
      ],
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.candidates).toHaveLength(3);
    expect(data.candidates[0].score).toBeGreaterThanOrEqual(
      data.candidates[1].score,
    );
    expect(data.candidates[1].score).toBeGreaterThanOrEqual(
      data.candidates[2].score,
    );
    expect(typeof data.isAmbiguous).toBe("boolean");
    expect(data.ambiguityMargin).toBe(0.025);
  });

  it("flags isAmbiguous true when the top two scores land within the margin", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        embeddings: [
          { values: vec([1, 0]) }, // query
          { values: vec([1, 0]) }, // candidate A -> score 1.0
          { values: vec([1, 0.05]) }, // candidate B -> score ~0.99875
        ],
      }),
    });

    const req = makeRequest({
      query: "population",
      candidates: ["Count_Person_A", "Count_Person_B"],
      dimensions: 256,
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.isAmbiguous).toBe(true);
    expect(data.candidates[0].score - data.candidates[1].score).toBeLessThan(
      0.025,
    );
  });

  it("uses the deterministic projection and reports its source when no key is configured", async () => {
    const req = makeRequest({
      query: "total population",
      target: "Count_Person",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.source).toBe("deterministic_projection");
  });

  it("calls the live Gemini API when a key is configured, reporting the pinned model and a clean outgoing request", async () => {
    process.env.GEMINI_API_KEY = "super-secret-key";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        embeddings: [
          { values: vec([1, 0, 0]) },
          { values: vec([0.9, 0.1, 0]) },
        ],
      }),
    });
    global.fetch = fetchMock;

    const req = makeRequest({
      query: "female life expectancy",
      target: "LifeExpectancy_Person_Female",
      dimensions: 256,
      taskType: "SEMANTIC_SIMILARITY",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.source).toBe("live_genai");
    expect(data.model).toBe(EMBEDDING_MODEL);
    expect(data.dimensions).toBe(256);
    expect(data.taskType).toBe("SEMANTIC_SIMILARITY");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl, calledInit] = fetchMock.mock.calls[0];

    // The key must travel in a header, never in the URL.
    expect(String(calledUrl)).not.toContain("key=");
    expect(String(calledUrl)).not.toContain("super-secret-key");
    expect(calledInit.headers["x-goog-api-key"]).toBe("super-secret-key");

    const sentBody = JSON.parse(calledInit.body as string);
    expect(sentBody.requests[0].model).toBe(`models/${EMBEDDING_MODEL}`);
    expect(sentBody.requests[0].outputDimensionality).toBe(256);
    expect(sentBody.requests[0].taskType).toBe("SEMANTIC_SIMILARITY");
  });

  it("returns the WINNING candidate's vector in the preview, not the first-typed one", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        embeddings: [
          { values: vec([1, 0]) }, // query
          { values: vec([0, 1]) }, // Count_Person_Female (typed first) -> score 0
          { values: vec([1, 0]) }, // Count_Person_Women (typed second) -> score 1.0, the winner
        ],
      }),
    });

    const req = makeRequest({
      query: "population of women",
      candidates: ["Count_Person_Female", "Count_Person_Women"],
      dimensions: 256,
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.candidates[0].text).toBe("Count_Person_Women");
    expect(data.primaryScore).toBe(1);
    // Preview must describe the WINNER (values [1,0]), not the first-typed
    // candidate Count_Person_Female (values [0,1]).
    expect(data.vectorPreview.targetVectorPreview[0]).toBe(1);
    expect(data.vectorPreview.targetVectorPreview[1]).toBe(0);
    expect(data.vectorPreview.targetNorm).toBe(1);
  });

  it("returns 502 and no fake data when the upstream call returns a non-2xx status", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ error: "unavailable" }),
    });

    const req = makeRequest({ query: "population", target: "Count_Person" });
    const res = await POST(req);
    expect(res.status).toBe(502);
    const data = await res.json();
    expect(data.error).toBeDefined();
    expect(data.source).toBeUndefined();
    expect(data.candidates).toBeUndefined();
  });

  it("returns 502 when the upstream fetch call rejects", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    global.fetch = vi.fn().mockRejectedValue(new Error("network unreachable"));

    const req = makeRequest({ query: "population", target: "Count_Person" });
    const res = await POST(req);
    expect(res.status).toBe(502);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it("returns 502 when an upstream vector contains non-numeric values", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        embeddings: [
          { values: vec([1, 0]) }, // query: valid
          { values: new Array(256).fill("a") }, // target: right length, wrong type
        ],
      }),
    });

    const req = makeRequest({
      query: "population",
      target: "Count_Person",
      dimensions: 256,
    });
    const res = await POST(req);
    expect(res.status).toBe(502);
    const data = await res.json();
    expect(data.candidates).toBeUndefined();
  });

  it("returns 502 when an upstream vector's length doesn't match the requested dimensions", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        embeddings: [
          { values: [1, 0, 0] }, // only 3 dims, but 256 was requested
          { values: [0.9, 0.1, 0] },
        ],
      }),
    });

    const req = makeRequest({
      query: "population",
      target: "Count_Person",
      dimensions: 256,
    });
    const res = await POST(req);
    expect(res.status).toBe(502);
  });

  it("returns 502 when an upstream vector contains NaN, Infinity, or null", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        embeddings: [
          { values: vec([1, 0]) }, // query: valid
          { values: [NaN, Infinity, null, ...new Array(253).fill(0)] }, // target: 256 long, but poisoned
        ],
      }),
    });

    const req = makeRequest({
      query: "population",
      target: "Count_Person",
      dimensions: 256,
    });
    const res = await POST(req);
    expect(res.status).toBe(502);
  });

  it.each([["abc"], [100000000], [-1], [0]])(
    "returns 400 for invalid dimensions %p",
    async (dimensions) => {
      const req = makeRequest({
        query: "population",
        target: "Count_Person",
        dimensions,
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    },
  );

  it("returns 400 for an invalid taskType", async () => {
    const req = makeRequest({
      query: "population",
      target: "Count_Person",
      taskType: "NOT_A_REAL_TASK_TYPE",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when candidate count (including target) exceeds MAX_CANDIDATES", async () => {
    const candidates = Array.from(
      { length: MAX_CANDIDATES + 1 },
      (_, i) => `Candidate_${i}`,
    );
    const req = makeRequest({ query: "population", candidates });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when a candidate exceeds MAX_TEXT_LENGTH", async () => {
    const req = makeRequest({
      query: "population",
      target: "x".repeat(MAX_TEXT_LENGTH + 1),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for a malformed JSON body", async () => {
    const req = makeRequest("{not valid json");
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it("returns 400 (not 500) for a JSON body that parses to null", async () => {
    // JSON.parse("null") succeeds and yields null, so this must be guarded
    // explicitly — otherwise the first property access below throws into the
    // catch-all and this becomes a 500 that logs a stack on every request.
    const req = makeRequest("null");
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it("returns 400 for a top-level array JSON body", async () => {
    const req = makeRequest("[1, 2, 3]");
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it("returns 413 when content-length exceeds MAX_REQUEST_BODY_BYTES", async () => {
    const req = makeRequest(
      { query: "population", target: "Count_Person" },
      { "content-length": String(MAX_REQUEST_BODY_BYTES + 1) },
    );
    const res = await POST(req);
    expect(res.status).toBe(413);
  });

  it("dedups target/candidates case-insensitively, keeping the first-seen casing", async () => {
    const req = makeRequest({
      query: "population",
      target: "Count_Person",
      candidates: ["count_person", "COUNT_PERSON"],
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.candidates).toHaveLength(1);
    expect(data.candidates[0].text).toBe("Count_Person");
  });

  it("returns 429 with a Retry-After header after exceeding the per-instance rate limit", async () => {
    let lastRes: Response | undefined;
    for (let i = 0; i < 31; i++) {
      lastRes = await POST(
        makeRequest({ query: "population", target: "Count_Person" }),
      );
    }
    expect(lastRes?.status).toBe(429);
    const retryAfter = lastRes?.headers.get("Retry-After");
    expect(retryAfter).toBeTruthy();
    expect(Number(retryAfter)).toBeGreaterThan(0);
  });
});
