// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CandidateView } from "./CandidateView";
import { candidates } from "../../lib/fixtures";
import type { CandidatesPart, SentenceToken } from "@/lib/contract/types";

function candidatesPart(): CandidatesPart {
  const part = candidates.parts[0];
  if (part?.status !== "candidates")
    throw new Error("expected a candidates part");
  return part;
}

describe("<CandidateView>", () => {
  it("lists candidates broadest-first as choosable sentences", () => {
    const part = candidatesPart();
    render(<CandidateView part={part} partIndex={0} />);
    const list = part.candidates.specs;
    // Broadest first: the first candidate's sentence renders before the second.
    expect(screen.getByText(/all flows/)).toBeInTheDocument();
    expect(screen.getByText(/ODA grants/)).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(list.length);
  });

  it("calls onChoose with the candidate Spec when picked", () => {
    const onChoose = vi.fn();
    const part = candidatesPart();
    render(<CandidateView part={part} partIndex={0} onChoose={onChoose} />);
    const first = part.candidates.specs[0];
    screen.getAllByRole("button")[0].click();
    expect(onChoose).toHaveBeenCalledWith(first);
  });

  it("renders the backend rendered_sentence for a candidate that carries one, and falls back for one that does not", () => {
    const part = candidatesPart();
    const specs = part.candidates.specs;
    const plan: SentenceToken[] = [
      { kind: "text", text: "Total " },
      {
        kind: "slot",
        text: "development finance flows",
        axis: "what",
        binding_ref: "what:flowType",
      },
      { kind: "text", text: " to " },
      { kind: "slot", text: "Africa", axis: "where", binding_ref: "where:" },
    ];
    const withSentence = {
      ...specs[0],
      rendered_sentence: "Total development finance flows to Africa.",
      sentence_plan: plan,
    };
    const patched: CandidatesPart = {
      ...part,
      candidates: { ...part.candidates, specs: [withSentence, specs[1]] },
    };
    render(<CandidateView part={patched} partIndex={0} />);
    // First candidate: shows the engine's rendered_sentence verbatim, not a client-side token join.
    expect(
      screen.getByText("Total development finance flows to Africa."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/^all flows/)).not.toBeInTheDocument();
    // Second candidate carries no rendered_sentence: falls back to the per-slot token join.
    expect(screen.getByText(/ODA grants/)).toBeInTheDocument();
  });

  it("displays rendered_sentence verbatim even when adjacent slot tokens have no connective text between them", () => {
    // A client-side join('') of just the tokens' text would read "Femalepopulation";
    // rendered_sentence carries the engine's own spacing (sentence_from_plan
    // space-joins body phrases). CandidateView must display it verbatim rather than
    // ever reconstructing it from sentence_plan itself.
    const part = candidatesPart();
    const specs = part.candidates.specs;
    const plan: SentenceToken[] = [
      {
        kind: "slot",
        text: "Female",
        axis: "what",
        binding_ref: "what:gender",
      },
      {
        kind: "slot",
        text: "population",
        axis: "what",
        binding_ref: "what:measure",
      },
    ];
    const withSentence = {
      ...specs[0],
      rendered_sentence: "Female population.",
      sentence_plan: plan,
    };
    const patched: CandidatesPart = {
      ...part,
      candidates: { ...part.candidates, specs: [withSentence, specs[1]] },
    };
    render(<CandidateView part={patched} partIndex={0} />);
    expect(screen.getByText("Female population.")).toBeInTheDocument();
    expect(screen.queryByText("Femalepopulation")).not.toBeInTheDocument();
  });

  it("shows the observations_omitted note under the cards when the part carries one", () => {
    const part = candidatesPart();
    const patched: CandidatesPart = {
      ...part,
      warnings: [
        {
          code: "observations_omitted",
          severity: "warn",
          message: "Observations were not fetched for this candidates part.",
        },
      ],
    };
    render(<CandidateView part={patched} partIndex={0} />);
    expect(
      screen.getByText(
        "Observations were not fetched for this candidates part.",
      ),
    ).toBeInTheDocument();
  });
});
