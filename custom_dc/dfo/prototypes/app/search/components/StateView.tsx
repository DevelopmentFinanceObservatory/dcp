/**
 * StateView registry — maps a structural condition of one Part to a prebuilt
 * component, keyed off the Part's own status, not backend display
 * directives.
 *
 * `candidate` and `no_data` are real. `definite` renders through the
 * surface's ViewModel seams, so its registry entry stays a stub, and so does
 * `unsupported`'s: SearchClient renders an inline error line for that status
 * directly, not through this registry. `wildcard` (broad-query detection)
 * has no component yet. `mixed` is unreachable through here in practice:
 * `Part.status` (what StateView switches on) is never "mixed", only the
 * whole envelope's own `ResolveResponse.status` can be. The entry exists
 * defensively, so a call site that mistakenly hands this an envelope-level
 * status still renders something sane instead of falling through to
 * "definite".
 */

import type { ComponentType } from "react";
import type { Part, PartStatus, Spec } from "@/lib/contract/types";
import { SeamPlaceholder } from "./_seam";
import { CandidateView } from "./states/CandidateView";
import { NoDataView } from "./states/NoDataView";

export type ViewState =
  "definite" | "candidate" | "wildcard" | "no_data" | "error" | "mixed";

export interface StateViewProps {
  part: Part;
  /** this part's own index in the envelope, for a11y ids/keys; CandidateView
   *  and NoDataView don't use it. */
  partIndex: number;
  /** promote a candidate / nearest sentence by choosing its spec */
  onChoose?: (spec: Spec) => void;
}

function makeStub(
  state: ViewState,
  stage: string,
): ComponentType<StateViewProps> {
  function Stub({ part }: StateViewProps) {
    return (
      <SeamPlaceholder name={`StateView:${state}`} stage={stage}>
        <p className="m-0 text-g5">status: {part.status}</p>
      </SeamPlaceholder>
    );
  }
  Stub.displayName = `StateView_${state}`;
  return Stub;
}

/** The registry: one prebuilt component per view state. */
export const stateViewRegistry: Record<
  ViewState,
  ComponentType<StateViewProps>
> = {
  definite: makeStub("definite", "Stage 1"),
  candidate: CandidateView,
  wildcard: makeStub("wildcard", "Stage 7"),
  no_data: NoDataView,
  error: makeStub("error", "Stage 2 / 4"),
  mixed: makeStub("mixed", "unreachable — see file banner"),
};

/**
 * Map a part's own status to a view state. `unsupported` maps to the same
 * `error` stub as a transport failure. SearchClient never actually routes
 * an unsupported part through here, so this arm exists only so the mapping
 * is total.
 */
export function selectViewState(status: PartStatus | "mixed"): ViewState {
  switch (status) {
    case "candidates":
      return "candidate";
    case "no_data":
      return "no_data";
    case "unsupported":
      return "error";
    case "mixed":
      return "mixed";
    case "definite":
    default:
      return "definite";
  }
}

export function StateView({ part, partIndex, onChoose }: StateViewProps) {
  const Component = stateViewRegistry[selectViewState(part.status)];
  return <Component part={part} partIndex={partIndex} onChoose={onChoose} />;
}
