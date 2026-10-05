/**
 * CandidateView — the ambiguous outcome, resolved to one surface. Candidates
 * are shown broadest-first, each as a one-line sentence with its coverage.
 * Picking one resubmits that candidate's spec.
 *
 * Renders the `observations_omitted` warning from `part.warnings` in its own
 * header, above the cards: the engine never fetches observations for
 * unpicked candidates.
 */

import { buildViewModel } from "../../lib/viewModel";
import type { ViewModel } from "../../lib/viewModel";
import type { StateViewProps } from "../StateView";
import { PartWarnings } from "../PartWarnings";

/**
 * The engine's own rendered sentence, when it came through. `sentence_from_plan`
 * space-joins body phrases because adjacent slot tokens often have no
 * connective text token between them, so a client-side rejoin of the tokens
 * can't faithfully reproduce it. Each candidate carries its own on
 * `spec.rendered_sentence` (lifted by normalizeSpec, same as a definite
 * spec's). Otherwise falls back to the naive per-slot join used when this
 * candidate has no sentence at all; see buildSentence in buildViewModel.ts
 * for why that fallback lists every unbound slot.
 */
function sentenceText(
  vm: ViewModel,
  rendered: string | null | undefined,
): string {
  if (rendered) return rendered;
  return (vm.sentence ?? []).map((phrase) => phrase.text).join(" ");
}

export function CandidateView({ part, onChoose }: StateViewProps) {
  const candidates = part.status === "candidates" ? part.candidates.specs : [];
  if (candidates.length === 0) return null;

  return (
    <section aria-label="Multiple matches">
      <p className="mb-2 text-g5">
        More than one reading fits — pick the one you mean:
      </p>
      <div className="mb-2">
        <PartWarnings warnings={part.warnings} />
      </div>
      <ul className="m-0 grid list-none gap-2 p-0">
        {candidates.map((candidate) => {
          const vm = buildViewModel(candidate, candidate.sentence_plan);
          return (
            <li key={candidate.spec_id}>
              <button
                onClick={() => onChoose?.(candidate)}
                className="block w-full cursor-pointer rounded-xl border border-g2 bg-white px-3 py-2.5 text-left"
              >
                <span className="text-[16px] text-g6">
                  {sentenceText(vm, candidate.rendered_sentence)}
                </span>
                <span className="mt-0.5 block text-[13px] text-g4">
                  {vm.coverage?.summary ?? ""}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
