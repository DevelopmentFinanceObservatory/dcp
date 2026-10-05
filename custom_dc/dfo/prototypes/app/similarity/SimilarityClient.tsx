"use client";

/**
 * /similarity — Vector Similarity Tester client.
 *
 * Single-page tool: pick a query string plus either one target StatVar name
 * ("pair" mode) or a batch of candidate StatVar names, POST to
 * /api/similarity via `computeSimilarity`, and render the scored result —
 * primary score/tier, threshold gauge, ambiguity check, ranked candidate
 * table, and an optional raw-vector inspector. Side B takes names, not
 * DCIDs, because the production Spanner vector index embeds StatVar names
 * (human-readable labels), never DCIDs.
 *
 * Honesty guardrail: when the backend has no embedding API key configured, it
 * falls back to hash-derived synthetic vectors (`source:
 * "deterministic_projection"`), flagged with an unmissable warning near the
 * score. The cosine math is real; the *vectors* aren't real embeddings, so
 * the score must not be read as real match quality.
 *
 * The header badge and vector-inspector title read `result.model` /
 * `result.dimensions` once a result exists, falling back to the fixed
 * request defaults (`EMBEDDING_MODEL`/`DEFAULT_DIMENSIONS`) beforehand —
 * always accurate, since the client never requests anything else. The route
 * rejects a returned vector whose length doesn't match the requested
 * `dimensions` (502) before ever reporting it, so an on-screen result can't
 * misrepresent its model or dimensions.
 */

import { useState, useEffect, useCallback, useId } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import type {
  SimilarityResponse,
  SimilarityRequest,
  CandidateResult,
  SimilarityTier,
} from "@/lib/contract/similarity";
import {
  EMBEDDING_MODEL,
  DEFAULT_DIMENSIONS,
  DEFAULT_TASK_TYPE,
} from "@/lib/contract/similarity";
import { computeSimilarity } from "@/lib/client/similarityClient";

interface PresetPair {
  label: string;
  category: string;
  query: string;
  target: string;
  candidates?: string[];
}

/**
 * DCID provenance for the names below. Each name is the `label` the DFO
 * graph returns for that DCID (GET /api/graph/node/{dcid} on dfo-dev), copied
 * verbatim. Kept here so the presets stay auditable; never sent to the API or
 * rendered. Listed DCID first, name second, so a name that drifts can be
 * re-checked against its source.
 *
 *   LifeExpectancy_Person_Female
 *     Female Life Expectancy
 *   LifeExpectancy_Person
 *     Life Expectancy
 *   Count_Person_Female
 *     Female population
 *   sdg/SH_DYN_MORT.AGE--Y0T4
 *     Under-five mortality rate [under 5 years old]
 *   sdg/DC_TOF_HLTHL
 *     Total official development assistance to medical research and basic health sectors, gross disbursement
 *   sdg/DC_TOF_HLTHNT
 *     Total official development assistance to medical research and basic health sectors, net disbursement
 *   sdg/DC_ODA_BDVDL
 *     Total official development assistance for biodiversity
 *   sdg/DC_ODA_POVDLG
 *     Official development assistance grants for poverty reduction
 *   Amount_EconomicActivity_GrossDomesticProduction_Nominal_PerCapita
 *     Nominal gross domestic product per capita
 *   Amount_EconomicActivity_GrossNationalIncome_PurchasingPowerParity_PerCapita
 *     Gross National Income Based on Purchasing Power Parity Per Capita
 *   RealValue_GrowthRate_Amount_EconomicActivity_GrossDomesticProduction
 *     Growth rate amount of economic activity (real value): gross domestic production
 *   sdg/GR_G14_GDP
 *     Total government revenue as a proportion of GDP
 *   sdg/DT_TDS_DECT
 *     Debt service as a proportion of exports of goods and services
 *   Amount_Stock_AsFractionOf_Amount_EconomicActivity_GrossDomesticProduction_Nominal
 *     Stock Value as a Percentage of Nominal GDP
 *   Count_Person_NotEnrolledInSchool
 *     Population Not Currently Enrolled in School
 *   Count_Student_PrimaryEducation
 *     Count of student: primary education
 *   Count_Person_EducationalAttainmentPrimarySchool
 *     Population: years 25 onwards, primary school
 *   Amount_Emissions_CarbonDioxide_PerCapita
 *     CO2 Emissions Per Capita
 *   sdg/EN_ATM_CO2GDP
 *     Carbon dioxide emissions per unit of GDP PPP
 *   Annual_Emissions_GreenhouseGas
 *     Annual amount of emissions: greenhouse gas
 *   sdg/EG_FEC_RNEW
 *     Renewable energy share in the total final energy consumption
 */
