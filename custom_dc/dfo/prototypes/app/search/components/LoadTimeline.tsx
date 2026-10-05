'use client';

/**
 * LoadTimeline — a plain-language version of the gutcheck event timeline
 * (app/gutcheck/page.tsx), for the user-facing /search load view. Where gutcheck
 * dumps every raw SearchEvent with timestamps and JSON payloads, this shows a
 * single current milestone at a time — the question being read, matched, fetched,
 * answered — advancing as the engine works.
 *
 * It reads the same streamed progress the store captures (loadingSteps +
 * StreamProgress): completed pipeline steps advance the milestone, and the
 * extracted terms / matched shape surface as a detail line, so the user sees what
 * the engine actually understood at this step rather than a generic spinner. A
 * slow timer nudges it forward as a fallback when no steps stream; combined via
 * max(), so real progress always leads and it never steps backward.
 */

import { useEffect, useState } from 'react';
import type { PipelineStepName } from '@/lib/contract/types';
import type { StreamProgress } from '../lib/store/specStore';
import { cn } from '@/lib/cn';

/** One user-facing milestone. Both `label` and `detail` read the streamed
 *  progress so the message names what the engine actually understood (the
 *  variables, places, and matched dataset) rather than staying generic — while
 *  falling back to a plain phrase before anything has streamed. */
type Stage = {
  label: (p: StreamProgress) => string;
  detail?: (p: StreamProgress) => string | null;
};

/** A short, human phrase for a list of labels: "Ethiopia", "Ethiopia and Kenya",
 *  or "Ethiopia and 2 more" — kept brief so a loading line never runs long. */
function phrase(items: string[]): string {
  const clean = items.filter(Boolean);
  if (clean.length <= 1) return clean[0] ?? '';
  if (clean.length === 2) return `${clean[0]} and ${clean[1]}`;
  return `${clean[0]} and ${clean.length - 1} more`;
}

// The ordered milestones the user sees — friendly phrases that name the query's
// own terms once they've streamed, never the technical six-step pipeline
// machinery (that lives in the settled result's summary and the debug panel).
const STAGES: Stage[] = [
  {
    label: () => 'Reading your question',
    detail: (p) => [...p.variables, ...p.entities, ...p.dates].join(' · ') || null,
  },
  {
    label: (p) => (p.variables.length ? `Finding data on ${phrase(p.variables)}` : 'Finding your data'),
    detail: (p) => p.shapeLabel,
  },
  {
    label: (p) => (p.entities.length ? `Getting the numbers for ${phrase(p.entities)}` : 'Getting the numbers'),
  },
  { label: () => 'Composing the answer' },
];

// Which milestone each real pipeline step advances the timeline to, so streamed
// progress can jump ahead to match what the engine is actually doing.
const STEP_STAGE: Record<PipelineStepName, number> = {
  extract: 0,
  recall: 1,
  shape: 1,
  bind: 1,
  materialise: 2,
  answer: 3,
};

const EMPTY_PROGRESS: StreamProgress = {
  variables: [],
  entities: [],
  dates: [],
  shapeLabel: null,
  stepMs: {},
};

export function LoadTimeline({
  steps,
  progress,
  hideDetail = false,
}: {
  steps?: PipelineStepName[];
  progress?: StreamProgress | null;
  /** visually hide the detail line (the milestone label still renders) — set
   *  once LiveSentence is already showing these same extracted terms, so
   *  sighted users don't see them twice. Stays in the DOM (sr-only) rather
   *  than being dropped: it's the only aria-live announcement of the
   *  extracted terms, since LiveSentence is aria-hidden. */
  hideDetail?: boolean;
}) {
  // Slow fallback tick so the milestone still advances if nothing streams;
  // clamped at the last stage (no looping). Real streamed steps lead via max().
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => Math.min(t + 1, STAGES.length - 1)), 1500);
    return () => clearInterval(id);
  }, []);

  const lastStep = steps && steps.length ? steps[steps.length - 1] : null;
  const realStage = lastStep != null ? (STEP_STAGE[lastStep] ?? 0) : 0;
  const current = Math.max(tick, realStage);
  const stage = STAGES[current];
  const prog = progress ?? EMPTY_PROGRESS;
  const detail = stage.detail?.(prog) ?? null;

  return (
    <div role="status" aria-live="polite" className="py-1">
      <div className="flex items-center gap-2.5">
        <span aria-hidden="true" className="h-2.5 w-2.5 flex-none animate-pulse-soft rounded-full bg-g6" />
        <span className="text-[15px] font-medium text-g6">{stage.label(prog)}…</span>
        <span className="ml-auto text-[12px] tabular-nums text-g4">
          {current + 1} / {STAGES.length}
        </span>
      </div>
      {detail && (
        <div className={cn('mt-1 truncate pl-[1.25rem] text-[13px] text-g4', hideDetail && 'sr-only')}>{detail}</div>
      )}
    </div>
  );
}
