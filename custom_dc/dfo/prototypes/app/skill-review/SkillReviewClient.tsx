"use client";

/**
 * /skill-review: Skill Comparison Review client.
 *
 * A reviewer types a development-finance question once, and the page POSTs
 * it to /api/skill-compare, which runs the same question through two
 * identical Gemini tool-calling loops (one that can discover and load the
 * DFO skills, one that cannot) and returns both answers labelled only `a`
 * and `b`, in randomised order. The reviewer reads both, unlabelled, picks a
 * winner (or a tie) and writes why, and only then does the page call
 * /api/skill-rating and reveal which answer had skill access and what it
 * chose to load. See lib/contract/skillCompare.ts for the full shapes.
 *
 * Blinding: every pane stays anonymous until a rating is submitted.
 * `compareResult.revealToken` is round-tripped to the rating request unread,
 * and per-arm `toolCalls` from the compare response are never rendered,
 * since a pane showing `load_skill` calls would reveal which arm had skills
 * as surely as a label would. Only the rating response's
 * `withSkillsArm`/`skillsLoaded` are shown, after submission.
 *
 * The passphrase gate is server-side on every /api/skill-compare and
 * /api/skill-rating call, not a separate login step. The page just remembers
 * a working passphrase in localStorage so a reviewer types it once, and
 * re-prompts (without losing the in-progress question or rating) on a 401.
 *
 * The compare call runs 10 to 40 seconds (two full Gemini tool-calling
 * loops, not a quarter-second embedding lookup), so the loading state shows
 * elapsed time and says plainly that both answers are being generated. A
 * reviewer staring at a bare spinner that long will assume the page hung and
 * reload. The elapsed counter is the fix.
 */

import { useCallback, useEffect, useId, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/cn";
import type {
  SkillCompareArmResult,
  SkillCompareRatingRequest,
  SkillCompareRatingResponse,
  SkillCompareRequest,
  SkillCompareResponse,
  SkillCompareWinner,
} from "@/lib/contract/skillCompare";
import { MAX_QUESTION_LENGTH } from "@/lib/contract/skillCompare";

/** localStorage key for the remembered passphrase. Wrapped in try/catch at
 *  every access point below, since it throws in some browsers' private
 *  modes. */
const PASSPHRASE_STORAGE_KEY = "dfo-skill-review-passphrase";

type Phase = "gate" | "question" | "loading" | "results" | "rated";

/** Which in-flight action a wrong passphrase interrupted, so re-entering it
 *  resumes that action instead of dropping the reviewer back at the start. */
type ResumeAction = "compare" | "rate" | null;

type ApiError = Error & { status?: number };

async function postJson<TRequest, TResponse>(
  path: string,
  body: TRequest,
): Promise<TResponse> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}) as { error?: string });
    const err = new Error(
      data.error || `Request failed (${res.status})`,
    ) as ApiError;
    err.status = res.status;
    throw err;
  }

  return res.json();
}

