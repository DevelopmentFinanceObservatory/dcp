"use client";

/**
 * /search surface laid out to the DC Search wireframes.
 *
 * Arrival: eyebrow + heading + prominent search bar + starter pills. Result:
 * a slim search bar, then one composed sentence for the whole result, every
 * part's own phrase in query order, sharing connectives and hoisted
 * qualifiers the way the engine composed them, with a compact line per
 * variable underneath for anything the hero can't show once there's more
 * than one part, and one data preview unioning every definite part's rows.
 * A single-variable query is one phrase and one row set. Loading shows one
 * sentence-shaped placeholder naming every expected variable; errors get a
 * recovery surface.
 *
 * Reads from specStore, synchronizing query and spec_id to URL parameters
 * (?q=... and ?spec=...) when there is exactly one part. A multi-part
 * result has no single spec_id to represent it in that grammar, so its share
 * link carries just the query.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useShallow } from "zustand/react/shallow";
import type { Part, PartStatus } from "@/lib/contract/types";
import { useSpecStore } from "./lib/store";
import type { PartView } from "./lib/store/specStore";
import {
  ArrivalView,
  type ArrivalItem,
  ComposedSentence,
  DebugPanel,
  LoadingSkeleton,
  SearchBar,
  SharePopover,
} from "./components";
import { ErrorView } from "./components/states/ErrorView";
import { cn } from "@/lib/cn";

export { computeAddableDimensions } from "./components/computeAddableDimensions";

const ARRIVAL_ITEMS: ArrivalItem[] = [
  {
    query: "total population of Kenya",
    primary: "total population of Kenya",
    secondary: "single series (65 observations)",
  },
  {
    query: "life expectancy in Kenya and Uganda",
    primary: "life expectancy in Kenya and Uganda",
    secondary: "two countries compared",
  },
  {
    query: "GDP per capita in Brazil since 1990",
    primary: "GDP per capita in Brazil",
    secondary: "economic trend since 1990",
  },
  {
    query: "CO2 emissions per capita in Mexico since 1970",
    primary: "CO2 emissions per capita in Mexico",
    secondary: "climate & emissions since 1970",
  },
  {
    query: "health expenditure per capita in Colombia",
    primary: "health expenditure in Colombia",
    secondary: "health system financing",
  },
  {
    query: "fertility rate in Rwanda since 2010",
    primary: "fertility rate in Rwanda",
    secondary: "demographic rate since 2010",
  },
];

/** This part's own status line, used verbatim when there's exactly one part
 *  and folded into the run tally otherwise. */
function partStatusText(part: Part | null): string {
  switch (part?.status) {
    case "definite":
      return "Click any phrase to refine.";
    case "candidates":
      return "Ambiguous query. Pick the reading you mean.";
    case "no_data":
      return "No data for this query.";
    case "unsupported":
      return part.unsupported.detail || "This part couldn't be answered.";
    default:
      return "";
  }
}

/** One run-level summary line for a multi-part result: "2 results", "1
 *  result, 1 to select". Counts by outcome rather than by part, so it reads
 *  as a result tally, not a part tally. */
function runSummary(parts: PartView[]): string {
  const counts: Record<PartStatus, number> = {
    definite: 0,
    candidates: 0,
    no_data: 0,
    unsupported: 0,
  };
  for (const pv of parts) {
    if (pv.part) counts[pv.part.status] += 1;
  }
  const bits: string[] = [];
  if (counts.definite)
    bits.push(`${counts.definite} result${counts.definite === 1 ? "" : "s"}`);
  if (counts.candidates) bits.push(`${counts.candidates} to select`);
  if (counts.no_data) bits.push(`${counts.no_data} no data`);
  if (counts.unsupported) bits.push(`${counts.unsupported} unsupported`);
  return bits.join(", ");
}

/** The toolbar status line: run-level notice for loading/error, this part's
 *  own status line when there's one part, else the multi-part result tally. */
function runNotice(
  status: "idle" | "loading" | "ready" | "error",
  parts: PartView[],
): string {
  if (status === "error") return "";
  if (status === "loading") return "Finding what you asked for…";
  if (status !== "ready" || parts.length === 0) return "";
  if (parts.length === 1) return partStatusText(parts[0].part);
  return runSummary(parts);
}

/** A rejected edit's own message, prefixed by that part's variable text,
 *  shown where the toolbar shows a run-level failure, since a per-part edit
 *  failure never takes the whole run to the "error" state (see
 *  PartView.editError). The first part carrying one wins; a second edit
 *  clears the first's editError before it can start. */
function partEditErrorText(parts: PartView[]): string | null {
  const pv = parts.find((p) => p.editError != null);
  if (!pv) return null;
  return pv.variableText ? `${pv.variableText}: ${pv.editError}` : pv.editError;
}

