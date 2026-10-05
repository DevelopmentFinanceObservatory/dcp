/**
 * NoDataView renders the empty query outcome.
 */

import type { NoDataReason, Spec } from "@/lib/contract/types";
import { buildViewModel } from "../../lib/viewModel";
import type { StateViewProps } from "../StateView";
import { GroundingCard } from "../GroundingCard";

function sentenceText(spec: Spec): string {
  return (buildViewModel(spec).sentence ?? [])
    .map((phrase) => phrase.text)
    .join(" ");
}

const REASON_TEXT: Record<NoDataReason, string> = {
  no_observations: "This region has no observations.",
  entity_not_resolved: "We couldn't match the place in that query.",
  variable_not_resolved: "We couldn't match the measure in that query.",
  no_matching_slice:
    "That specific combination is unavailable as a data series.",
  denominator_not_available:
    "The denominator needed for this measure is unavailable.",
  role_unresolved:
    'We couldn\'t tell whether that place is the aid donor or recipient. Try rephrasing with "to" or "from".',
};

export function NoDataView({ part, onChoose }: StateViewProps) {
  const noData = part.status === "no_data" ? part.no_data : undefined;
  const reasonCode = noData?.reason;
  const reason =
    (reasonCode && REASON_TEXT[reasonCode]) || "No data matched this query.";
  const nearest = noData?.nearest_real ?? [];
  const flagged = noData?.flagged_match;

  const vm = flagged ? buildViewModel(flagged) : null;
  const hasGrounding =
    vm &&
    (vm.interpretation.variables.length > 0 ||
      vm.interpretation.places.length > 0 ||
      !!vm.interpretation.dates);

  return (
    <section aria-label="No data">
      <p className="mb-1 text-[16px] text-g6">No data for this query.</p>
      <p className="m-0 text-[14px] text-g4">{reason}</p>

      {flagged && vm && hasGrounding && (
        <div className="mb-3 mt-3 rounded-lg border border-g2 bg-g1 p-3">
          <p className="m-0 mb-2 text-[14px] text-g6">Parsed query</p>
          <GroundingCard
            variables={vm.interpretation.variables}
            places={vm.interpretation.places}
            dates={vm.interpretation.dates ?? undefined}
          />
          <p className="m-0 mt-2 text-[13px] text-g5">
            There is no data for this specific combination.
          </p>
        </div>
      )}

      {nearest.length > 0 && (
        <>
          <p className="mb-1.5 mt-3 text-[14px] text-g5 font-semibold">
            Did you mean
          </p>
          <ul className="m-0 grid list-none gap-1.5 p-0">
            {nearest.map((spec) => (
              <li key={spec.spec_id}>
                <button
                  onClick={() => onChoose?.(spec)}
                  className="cursor-pointer w-full text-left rounded-lg border border-g2 bg-white px-3 py-2 text-[15px] text-g6 hover:border-blue-400 hover:bg-blue-50 transition-colors"
                >
                  {sentenceText(spec)}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