const PRESETS: PresetPair[] = [
  {
    label: "Life Expectancy",
    category: "Health",
    query: "female life expectancy at birth in Kenya",
    target: "Female Life Expectancy",
    candidates: [
      "Female Life Expectancy",
      "Life Expectancy",
      "Female population",
      "Under-five mortality rate [under 5 years old]",
    ],
  },
  {
    label: "Health ODA",
    category: "Finance",
    query: "aid for medical research and basic health",
    target:
      "Total official development assistance to medical research and basic health sectors, gross disbursement",
    candidates: [
      "Total official development assistance to medical research and basic health sectors, gross disbursement",
      "Total official development assistance to medical research and basic health sectors, net disbursement",
      "Total official development assistance for biodiversity",
      "Official development assistance grants for poverty reduction",
    ],
  },
  {
    label: "GDP Per Capita",
    category: "Economy",
    query: "GDP per person in Nigeria",
    target: "Nominal gross domestic product per capita",
    candidates: [
      "Nominal gross domestic product per capita",
      "Gross National Income Based on Purchasing Power Parity Per Capita",
      "Growth rate amount of economic activity (real value): gross domestic production",
      "Total government revenue as a proportion of GDP",
    ],
  },
  {
    label: "Debt Service",
    category: "Debt",
    query: "how much of export earnings goes to servicing debt",
    target: "Debt service as a proportion of exports of goods and services",
    candidates: [
      "Debt service as a proportion of exports of goods and services",
      "Stock Value as a Percentage of Nominal GDP",
      "Total government revenue as a proportion of GDP",
      "Nominal gross domestic product per capita",
    ],
  },
  {
    label: "Out of School",
    category: "Education",
    query: "children who are not in school",
    target: "Population Not Currently Enrolled in School",
    candidates: [
      "Population Not Currently Enrolled in School",
      "Count of student: primary education",
      "Population: years 25 onwards, primary school",
      "Female population",
    ],
  },
  {
    label: "CO2 Emissions",
    category: "Climate",
    query: "per capita carbon dioxide emissions",
    target: "CO2 Emissions Per Capita",
    candidates: [
      "CO2 Emissions Per Capita",
      "Carbon dioxide emissions per unit of GDP PPP",
      "Annual amount of emissions: greenhouse gas",
      "Renewable energy share in the total final energy consumption",
    ],
  },
];

/** Distinguishes tiers by weight/border/label, never by hue — the app is
 *  monochrome (see search.css). Mirrors the ss-phrase--bound/--unbound
 *  convention: solid + heavier for definite, dashed + lighter for marginal. */
const TIER_BADGE_CLASS: Record<SimilarityTier, string> = {
  strong: "bg-g6 text-white border-g6 font-semibold",
  candidate: "bg-white text-g6 border-g6 font-semibold",
  spanner_floor: "bg-white text-g5 border-g3 border-dashed font-medium",
  below_threshold: "bg-white text-g4 border-g3 border-dashed font-normal",
};

type SimilarityError = { message: string; status?: number };

/** Lightweight skeleton reusing the `.ss-skel` shimmer (globals.css), shown
 *  while a comparison is in flight, including the auto-fire on mount. */
function SimilarityResultsSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <section className="rounded-2xl border border-g2 bg-white p-6 sm:p-8 shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-g2/70">
          <div className="ss-skel" style={{ height: 14, width: 140 }} />
          <div className="ss-skel" style={{ height: 24, width: 90 }} />
        </div>
        <div className="space-y-2">
          <div className="ss-skel" style={{ height: 12, width: 110 }} />
          <div className="ss-skel" style={{ height: 44, width: 220 }} />
        </div>
        <div className="ss-skel" style={{ height: 16, width: "100%" }} />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-g2/60">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="ss-skel" style={{ height: 44 }} />
          ))}
        </div>
      </section>
    </div>
  );
}