function partAnnouncement(pv: PartView): string {
  if (!pv.part) return "";
  if (pv.part.status === "definite" && pv.viewModel) {
    return `${pv.viewModel.sentence.map((p) => p.text).join(" ")} · ${pv.viewModel.coverage.summary}`;
  }
  return partStatusText(pv.part);
}

/** Text announced to assistive tech when the result settles (not during
 *  loading): one run-level line for a multi-part result, this part's own
 *  single-sentence announcement for one part. */
function runAnnouncement(
  status: "idle" | "loading" | "ready" | "error",
  error: string | null,
  parts: PartView[],
): string {
  if (status === "error") return error ?? "Something went wrong.";
  if (status !== "ready" || parts.length === 0) return "";
  if (parts.length === 1) return partAnnouncement(parts[0]);
  const summary = runSummary(parts);
  const perBlock = parts
    .map(
      (pv, i) =>
        `${pv.variableText ?? `part ${i + 1}`}: ${partAnnouncement(pv)}`,
    )
    .join(" ");
  return `${summary}. ${perBlock}`;
}

export default function SearchClient() {
  // Scoped `useShallow` selectors: each subscription only triggers a
  // re-render when a field it actually reads changes.
  const { status, error, canUndo, canRedo, editPending } = useSpecStore(
    useShallow((s) => ({
      status: s.status,
      error: s.error,
      canUndo: s.canUndo,
      canRedo: s.canRedo,
      editPending: s.editPending,
    })),
  );
  const {
    parts,
    expectedParts,
    response,
    lastEditedSlot,
    telemetry,
    warnings,
  } = useSpecStore(
    useShallow((s) => ({
      parts: s.parts,
      expectedParts: s.expectedParts,
      response: s.response,
      lastEditedSlot: s.lastEditedSlot,
      telemetry: s.telemetry,
      warnings: s.warnings,
    })),
  );
  // Actions are stable references (defined once by `create`). Grouping them
  // behind one shallow-compared selector costs nothing and keeps the call
  // site tidy.
  const {
    resolve,
    runSpecId,
    editSlot,
    editDonor,
    editShared,
    undo,
    redo,
    cancel,
    retry,
    reset,
    chooseSpec,
    refineText,
  } = useSpecStore(
    useShallow((s) => ({
      resolve: s.resolve,
      runSpecId: s.runSpecId,
      editSlot: s.editSlot,
      editDonor: s.editDonor,
      editShared: s.editShared,
      undo: s.undo,
      redo: s.redo,
      cancel: s.cancel,
      retry: s.retry,
      reset: s.reset,
      chooseSpec: s.chooseSpec,
      refineText: s.refineText,
    })),
  );
  const [query, setQuery] = useState("");
  // Platform-aware shortcut hint (⌘ on mac, Ctrl elsewhere). Detected after
  // mount to avoid an SSR/hydration mismatch. The tooltip only shows on
  // hover anyway.
  const [isMac, setIsMac] = useState(false);
  useEffect(() => {
    setIsMac(
      /Mac|iPhone|iPad|iPod/i.test(
        navigator.userAgent + " " + (navigator.platform ?? ""),
      ),
    );
  }, []);
  const undoTitle = `Undo (${isMac ? "⌘Z" : "Ctrl+Z"})`;
  const redoTitle = `Redo (${isMac ? "⌘⇧Z" : "Ctrl+Shift+Z"})`;

  // Bumped by undo/redo/cancel/start-over. ComposedSentence closes its own
  // open editor on this even on the rare step where its own props don't
  // otherwise change identity.
  const [stepGeneration, setStepGeneration] = useState(0);

  // ⌘Z / ⌘⇧Z (Ctrl on non-mac) step through history, unless typing in a field.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "z") return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))
      )
        return;
      e.preventDefault();
      const s = useSpecStore.getState();
      if (e.shiftKey) {
        if (s.canRedo) {
          setStepGeneration((g) => g + 1);
          s.redo();
          setQuery(useSpecStore.getState().queryText ?? "");
        }
      } else if (s.canUndo) {
        setStepGeneration((g) => g + 1);
        s.undo();
        setQuery(useSpecStore.getState().queryText ?? "");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Escape cancels a pending edit. A popover that's open at the time handles
  // its own Escape (closing itself) independently of this.
  useEffect(() => {
    if (editPending == null) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      e.preventDefault();
      handleCancel();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editPending]);

  async function runQuery(q: string) {
    setQuery(q);
    await resolve(q);
  }

  function undoEdit() {
    setStepGeneration((g) => g + 1);
    undo();
    setQuery(useSpecStore.getState().queryText ?? "");
  }

  function redoEdit() {
    setStepGeneration((g) => g + 1);
    redo();
    setQuery(useSpecStore.getState().queryText ?? "");
  }

  // Cancelling a resolve restores the last committed result (or idle). The
  // search bar's typed text needs to catch up so it matches what's now
  // showing.
  function handleCancel() {
    cancel();
    const s = useSpecStore.getState();
    if (s.status !== "idle") setQuery(s.queryText ?? "");
  }

  const [shareOpen, setShareOpen] = useState(false);

  // Sync state to URL and hydrate from it.
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const qParam = searchParams.get("q");
    const specParam = searchParams.get("spec");
    if (qParam) {
      setQuery(qParam);
      void runQuery(qParam);
    } else if (specParam) {
      void runSpecId(specParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ?spec=/?q= auto-push follows the single-spec grammar: only meaningful
  // when the result is exactly one part. A multi-part result has no single
  // spec_id to represent it here. Its share link carries just the query
  // instead.
  useEffect(() => {
    if (status !== "ready" || parts.length !== 1) return;
    const pv = parts[0];
    if (pv.part?.status !== "definite" || !pv.viewModel?.specId) return;
    const url = new URL(window.location.href);
    const effectiveQ = query || (useSpecStore.getState().queryText ?? "");
    const newSpec = pv.viewModel.specId;
    const currentQ = url.searchParams.get("q") ?? "";
    const currentSpec = url.searchParams.get("spec") ?? "";

    if (currentQ !== effectiveQ || currentSpec !== newSpec) {
      if (effectiveQ) {
        url.searchParams.set("q", effectiveQ);
      } else {
        url.searchParams.delete("q");
      }
      url.searchParams.set("spec", newSpec);
      window.history.pushState(null, "", url.toString());
    }
  }, [status, parts, query]);

  useEffect(() => {
    const handlePopState = () => {
      const searchParams = new URLSearchParams(window.location.search);
      const qParam = searchParams.get("q");
      const specParam = searchParams.get("spec");
      if (qParam) {
        setQuery(qParam);
        void runQuery(qParam);
      } else if (specParam) {
        void runSpecId(specParam);
      } else {
        setStepGeneration((g) => g + 1);
        setQuery("");
        reset();
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startOver() {
    setStepGeneration((g) => g + 1);
    setQuery("");
    reset();
    window.history.pushState(null, "", window.location.pathname);
  }

  const partError = partEditErrorText(parts);
  const statusText =
    editPending != null ? "Updating…" : (partError ?? runNotice(status, parts));
  // Styled as a failure whenever the visible text actually is one: a
  // run-level transport error, or a rejected edit's own message once no new
  // edit on that part is in flight to supersede it.
  const showAsError =
    Boolean(error) || (editPending == null && partError != null);
  const active = status !== "idle";

  const announcement = runAnnouncement(status, error, parts);

  const shareQuery = query || (useSpecStore.getState().queryText ?? "");
  const singlePartSpecId =
    parts.length === 1
      ? (parts[0].spec?.spec_id ?? parts[0].viewModel?.specId)
      : undefined;

  return (
    <main
      className={cn(
        "ss-app mx-auto max-w-[960px] px-6 pb-16 pt-8 font-sans text-g6 antialiased",
        active ? "is-active" : "is-home",
      )}
    >
      <div className="sr-only" role="status" aria-live="polite">
        {announcement}
      </div>
      {/* Persistent hero: the search bar stays mounted and animates from the
          centred home position to the slim top bar. Heading + starters collapse. */}
      <div className="ss-hero">
        <div className="ss-hero-head">
          <div className="flex items-center justify-center gap-2">
            <p className="m-0 text-[12px] font-semibold uppercase tracking-[0.08em] text-g4">
              data.one.org / search
            </p>
            <span className="text-g3 text-[12px]">·</span>
            <Link
              href="/similarity"
              className="text-[12px] font-medium text-g5 hover:text-g6 underline transition-colors"
            >
              Vector Similarity Tester →
            </Link>
          </div>
          <h1 className="mb-6 mt-2 text-[40px] font-bold leading-[1.1] tracking-[-0.02em]">
            What data are you looking for?
          </h1>
        </div>
        <SearchBar
          value={query}
          onChange={setQuery}
          onSubmit={(q) => void runQuery(q)}
          slim={active}
          autoFocus={!active}
          busy={status === "loading"}
          onCancel={handleCancel}
        />
        <div className="ss-hero-starters" aria-hidden={active}>
          <ArrivalView items={ARRIVAL_ITEMS} onPick={(q) => void runQuery(q)} />
        </div>
      </div>

      {active && (
        <div className="animate-enter">
          {/* Status + history toolbar, always present once active so the toolbar
              appearing doesn't displace the result. Buttons disable until there's
              history to step through. */}
          <div className="my-5 flex min-h-[36px] items-center gap-2.5">
            <span
              role="status"
              className={cn(
                "flex-1 text-[13px]",
                showAsError
                  ? "rounded-xl border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-[#991b1b]"
                  : "text-g4",
              )}
            >
              {statusText}
              {editPending != null && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="ml-2 cursor-pointer rounded-lg border border-g3 bg-white px-2 py-0.5 text-[12px] text-g5 hover:border-g4 hover:text-g6"
                >
                  Cancel
                </button>
              )}
            </span>
            <div
              className="flex items-center gap-1"
              role="group"
              aria-label="History"
            >
              <button
                type="button"
                onClick={undoEdit}
                disabled={!canUndo}
                aria-label="Undo"
                aria-keyshortcuts="Meta+Z Control+Z"
                title={undoTitle}
                className="inline-flex cursor-pointer items-center rounded-lg border border-g4 bg-white p-2 text-g6 hover:border-g5 hover:bg-g1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-g4 disabled:cursor-default disabled:border-g2 disabled:text-g4 disabled:opacity-50"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M9 14 4 9l5-5" />
                  <path d="M4 9h11a5 5 0 0 1 0 10h-1" />
                </svg>
              </button>
              <button
                type="button"
                onClick={redoEdit}
                disabled={!canRedo}
                aria-label="Redo"
                aria-keyshortcuts="Meta+Shift+Z Control+Shift+Z"
                title={redoTitle}
                className="inline-flex cursor-pointer items-center rounded-lg border border-g4 bg-white p-2 text-g6 hover:border-g5 hover:bg-g1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-g4 disabled:cursor-default disabled:border-g2 disabled:text-g4 disabled:opacity-50"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="m15 14 5-5-5-5" />
                  <path d="M20 9H9a5 5 0 0 0 0 10h1" />
                </svg>
              </button>
              {/* One view-level share, always: the single-spec grammar
                  (?spec=+?q=) when there's exactly one part, else just the
                  run's own ?q= (singlePartSpecId is undefined). */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShareOpen((o) => !o)}
                  title="Share this search permalink"
                  aria-label="Share search link"
                  aria-haspopup="dialog"
                  aria-expanded={shareOpen}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-g4 bg-white px-2.5 py-1.5 text-[13px] text-g6 hover:border-g5 hover:bg-g1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-g4"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                  <span>Share</span>
                </button>

                {shareOpen && (
                  <div className="absolute right-0 top-full mt-2 z-50">
                    <SharePopover
                      specId={singlePartSpecId}
                      query={shareQuery}
                      onClose={() => setShareOpen(false)}
                    />
                  </div>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={startOver}
              className="cursor-pointer rounded-lg border border-g3 bg-white px-2.5 py-1 text-[13px] text-g5 hover:border-g4 hover:text-g6"
            >
              Start over
            </button>
          </div>

          {status === "loading" && (
            <LoadingSkeleton expectedParts={expectedParts} />
          )}

          {status === "ready" && parts.length > 0 && (
            <div className="mt-6 grid gap-6 animate-enter">
              {response?.diagnostics?.warnings &&
                response.diagnostics.warnings.length > 0 && (
                  <p
                    role="status"
                    className="rounded-xl border border-[#fde68a] bg-[#fffbeb] px-3 py-2 text-[13px] text-[#92400e]"
                  >
                    Partial result:{" "}
                    {response.diagnostics.warnings
                      .map((w) => w?.message ?? "")
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}

              <ComposedSentence
                response={response}
                parts={parts}
                editPending={editPending}
                lastEditedSlot={lastEditedSlot}
                onEditSlot={editSlot}
                onEditDonor={editDonor}
                onEditShared={editShared}
                onChooseSpec={chooseSpec}
                onRefineText={refineText}
                stepGeneration={stepGeneration}
                warnings={warnings}
              />

              {/* Dev-only window onto the raw engine payload. Never ships to
                  users (gated on NODE_ENV) and collapsed by default. */}
              {process.env.NODE_ENV !== "production" && response && (
                <DebugPanel
                  response={response}
                  extra={{
                    status,
                    telemetry,
                    warnings,
                    parts: parts.map((pv, i) => ({
                      index: i,
                      status: pv.part?.status,
                      warnings: pv.part?.warnings,
                      timingMs: pv.part?.timing_ms,
                    })),
                  }}
                />
              )}
            </div>
          )}

          {status === "error" && (
            <div className="mt-6 animate-enter">
              <ErrorView
                message={error ?? "Something went wrong."}
                onRetry={() => void retry()}
                onReset={startOver}
              />
            </div>
          )}
        </div>
      )}
    </main>
  );
}
