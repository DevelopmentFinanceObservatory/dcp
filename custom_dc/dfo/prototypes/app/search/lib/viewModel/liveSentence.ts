/**
 * liveSentence — projections for the in-flight sentence shown while a resolve
 * streams. Two sources, in the order the stream delivers them:
 *
 *   1. the `interpretation` event (extracted phrases, before any shape exists)
 *   2. the `shape` / `sentence` events (skeleton plan → bound plan)
 *
 * Both project to the same LivePart[] so one component renders every phase and
 * the sentence area visibly *becomes* the answer instead of jumping from a
 * shimmer to a finished result. Pure functions, no React.
 */

import type { SentenceToken as StreamSentenceToken } from '@/lib/client/searchClient';
import type { LiveSentenceView, StreamProgress } from '../store/specStore';

export type LivePart =
  | { kind: 'text'; text: string }
  /** a phrase with real text (extracted term, or a bound/pre-rendered token) */
  | { kind: 'phrase'; text: string; pending: false }
  /** a placeholder for a slot still being resolved; text is the slot's label */
  | { kind: 'phrase'; text: string; pending: true };

/**
 * Project one streamed sentence plan (skeleton or bound). Unlike the settled
 * sentence (buildSentenceTokens drops empty-text tokens), an empty slot token
 * here renders as a labelled placeholder — that placeholder filling in IS the
 * progress the user is watching.
 */
export function livePartsFromPlan(
  plan?: StreamSentenceToken[] | null,
  labels?: Record<string, string> | null,
): LivePart[] {
  const parts: LivePart[] = [];
  const safeLabels = labels ?? {};
  for (const tok of plan ?? []) {
    if (tok.kind === 'text') {
      if (tok.text !== '') parts.push({ kind: 'text', text: tok.text });
      continue;
    }
    if (tok.text !== '') {
      parts.push({ kind: 'phrase', text: tok.text, pending: false });
      continue;
    }
    const label = (tok.binding_ref ? safeLabels[tok.binding_ref] : undefined) ?? tok.axis ?? '';
    if (label) parts.push({ kind: 'phrase', text: label, pending: true });
  }
  return parts;
}

/**
 * Project the extraction echo — what the engine understood the query to be,
 * shown in the sentence area before the first shape arrives. Deliberately no
 * invented grammar (a connective like "in" would be wrong for e.g. a donor
 * query); the phrases are separated by interpuncts.
 */
export function livePartsFromInterpretation(progress?: StreamProgress | null): LivePart[] {
  if (!progress) return [];
  const phrases = [...(progress.variables ?? []), ...(progress.entities ?? []), ...(progress.dates ?? [])];
  const parts: LivePart[] = [];
  phrases.forEach((text, i) => {
    if (i > 0) parts.push({ kind: 'text', text: ' · ' });
    parts.push({ kind: 'phrase', text, pending: false });
  });
  return parts;
}

/**
 * The loading surface's current best sentence: bound/skeleton plans per
 * variable when any have streamed in (ordered by variable index), else the
 * extraction echo, else null (caller shows the plain skeleton shimmer).
 */
export function liveSentenceParts(
  liveSentences?: Record<number, LiveSentenceView> | null,
  progress?: StreamProgress | null,
): LivePart[][] | null {
  const entries = Object.entries(liveSentences ?? {})
    .filter(([, view]) => Boolean(view))
    .sort(([a], [b]) => Number(a) - Number(b));
  if (entries.length > 0) {
    return entries.map(([, view]) => livePartsFromPlan(view?.plan, view?.labels));
  }
  if (progress && ((progress.variables?.length ?? 0) > 0 || (progress.entities?.length ?? 0) > 0)) {
    return [livePartsFromInterpretation(progress)];
  }
  return null;
}