export default function SimilarityClient() {
  const queryInputId = useId();
  const targetInputId = useId();
  const candidatesInputId = useId();

  const [mode, setMode] = useState<"pair" | "batch">("pair");
  const [query, setQuery] = useState(
    "female life expectancy at birth in Kenya",
  );
  const [target, setTarget] = useState("Female Life Expectancy");
  const [batchCandidatesText, setBatchCandidatesText] = useState(
    "Female Life Expectancy\nLife Expectancy\nFemale population\nUnder-five mortality rate [under 5 years old]",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<SimilarityError | null>(null);
  const [result, setResult] = useState<SimilarityResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [showVectors, setShowVectors] = useState(false);

  const executeComparison = useCallback(async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    let candidates: string[] = [];
    if (mode === "pair") {
      if (!target.trim()) {
        setLoading(false);
        setError({ message: "Target StatVar name is required." });
        return;
      }
      candidates = [target.trim()];
    } else {
      candidates = batchCandidatesText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      if (candidates.length === 0) {
        setLoading(false);
        setError({
          message: "At least one candidate StatVar name is required.",
        });
        return;
      }
    }

    const req: SimilarityRequest = {
      query: query.trim(),
      candidates,
      dimensions: DEFAULT_DIMENSIONS,
      taskType: DEFAULT_TASK_TYPE,
    };
    if (mode === "pair") {
      req.target = target.trim();
    }

    try {
      const data = await computeSimilarity(req);
      setResult(data);
    } catch (err) {
      const status = (err as { status?: number } | null)?.status;
      const message =
        err instanceof Error ? err.message : "Failed to compute similarity";
      setError({ message, status });
    } finally {
      setLoading(false);
    }
  }, [query, target, mode, batchCandidatesText]);

  // Initial computation on mount
  useEffect(() => {
    void executeComparison();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSwap = () => {
    if (mode === "pair") {
      const temp = query;
      setQuery(target);
      setTarget(temp);
    }
  };

  const handleApplyPreset = (preset: PresetPair) => {
    setQuery(preset.query);
    setTarget(preset.target);
    if (preset.candidates) {
      setBatchCandidatesText(preset.candidates.join("\n"));
    }
  };

  const handleCopySummary = async () => {
    if (!result) return;
    const topDelta = result.candidates[0]?.deltaToNext;
    const summary = [
      `Query: "${result.query}"`,
      mode === "pair"
        ? `StatVar: "${result.candidates[0]?.text}"`
        : `Top StatVar: "${result.candidates[0]?.text}" (of ${result.candidates.length} candidates)`,
      `Cosine Score: ${result.primaryScore.toFixed(4)} (${result.primaryTierLabel})`,
      `Distance: ${result.primaryDistance.toFixed(4)}`,
      `Model: ${result.model} (${result.dimensions}d, ${result.taskType})`,
      result.isAmbiguous
        ? `Ambiguity Alert: Top 2 candidates separated by only Δ = ${(result.candidates[0].score - result.candidates[1].score).toFixed(4)} (< ${result.ambiguityMargin} threshold)`
        : `Confidence Gap: ${topDelta != null ? `Δ = ${topDelta.toFixed(4)}` : "n/a"}`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const badgeModel = result?.model ?? EMBEDDING_MODEL;
  const badgeDimensions = result?.dimensions ?? DEFAULT_DIMENSIONS;
  const isSynthetic = result?.source === "deterministic_projection";

  return (
    <div className="min-h-screen bg-g1 text-g6 flex flex-col selection:bg-g6 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="border-b border-g2 bg-white sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link
              href="/search"
              className="flex items-center gap-2 font-semibold text-[14px] text-g6 hover:opacity-80 transition-opacity"
            >
              <div className="w-5 h-5 rounded bg-g6 text-white flex items-center justify-center text-[11px] font-mono font-bold">
                D
              </div>
              <span>DFO Prototype</span>
            </Link>

            <nav className="flex items-center gap-1">
              <Link
                href="/search"
                className="px-3 py-1.5 rounded-lg text-[13px] font-medium text-g5 hover:text-g6 hover:bg-g1 transition-colors"
              >
                Sentence Search
              </Link>
              <span className="px-3 py-1.5 rounded-lg text-[13px] font-semibold text-g6 bg-g1 border border-g2/80 shadow-sm">
                Vector Similarity
              </span>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-g1 border border-g2 text-[12px] font-mono text-g5">
              <span className="w-1.5 h-1.5 rounded-full bg-g5 animate-pulse" />
              {badgeModel} · {badgeDimensions}d
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Surface */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Title & Scope */}
        <div className="space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-g6">
                Vector Similarity Tester
              </h1>
              <p className="text-[13px] text-g4">
                Evaluate cosine similarity scores against Google&apos;s{" "}
                <code className="font-mono text-g5">{EMBEDDING_MODEL}</code>{" "}
                embedding model under Data Commons / Spanner resolution settings
                (
                <code className="font-mono text-g5">
                  task_type: {DEFAULT_TASK_TYPE}
                </code>
                , {DEFAULT_DIMENSIONS} dimensions).
              </p>
            </div>

            {/* Mode Switcher */}
            <div className="inline-flex rounded-lg border border-g2 bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setMode("pair")}
                className={cn(
                  "px-3 py-1 text-[13px] font-medium rounded-md transition-all",
                  mode === "pair"
                    ? "bg-g6 text-white shadow-sm"
                    : "text-g5 hover:text-g6",
                )}
              >
                Single Pair
              </button>
              <button
                type="button"
                onClick={() => setMode("batch")}
                className={cn(
                  "px-3 py-1 text-[13px] font-medium rounded-md transition-all",
                  mode === "batch"
                    ? "bg-g6 text-white shadow-sm"
                    : "text-g5 hover:text-g6",
                )}
              >
                Batch Candidates
              </button>
            </div>
          </div>

          {/* Preset Buttons */}
          <div className="pt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-[12px] text-g4 font-medium mr-1">
              Presets:
            </span>
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-g2 bg-white text-[12px] text-g5 hover:text-g6 hover:border-g3 transition-all"
              >
                <span className="text-g4 text-[10px]">[{preset.category}]</span>
                <span>{preset.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Input Card */}
        <section
          aria-label="Input comparison strings"
          className="rounded-2xl border border-g2 bg-white p-5 sm:p-6 shadow-sm space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
            {/* Input A: Query */}
            <div className="md:col-span-5 space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor={queryInputId}
                  className="text-[12px] font-semibold uppercase tracking-wider text-g4"
                >
                  String A · Natural Language Query
                </label>
                <span className="text-[11px] text-g4 font-mono">
                  {query.length} chars
                </span>
              </div>
              <textarea
                id={queryInputId}
                rows={mode === "batch" ? 4 : 3}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. female life expectancy at birth in Kenya"
                className="w-full rounded-xl border border-g2 bg-g1/50 px-3.5 py-2.5 text-[14px] text-g6 placeholder:text-g4 focus:border-g6 focus:bg-white focus:outline-none focus:ring-1 focus:ring-g6 transition-all resize-none font-sans"
              />
            </div>

            {/* Middle Action / Swap */}
            <div className="md:col-span-2 flex md:flex-col items-center justify-center self-center py-2 md:py-0">
              {mode === "pair" ? (
                <button
                  type="button"
                  onClick={handleSwap}
                  title="Swap input strings"
                  className="w-9 h-9 rounded-full border border-g2 bg-g1 flex items-center justify-center text-g5 hover:text-g6 hover:border-g3 hover:bg-white transition-all shadow-sm"
                >
                  ⇄
                </button>
              ) : (
                <div className="text-[12px] font-semibold text-g4 uppercase">
                  vs
                </div>
              )}
            </div>

            {/* Input B: StatVar Target or Batch Candidates */}
            <div className="md:col-span-5 space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor={mode === "pair" ? targetInputId : candidatesInputId}
                  className="text-[12px] font-semibold uppercase tracking-wider text-g4"
                >
                  {mode === "pair"
                    ? "String B · Target StatVar Name"
                    : "Candidate StatVar Names (one per line)"}
                </label>
                <span className="text-[11px] text-g4 font-mono">
                  {mode === "pair"
                    ? `${target.length} chars`
                    : `${batchCandidatesText.split("\n").filter(Boolean).length} items`}
                </span>
              </div>

              {mode === "pair" ? (
                <textarea
                  id={targetInputId}
                  rows={3}
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="e.g. Female Life Expectancy"
                  className="w-full rounded-xl border border-g2 bg-g1/50 px-3.5 py-2.5 text-[13px] text-g6 placeholder:text-g4 focus:border-g6 focus:bg-white focus:outline-none focus:ring-1 focus:ring-g6 transition-all resize-none font-sans"
                />
              ) : (
                <textarea
                  id={candidatesInputId}
                  rows={4}
                  value={batchCandidatesText}
                  onChange={(e) => setBatchCandidatesText(e.target.value)}
                  placeholder="e.g. Female Life Expectancy (one per line)"
                  className="w-full rounded-xl border border-g2 bg-g1/50 px-3.5 py-2.5 text-[13px] text-g6 placeholder:text-g4 focus:border-g6 focus:bg-white focus:outline-none focus:ring-1 focus:ring-g6 transition-all resize-none font-sans"
                />
              )}
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-g2/60">
            <div className="flex items-center gap-4 text-[12px] text-g4">
              <span>
                Task:{" "}
                <code className="font-mono text-g5">{DEFAULT_TASK_TYPE}</code>
              </span>
              <span>
                Metric:{" "}
                <code className="font-mono text-g5">Cosine Distance</code>
              </span>
              <span>
                Dimensions:{" "}
                <code className="font-mono text-g5">{DEFAULT_DIMENSIONS}</code>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => void executeComparison()}
                className={cn(
                  "px-5 py-2 rounded-xl text-[14px] font-semibold text-white bg-g6 hover:bg-black transition-all shadow-sm inline-flex items-center gap-2",
                  loading && "opacity-75 cursor-not-allowed",
                )}
              >
                {loading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Computing...
                  </>
                ) : (
                  <>
                    Compute Similarity
                    <span className="text-[10px] text-g3 font-mono">⌘↵</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Error State */}
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-[13px] text-red-800 flex items-center justify-between gap-3"
          >
            <div>
              <p className="font-semibold">
                {error.status === 502
                  ? "Embedding service unavailable"
                  : "Request failed"}
              </p>
              <span>{error.message}</span>
            </div>
            <button
              type="button"
              onClick={() => void executeComparison()}
              className="font-medium underline hover:text-red-950 text-[12px] shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {/* Results Presentation */}
        <div role="status" aria-live="polite" aria-busy={loading}>
          {loading && (
            <>
              <span className="sr-only">Computing similarity…</span>
              <SimilarityResultsSkeleton />
            </>
          )}

          {!loading && result && (
            <div className="space-y-6 animate-enter">
              {/* Primary Score Hero Card */}
              <section
                aria-label="Score Overview"
                className="rounded-2xl border border-g2 bg-white p-6 sm:p-8 shadow-sm space-y-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-g2/70">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="text-[12px] font-bold uppercase tracking-wider text-g4">
                        Similarity Result
                      </span>
                      <span
                        className={cn(
                          "px-2.5 py-0.5 rounded-full border text-[11px] uppercase tracking-wide",
                          TIER_BADGE_CLASS[result.primaryTier],
                        )}
                      >
                        {result.primaryTierLabel}
                      </span>
                    </div>
                    <p className="text-[13px] text-g5">
                      {result.primaryDescription}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleCopySummary()}
                      className="px-3 py-1.5 rounded-lg border border-g2 bg-g1 text-[12px] font-medium text-g5 hover:text-g6 hover:border-g3 hover:bg-white transition-all shadow-sm"
                    >
                      {copied ? "Copied Summary!" : "Copy Summary"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowVectors(!showVectors)}
                      className="px-3 py-1.5 rounded-lg border border-g2 bg-g1 text-[12px] font-medium text-g5 hover:text-g6 hover:border-g3 hover:bg-white transition-all shadow-sm"
                    >
                      {showVectors ? "Hide Vector" : "Inspect Vector"}
                    </button>
                  </div>
                </div>

                {/* Synthetic Data Warning — the one sanctioned use of color outside
                    the error banner, matching ExportHubModal's red for hard failures.
                    Rendered whenever the response is hash-derived rather than a real
                    embedding, so the score above can never be mistaken for a measurement. */}
                {isSynthetic && (
                  <div className="rounded-xl border-2 border-red-300 bg-red-50 p-4 text-[13px] text-red-900">
                    <p className="font-bold uppercase tracking-wide text-[11px] text-red-700">
                      Synthetic Data — Not a Real Measurement
                    </p>
                    <p className="mt-1">
                      No embedding API key is configured on this environment, so
                      these vectors are hash-derived placeholders, not real{" "}
                      <code className="font-mono">{result.model}</code>{" "}
                      embeddings. The score below does not reflect real match
                      quality. Do not use it to judge results.
                    </p>
                  </div>
                )}

                {/* Big Number & Gauge */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                  {/* Left: Score readout */}
                  <div className="lg:col-span-4 space-y-1">
                    <div className="text-[12px] font-semibold uppercase tracking-wider text-g4">
                      Cosine Similarity
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-g6">
                        {result.primaryScore.toFixed(4)}
                      </span>
                      <span className="text-lg font-medium text-g4 font-mono">
                        ({(result.primaryScore * 100).toFixed(1)}%)
                      </span>
                    </div>
                    <div className="text-[12px] text-g4">
                      Cosine Distance:{" "}
                      <code className="font-mono text-g5">
                        {result.primaryDistance.toFixed(4)}
                      </code>
                    </div>
                  </div>

                  {/* Right: Visual Threshold Gauge */}
                  <div className="lg:col-span-8 space-y-2">
                    <div className="flex justify-between text-[11px] font-mono text-g4">
                      <span>0.00 (Noise)</span>
                      <span>0.50 (Spanner Floor)</span>
                      <span>0.65 (DFO Recall)</span>
                      <span>0.75 (Definite)</span>
                      <span>1.00</span>
                    </div>

                    {/* Meter Track */}
                    <div className="relative w-full h-4 bg-g1 rounded-full overflow-hidden border border-g2">
                      {/* Threshold ticks — neutral, no fill. The cursor plus the
                          labels above carry the meaning; no colored zone bands. */}
                      <div className="absolute inset-y-0 left-[50%] w-px bg-g3" />
                      <div className="absolute inset-y-0 left-[65%] w-px bg-g3" />
                      <div className="absolute inset-y-0 left-[75%] w-px bg-g3" />

                      {/* Cursor indicator */}
                      <div
                        className="absolute top-0 bottom-0 w-2.5 bg-g6 -ml-1.25 rounded-full shadow-md transition-all duration-500 ease-out"
                        style={{
                          left: `${Math.max(0, Math.min(100, result.primaryScore * 100))}%`,
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-g4">
                      <span>Spanner Index Cutoff: 0.50</span>
                      <span>
                        Candidate Ambiguity Margin: {result.ambiguityMargin}
                      </span>
                      <span>Latency: {result.latencyMs}ms</span>
                    </div>
                  </div>
                </div>

                {/* Ambiguity Alert if detected */}
                {result.isAmbiguous && (
                  <div className="rounded-xl border-2 border-g6 bg-g1 p-4 text-[13px] text-g6 space-y-1">
                    <div className="font-semibold">Near-Neighbor Ambiguity</div>
                    <p>
                      Top candidate{" "}
                      <strong className="text-g6">
                        {result.candidates[0]?.text}
                      </strong>{" "}
                      ({result.candidates[0]?.score.toFixed(4)}) and
                      second-ranked candidate{" "}
                      <strong className="text-g6">
                        {result.candidates[1]?.text}
                      </strong>{" "}
                      ({result.candidates[1]?.score.toFixed(4)}) differ by only{" "}
                      <strong>
                        Δ ={" "}
                        {(
                          result.candidates[0].score -
                          result.candidates[1].score
                        ).toFixed(4)}
                      </strong>{" "}
                      (below the{" "}
                      <code className="font-mono">
                        SEARCH_NEAR_MARGIN = {result.ambiguityMargin}
                      </code>{" "}
                      gate).
                    </p>
                    <p className="text-[12px] text-g5">
                      The search engine requires further slot disambiguation
                      before electing this candidate.
                    </p>
                  </div>
                )}

                {/* Technical Metadata Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-g2/60 text-[12px]">
                  <div className="rounded-lg bg-g1/60 p-3 border border-g2/50">
                    <div className="text-g4 font-medium text-[11px]">Model</div>
                    <div className="font-mono font-semibold text-g6 mt-0.5">
                      {result.model}
                    </div>
                  </div>
                  <div className="rounded-lg bg-g1/60 p-3 border border-g2/50">
                    <div className="text-g4 font-medium text-[11px]">
                      Dimensions
                    </div>
                    <div className="font-mono font-semibold text-g6 mt-0.5">
                      {result.dimensions}d (float64)
                    </div>
                  </div>
                  <div className="rounded-lg bg-g1/60 p-3 border border-g2/50">
                    <div className="text-g4 font-medium text-[11px]">
                      Task Type
                    </div>
                    <div className="font-mono font-semibold text-g6 mt-0.5">
                      {result.taskType}
                    </div>
                  </div>
                  <div className="rounded-lg bg-g1/60 p-3 border border-g2/50">
                    <div className="text-g4 font-medium text-[11px]">
                      Resolution Backend
                    </div>
                    <div className="font-mono font-semibold text-g6 mt-0.5 capitalize">
                      {result.source.replace(/_/g, " ")}
                    </div>
                  </div>
                </div>

                {/* Vector Inspector Drawer */}
                {showVectors && result.vectorPreview && (
                  <div className="rounded-xl border border-g2 bg-g1/50 p-4 space-y-3 animate-enter text-[12px]">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-g6">
                        Vector Preview ({result.dimensions} Dimensions)
                      </span>
                      <span className="text-g4 font-mono text-[11px]">
                        Query ||v||: {result.vectorPreview.queryNorm.toFixed(4)}{" "}
                        · Target ||v||:{" "}
                        {result.vectorPreview.targetNorm.toFixed(4)}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <div className="text-[11px] text-g4 font-medium mb-1">
                          Query vector preview (first 8 components):
                        </div>
                        <pre className="p-2.5 rounded-lg bg-white border border-g2 font-mono text-[11px] text-g5 overflow-x-auto">
                          [{result.vectorPreview.queryVectorPreview.join(", ")}{" "}
                          ...]
                        </pre>
                      </div>

                      <div>
                        <div className="text-[11px] text-g4 font-medium mb-1">
                          Target vector preview (first 8 components):
                        </div>
                        <pre className="p-2.5 rounded-lg bg-white border border-g2 font-mono text-[11px] text-g5 overflow-x-auto">
                          [{result.vectorPreview.targetVectorPreview.join(", ")}{" "}
                          ...]
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* Multi-Candidate Table (when candidates >= 2) */}
              {result.candidates.length > 1 && (
                <section
                  aria-label="Ranked Candidates"
                  className="rounded-2xl border border-g2 bg-white p-5 sm:p-6 shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-[14px] font-bold uppercase tracking-wider text-g6">
                      Ranked Candidates ({result.candidates.length})
                    </h2>
                    <span className="text-[12px] text-g4">
                      Sorted by Cosine Similarity
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[13px]">
                      <thead>
                        <tr className="border-b border-g2 text-g4 text-[11px] font-semibold uppercase tracking-wider">
                          <th className="py-2.5 px-3 w-12">Rank</th>
                          <th className="py-2.5 px-3">StatVar Candidate</th>
                          <th className="py-2.5 px-3 w-28">Score</th>
                          <th className="py-2.5 px-3 w-28">Distance</th>
                          <th className="py-2.5 px-3 w-28">Δ to Next</th>
                          <th className="py-2.5 px-3 w-36">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-g2/60">
                        {result.candidates.map((cand: CandidateResult) => (
                          <tr
                            key={cand.text}
                            className={cn(
                              "hover:bg-g1/50 transition-colors",
                              cand.rank === 1 && "bg-g1/30 font-medium",
                            )}
                          >
                            <td className="py-3 px-3 font-mono text-g4">
                              #{cand.rank}
                            </td>
                            <td className="py-3 px-3 font-sans text-[12px] text-g6">
                              <span className="break-words">{cand.text}</span>
                            </td>
                            <td className="py-3 px-3 font-mono font-bold text-g6">
                              {cand.score.toFixed(4)}
                            </td>
                            <td className="py-3 px-3 font-mono text-g4">
                              {cand.distance.toFixed(4)}
                            </td>
                            <td className="py-3 px-3 font-mono text-g4">
                              {cand.deltaToNext !== null
                                ? `+${cand.deltaToNext.toFixed(4)}`
                                : "—"}
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={cn(
                                  "inline-block px-2 py-0.5 rounded-md border text-[11px]",
                                  TIER_BADGE_CLASS[cand.tier],
                                )}
                              >
                                {cand.tierLabel}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