function readStoredPassphrase(): string {
  try {
    return window.localStorage.getItem(PASSPHRASE_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function storePassphrase(value: string): void {
  try {
    window.localStorage.setItem(PASSPHRASE_STORAGE_KEY, value);
  } catch {
    // Private mode or blocked storage. The passphrase still lives in React
    // state for this session. It will not be remembered next visit.
  }
}

/** sessionStorage key for the in-progress question, compare result, and
 *  draft rating. Wrapped in try/catch at every access point, same reason as
 *  the passphrase helpers above: a reviewer who refreshes or closes the tab
 *  after waiting 10 to 40 seconds for two already-billed model calls keeps
 *  both answers and any in-progress verdict. */
const SESSION_STORAGE_KEY = "dfo-skill-review-session";

interface StoredSession {
  question: string;
  compareResult: SkillCompareResponse | null;
  winner: SkillCompareWinner | null;
  why: string;
}

function readStoredSession(): StoredSession | null {
  try {
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredSession> | null;
    if (typeof parsed !== "object" || parsed === null) return null;
    return {
      question: typeof parsed.question === "string" ? parsed.question : "",
      compareResult: parsed.compareResult ?? null,
      winner: parsed.winner ?? null,
      why: typeof parsed.why === "string" ? parsed.why : "",
    };
  } catch {
    return null;
  }
}

function storeSession(state: StoredSession): void {
  try {
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private mode or blocked storage. The in-progress question and verdict
    // still live in React state for this render. They will not survive a
    // refresh or a closed tab.
  }
}

function clearStoredSession(): void {
  try {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Nothing to clean up if storage never worked in the first place.
  }
}

const WINNER_OPTIONS: Array<{ value: SkillCompareWinner; label: string }> = [
  { value: "a", label: "Answer A was better" },
  { value: "b", label: "Answer B was better" },
  { value: "tie", label: "About the same" },
];

function armFailed(arm: SkillCompareArmResult): boolean {
  return arm.answer === null && arm.error !== null;
}

/** The reviewer's own question, shown above the two answer panes so it stays
 *  in view while they read, judge, and write their comment, including after
 *  a page refresh restores an in-progress session. Rendered as plain text
 *  with line breaks preserved, never as markdown or HTML, since it is the
 *  reviewer's own typed input. Kept visually secondary and height-capped
 *  with its own scroll, since the answers below are what's being judged and
 *  a long question must not push them off screen. */
function AskedQuestion({ question }: { question: string }) {
  return (
    <section
      aria-label="The question you asked"
      className="rounded-2xl border border-g2 bg-g1/50 p-4 sm:p-5 space-y-1"
    >
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-g4">
        You asked
      </h2>
      <p className="text-[13px] leading-relaxed text-g5 whitespace-pre-wrap break-words max-h-28 overflow-y-auto">
        {question}
      </p>
    </section>
  );
}

/** Tailwind classes for each Markdown element in an answer. The app has no
 *  typography plugin, and Preflight strips list bullets and heading sizes, so
 *  every element the models emit gets its styling here. Raw HTML in an answer
 *  is escaped, which is react-markdown's default. */
const answerMarkdownComponents: Components = {
  p: ({ node: _node, ...props }) => <p className="my-3 first:mt-0 last:mb-0" {...props} />,
  ul: ({ node: _node, ...props }) => <ul className="my-3 list-disc space-y-1.5 pl-5" {...props} />,
  ol: ({ node: _node, ...props }) => <ol className="my-3 list-decimal space-y-1.5 pl-5" {...props} />,
  li: ({ node: _node, ...props }) => <li className="pl-1 [&>ol]:my-1.5 [&>ul]:my-1.5" {...props} />,
  h1: ({ node: _node, ...props }) => <h3 className="mt-5 mb-2 text-[15px] font-semibold text-g6" {...props} />,
  h2: ({ node: _node, ...props }) => <h3 className="mt-5 mb-2 text-[15px] font-semibold text-g6" {...props} />,
  h3: ({ node: _node, ...props }) => <h4 className="mt-4 mb-2 text-[14px] font-semibold text-g6" {...props} />,
  h4: ({ node: _node, ...props }) => <h4 className="mt-4 mb-2 text-[14px] font-semibold text-g6" {...props} />,
  strong: ({ node: _node, ...props }) => <strong className="font-semibold text-g6" {...props} />,
  a: ({ node: _node, ...props }) => (
    <a className="underline underline-offset-2" target="_blank" rel="noreferrer" {...props} />
  ),
  code: ({ node: _node, ...props }) => (
    <code className="rounded bg-g1 px-1 py-0.5 text-[13px]" {...props} />
  ),
  blockquote: ({ node: _node, ...props }) => (
    <blockquote className="my-3 border-l-2 border-g2 pl-3 text-g5" {...props} />
  ),
  table: ({ node: _node, ...props }) => (
    <div className="my-3 overflow-x-auto">
      <table className="w-full border-collapse text-[13px]" {...props} />
    </div>
  ),
  th: ({ node: _node, ...props }) => (
    <th className="border-b border-g2 px-2 py-1.5 text-left font-semibold" {...props} />
  ),
  td: ({ node: _node, ...props }) => <td className="border-b border-g1 px-2 py-1.5" {...props} />,
};

/** One answer pane. Renders the arm's prose, or its error if it failed. It
 *  never renders tool calls, since that would leak the blind. */
function AnswerPane({
  label,
  arm,
}: {
  label: string;
  arm: SkillCompareArmResult;
}) {
  return (
    <section
      aria-label={`Answer ${label}`}
      className="rounded-2xl border border-g2 bg-white p-5 sm:p-6 shadow-sm space-y-3 min-w-0"
    >
      <h2 className="text-[12px] font-bold uppercase tracking-wider text-g4">
        Answer {label}
      </h2>
      {armFailed(arm) ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-[13px] text-red-800"
        >
          <p className="font-semibold">This answer failed to generate.</p>
          <p>{arm.error}</p>
        </div>
      ) : (
        <>
          <div className="text-[14px] leading-relaxed text-g6 break-words">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={answerMarkdownComponents}>
              {arm.answer ?? ""}
            </ReactMarkdown>
          </div>
          {arm.truncated && (
            <p className="text-[12px] text-g5 italic">
              This answer was cut off at the length limit.
            </p>
          )}
        </>
      )}
    </section>
  );
}

export default function SkillReviewClient() {
  const passphraseInputId = useId();
  const questionInputId = useId();
  const whyInputId = useId();

  const [phase, setPhase] = useState<Phase>("gate");
  const [passphrase, setPassphrase] = useState("");
  const [passphraseDraft, setPassphraseDraft] = useState("");
  const [passphraseError, setPassphraseError] = useState<string | null>(null);
  const [resumeAction, setResumeAction] = useState<ResumeAction>(null);

  const [question, setQuestion] = useState("");
  const [compareError, setCompareError] = useState<string | null>(null);
  const [compareResult, setCompareResult] =
    useState<SkillCompareResponse | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const [winner, setWinner] = useState<SkillCompareWinner | null>(null);
  const [why, setWhy] = useState("");
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingError, setRatingError] = useState<string | null>(null);
  const [ratingResult, setRatingResult] =
    useState<SkillCompareRatingResponse | null>(null);

  // Read the remembered passphrase after mount only, so the server-rendered
  // and first client render both show the gate. Reading localStorage during
  // render would desync them and cause a hydration mismatch.
  useEffect(() => {
    const stored = readStoredPassphrase();
    if (stored) {
      setPassphrase(stored);
      setPassphraseDraft(stored);
      setPhase("question");
    }
  }, []);

  // Restore an in-progress question, compare result, and rating draft after
  // mount, same reasoning and hydration-mismatch guard as the passphrase
  // restore above. A restored compareResult moves straight to the results
  // phase, prefilled with whatever winner/why the reviewer had already
  // chosen. ratingResult stays out of persisted state (see StoredSession),
  // so a restore never resumes into the "rated" phase.
  useEffect(() => {
    const stored = readStoredSession();
    if (!stored) return;
    setQuestion(stored.question);
    setWinner(stored.winner);
    setWhy(stored.why);
    if (stored.compareResult) {
      setCompareResult(stored.compareResult);
      setPhase("results");
    }
  }, []);

  // Persist the in-progress question, compare result, and rating draft on
  // every change, so a refresh or a closed tab keeps two already-billed
  // model calls and any verdict typed so far.
  useEffect(() => {
    storeSession({ question, compareResult, winner, why });
  }, [question, compareResult, winner, why]);

  // Elapsed-time readout for the loading phase. Resets when a new compare
  // call starts, stops (and its interval is cleared) once it leaves loading.
  useEffect(() => {
    if (phase !== "loading") return;
    setElapsedSeconds(0);
    const start = Date.now();
    const id = setInterval(() => {
      setElapsedSeconds(Math.round((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  const runCompare = useCallback(async (q: string, pass: string) => {
    setPhase("loading");
    setCompareError(null);
    try {
      const data = await postJson<SkillCompareRequest, SkillCompareResponse>(
        "/prototype/api/skill-compare",
        { question: q, passphrase: pass },
      );
      setCompareResult(data);
      setWinner(null);
      setWhy("");
      setRatingResult(null);
      setRatingError(null);
      setPhase("results");
    } catch (err) {
      const status = (err as ApiError).status;
      if (status === 401) {
        setPassphraseError("That passphrase didn't work. Enter it again.");
        setResumeAction("compare");
        setPhase("gate");
        return;
      }
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      setCompareError(message);
      setPhase("question");
    }
  }, []);

  const runRating = useCallback(
    async (pass: string) => {
      if (!compareResult || !winner) return;
      setRatingSubmitting(true);
      setRatingError(null);
      try {
        const data = await postJson<
          SkillCompareRatingRequest,
          SkillCompareRatingResponse
        >("/prototype/api/skill-rating", {
          question: question.trim(),
          passphrase: pass,
          winner,
          why: why.trim(),
          revealToken: compareResult.revealToken,
        });
        setRatingResult(data);
        setPhase("rated");
        // A rated verdict has nowhere useful to resume to (ratingResult
        // itself is not persisted), so clear the draft rather than leave a
        // stale compareResult for the next restore to resurrect.
        clearStoredSession();
      } catch (err) {
        const status = (err as ApiError).status;
        if (status === 401) {
          setPassphraseError(
            "That passphrase didn't work. Enter it again to submit your rating.",
          );
          setResumeAction("rate");
          setPhase("gate");
          return;
        }
        const message =
          err instanceof Error ? err.message : "Something went wrong.";
        setRatingError(message);
      } finally {
        setRatingSubmitting(false);
      }
    },
    [compareResult, winner, why, question],
  );

  const handleSubmitPassphrase = () => {
    const trimmed = passphraseDraft.trim();
    if (!trimmed) return;
    setPassphrase(trimmed);
    storePassphrase(trimmed);
    setPassphraseError(null);

    const action = resumeAction;
    setResumeAction(null);
    if (action === "compare" && question.trim()) {
      void runCompare(question.trim(), trimmed);
    } else if (action === "rate" && compareResult && winner) {
      void runRating(trimmed);
    } else {
      setPhase("question");
    }
  };

  const handleSubmitQuestion = () => {
    const trimmed = question.trim();
    if (!trimmed || trimmed.length > MAX_QUESTION_LENGTH) return;
    void runCompare(trimmed, passphrase);
  };

  const handleSubmitRating = () => {
    if (!winner || !why.trim()) return;
    void runRating(passphrase);
  };

  const handleStartOver = () => {
    setQuestion("");
    setCompareResult(null);
    setCompareError(null);
    setWinner(null);
    setWhy("");
    setRatingResult(null);
    setRatingError(null);
    setPhase("question");
    clearStoredSession();
  };

  const bothFailed =
    !!compareResult &&
    armFailed(compareResult.a) &&
    armFailed(compareResult.b);

  const withSkillsLabel: string | null = ratingResult
    ? ratingResult.withSkillsArm === "a"
      ? "A"
      : "B"
    : null;

  return (
    <div className="min-h-screen bg-g1 text-g6 flex flex-col selection:bg-g6 selection:text-white">
      <header className="border-b border-g2 bg-white sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center">
          <div className="flex items-center gap-2 font-semibold text-[14px] text-g6">
            <div className="w-5 h-5 rounded bg-g6 text-white flex items-center justify-center text-[11px] font-mono font-bold">
              D
            </div>
            <span>DFO Prototype · Skill Review</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-g6">
            Skill Review
          </h1>
          <p className="text-[13px] text-g5 max-w-3xl">
            You&apos;re comparing two answers to your own development-finance
            question. One was generated with access to a set of specialized
            reference material, the other was not. Read both, then tell us
            which one is more useful and correct, and why. You&apos;ll find
            out which is which only after you submit your rating.
          </p>
        </div>

        {phase === "gate" && (
          <section
            aria-label="Enter passphrase"
            className="rounded-2xl border border-g2 bg-white p-5 sm:p-6 shadow-sm space-y-4 max-w-md"
          >
            <div className="space-y-1.5">
              <label
                htmlFor={passphraseInputId}
                className="text-[12px] font-semibold uppercase tracking-wider text-g4"
              >
                Passphrase
              </label>
              <input
                id={passphraseInputId}
                type="password"
                value={passphraseDraft}
                onChange={(e) => setPassphraseDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSubmitPassphrase();
                }}
                placeholder="Shared passphrase"
                className="w-full rounded-xl border border-g2 bg-g1/50 px-3.5 py-2.5 text-[14px] text-g6 placeholder:text-g4 focus:border-g6 focus:bg-white focus:outline-none focus:ring-1 focus:ring-g6 transition-all"
              />
            </div>
            {passphraseError && (
              <p role="alert" className="text-[13px] text-red-800">
                {passphraseError}
              </p>
            )}
            <button
              type="button"
              disabled={!passphraseDraft.trim()}
              onClick={handleSubmitPassphrase}
              className={cn(
                "px-5 py-2 rounded-xl text-[14px] font-semibold text-white bg-g6 hover:bg-black transition-all shadow-sm",
                !passphraseDraft.trim() && "opacity-50 cursor-not-allowed",
              )}
            >
              Continue
            </button>
          </section>
        )}

        {phase === "question" && (
          <section
            aria-label="Ask a question"
            className="rounded-2xl border border-g2 bg-white p-5 sm:p-6 shadow-sm space-y-4"
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor={questionInputId}
                  className="text-[12px] font-semibold uppercase tracking-wider text-g4"
                >
                  Your question
                </label>
                <span className="text-[11px] text-g4 font-mono">
                  {Math.max(0, MAX_QUESTION_LENGTH - question.length)}{" "}
                  characters left
                </span>
              </div>
              <textarea
                id={questionInputId}
                rows={4}
                maxLength={MAX_QUESTION_LENGTH}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g. How is grant equivalent ODA different from cash-flow ODA?"
                className="w-full rounded-xl border border-g2 bg-g1/50 px-3.5 py-2.5 text-[14px] text-g6 placeholder:text-g4 focus:border-g6 focus:bg-white focus:outline-none focus:ring-1 focus:ring-g6 transition-all resize-none font-sans"
              />
            </div>

            {compareError && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-4 text-[13px] text-red-800"
              >
                <p className="font-semibold">Request failed</p>
                <p>{compareError}</p>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                disabled={!question.trim()}
                onClick={handleSubmitQuestion}
                className={cn(
                  "px-5 py-2 rounded-xl text-[14px] font-semibold text-white bg-g6 hover:bg-black transition-all shadow-sm",
                  !question.trim() && "opacity-50 cursor-not-allowed",
                )}
              >
                Submit
              </button>
            </div>
          </section>
        )}

        {phase === "loading" && (
          <section
            role="status"
            aria-live="polite"
            aria-label="Generating answers"
            className="rounded-2xl border border-g2 bg-white p-6 sm:p-8 shadow-sm space-y-3 text-center"
          >
            <div className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-g3 border-t-g6 rounded-full animate-spin" />
              <span className="text-[14px] font-semibold text-g6">
                Generating both answers…
              </span>
            </div>
            <p className="text-[13px] text-g5">
              This can take up to 40 seconds. Both answers are being written
              at once. Elapsed: {elapsedSeconds}s
            </p>
          </section>
        )}

        {phase === "results" && compareResult && (
          <div className="space-y-6 animate-enter">
            <AskedQuestion question={question} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnswerPane label="A" arm={compareResult.a} />
              <AnswerPane label="B" arm={compareResult.b} />
            </div>

            {bothFailed ? (
              <section className="rounded-2xl border border-red-200 bg-red-50 p-5 sm:p-6 space-y-3">
                <p className="text-[13px] font-semibold text-red-800">
                  Both answers failed to generate.
                </p>
                <button
                  type="button"
                  onClick={() => void runCompare(question.trim(), passphrase)}
                  className="px-4 py-1.5 rounded-lg border border-red-300 bg-white text-[13px] font-medium text-red-800 hover:bg-red-100 transition-all"
                >
                  Retry
                </button>
              </section>
            ) : (
              <section
                aria-label="Rate the answers"
                className="rounded-2xl border border-g2 bg-white p-5 sm:p-6 shadow-sm space-y-4"
              >
                <fieldset className="space-y-2">
                  <legend className="text-[12px] font-semibold uppercase tracking-wider text-g4">
                    Which answer was better?
                  </legend>
                  <div className="flex flex-wrap gap-3">
                    {WINNER_OPTIONS.map((opt) => (
                      <label
                        key={opt.value}
                        className="inline-flex items-center gap-2 text-[13px] text-g6 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="winner"
                          value={opt.value}
                          checked={winner === opt.value}
                          onChange={() => setWinner(opt.value)}
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div className="space-y-1.5">
                  <label
                    htmlFor={whyInputId}
                    className="text-[12px] font-semibold uppercase tracking-wider text-g4"
                  >
                    Why?
                  </label>
                  <textarea
                    id={whyInputId}
                    rows={3}
                    value={why}
                    onChange={(e) => setWhy(e.target.value)}
                    placeholder="What made it more useful or correct?"
                    className="w-full rounded-xl border border-g2 bg-g1/50 px-3.5 py-2.5 text-[14px] text-g6 placeholder:text-g4 focus:border-g6 focus:bg-white focus:outline-none focus:ring-1 focus:ring-g6 transition-all resize-none font-sans"
                  />
                </div>

                {ratingError && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 p-4 text-[13px] text-red-800"
                  >
                    <p className="font-semibold">Rating not submitted</p>
                    <p>{ratingError}</p>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={!winner || !why.trim() || ratingSubmitting}
                    onClick={handleSubmitRating}
                    className={cn(
                      "px-5 py-2 rounded-xl text-[14px] font-semibold text-white bg-g6 hover:bg-black transition-all shadow-sm",
                      (!winner || !why.trim() || ratingSubmitting) &&
                        "opacity-50 cursor-not-allowed",
                    )}
                  >
                    {ratingSubmitting ? "Submitting…" : "Submit rating"}
                  </button>
                </div>
              </section>
            )}
          </div>
        )}

        {phase === "rated" && compareResult && ratingResult && (
          <div className="space-y-6 animate-enter">
            <AskedQuestion question={question} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnswerPane label="A" arm={compareResult.a} />
              <AnswerPane label="B" arm={compareResult.b} />
            </div>

            <section
              aria-label="Reveal"
              className="rounded-2xl border border-g2 bg-white p-5 sm:p-6 shadow-sm space-y-3"
            >
              <h2 className="text-[12px] font-bold uppercase tracking-wider text-g4">
                Reveal
              </h2>
              <p className="text-[14px] text-g6">
                <strong>Answer {withSkillsLabel}</strong> had access to the
                skills.
              </p>
              {ratingResult.skillsLoaded.length > 0 ? (
                <div className="text-[13px] text-g5">
                  <p>It chose to load:</p>
                  <ul className="list-disc pl-5 mt-1 space-y-0.5">
                    {ratingResult.skillsLoaded.map((name) => (
                      <li key={name} className="font-mono text-g6">
                        {name}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-[13px] text-g5">
                  It didn&apos;t load any skills for this question.
                </p>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleStartOver}
                  className="px-4 py-1.5 rounded-lg border border-g2 bg-g1 text-[13px] font-medium text-g5 hover:text-g6 hover:border-g3 hover:bg-white transition-all shadow-sm"
                >
                  Compare another question
                </button>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
